from ruhsat.parser import BY_KEY, validate, reconcile


def record(key,value,confidence=.94):
    return {'key':key,'value':value,'raw_value':value,'confidence':confidence,
            'line_ids':[value],'issues':[],'alternatives':[], 'needs_review':False,'status':'read'}


def merge(key,first,second):
    a={'fields':[record(key,first)],'anchor_count':5,'document_recognized':True}
    b={'fields':[record(key,second,.86)],'anchor_count':5,'document_recognized':True}
    return reconcile(a,b)['fields'][0]


def test_standard_secondary_keeps_observed_conflict_and_requires_review():
    for key,a,b in [('color','sSIYAH','SİYAH'),
                    ('usage_purpose','YOLCU NAKLL - HUSUSİ','YOLCU NAKLİ - HUSUSİ'),
                    ('vehicle_category','OTOMOBİL-AC STEYIN','OTOMOBİL-AC STEYŞİN'),
                    ('document_serial_no','ABN123456','AB123456')]:
        result=merge(key,a,b)
        assert result['value']==b and result['raw_value']==b
        assert result['line_ids']==[b] and result['confidence']==.86
        assert result['alternatives'][0]['value']==a
        assert result['needs_review'] and result['agreement'] is False


def test_two_valid_descriptions_and_identifiers_keep_primary():
    for key,a,b in [('color','MAVİ','SİYAH'),('document_serial_no','AB123456','AC123456'),
                    ('vehicle_category','OTOMOBİL (AA SEDAN)','OTOMOBİL (AB HEÇBEK)'),
                    ('vehicle_category','OTOMOBİL','OTOMOBİL (AA SEDAN)'),
                    ('color','SİYAH (METALİK) BEYAZ','SİYAH'),
                    ('color','NAR ÇİÇEĞİ','KIRMIZI'),
                    ('document_serial_no','ABN123456','CD654321'),
                    ('vin','TEST1234567890123','TEST1234567890124'),
                    ('owner_name','SİYAH','MAVİ'),('kind','G5','C5')]:
        assert merge(key,a,b)['value']==a


def test_unusual_single_observation_is_not_guessed():
    assert validate(BY_KEY['document_serial_no'],'ABN123456')[0]=='ABN123456'
    assert validate(BY_KEY['usage_purpose'],'YOLCU NAKLL - HUSUSI')[0]=='YOLCU NAKLL - HUSUSİ'


def test_corrupt_coded_caption_is_rejected_without_rejecting_model_y():
    assert validate(BY_KEY['kind'],'(①.4) MODEL YULA')[0] is None
    assert validate(BY_KEY['kind'],'MODEL Y')[0]=='MODEL Y'


def test_preferred_observation_does_not_erase_other_original_alternatives():
    first=record('color','sSIYAH')
    first['alternatives']=[{'value':'MAVİ','confidence':.7,'line_ids':['third']}]
    a={'fields':[first],'anchor_count':5,'document_recognized':True}
    b={'fields':[record('color','SİYAH')],'anchor_count':5,'document_recognized':True}
    result=reconcile(a,b)['fields'][0]
    assert result['value']=='SİYAH'
    assert {x['value'] for x in result['alternatives']}=={'MAVİ','sSIYAH'}


def test_exact_joined_usage_phrase_restores_spaces_without_letter_guessing():
    assert validate(BY_KEY['usage_purpose'],'YOLCUNAKLI-HUSUSI')[0]=='YOLCU NAKLİ - HUSUSİ'
    assert validate(BY_KEY['usage_purpose'],'YUKNAKLI-TICARI')[0]=='YÜK NAKLİ - TİCARİ'
    assert validate(BY_KEY['usage_purpose'],'YOLCUNAXLI-HUSUSI')[0]=='YOLCUNAXLI - HUSUSİ'
    assert validate(BY_KEY['owner_surname'],'YOLCUNAKLI')[0]=='YOLCUNAKLI'


def test_known_color_descriptor_spelling_does_not_guess_bad_glyphs():
    assert validate(BY_KEY['color'],'GRI (TITANYUM)')[0]=='GRİ (TİTANYUM)'
    assert validate(BY_KEY['color'],'KIRMIZI (VISNE)')[0]=='KIRMIZI (VİŞNE)'
    assert validate(BY_KEY['color'],'KIRMIZI (VI$NE)')[0]=='KIRMIZI (VI$NE)'


def test_color_descriptor_spacing_keeps_words_and_other_fields_intact():
    assert validate(BY_KEY['color'],'BEYAZ(INCI)')[0]=='BEYAZ (İNCİ)'
    assert validate(BY_KEY['color'],'SIYAH ( METALIK ) BEYAZ')[0]=='SİYAH (METALİK) BEYAZ'
    assert validate(BY_KEY['color'],'KIRMIZI(VI$NE)')[0]=='KIRMIZI (VI$NE)'
    assert validate(BY_KEY['kind'],'MODEL(PLUS)')[0]=='MODEL(PLUS)'


def test_numeric_commercial_names_are_reviewable_not_discarded():
    for name in ['208','2008','500']:
        value,issues=validate(BY_KEY['kind'],name)
        assert value==name and issues
    for key in ['brand','color','vehicle_category']:
        assert validate(BY_KEY[key],'2008')[0] is None
    assert validate(BY_KEY['kind'],'123456789')[0] is None
