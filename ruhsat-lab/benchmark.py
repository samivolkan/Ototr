"""Small synthetic robustness check, not a production accuracy benchmark."""
import io
import json
import socket
import sys
import cv2
import numpy as np
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter
from ruhsat.engine import OCRService

ROOT = Path(__file__).resolve().parent


def no_network(*args, **kwargs):
    raise AssertionError("Unexpected network connection")


def main():
    socket.socket.connect = no_network
    service = OCRService(); service.initialize()
    assert service.status == "ready", service.error
    source = Image.open(ROOT / "web/sample.png").convert("RGB")
    expected = json.loads((ROOT / "tests/fixtures/expected.json").read_text(encoding="utf-8"))
    other = Image.new("RGB", (1400, 700), "white")
    d = ImageDraw.Draw(other)
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 32)
    rows = ["KURGUSAL TEST / RESMI BELGE DEGILDIR", "PLAKA: 34 ABC 987", "SASI NO: TEST9876543210123", "MARKASI: TOYOTA", "TICARI ADI: COROLLA", "MODEL YILI: 2019", "MOTOR NO: ABC987654", "YAKIT CINSI: DIZEL"]
    for i, row in enumerate(rows):
        d.text((60, 40 + i * 75), row, font=font, fill="#172d3b")
    matrix=cv2.getPerspectiveTransform(np.float32([[0,0],[1699,0],[1699,1319],[0,1319]]),np.float32([[140,70],[1780,160],[1850,1440],[80,1370]]))
    skewed=Image.fromarray(cv2.warpPerspective(np.array(source),matrix,(1950,1530),borderValue=(65,75,80)))
    cases = [
        ("jpeg_quality_65", source, expected, "JPEG", {"quality":65}, "detailed"),
        ("rotated_90", source.rotate(90,expand=True), expected, "PNG", {}, "fast"),
        ("rotated_180", source.rotate(180,expand=True), expected, "PNG", {}, "fast"),
        ("rotated_270", source.rotate(270,expand=True), expected, "PNG", {}, "fast"),
        ("alternate_inline_layout", other, {"plate":"34ABC987", "vin":"TEST9876543210123", "brand":"TOYOTA", "kind":"COROLLA", "model_year":"2019", "engine_no":"ABC987654", "fuel_type":"DİZEL"}, "PNG", {}, "detailed"),
        ("blank", Image.new("RGB",(1000,700),"white"), {}, "PNG", {}, "fast"),
        ("perspective", skewed, expected, "JPEG", {"quality":85}, "detailed"),
    ]
    if len(sys.argv)>1:
        cases=[c for c in cases if c[0]==sys.argv[1]]
        assert cases, "Unknown case"
    report = []
    for name, image, labels, fmt, opts, mode in cases:
        data=io.BytesIO();image.save(data,format=fmt,**opts)
        result=service.analyze(data.getvalue(),mode,0,name=="perspective",True)
        got={**result["analysed"]["Data"], **{f["key"]: f["value"] for f in result["seller_suggestion"]["fields"]}}
        item={"case":name,"expected_fields":len(labels),"exact_fields":sum(got[k]==v for k,v in labels.items()),
              "seconds":result["elapsed_seconds"],"rotation":result["image"]["rotation"],"perspective_corrected":result["image"]["perspective_corrected"],
              "mismatches":{k:{"expected":v,"actual":got[k]} for k,v in labels.items() if got[k]!=v},
              "populated":sum(v is not None for v in got.values()),"warnings":result["warnings"]}
        report.append(item)
        print(json.dumps(item,ensure_ascii=True),flush=True)
        if name=="blank":
            assert item["populated"]==0
        (ROOT / "test-results" / f"{name}.json").write_text(json.dumps({"fields":result["fields"],"lines":result["lines"],"image_size":[result["image"]["width"],result["image"]["height"]]},ensure_ascii=False),encoding="utf-8")
    report_path=ROOT / "test-results/benchmark.json"
    if len(sys.argv)>1 and report_path.exists():
        report=[r for r in json.loads(report_path.read_text(encoding="utf-8")) if r["case"]!=sys.argv[1]]+report
    report_path.write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")


if __name__=="__main__":
    main()
