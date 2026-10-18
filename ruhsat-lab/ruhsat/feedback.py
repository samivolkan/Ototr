"""Anonymous reviewed-field outcomes. No images, text values or owner fields."""
import sqlite3
from contextlib import closing
from pathlib import Path
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

VehicleKey = Literal["plate", "vin", "brand", "kind", "type", "model_year", "engine_no", "color",
                     "fuel_type", "vehicle_class", "vehicle_category", "registration_date",
                     "first_registration_date", "document_serial_no", "usage_purpose", "engine_capacity",
                     "engine_power", "net_weight", "max_loaded_weight", "seat_count", "standing_passenger_count"]


class Outcome(BaseModel):
    model_config = ConfigDict(extra="forbid", strict=True)
    key: VehicleKey
    corrected: bool
    originally_missing: bool
    confidence: float = Field(ge=0, le=1, allow_inf_nan=False)


class Feedback(BaseModel):
    model_config = ConfigDict(extra="forbid")
    request_id: UUID
    mode: Literal["fast", "detailed"]
    preprocessing: Literal["standard", "contrast"]
    engine_version: Literal["0.2.0", "0.3.0"]
    condition: Literal["unknown", "clear", "blur", "glare", "skew", "small", "mixed"] = "unknown"
    synthetic: bool = Field(strict=True)
    fields: list[Outcome] = Field(min_length=1, max_length=21)


class FeedbackStore:
    def __init__(self, path: Path):
        self.path = path

    def connect(self):
        self.path.parent.mkdir(parents=True, exist_ok=True)
        db = sqlite3.connect(self.path, timeout=10)
        db.execute("PRAGMA foreign_keys=ON")
        db.execute("""CREATE TABLE IF NOT EXISTS reviews (
          request_id TEXT PRIMARY KEY, mode TEXT NOT NULL, preprocessing TEXT NOT NULL,
          engine_version TEXT NOT NULL, synthetic INTEGER NOT NULL)""")
        if "condition" not in {row[1] for row in db.execute("PRAGMA table_info(reviews)")}:
            db.execute("ALTER TABLE reviews ADD COLUMN condition TEXT NOT NULL DEFAULT 'unknown'")
        db.execute("""CREATE TABLE IF NOT EXISTS outcomes (
          request_id TEXT NOT NULL REFERENCES reviews(request_id) ON DELETE CASCADE,
          field_key TEXT NOT NULL, corrected INTEGER NOT NULL, originally_missing INTEGER NOT NULL,
          confidence REAL NOT NULL, PRIMARY KEY(request_id,field_key))""")
        return db

    def save(self, feedback: Feedback):
        if len({f.key for f in feedback.fields}) != len(feedback.fields):
            raise ValueError("Aynı alan birden fazla gönderilemez.")
        with closing(self.connect()) as db, db:
            request_id = str(feedback.request_id)
            db.execute("DELETE FROM reviews WHERE request_id=?", (request_id,))
            db.execute("INSERT INTO reviews(request_id,mode,preprocessing,engine_version,synthetic,condition) VALUES (?,?,?,?,?,?)", (request_id, feedback.mode,
                       feedback.preprocessing, feedback.engine_version, int(feedback.synthetic), feedback.condition))
            db.executemany("INSERT INTO outcomes VALUES (?,?,?,?,?)", [
                (request_id, f.key, int(f.corrected), int(f.originally_missing), f.confidence)
                for f in feedback.fields])

    def stats(self, synthetic: bool = False):
        with closing(self.connect()) as db:
            count = db.execute("SELECT COUNT(*) FROM reviews WHERE synthetic=?", (int(synthetic),)).fetchone()[0]
            rows = db.execute("""SELECT field_key,COUNT(*),SUM(corrected),SUM(originally_missing),
                AVG(confidence),mode,preprocessing,engine_version,condition
                FROM outcomes JOIN reviews USING(request_id) WHERE synthetic=?
                GROUP BY field_key,mode,preprocessing,engine_version,condition ORDER BY field_key,mode,preprocessing,condition""",
                (int(synthetic),)).fetchall()
        return {"documents_reviewed": count, "synthetic": synthetic, "model_trained": False,
                "scope": "reviewed_fields_only", "rows": [{"key": r[0], "reviewed": r[1],
                "corrected": r[2], "originally_missing": r[3], "mean_confidence": round(r[4], 3),
                "mode": r[5], "preprocessing": r[6], "engine_version": r[7], "condition": r[8],
                "unchanged_rate": round((r[1]-r[2])/r[1], 4)} for r in rows]}
