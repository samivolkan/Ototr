"""Real inference smoke test. No customer documents, no network allowed."""
import json
import socket
from pathlib import Path
from ruhsat.engine import OCRService

ROOT = Path(__file__).resolve().parent


def blocked(*args, **kwargs):
    raise AssertionError("Offline inference attempted a network connection")


if __name__ == "__main__":
    socket.socket.connect = blocked
    service = OCRService()
    service.initialize()
    assert service.status == "ready", service.error
    result = service.analyze((ROOT / "web/sample.png").read_bytes(), "detailed", 0, False, True)
    expected = json.loads((ROOT / "tests/fixtures/expected.json").read_text(encoding="utf-8"))
    got = {**result["analysed"]["Data"], **{f["key"]: f["value"] for f in result["seller_suggestion"]["fields"]}}
    matches = sum(got.get(k) == v for k, v in expected.items())
    print(json.dumps({"seconds": result["elapsed_seconds"], "exact": matches, "expected": len(expected),
                      "mismatches": {k: {"expected": v, "got": got.get(k)} for k, v in expected.items() if got.get(k) != v},
                      "warnings": result["warnings"], "summary": result["summary"]}, ensure_ascii=True, indent=2))
    (ROOT / "test-results").mkdir(exist_ok=True)
    (ROOT / "test-results/synthetic-result.json").write_text(json.dumps(result, ensure_ascii=False), encoding="utf-8")
