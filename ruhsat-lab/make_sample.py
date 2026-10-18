"""Synthetic OCR fixture, not an official document or an identity document."""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent
VALUES = [
    ("plate", "(A) PLAKA", "16 TST 123", "16TST123"),
    ("first_registration_date", "(B) İLK TESCİL TARİHİ", "15.06.2021", "2021-06-15"),
    ("registration_date", "(I) TESCİL TARİHİ", "20.08.2024", "2024-08-20"),
    ("brand", "(D.1) MARKASI", "RENAULT", "RENAULT"),
    ("kind", "(D.3) TİCARİ ADI", "MEGANE", "MEGANE"),
    ("type", "(D.2) TİPİ", "RFB", "RFB"),
    ("model_year", "(D.4) MODEL YILI", "2021", "2021"),
    ("vehicle_class", "(J) ARAÇ SINIFI", "M1", "M1"),
    ("vehicle_category", "(D.5) CİNSİ", "OTOMOBİL", "OTOMOBİL"),
    ("color", "(R) RENGİ", "BEYAZ", "BEYAZ"),
    ("vin", "(E) ŞASİ NO", "TEST1234567890123", "TEST1234567890123"),
    ("engine_no", "(P.5) MOTOR NO", "H5H123456", "H5H123456"),
    ("fuel_type", "(P.3) YAKIT CİNSİ", "BENZİN", "BENZİN"),
    ("engine_capacity", "(P.1) SİLİNDİR HACMİ", "1332", "1332"),
    ("engine_power", "(P.2) MOTOR GÜCÜ", "103", "103"),
    ("net_weight", "(G.1) NET AĞIRLIĞI", "1320", "1320"),
    ("max_loaded_weight", "(F.1) AZAMİ YÜKLÜ AĞIRLIĞI", "1840", "1840"),
    ("seat_count", "(S.1) KOLTUK SAYISI", "5", "5"),
    ("standing_passenger_count", "(S.2) AYAKTA YOLCU SAYISI", "0", "0"),
    ("usage_purpose", "(Y.3) KULLANIM AMACI", "HUSUSİ", "HUSUSİ"),
    ("document_serial_no", "(N) BELGE SERİ NO", "ZZ 123456", "ZZ123456"),
    ("owner_name", "(C.1.2) ADI", "DENEME", "DENEME"),
    ("owner_surname", "(C.1.1) SOYADI", "ÖRNEK", "ÖRNEK"),
]


def main():
    fonts = Path("C:/Windows/Fonts")
    label = ImageFont.truetype(str(fonts / "arial.ttf"), 23)
    value = ImageFont.truetype(str(fonts / "arialbd.ttf"), 33)
    title = ImageFont.truetype(str(fonts / "arialbd.ttf"), 38)
    image = Image.new("RGB", (1700, 1320), "#f4f1e8")
    draw = ImageDraw.Draw(image)
    draw.rounded_rectangle((30, 30, 1670, 1290), radius=12, fill="#fffcf6", outline="#afbac0", width=2)
    draw.text((65, 62), "OTOTR / KURGUSAL OCR TEST BELGESİ", font=title, fill="#223745")
    draw.text((65, 117), "RESMİ BELGE DEĞİLDİR. Bütün değerler yazılım testi için üretilmiştir.", font=label, fill="#996344")
    draw.line((65, 165, 1635, 165), fill="#bdc7ca", width=2)
    for index, (_, caption, text, _) in enumerate(VALUES):
        column, row = divmod(index, 12)
        x, y = 65 + column * 805, 195 + row * 86
        draw.text((x, y), caption, font=label, fill="#526d79")
        draw.text((x, y + 28), text, font=value, fill="#192d39")
        draw.line((x, y + 73, x + 750, y + 73), fill="#dedfd7", width=1)
    draw.text((870, 1222), "T.C. / vergi no bu örnekte yoktur.", font=label, fill="#996344")
    target = ROOT / "web"
    target.mkdir(exist_ok=True)
    image.save(target / "sample.png")
    fixtures = ROOT / "tests" / "fixtures"
    fixtures.mkdir(parents=True, exist_ok=True)
    (fixtures / "expected.json").write_text(json.dumps({key: expected for key, _, _, expected in VALUES}, ensure_ascii=False, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
