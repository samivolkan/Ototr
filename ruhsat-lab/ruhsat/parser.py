"""Conservative, spatial extraction. OCR evidence is never silently corrected.

Scores are ranking signals, NOT calibrated probabilities. Labels take priority
over historical field codes. Missing and conflicting values require review.
"""
from __future__ import annotations

import math
import re
import unicodedata
from dataclasses import dataclass
from datetime import date, datetime
from difflib import SequenceMatcher


def fold(text: str) -> str:
    text = text.translate(str.maketrans("ıİşŞğĞüÜöÖçÇ", "iIsSgGuUoOcC")).upper()
    return "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))


def same_value(one: str, two: str) -> bool:
    # Accent folding is for captions only. ÖRNEK and ORNEK are distinct readings.
    return unicodedata.normalize("NFC", one).casefold() == unicodedata.normalize("NFC", two).casefold()


@dataclass(frozen=True)
class Spec:
    key: str
    label: str
    aliases: tuple[str, ...]
    codes: tuple[str, ...] = ()
    kind: str = "text"
    group: str = "Araç bilgileri"


SPECS = [
    Spec("plate", "Plaka", ("TESCIL PLAKA NO", "PLAKA NO", "PLAKASI", "PLAKA"), ("A",), "plate"),
    Spec("vin", "Şasi numarası", ("SASI NUMARASI", "SASE NUMARASI", "SASI NO", "SASE NO", "SASI", "SASE"), ("E",), "vin"),
    Spec("brand", "Marka", ("MARKASI", "MARKA"), ("D.1",)),
    Spec("kind", "Ticari adı", ("TICARI ADI", "TICARI AD"), ("D.3",)),
    Spec("type", "Tipi", ("TIPI",), ("D.2",)),
    Spec("model_year", "Model yılı", ("MODEL YILI", "IMAL YILI"), ("D.4",), "year"),
    Spec("engine_no", "Motor numarası", ("MOTOR NUMARASI", "MOTOR NO"), ("P.5",), "engine"),
    Spec("color", "Renk", ("RENGI", "RENK"), ("R",)),
    Spec("fuel_type", "Yakıt cinsi", ("YAKIT CINSI", "YAKIT TURU", "YAKITI"), ("P.3",)),
    Spec("vehicle_class", "Araç sınıfı", ("ARAC SINIFI",), ("J",)),
    Spec("vehicle_category", "Cinsi", ("ARACIN CINSI", "CINSI"), ("D.5",)),
    Spec("registration_date", "Tescil tarihi", ("TESCIL TARIHI",), ("I", "D"), "date", "Tescil bilgileri"),
    Spec("first_registration_date", "İlk tescil tarihi", ("ILK TESCIL TARIHI",), ("B",), "date", "Tescil bilgileri"),
    Spec("document_serial_no", "Belge seri numarası", ("BELGE SERI NUMARASI", "BELGE SERI NO", "BELGE NO", "SERI NO"), ("N",), "serial", "Tescil bilgileri"),
    Spec("usage_purpose", "Kullanım amacı", ("KULLANIM AMACI", "KULLANIM SEKLI", "KULLANIS AMACI"), ("Y.3",)),
    Spec("engine_capacity", "Silindir hacmi · cm³", ("SILINDIR HACMI", "MOTOR HACMI"), ("P.1",), "number", "Teknik bilgiler"),
    Spec("engine_power", "Motor gücü · kW", ("MOTOR GUCU",), ("P.2",), "number", "Teknik bilgiler"),
    Spec("net_weight", "Net ağırlık · kg", ("NET AGIRLIGI", "NET AGIRLIK"), ("G.1",), "number", "Teknik bilgiler"),
    Spec("max_loaded_weight", "Azami yüklü ağırlık · kg", ("AZAMI YUKLU AGIRLIGI", "AZAMI YUKLU AGIRLIK"), ("F.1",), "number", "Teknik bilgiler"),
    Spec("seat_count", "Koltuk sayısı", ("KOLTUK SAYISI", "OTURMA YERI SAYISI"), ("S.1",), "integer", "Teknik bilgiler"),
    Spec("standing_passenger_count", "Ayakta yolcu sayısı", ("AYAKTA YOLCU SAYISI", "AYAKTA YOLCU"), ("S.2",), "integer", "Teknik bilgiler"),
    Spec("owner_name", "Sahibin adı", ("SAHIBININ ADI", "ADI"), ("C.1.2",), "text", "Sahip bilgileri"),
    Spec("owner_surname", "Soyadı / unvanı", ("SOYADI TICARI UNVANI", "SOYADI / TICARI UNVANI", "SOYADI VEYA TICARI UNVANI", "SOYADI", "TICARI UNVANI"), ("C.1.1",), "text", "Sahip bilgileri"),
    Spec("tc_or_tax_no", "T.C. / vergi numarası", ("T.C. KIMLIK NO", "TC KIMLIK NO", "T C KIMLIK NO", "VERGI NO", "KIMLIK NO"), ("Y.4",), "identity", "Sahip bilgileri"),
]
BY_KEY = {s.key: s for s in SPECS}
# These labels are boundaries only. Their values are never extracted as fields.
STOP_LABELS = ("ADRESI", "ADRES", "DIGER BILGILER", "HAK VE MENFAAT", "TIP ONAY NO", "TESCIL SIRA NO", "VERILDIGI IL", "NOTER", "ONAYLAYAN", "GECERLILIK SURESI")


