import io
from unittest.mock import patch

from PIL import Image

from ruhsat.engine import OCRService
from ruhsat.privacy import OWNER_KEYS, partition_fields


def field(key, value):
    return {"key": key, "value": value, "status": "ok", "needs_review": False}


def test_all_owner_fields_are_separate_including_missing_values():
    fields = [field("plate", "16TST123"), field("owner_name", "KURGUSAL AD"),
              field("owner_surname", "KURGUSAL SOYAD"), field("tc_or_tax_no", None)]
    vehicle, suggestion = partition_fields(fields)
    assert [f["key"] for f in vehicle] == ["plate"]
    assert {f["key"] for f in suggestion["fields"]} == OWNER_KEYS
    assert suggestion["persistence"] == "memory_only"
    assert len(fields) == 4  # Does not erase evidence needed in the live session.


def test_engine_contract_keeps_seller_out_of_vehicle_data():
    reader = OCRService()
    fields = [field("plate", "16TST123"), field("owner_name", "KURGUSAL AD"),
              field("owner_surname", "KURGUSAL SOYAD"), field("tc_or_tax_no", "TEST-NO")]
    extraction = {"fields": fields, "document_recognized": True, "anchor_count": 10}
    buffer = io.BytesIO()
    Image.new("RGB", (800, 800), "white").save(buffer, format="PNG")
    with patch.object(reader, "read", return_value=[]), patch.object(reader, "orientation", return_value=0), \
            patch("ruhsat.engine.extract", return_value=extraction):
        result = reader.analyze(buffer.getvalue(), "fast", 0, False, False)
    assert result["analysed"]["Data"] == {"plate": "16TST123"}
    assert {f["key"] for f in result["fields"]}.isdisjoint(OWNER_KEYS)
    assert {f["key"] for f in result["seller_suggestion"]["fields"]} == OWNER_KEYS
    assert result["summary"]["read"] == 1
    assert result["privacy"]["persistent_storage"] is False
    assert result["privacy"]["seller_suggestion_storage"] == "memory_only"
