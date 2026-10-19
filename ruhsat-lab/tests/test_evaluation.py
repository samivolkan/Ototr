import json
from copy import deepcopy
import pytest
from pydantic import ValidationError
from evaluate import Dataset, load_dataset, report, compare, score_case, repeat_summary


def test_repeat_summary_has_counts_and_nearest_rank_tail_latency_only():
    samples=[{'id':'synthetic','repeat':n+1,'seconds':n+1} for n in range(20)]
    result=repeat_summary(samples,2,1.23456)
    assert result['runs']==20 and result['median_seconds']==10.5
    assert result['p95_seconds']==19 and result['max_seconds']==20
    assert result['changed_field_observations']==2
    assert result['accuracy_counts_use_first_run_only'] is True
    assert result['initialization_seconds']==1.235
    assert result['per_case']==[{'id':'synthetic','runs':20,'median_seconds':10.5}]


def test_repeat_summary_handles_no_completed_samples():
    result=repeat_summary([],0,0)
    assert result['runs']==0 and result['p95_seconds'] is None


def dataset():
    return {'schema_version':1,'cases':[dict(id='one',document_group='one',split='development',condition='skew',image='one.jpg',consent=True,label_review='assistant',synthetic=True,expected={'plate':'16TST123','vin':None})]}


def test_private_labels_and_unreviewed_test_labels_rejected():
    data=dataset();data['cases'][0]['expected']['owner_name']='PRIVATE'
    with pytest.raises(ValidationError):Dataset.model_validate(data)
    data=dataset();data['cases'][0]['split']='test'
    with pytest.raises(ValidationError):Dataset.model_validate(data)


def test_no_document_group_leakage_or_path_escape(tmp_path):
    data=dataset();other=deepcopy(data['cases'][0]);other.update(id='two',split='train',label_review='human');data['cases'].append(other)
    with pytest.raises(ValidationError):Dataset.model_validate(data)
    data=dataset();data['cases'][0]['image']='../one.jpg'
    manifest=tmp_path/'labels.json';manifest.write_text(json.dumps(data))
    with pytest.raises(ValueError):load_dataset(manifest)


def test_duplicate_images_cannot_be_separate_documents(tmp_path):
    data=dataset();other=deepcopy(data['cases'][0]);other.update(id='two',document_group='two');data['cases'].append(other)
    (tmp_path/'one.jpg').write_bytes(b'identical image')
    manifest=tmp_path/'labels.json';manifest.write_text(json.dumps(data))
    with pytest.raises(ValueError):load_dataset(manifest)


def test_report_counts_false_positives_and_detects_critical_regression():
    case=Dataset.model_validate(dataset()).cases[0]
    a=score_case(case,[{'key':'plate','value':'16TST123'}],1)
    b=score_case(case,[{'key':'plate','value':'16TST124'},{'key':'vin','value':'UNEXPECTED'}],2)
    before=report([a],'same','development','old');after=report([b],'same','development','new')
    result=compare(before,after)
    assert result['before_exact']==2 and result['after_exact']==0
    assert len(result['critical_regressions'])==2 and not result['production_ready']
    assert '16TST' not in json.dumps(after) and 'UNEXPECTED' not in json.dumps(after)
    after['dataset_fingerprint']='other'
    with pytest.raises(ValueError):compare(before,after)
