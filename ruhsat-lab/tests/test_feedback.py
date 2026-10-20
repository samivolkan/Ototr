from copy import deepcopy
from unittest.mock import patch
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError
import app as server
from ruhsat.feedback import Feedback, FeedbackStore

HEADERS={'X-OTOTR-Client':'ruhsat-lab'}


def test_patch_release_keeps_private_feedback_compatible():
    data=payload();data['engine_version']='0.3.1';data['condition']='skew'
    result=Feedback.model_validate(data)
    assert result.engine_version=='0.3.1' and result.condition=='skew'


def payload(**extra):
    return dict(request_id=str(uuid4()),mode='fast',preprocessing='standard',engine_version='0.2.0',synthetic=True,
                fields=[dict(key='plate',corrected=True,originally_missing=False,confidence=.8)],**extra)


@pytest.mark.parametrize('extra',[{'image':'PRIVATE'},{'owner_name':'PRIVATE'},{'value':'PRIVATE'},{'filename':'PRIVATE'}])
def test_feedback_rejects_personal_or_raw_fields(extra):
    with pytest.raises(ValidationError):Feedback.model_validate(payload(**extra))


@pytest.mark.parametrize('field',[dict(key='owner_name',corrected=False,originally_missing=False,confidence=.9),
                                   dict(key='plate',corrected=True,originally_missing=False,confidence=.9,value='PRIVATE'),
                                   dict(key='plate',corrected='false',originally_missing=False,confidence=.9)])
def test_nested_payload_cannot_smuggle_values(field):
    data=payload();data['fields']=[field]
    with pytest.raises(ValidationError):Feedback.model_validate(data)


def test_stats_replace_repeated_review_and_separate_synthetic(tmp_path):
    store=FeedbackStore(tmp_path/'feedback.sqlite3');data=payload()
    store.save(Feedback.model_validate(data));data['fields'][0]['corrected']=False
    store.save(Feedback.model_validate(data))
    assert store.stats()['documents_reviewed']==0
    stats=store.stats(True)
    assert stats['documents_reviewed']==1 and stats['rows'][0]['corrected']==0
    assert stats['rows'][0]['unchanged_rate']==1
    duplicate=deepcopy(data);duplicate['fields']*=2
    with pytest.raises(ValueError):store.save(Feedback.model_validate(duplicate))
    assert store.stats(True)['documents_reviewed']==1
    # All connection handles must be closed (also verifies Windows unlink).
    store.path.unlink()


def test_admin_auth_and_private_values_are_never_echoed_or_stored(tmp_path):
    client=TestClient(server.app,base_url='http://localhost',client=('127.0.0.1',123))
    store=FeedbackStore(tmp_path/'feedback.sqlite3')
    with patch('app.feedback_store',store),patch('app.ADMIN_TOKEN','admin-token'):
        assert client.get('/api/admin/feedback').status_code==401
        assert client.post('/api/admin/feedback',json=payload(),headers=HEADERS).status_code==401
        headers={**HEADERS,'Authorization':'Bearer admin-token'}
        r=client.post('/api/admin/feedback',json=payload(value='PRIVATE'),headers=headers)
        assert r.status_code==422 and 'PRIVATE' not in r.text
        assert not store.path.exists()
        assert client.post('/api/admin/feedback',content=b'x'*12001,headers=headers).status_code==413
        assert client.post('/api/admin/feedback',json=payload(),headers=headers).status_code==200
        assert b'PRIVATE' not in store.path.read_bytes()
        assert client.get('/api/admin/feedback?synthetic=true',headers=headers).json()['documents_reviewed']==1


def test_preview_never_allows_unprotected_admin():
    client=TestClient(server.app,base_url='http://localhost',client=('127.0.0.1',123))
    with patch('app.PUBLIC_ORIGIN','https://example.trycloudflare.com'),patch('app.ADMIN_TOKEN',''):
        assert client.get('/api/admin/feedback').status_code==403


def test_server_requires_ocr_token_and_is_distinct_from_admin():
    client=TestClient(server.app,base_url='http://localhost')
    server.recent_requests.clear()
    with patch('app.SERVER_ORIGIN','https://ocr.example.com'),patch('app.API_TOKEN','ocr-token'),patch('app.ADMIN_TOKEN','admin-token'),patch.object(server.service,'status','ready'),patch.object(server.service,'analyze',return_value={'ok':True}):
        assert client.get('/api/health').json()['access_mode']=='server_token'
        assert client.get('/api/ready').status_code==200
        for token in ['', 'admin-token', 'wrong']:
            assert client.post('/api/v1/ruhsat/oku',content=b'x',headers={**HEADERS,'Authorization':'Bearer '+token}).status_code==401
        assert client.post('/api/v1/ruhsat/oku',content=b'x',headers={**HEADERS,'Authorization':'Bearer ocr-token'}).status_code==200
        assert client.post('/api/v1/ruhsat/oku',content=b'x',headers={**HEADERS,'Origin':'https://evil.example','Authorization':'Bearer ocr-token'}).status_code==403
    server.recent_requests.clear()


def test_invalid_quality_parameters_do_not_reach_engine():
    client=TestClient(server.app,base_url='http://localhost')
    with patch.object(server.service,'analyze') as analyze:
        for param in ['review_threshold=0.2','vin_threshold=1.1','preprocessing=PRIVATE','review_threshold=NaN']:
            response=client.post('/api/v1/ruhsat/oku?'+param,headers=HEADERS,content=b'x')
            assert response.status_code==422 and 'PRIVATE' not in response.text
        analyze.assert_not_called()


def test_legacy_database_migrates_and_conditions_remain_separate(tmp_path):
    import sqlite3
    path=tmp_path/'old.sqlite3'
    with sqlite3.connect(path) as db:
        db.execute('CREATE TABLE reviews(request_id TEXT PRIMARY KEY, mode TEXT NOT NULL, preprocessing TEXT NOT NULL, engine_version TEXT NOT NULL, synthetic INTEGER NOT NULL)')
        db.execute("INSERT INTO reviews VALUES ('old','fast','standard','0.2.0',1)")
    store=FeedbackStore(path)
    store.save(Feedback.model_validate(payload(condition='glare')))
    store.save(Feedback.model_validate(payload(condition='blur')))
    stats=store.stats(True)
    assert stats['documents_reviewed']==3
    assert {r['condition'] for r in stats['rows']}=={'glare','blur'}


def test_category_targets_are_controlled_retractable_and_not_training(tmp_path):
    store=FeedbackStore(tmp_path/'feedback.sqlite3')
    data=payload()
    data['fields']=[dict(key='vehicle_category',corrected=True,originally_missing=False,confidence=.7,category_target='AA')]
    store.save(Feedback.model_validate(data))
    result=store.stats(True)
    assert result['category_corrections']==[dict(code='AA',reviews=1,status='pending_evaluation')]
    assert result['model_trained'] is False
    for key,corrected,target in [('owner_name',True,'AA'),('plate',True,'AA'),('vehicle_category',False,'AA'),('vehicle_category',True,'PRIVATE')]:
        invalid=deepcopy(data)
        invalid['fields'][0].update(key=key,corrected=corrected,category_target=target)
        with pytest.raises(ValidationError):Feedback.model_validate(invalid)
    data['fields']=[]
    store.save(Feedback.model_validate(data))
    assert store.stats(True)['documents_reviewed']==0
    assert store.stats(True)['category_corrections']==[]
