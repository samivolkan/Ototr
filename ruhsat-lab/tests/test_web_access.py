import pytest
from ruhsat.web_access import origin_allowed, preview_origin


def test_default_remains_local():
    assert preview_origin("") == ""
    assert origin_allowed(None, "http://localhost/", "")
    assert origin_allowed("http://localhost", "http://localhost/", "")
    assert not origin_allowed("https://other.trycloudflare.com", "http://localhost/", "")


def test_preview_allows_only_exact_origin():
    origin = preview_origin("https://example-test.trycloudflare.com/")
    assert origin_allowed(origin, "http://localhost/", origin)
    for other in ["https://evil.example", origin + ".evil.example", origin + "/", "null"]:
        assert not origin_allowed(other, "http://localhost/", origin)


@pytest.mark.parametrize("value", [
    "http://example.trycloudflare.com", "https://example.com",
    "https://trycloudflare.com.evil.example", "https://example.trycloudflare.com/path",
    "https://example.trycloudflare.com?x=1", "https://example.trycloudflare.com#fragment",
    "https://user:pass@example.trycloudflare.com", "https://example.trycloudflare.com:443",
])
def test_bad_preview_config_fails_closed(value):
    with pytest.raises(ValueError):
        preview_origin(value)
