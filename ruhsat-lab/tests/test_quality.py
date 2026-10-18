from copy import deepcopy
from PIL import Image
from ruhsat.quality import apply_thresholds, prepare_image


def test_thresholds_never_override_conflicts_or_image_warnings():
    original = {'document_recognized': True, 'fields': [
        {'key':'plate','value':'16TST123','confidence':.89,'issues':[]},
        {'key':'vin','value':'TEST1234567890123','confidence':.93,'issues':[]},
        {'key':'engine_no','value':'X1','confidence':.99,'issues':['conflict']},
        {'key':'color','value':None,'confidence':0,'issues':[]}], 'summary':{}}
    high=apply_thresholds(deepcopy(original),.90,.95)
    assert all(f['needs_review'] for f in high['fields'])
    low=apply_thresholds(deepcopy(original),.50,.90)
    assert [f['needs_review'] for f in low['fields']]==[False,False,True,True]
    original['warnings']=['Blurred']
    assert all(f['needs_review'] for f in apply_thresholds(original,.5,.5)['fields'])


def test_preprocessing_changes_pixels_without_moving_evidence():
    image=Image.linear_gradient('L').resize((200,100)).point(lambda p:100+p//5).convert('RGB')
    changed=prepare_image(image,'contrast')
    assert changed.size==image.size and changed.mode==image.mode
    assert changed.tobytes()!=image.tobytes()
    assert prepare_image(image,'standard') is image
