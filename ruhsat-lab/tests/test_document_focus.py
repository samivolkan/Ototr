import io
from types import SimpleNamespace
from PIL import Image
from ruhsat.engine import OCRService, document_region


def rows(prefix, x=300, y=400, plate="16 TST 123", omit_vin=False):
    texts=[f"PLAKA: {plate}", "SASI NO: TEST1234567890123", "MARKASI: TEST",
           "MODEL YILI: 2020", "RENGI: BEYAZ", "YAKIT CINSI: DIZEL"]
    return [dict(id=f"{prefix}-{i}",text=text,score=.99,
                 box=[[x,y+i*50],[x+300,y+i*50],[x+300,y+i*50+20],[x,y+i*50+20]])
            for i,text in enumerate(texts) if not (omit_vin and i==1)]


class FakeService(OCRService):
    def __init__(self, conflict=False, lose_vin=False):
        super().__init__()
        self.conflict=conflict
        self.lose_vin=lose_vin

    def orientation(self,image,lines):
        return 0

    def read_upright(self,image,model,prefix,detected=None):
        return self.read(image,model,prefix)

    def read(self,image,model,prefix):
        if image.size==(1600,1600):
            return rows(prefix)
        return rows(prefix,30,30,"16 TST 124" if self.conflict else "16 TST 123",self.lose_vin)


def document():
    data=io.BytesIO()
    Image.new("RGB",(1600,1600),"white").save(data,format="PNG")
    return data.getvalue()


def test_focus_requires_caption_evidence_and_significant_background():
    assert document_region(Image.new("RGB",(1600,1600)),rows('a'))
    assert document_region(Image.new("RGB",(1600,1600)),rows('a')[:3]) is None
    assert document_region(Image.new("RGB",(360,340)),rows('a',10,10)) is None


def test_focused_preview_is_lossless_and_boxes_share_the_same_coordinates():
    result=FakeService(conflict=True).analyze(document(),"detailed",0,False,True)
    assert result["image"]["document_crop"] is not None
    assert result["image"]["preview"].startswith("data:image/png;base64,")
    plate=next(f for f in result["fields"] if f["key"]=="plate")
    assert plate["value"]=="16TST124" and plate["needs_review"]
    assert any(a["value"]=="16TST123" for a in plate["alternatives"])
    assert any("yakınlaştırması" in issue for issue in plate["issues"])
    original=[l for l in result["lines"] if l["id"].startswith("original-")]
    assert original
    for line in original:
        assert all(0<=x<=result["image"]["width"] and 0<=y<=result["image"]["height"] for x,y in line["box"])


def test_focus_cannot_discard_an_already_read_critical_identifier():
    result=FakeService(lose_vin=True).analyze(document(),"fast",0,False,True)
    assert result["image"]["document_crop"] is None
    assert result["analysed"]["Data"]["vin"]=="TEST1234567890123"


def test_upright_recognition_reuses_boxes_without_rotating_numeric_cells():
    class Model:
        def text_rec(self,args):
            assert len(args.img)==1
            return SimpleNamespace(txts=['999'],scores=[.99])
        def __call__(self,*args,**kwargs):
            raise AssertionError('Detection and line classification must not repeat')
    service=OCRService();service.models={'v5':Model()}
    detected=[dict(id='a-0',text='666',score=.99,box=[[10,10],[100,10],[100,40],[10,40]])]
    output=service.read_upright(Image.new('RGB',(200,100)),'v5','a',detected=detected)
    assert output[0]['text']=='999' and output[0]['box']==detected[0]['box']


class RecoveryService(FakeService):
    def __init__(self, outside=False):
        super().__init__()
        self.outside=outside
        self.full_secondary_reads=0

    def read(self,image,model,prefix):
        result=super().read(image,model,prefix)
        if image.size==(1600,1600) and model=='v6':
            self.full_secondary_reads+=1
            x=1200 if self.outside else 330
            for i,text in enumerate(['ARAC SINIFI: M1','ADI: KURGUSAL']):
                result.append(dict(id=f'{prefix}-extra-{i}',text=text,score=.98,
                                   box=[[x,550+i*30],[x+200,550+i*30],
                                        [x+200,570+i*30],[x,570+i*30]]))
        return result


def test_missing_focused_field_recovers_observed_full_frame_evidence_for_review():
    service=RecoveryService()
    result=service.analyze(document(),'detailed',0,False,True)
    field=next(f for f in result['fields'] if f['key']=='vehicle_class')
    assert field['value']=='M1' and field['needs_review'] and field['status']=='review'
    assert service.full_secondary_reads==1
    evidence=[l for l in result['lines'] if l['id'] in field['line_ids']]
    assert evidence and all(l['id'].startswith('full-b-') for l in evidence)
    assert all(0<=x<=result['image']['width'] and 0<=y<=result['image']['height']
               for l in evidence for x,y in l['box'])
    assert not any(f['value'] for f in result['seller_suggestion']['fields'])
    assert not any('KURGUSAL' in l['text'] for l in result['lines'])


def test_recovery_rejects_evidence_outside_preview_and_fast_mode_does_not_retry():
    result=RecoveryService(outside=True).analyze(document(),'detailed',0,False,True)
    assert result['analysed']['Data']['vehicle_class'] is None
    service=RecoveryService()
    result=service.analyze(document(),'fast',0,False,True)
    assert service.full_secondary_reads==0
    assert result['analysed']['Data']['vehicle_class'] is None
