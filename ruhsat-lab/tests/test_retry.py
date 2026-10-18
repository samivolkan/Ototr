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
        def read(self,image,model,prefix):return [dict(text='2018',score=.95)]
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
