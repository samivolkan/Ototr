import pytest
from ruhsat.engine import inference_threads


@pytest.mark.parametrize('cpus,expected', [(12,6), (2,2), (1,1), (None,4)])
def test_default_parallelism_respects_available_cpu_count(monkeypatch,cpus,expected):
    monkeypatch.delenv('OTOTR_OCR_THREADS',raising=False)
    monkeypatch.setattr('ruhsat.engine.os.cpu_count',lambda:cpus)
    assert inference_threads()==expected


@pytest.mark.parametrize('value', ['1','4','6','16'])
def test_explicit_host_benchmark_setting(monkeypatch,value):
    monkeypatch.setenv('OTOTR_OCR_THREADS',value)
    assert inference_threads()==int(value)


@pytest.mark.parametrize('value', ['0','-1','17','all','1.5',''])
def test_invalid_parallelism_fails_before_inference(monkeypatch,value):
    monkeypatch.setenv('OTOTR_OCR_THREADS',value)
    with pytest.raises(ValueError):inference_threads()
