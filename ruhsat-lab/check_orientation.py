"""Offline synthetic acceptance for automatic and manual page orientation."""
import io
import json
import socket
from pathlib import Path

from PIL import Image
from ruhsat.engine import OCRService

ROOT = Path(__file__).resolve().parent


def main():
    def offline(*args, **kwargs):
        raise AssertionError("Orientation acceptance must remain offline")

    socket.socket.connect = offline
    service = OCRService()
    service.initialize()
    assert service.status == "ready", "Local models must be installed"
    source = Image.open(ROOT / "web/sample.png").convert("RGB")
    expected = json.loads((ROOT / "tests/fixtures/expected.json").read_text(encoding="utf-8"))
    expected = {k: v for k, v in expected.items()
                if k not in {"owner_name", "owner_surname", "tc_or_tax_no"}}
    cases = [(f"auto_{angle}", source.rotate(angle, expand=True), 0, True, "exact")
             for angle in (0, 90, 180, 270)]
    cases += [
        ("upright_auto_off", source, 0, False, "exact"),
        ("manual_rotation", source.rotate(90, expand=True), 90, False, "exact"),
        ("sideways_auto_off", source.rotate(90, expand=True), 0, False, "review"),
        ("blank", Image.new("RGB", (1000, 700), "white"), 0, True, "blank"),
    ]
    reports = []
    for name, image, rotation, auto_rotate, assertion in cases:
        encoded = io.BytesIO()
        image.save(encoded, format="PNG")
        result = service.analyze(encoded.getvalue(), "detailed", rotation, False, auto_rotate)
        fields = result["analysed"]["Data"]
        mismatches = [k for k, value in expected.items() if fields.get(k) != value]
        if assertion == "exact":
            passed = not mismatches
        elif assertion == "blank":
            passed = (not result["document_recognized"] and not any(fields.values())
                      and not any(f["value"] for f in result["seller_suggestion"]["fields"]))
        else:
            passed = (any("Yön kontrolünü" in warning for warning in result["warnings"])
                      and all(f["needs_review"] for f in result["fields"] if f["value"]))
        report = {"case": name, "passed": passed, "assertion": assertion,
                  "seconds": result["elapsed_seconds"], "rotation": result["image"]["rotation"],
                  "mismatch_keys": mismatches if assertion == "exact" else []}
        reports.append(report)
        print(json.dumps(report), flush=True)
    (ROOT / "test-results").mkdir(exist_ok=True)
    (ROOT / "test-results/orientation-acceptance.json").write_text(
        json.dumps({"synthetic": True, "cases": reports}, indent=2), encoding="utf-8")
    assert all(r["passed"] for r in reports), "Orientation acceptance failed; inspect report"


if __name__ == "__main__":
    main()
