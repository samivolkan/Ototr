from publish_web import build
from ruhsat.web_access import server_origin
import pytest


@pytest.mark.parametrize('value',['http://ocr.example.com','https://user:pass@ocr.example.com','https://ocr.example.com/path','https://ocr.example.com?token=x','https://ocr.example.com:443'])
def test_server_origin_rejects_unsafe_config(value):
    with pytest.raises(ValueError):server_origin(value)


def test_server_frontend_build_is_self_contained_and_discloses_host(tmp_path):
    build(tmp_path,'https://ocr.example.com',server=True)
    html=(tmp_path/'index.html').read_text(encoding='utf-8')
    assert 'kendi OCR bilgisayarınıza' not in html
    assert 'Kendi OCR sunucunuzda' in html
    for filename in ['quality-policy.js','learning.js','config.js','app.js']:
        assert (tmp_path/filename).exists() and './'+filename in html
    assert 'TOKEN' not in (tmp_path/'config.js').read_text(encoding='utf-8')