def rect(line: dict) -> list[float]:
    points = line["box"]
    return [min(p[0] for p in points), min(p[1] for p in points), max(p[0] for p in points), max(p[1] for p in points)]


def find_labels(text: str) -> list[tuple[int, int, str]]:
    normalized = fold(text)
    found = []
    for spec in SPECS:
        for alias in spec.aliases:
            pattern = r"(?<![A-Z])" + re.escape(alias).replace(r"\ ", r"\s+") + r"(?![A-Z])"
            for match in re.finditer(pattern, normalized):
                found.append((match.start(), match.end(), spec.key))
    for alias in STOP_LABELS:
        for match in re.finditer(r"(?<![A-Z])" + re.escape(alias) + r"(?![A-Z])", normalized):
            found.append((match.start(), match.end(), "_stop"))
    # Long labels first prevents ADI from stealing TICARI ADI / SOYADI.
    kept = []
    for item in sorted(found, key=lambda x: x[1] - x[0], reverse=True):
        if not any(item[0] < other[1] and other[0] < item[1] for other in kept):
            kept.append(item)
    coded = re.match(r"^\s*\(\s*([A-Z](?:[.,]\d+){0,2})\s*\)\s*", normalized)
    if coded:
        code = coded[1].replace(",", ".")
        coded_spec = next((s for s in SPECS if code in s.codes), None)
        if coded_spec:
            tail = normalized[coded.end():]
            for alias in sorted(coded_spec.aliases, key=len, reverse=True):
                if len(alias) >= 5 and SequenceMatcher(None, tail[:len(alias)], alias).ratio() >= .80:
                    end = coded.end() + len(alias)
                    # A strong code+caption match resolves a partial label such
                    # as (B) lLK TESCIL TARIHI being mistaken for TESCIL TARIHI.
                    kept = [k for k in kept if k[0] >= end] + [(coded.start(), end, coded_spec.key)]
                    break
    if not kept:
        # Use codes only when the OCR box starts with a clear parenthesized code.
        m = re.match(r"^\s*\(\s*([A-Z](?:[.,]\d+){0,2})\s*\)", normalized)
        if m:
            code = m.group(1).replace(",", ".")
            for spec in SPECS:
                if code in spec.codes:
                    # OCR may corrupt one character in a caption. With a clear
                    # field code, consume the approximately matching caption too.
                    end = m.end()
                    tail = normalized[end:].lstrip(" :")
                    offset = len(normalized[end:]) - len(tail)
                    for alias in sorted(spec.aliases, key=len, reverse=True):
                        probe = tail[:len(alias)]
                        if len(probe) >= 4 and SequenceMatcher(None, probe, alias).ratio() >= .76:
                            end += offset + len(alias)
                            break
                    kept.append((m.start(), end, spec.key))
                    break
            if code in ("C.1.3", "Z.1", "Z.2", "Y.1", "Y.2", "K"):
                kept.append((m.start(), m.end(), "_stop"))
    return sorted(kept)


def clean(value: str) -> str:
    value = re.sub(r"^\s*[:;|.\-]+\s*", "", value)
    value = re.sub(r"\((?:SUR\.?\s*DAHIL|SURUCU DAHIL)\)", "", value, flags=re.I)
    return re.sub(r"\s+", " ", value).strip(" :;|\n")


def looks_like_address(value: str) -> bool:
    # This guard is supplementary to address-region exclusion below. Never
    # offer an obvious address as a vehicle field, including alternatives.
    return bool(re.search(r"\b(?:MAHALLESI|MAH|CADDESI|CAD|SOKAK|SOKAGI|SOK|SK|DAIRE)\b", fold(value)))


