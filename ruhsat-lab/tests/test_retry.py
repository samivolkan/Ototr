import io
from unittest.mock import patch
import pytest
from PIL import Image
from fastapi.testclient import TestClient
import app as server
from ruhsat.retry import collect_candidates, reread
from ruhsat.engine import ImageInputError


def reading(text,model='v5',variant='original'):
    return dict(model=model,variant=variant,lines=[dict(text=text,score=.98)])


def test_disagreement_is_preserved_and_never_auto_confirmed():
    results=collect_candidates('vin',[reading('VF1TEST12345678901'),reading('VF1TEST12345678902','v6'),reading('VF1TEST12345678901',variant='local_contrast')])
    assert len(results)==2 and all(r['needs_review'] for r in results)
    assert not any(r['model_agreement'] for r in results)
    assert len(results[0]['sources'])==2


def test_rejects_owner_and_other_labelled_cells():
    with pytest.raises(ValueError):collect_candidates('owner_name',[])
    assert collect_candidates('model_year',[reading('TESCİL TARİHİ: 01/01/2020')])==[]


def test_crop_limits_and_four_real_passes():
    class Service:
        def read_upright(self,image,model,prefix):return [dict(text='2018',score=.95)]
    data=io.BytesIO();Image.new('RGB',(100,30),'white').save(data,format='PNG')
    result=reread(Service(),data.getvalue(),'model_year')
    assert result['attempts']==4 and result['candidates'][0]['model_agreement']
    assert result['requires_confirmation'] and not result['persistent_storage']
    large=io.BytesIO();Image.new('RGB',(3000,1000),'white').save(large,format='PNG')
    with pytest.raises(ImageInputError):reread(Service(),large.getvalue(),'model_year')


def test_api_auth_limits_and_lock_release():
    client=TestClient(server.app,base_url='http://localhost')
    headers={'X-OTOTR-Client':'ruhsat-lab'}
    endpoint='/api/v1/ruhsat/tekrar?field=vin'
    assert client.post(endpoint,content=b'x').status_code==403
    with patch.object(server.service,'status','ready'):
        assert client.post(endpoint.replace('vin','owner_name'),content=b'x',headers=headers).status_code==422
        assert client.post(endpoint,content=b'',headers=headers).status_code==400
        assert client.post(endpoint,content=b'bad',headers=headers).status_code==422
        assert client.post(endpoint,content=b'x'*(4*1024*1024+1),headers=headers).status_code==413
        assert not server.service.lock.locked()
    with patch('app.SERVER_ORIGIN','https://ocr.example.com'),patch('app.API_TOKEN','secret'):
        assert client.post(endpoint,content=b'x',headers=headers).status_code==401
    server.recent_requests.clear()


def box(text,x,y,w=120,h=20,score=.98):
    return dict(text=text,score=score,box=[[x,y],[x+w,y],[x+w,y+h],[x,y+h]])


def spatial_reading(lines,model='v5',variant='original'):
    return dict(model=model,variant=variant,lines=lines,width=600,height=180)


def test_wrapped_crop_is_one_complete_normalized_value():
    lines=[box('OTOMOBIL (AB',210,50,240),box('HECBEK)',180,75,160)]
    rows=[spatial_reading(lines,m,v) for m in ['v5','v6'] for v in ['original','local_contrast']]
    results=collect_candidates('vehicle_category',rows)
    assert [r['value'] for r in results] == ['OTOMOBİL (AB HEÇBEK)']
    assert len(results[0]['sources']) == 4 and results[0]['needs_review']
    assert results[0]['issues']


def test_incomplete_category_and_bare_continuation_are_not_replacements():
    assert collect_candidates('vehicle_category',[reading('HECBEK')]) == []
    assert collect_candidates('vehicle_category',[reading('OTOMOBIL (AB')]) == []
    assert collect_candidates('vehicle_category',[reading('CİNSİ: OTOMOBIL (AB')]) == []


def test_crop_caption_binds_type_and_rejects_neighbour_date_and_year():
    rows=[box('TESCİL TARİHİ',360,5,180),box('13/07/2023',370,30,160),
          box('(D.2) TİPİ',70,5,130),box('R',100,32,25),
          box('MODEL YILI',70,70,150),box('2018',100,100,60)]
    assert [c['value'] for c in collect_candidates('type',[spatial_reading(rows)])] == ['R']


def test_unlabelled_crop_selects_centre_value_not_adjacent_heading():
    rows=[box('13/07/2023',230,10,140),box('R',290,80,20),box('DEL.VILIT',250,140,130)]
    assert [c['value'] for c in collect_candidates('type',[spatial_reading(rows)])] == ['R']
    assert collect_candidates('type',[reading('13/07/2023')]) == []


def test_another_labelled_cell_is_not_fallback_when_target_is_missing():
    rows=[box('TESCİL TARİHİ',200,10,180),box('13/07/2023',220,40,160)]
    assert collect_candidates('type',[spatial_reading(rows)]) == []


def test_multiline_category_does_not_consume_adjacent_color():
    rows=[box('(D.5) CİNSİ',10,5,160),box('OTOMOBIL (AB',40,33,200),
          box('HECBEK)',10,58,120),box('(R) RENGİ',340,5,140),box('BEYAZ',370,35,110)]
    assert [c['value'] for c in collect_candidates('vehicle_category',[spatial_reading(rows)])] == ['OTOMOBİL (AB HEÇBEK)']


def test_skewed_wrapped_crop_keeps_full_value_when_punctuation_is_lost():
    rows=[box('(D.5) CINSI',60,15,250,60),box('OTOMOBIL (AB',275,55,420,95),box('HECBEK',53,110,245,65)]
    rd=dict(model='v5',variant='original',width=748,height=222,lines=rows)
    result=collect_candidates('vehicle_category',[rd])
    assert [c['value'] for c in result] == ['OTOMOBİL (AB HEÇBEK)']
    assert result[0]['issues'] and result[0]['needs_review']


def test_split_first_row_joins_before_wrapped_continuation():
    rows=[box('OTOMOBIL',280,65,295,70),box('(AB',585,80,100,65),box('HECBEK',50,110,250,65)]
    rd=dict(model='v6',variant='original',width=748,height=222,lines=rows)
    assert [c['value'] for c in collect_candidates('vehicle_category',[rd])] == ['OTOMOBİL (AB HEÇBEK)']


def test_unknown_or_missing_description_is_never_completed():
    for tail in ['HECBEKI','BILINMEYEN','']:
        rows=[box('OTOMOBIL (AB',200,30,240),box(tail,200,60,180)]
        assert collect_candidates('vehicle_category',[spatial_reading(rows)]) == []


def test_glued_neighbour_caption_is_not_a_commercial_name_candidate():
    assert collect_candidates('kind',[reading('(D.S)CINSIOTOMOBIL (AA')]) == []
