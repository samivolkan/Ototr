"""Separate transient seller suggestions from the vehicle data contract."""

OWNER_KEYS = frozenset({"owner_name", "owner_surname", "tc_or_tax_no"})


def partition_fields(fields: list[dict]) -> tuple[list[dict], dict]:
    vehicle = [field for field in fields if field["key"] not in OWNER_KEYS]
    suggestions = [field for field in fields if field["key"] in OWNER_KEYS]
    return vehicle, {
        "purpose": "seller_suggestion",
        "persistence": "memory_only",
        "fields": suggestions,
    }