def validate(spec: Spec, raw: str) -> tuple[str | None, list[str]]:
    value = clean(raw)
    if not value or value in ("-", "—", ".", ":"):
        return None, []
    folded = fold(value)
    issues: list[str] = []
    if looks_like_address(value):
        return None, ["Adres benzeri metin alan önerisinden çıkarıldı."]
    if spec.key == "vehicle_class" and not re.fullmatch(r"[A-Z]{1,2}\d[A-Z0-9/\-]{0,8}", folded):
        return None, ["Araç sınıfı kodu okunamadı."]
    if spec.key == "fuel_type" and not re.search(r"\b(?:BENZIN\w*|DIZEL|MOTORIN|ELEKTRIK\w*|HIBRIT|HYBRID|LPG|CNG|LNG|HIDROJEN|ETANOL|METANOL)\b", folded):
        return None, ["Yakıt cinsi olarak tanınan bir değer okunamadı."]
    if spec.key == "usage_purpose" and (re.search(r"[0-9*]", folded) or not re.search(r"\b(?:HUSUSI|TICARI|RESMI|YOLCU|YUK|NAKLI|TASIMA|OKUL|SERVIS|AMBULANS|TAKSI|KIRALIK|OZEL)\b", folded)):
        return None, ["Kullanım şekli olarak tanınan bir değer okunamadı."]
    if spec.kind in ("plate", "vin", "engine", "identity", "serial"):
        value = re.sub(r"\s+", "", value).upper()
        folded = fold(value)
    if spec.kind == "plate":
        if not re.fullmatch(r"(?:0[1-9]|[1-7]\d|8[01])[A-Z]{1,3}\d{2,5}", folded):
            issues.append("Standart Türkiye plaka biçimiyle uyuşmuyor; özel plakayı elle kontrol edin.")
    elif spec.kind == "vin":
        if not re.fullmatch(r"[A-HJ-NPR-Z0-9]{17}", value):
            issues.append("Şasi 17 karakter ve I/O/Q içermeyen biçimde okunmadı. Eski/özel araçları elle kontrol edin.")
    elif spec.kind == "engine":
        if not re.search(r"[A-Z]", value) or not re.search(r"\d", value):
            return None, ["Motor numarası yerine farklı bir satır okunmuş olabilir."]
        if not re.fullmatch(r"[A-Z0-9*./\-]{4,30}", value):
            issues.append("Motor numarasının biçimini kontrol edin.")
    elif spec.kind == "serial":
        if not re.fullmatch(r"[A-Z]{1,4}\d{5,10}", value):
            issues.append("Belge seri numarasını kontrol edin.")
    elif spec.kind == "year":
        if not re.fullmatch(r"\d{4}", value) or not (1900 <= int(value) <= date.today().year + 1):
            issues.append("Model yılı geçerli aralıkta değil.")
    elif spec.kind == "date":
        match = re.fullmatch(r"(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})", value)
        try:
            if not match:
                raise ValueError()
            parsed = date(int(match[3]), int(match[2]), int(match[1]))
            value = parsed.isoformat()
            if parsed > date.today():
                issues.append("Tescil tarihi gelecekte görünüyor.")
        except ValueError:
            issues.append("Geçerli bir tarih okunamadı.")
    elif spec.kind in ("number", "integer"):
        value = re.sub(r"\s*(KG|KW|CM[³3]?|CC)\s*$", "", folded).strip().replace(",", ".")
        pattern = r"\d+" if spec.kind == "integer" else r"\d+(?:\.\d+)?"
        if not re.fullmatch(pattern, value):
            return None, ["Sayısal değer okunamadı; otomatik birim dönüşümü yapılmadı."]
        elif spec.kind == "integer" and int(value) > 200:
            issues.append("Yolcu/koltuk sayısı olağan aralığın dışında.")
    elif spec.kind == "identity":
        if not re.fullmatch(r"\d{10,11}", value):
            issues.append("T.C. / vergi numarası 10 veya 11 hane olarak okunmadı.")
        elif len(value) == 11:
            d = list(map(int, value))
            if d[0] == 0 or ((sum(d[0:9:2]) * 7 - sum(d[1:8:2])) % 10 != d[9]) or sum(d[:10]) % 10 != d[10]:
                issues.append("T.C. numarasının kontrol basamakları uyuşmuyor.")
    # Only canonicalize known category names, never identifiers or personal names.
    canonical = {
        "fuel_type": {"BENZIN": "BENZİN", "BENZINLI": "BENZİNLİ", "DIZEL": "DİZEL", "ELEKTRIK": "ELEKTRİK", "BENZIN/LPG": "BENZİN/LPG"},
        "vehicle_category": {"OTOMOBIL": "OTOMOBİL", "MOTOSIKLET": "MOTOSİKLET"},
        "usage_purpose": {"HUSUSI": "HUSUSİ", "TICARI": "TİCARİ", "RESMI": "RESMİ"},
    }
    if spec.key in canonical:
        value = canonical[spec.key].get(fold(value), value)
    if spec.kind == "text" and value.count("(") != value.count(")"):
        issues.append("Metin eksik okunmuş olabilir; parantezli açıklamayı fotoğrafla karşılaştırın.")
    return value, issues


def extract(lines: list[dict], image_width: int, image_height: int) -> dict:
    anchors, candidates = [], {s.key: [] for s in SPECS}
    line_map = {line["id"]: line for line in lines}
    for line in lines:
        labels = find_labels(line["text"])
        bounds = rect(line)
        for idx, (start, end, key) in enumerate(labels):
            x0, y0, x1, y1 = bounds
            start_x = x0 + (x1 - x0) * start / max(len(line["text"]), 1)
            next_start = labels[idx + 1][0] if idx + 1 < len(labels) else len(line["text"])
            anchor_end_x = x0 + (x1 - x0) * end / max(len(line["text"]), 1)
            anchors.append({"key": key, "line": line, "rect": [start_x, y0, anchor_end_x, y1]})
            tail = clean(line["text"][end:next_start])
            # Remove a trailing code belonging to the next label from inline values.
            tail = re.sub(r"\s*\([A-Z](?:[.,]\d+){0,2}\)\s*$", "", tail)
            if key != "_stop" and tail and not re.fullmatch(r"[()\s.:/\-]+", tail):
                candidates[key].append({"raw": tail, "score": line["score"], "ids": [line["id"]], "method": "inline", "priority": 1.0})

    # The address cell is not a source for ANY extracted field. Exclude its
    # unlabelled continuation lines, even if they resemble a name or a code.
    address_regions = []
    for anchor in anchors:
        caption = fold(anchor["line"]["text"])
        if anchor["key"] != "_stop" or not ("ADRES" in caption or re.search(r"C[.,]1[.,]3", caption)):
            continue
        x0, y0, x1, y1 = rect(anchor["line"])
        margin = max((y1-y0)*1.5, image_width*.02)
        below_anchors = [other["rect"][1] for other in anchors
                         if other is not anchor and other["rect"][1] > y1
                         and abs(rect(other["line"])[0]-x0) < image_width*.12]
        address_regions.append((x0-margin, y0, min(below_anchors, default=image_height)))
    private_line_ids = set()
    for line in lines:
        x0, y0, x1, y1 = rect(line)
        if any(x0 >= left and top <= (y0+y1)/2 < bottom for left, top, bottom in address_regions):
            private_line_ids.add(line["id"])
    for key in candidates:
        candidates[key] = [c for c in candidates[key] if not private_line_ids.intersection(c["ids"])]

    # Search within the same row or directly below, stopping at another label.
    for anchor in anchors:
        key = anchor["key"]
        if key == "_stop":
            continue
        ax0, ay0, ax1, ay1 = anchor["rect"]
        ah = max(ay1 - ay0, 8)
        acy = (ay0 + ay1) / 2
        options = []
        for line in lines:
            if line["id"] in private_line_ids or line["id"] == anchor["line"]["id"] or find_labels(line["text"]):
                continue
            x0, y0, x1, y1 = rect(line)
            lh = max(y1 - y0, 8)
            cy = (y0 + y1) / 2
            same_row = abs(cy - acy) < max(ah, lh) * 0.7 and x0 >= ax1 - ah * 0.3
            below = -min(ah, lh) * .48 < y0 - ay1 < max(ah * 3.8, image_height * 0.035) and cy > acy + ah * .5 and abs(x0 - ax0) < max(image_width * 0.075, ah * 3)
            if same_row and x0 - ax1 < image_width * 0.37:
                blocked = any(other is not anchor and abs((other["rect"][1] + other["rect"][3]) / 2 - acy) < ah and ax1 < other["rect"][0] < x0 for other in anchors)
                distance = max(0, x0 - ax1) / max(image_width, 1)
                priority = 0.96 - distance * 0.3
            elif below:
                blocked = any(other is not anchor and ay1 < other["rect"][1] < y1 and abs(other["rect"][0] - ax0) < max(image_width * 0.075, ah * 3) for other in anchors)
                distance = max(0, y0 - ay1) / max(ah, 1)
                priority = 0.94 - distance * 0.025
            else:
                continue
            if blocked:
                continue
            value, issues = validate(BY_KEY[key], line["text"])
            if value:
                options.append({"raw": line["text"], "score": min(line["score"], anchor["line"]["score"]), "ids": [line["id"]], "method": "right" if same_row else "below", "priority": priority - (0.25 if issues else 0)})
        if options:
            candidates[key].append(max(options, key=lambda c: c["priority"]))

    # Unlabelled VIN/plate candidates are suggestions only. Never promote to trusted.
    for spec in SPECS[:2]:
        if candidates[spec.key]:
            continue
        for line in lines:
            if line["id"] in private_line_ids or find_labels(line["text"]):
                continue
            value, issues = validate(spec, line["text"])
            if value and not issues:
                candidates[spec.key].append({"raw": line["text"], "score": line["score"], "ids": [line["id"]], "method": "pattern", "priority": 0.7})

    fields = []
    for spec in SPECS:
        normalized = []
        for candidate in candidates[spec.key]:
            value, issues = validate(spec, candidate["raw"])
            if not value:
                continue
            if spec.kind in ("year", "date", "number", "integer", "identity") and not re.search(r"\d", value):
                continue
            confidence = min(float(candidate["score"]), candidate["priority"])
            if issues:
                confidence = min(confidence, 0.65)
            normalized.append({**candidate, "value": value, "issues": issues, "confidence": round(confidence, 4)})
        normalized.sort(key=lambda c: c["confidence"], reverse=True)
        selected = normalized[0] if normalized else None
        alternatives = []
        if selected:
            for c in normalized[1:]:
                if not same_value(c["value"], selected["value"]) and c["value"] not in [a["value"] for a in alternatives]:
                    alternatives.append({"value": c["value"], "confidence": c["confidence"], "line_ids": c["ids"]})
        issues = list(selected["issues"]) if selected else []
        if alternatives:
            issues.append("Aynı alan için birden fazla farklı değer bulundu.")
        if selected and selected["method"] == "pattern":
            issues.append("Alan etiketi bulunamadı; biçime göre önerildi.")
        threshold = 0.95 if spec.key == "vin" else 0.90
        confidence = selected["confidence"] if selected else 0.0
        needs_review = not selected or confidence < threshold or bool(issues)
        fields.append({"key": spec.key, "label": spec.label, "group": spec.group,
                       "value": selected["value"] if selected else None,
                       "raw_value": selected["raw"] if selected else None,
                       "confidence": confidence, "threshold": threshold,
                       "status": "missing" if not selected else "review" if needs_review else "read",
                       "needs_review": needs_review, "issues": issues,
                       "line_ids": selected["ids"] if selected else [], "alternatives": alternatives,
                       "method": selected["method"] if selected else None})

    # Cross-field contradictions must be surfaced even with high OCR scores.
    by_key = {f["key"]: f for f in fields}
    first, registered = by_key["first_registration_date"], by_key["registration_date"]
    if first["value"] and registered["value"] and not first["issues"] and not registered["issues"] and first["value"] > registered["value"]:
        for field in (first, registered):
            field["issues"].append("İlk tescil tarihi, tescil tarihinden sonra görünüyor.")
            field["needs_review"], field["status"] = True, "review"
    anchor_count = len({a["key"] for a in anchors if a["key"] != "_stop"})
    recognized = anchor_count >= 3
    if not recognized:
        for field in fields:
            if field["value"]:
                field["issues"].append("Belge ruhsat olarak yeterince doğrulanamadı.")
                field["needs_review"], field["status"] = True, "review"
    return {"fields": fields, "anchor_count": anchor_count, "document_recognized": recognized}


def reconcile(primary: dict, secondary: dict) -> dict:
    """Independent model disagreement forces human review; no majority invention."""
    for one, two in zip(primary["fields"], secondary["fields"]):
        if not one["value"] and two["value"]:
            one.update(two)
            one["issues"].append("Yalnız ikinci okumada bulundu.")
            one["needs_review"], one["status"] = True, "review"
        elif one["value"] and two["value"]:
            if same_value(one["value"], two["value"]):
                one["agreement"] = True
            else:
                one["agreement"] = False
                one["alternatives"].append({"value": two["value"], "confidence": two["confidence"], "line_ids": two["line_ids"]})
                one["issues"].append("İki OCR modeli farklı okudu; fotoğraftan karşılaştırın.")
                one["needs_review"], one["status"] = True, "review"
    primary["anchor_count"] = max(primary["anchor_count"], secondary["anchor_count"])
    primary["document_recognized"] = primary["document_recognized"] or secondary["document_recognized"]
    return primary
