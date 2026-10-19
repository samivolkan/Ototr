from ruhsat.parser import BY_KEY, extract, find_labels, reconcile, validate


def line(text, x=10, y=10, w=220, h=20, idx=0, score=.98):
    return {"id": str(idx), "text": text, "score": score, "box": [[x,y],[x+w,y],[x+w,y+h],[x,y+h]]}


def field(lines,key):
    return next(f for f in extract(lines,1000,1000)["fields"] if f["key"]==key)


def test_long_labels_take_priority():
    assert [m[2] for m in find_labels("(B) İLK TESCİL TARİHİ")] == ["first_registration_date"]
    assert [m[2] for m in find_labels("(D.3) TİCARİ ADI")] == ["kind"]
    assert [m[2] for m in find_labels("(C.1.1) SOYADI / TİCARİ UNVANI")] == ["owner_surname"]


def test_turkish_character_label_matching():
    assert find_labels("ŞASİ NO")[0][2] == "vin"
    assert find_labels("SASE NO")[0][2] == "vin"


def test_adjacent_columns_do_not_mix():
    lines=[line("PLAKA",x=10,y=10,w=100,idx=0),line("16 TST 123",x=10,y=38,idx=1),
           line("MARKASI",x=600,y=10,w=100,idx=2),line("RENAULT",x=600,y=38,idx=3)]
    assert field(lines,"plate")["value"]=="16TST123"
    assert field(lines,"brand")["value"]=="RENAULT"


def test_numeric_commercial_name_stays_in_its_cell_and_requires_review():
    rows=[line('(D.3) TICARI ADI',x=20,y=100,w=200,idx=0),
          line('2008',x=20,y=130,w=70,idx=1),
          line('(D.4) MODEL YILI',x=550,y=100,w=200,idx=2),
          line('2020',x=550,y=130,w=70,idx=3)]
    result=field(rows,'kind')
    assert result['value']=='2008' and result['needs_review']
    assert field(rows,'model_year')['value']=='2020'
    assert field([r for r in rows if r['id']!='1'],'kind')['value'] is None


def test_slanted_caption_overlap_keeps_lower_fuel_value_not_upper_value():
    rows=[line('(P.3) YAKIT CINSI',x=293,y=990,w=198,h=62,idx=0),
          line('BENZINLI',x=344,y=1015,w=128,h=48,idx=1),
          line('(Y.3) KULLANIM AMACI',x=298,y=1054,w=263,h=65,idx=2),
          line('DIZEL',x=344,y=960,w=128,h=28,idx=3)]
    assert field(rows,'fuel_type')['value']=='BENZİNLİ'
    assert field([r for r in rows if r['id']!='1'],'fuel_type')['value'] is None


def test_next_label_blocks_missing_value():
    lines=[line("PLAKA",idx=0),line("MARKASI",y=35,idx=1),line("RENAULT",y=62,idx=2)]
    assert field(lines,"plate")["value"] is None


def test_never_repairs_vin_character_silently():
    bad="TEST123456789O123"
    value,issues=validate(BY_KEY["vin"],bad)
    assert value==bad and issues


def test_unique_unlabelled_vin_is_review_only():
    result=field([line("TEST1234567890123")],"vin")
    assert result["value"]=="TEST1234567890123" and result["needs_review"]


def test_conflicting_vins_require_review():
    lines=[line("ŞASİ NO: TEST1234567890123",idx=0),line("ŞASİ NO: TEST1234567890124",y=100,idx=1)]
    result=field(lines,"vin")
    assert result["needs_review"] and len(result["alternatives"])==1


def test_invalid_date_and_future_year():
    assert validate(BY_KEY["registration_date"],"31.02.2024")[1]
    assert validate(BY_KEY["model_year"],"9999")[1]
    assert validate(BY_KEY["registration_date"],"15/06/2021")[0]=="2021-06-15"


def test_zero_passengers_is_a_value():
    assert field([line("AYAKTA YOLCU SAYISI: 0")],"standing_passenger_count")["value"]=="0"


def test_no_address_field_and_address_does_not_become_name():
    lines=[line("ADI",idx=0),line("ADRESİ",y=35,idx=1),line("TEST MAHALLESİ",y=60,idx=2)]
    assert "address" not in BY_KEY
    assert field(lines,"owner_name")["value"] is None


def test_two_models_disagree():
    one=extract([line("PLAKA: 16 TST 123")],1000,1000)
    two=extract([line("PLAKA: 16 TST 124")],1000,1000)
    output=reconcile(one,two)
    plate=next(f for f in output["fields"] if f["key"]=="plate")
    assert plate["value"]=="16TST123" and plate["needs_review"] and plate["agreement"] is False


def test_empty_document_does_not_invent_fields():
    result=extract([],1000,1000)
    assert not result["document_recognized"]
    assert all(f["value"] is None for f in result["fields"])


def test_overlapping_ocr_boxes_still_pair_below_values():
    lines=[line("(D.1) MARKASI",x=58,y=447,w=174,h=38,idx=0),
           line("RENAULT",x=62,y=480,w=168,h=36,idx=1)]
    assert field(lines,"brand")["value"]=="RENAULT"


def test_corrupted_caption_with_explicit_code_is_not_value():
    assert find_labels("(F.1) AZAMi YÜKLÜ AČIRLIğI")[0][2]=="max_loaded_weight"
    lines=[line("(F.1) AZAMi YÜKLÜ AČIRLIğI",idx=0),line("1840",y=35,idx=1)]
    assert field(lines,"max_loaded_weight")["value"]=="1840"
    assert find_labels("(D.3) TÍCARi ADI")[0][2]=="kind"


def test_first_registration_is_not_stolen_by_shorter_caption():
    assert find_labels("(B) lLK TESCIL TARIHI")[0][2]=="first_registration_date"


def test_name_diacritics_are_not_falsely_called_agreement():
    one=extract([line("SOYADI: ÖRNEK")],1000,1000)
    two=extract([line("SOYADI: ORNEK")],1000,1000)
    surname=next(f for f in reconcile(one,two)["fields"] if f["key"]=="owner_surname")
    assert surname["agreement"] is False and surname["alternatives"][0]["value"]=="ORNEK"


def test_address_cannot_become_vehicle_field_or_alternative():
    import json
    fake_address = "KURGUSAL MAH. DENEME SK. NO:99"
    for spec in BY_KEY.values():
        assert validate(spec, fake_address)[0] is None
    rows = [line("ARAC SINIFI", x=300, y=100, w=110, idx=0),
            line(fake_address, x=440, y=100, w=350, idx=1),
            line("M1", x=300, y=125, w=40, idx=2)]
    result = extract(rows, 1000, 1000)
    assert fake_address not in json.dumps(result, ensure_ascii=False)
    assert next(f for f in result["fields"] if f["key"] == "vehicle_class")["value"] == "M1"


def test_address_continuation_without_address_keywords_is_excluded():
    rows = [line("MARKASI", x=300, y=135, w=100, idx=0),
            line("(C.1.3) ADRESI", x=450, y=100, w=180, idx=1),
            line("KURGUSAL SEHIR", x=450, y=135, w=170, idx=2),
            line("(Z.1) DIGER BILGILER", x=450, y=210, w=220, idx=3)]
    assert field(rows, "brand")["value"] is None


def test_unrelated_captions_are_not_vehicle_values():
    for key, text in [("fuel_type", "(Q) GUC AGIRLIK ORANI"),
                      ("usage_purpose", "e1*2018/858*99999*01"),
                      ("engine_no", "VE MENFAAT BULUNANLAR"),
                      ("engine_capacity", "CM2")]:
        value, issues = validate(BY_KEY[key], text)
        assert value is None and issues
    assert validate(BY_KEY["usage_purpose"], "YOLCU NAKLI - HUSUSI")[0]
    assert validate(BY_KEY["fuel_type"], "BENZINLI")[0] == "BENZİNLİ"


def test_truncated_category_is_flagged_for_review():
    value, issues = validate(BY_KEY["vehicle_category"], "OTOMOBIL (AF")
    assert value == "OTOMOBİL (AF" and issues


def test_skewed_overlapping_boxes_and_centered_values():
    lines=[line('MARKASI',x=100,y=200,w=150,h=35,idx=1),line('RENAULT',x=115,y=230,w=130,h=35,idx=2),line('TİCARİ ADI',x=100,y=254,w=170,h=35,idx=3),line('TESCİL TARİHİ',x=500,y=200,w=190,h=35,idx=4),line('13/07/2023',x=560,y=230,w=130,h=35,idx=5),line('MOTOR NO',x=100,y=400,w=150,h=35,idx=6),line('ABC1234567',x=270,y=440,w=180,h=35,idx=7)]
    assert field(lines,'brand')['value']=='RENAULT'
    assert field(lines,'engine_no')['value']=='ABC1234567'


def test_serial_caption_inline_and_split_boxes():
    assert field([line('Seri: GS Ne 123456')],'document_serial_no')['value']=='GS123456'
    lines=[line('Seri: GS No',x=600,y=900,w=110,idx=1),line('123456',x=715,y=900,w=90,idx=2)]
    assert field(lines,'document_serial_no')['value']=='GS123456'
    assert field([line('Seri: GS No')],'document_serial_no')['value'] is None


def test_fuzzy_caption_never_extends_past_text():
    assert find_labels('(A) PLAKA')[0][1]<=len('(A) PLAKA')


def test_wrapped_category_with_skew_and_overlapping_boxes():
    lines=[line('(D.5) CİNSİ',x=233,y=399,w=136,h=45,idx=1),line('OTOMOBIL (AB',x=337,y=420,w=219,h=60,idx=2),line('HECBEK)',x=228,y=453,w=128,h=38,idx=3),line('(R) RENGI',x=593,y=422,w=128,h=45,idx=4),line('(P.5) MOTOR NO',x=234,y=479,w=191,h=47,idx=5)]
    assert field(lines,'vehicle_category')['value']=='OTOMOBİL (AB HEÇBEK)'


def test_separate_serial_number_marker_is_not_an_extra_letter():
    assert validate(BY_KEY['document_serial_no'],'HH N 123456')[0]=='HH123456'
    assert validate(BY_KEY['document_serial_no'],'HHN123456')[0]=='HHN123456'


def test_short_caption_with_field_code_keeps_cell_left_edge():
    lines=[line('(D.2) TİPİ',x=57,y=615,w=116,h=42,idx=1),line('RFB',x=57,y=648,w=84,h=45,idx=2)]
    assert field(lines,'type')['value']=='RFB'


def test_only_known_vehicle_terms_receive_turkish_spelling():
    from ruhsat.parser import NORMALIZED_NOTE
    value, issues = validate(BY_KEY['usage_purpose'], 'YOLCU NAKLI - HUSUSI')
    assert value == 'YOLCU NAKLİ - HUSUSİ' and NORMALIZED_NOTE in issues
    value, issues = validate(BY_KEY['vehicle_category'], 'OTOMOBIL (AB HECBEK)')
    assert value == 'OTOMOBİL (AB HEÇBEK)' and NORMALIZED_NOTE in issues
    assert validate(BY_KEY['usage_purpose'], 'YOLCU NAKLİ - HUSUSİ')[1] == []
    for key in ['owner_name','owner_surname','brand','kind','type']:
        assert validate(BY_KEY[key], 'HUSUSI')[0] == 'HUSUSI'
    assert validate(BY_KEY['vin'], 'VF1TEST00000000000')[0] == 'VF1TEST00000000000'
    assert validate(BY_KEY['vehicle_category'], 'OTOMOBİL (AB BİLİNMEYEN)')[0] == 'OTOMOBİL (AB BİLİNMEYEN)'


def test_normalized_field_retains_source_and_requires_review():
    result = field([line('KULLANIM AMACI: YOLCU NAKLI - HUSUSI')], 'usage_purpose')
    assert result['value'] == 'YOLCU NAKLİ - HUSUSİ'
    assert result['raw_value'] == 'YOLCU NAKLI - HUSUSI'
    assert result['needs_review'] and result['issues']


def test_date_cannot_be_a_vehicle_type():
    assert validate(BY_KEY['type'], '13/07/2023')[0] is None
    assert validate(BY_KEY['type'], '123')[0] == '123'


def test_only_exact_known_body_description_can_complete_punctuation():
    assert validate(BY_KEY['vehicle_category'], 'OTOMOBIL (AB HECBEK')[0] == 'OTOMOBİL (AB HEÇBEK)'
    assert validate(BY_KEY['vehicle_category'], 'OTOMOBIL (AB HECBEKI')[0] == 'OTOMOBİL (AB HECBEKI'
    assert validate(BY_KEY['usage_purpose'], 'YOLCU NAKLI-HUSUSI')[0] == 'YOLCU NAKLİ - HUSUSİ'


def test_numeric_engine_serials_are_allowed_but_short_measurements_are_not():
    assert validate(BY_KEY['engine_no'],'1234567890') == ('1234567890',[])
    assert validate(BY_KEY['engine_no'],'000012345678901234567890')[0] == '000012345678901234567890'
    for text in ['159','2145','0','MOTOR NO 1234567890']:
        assert validate(BY_KEY['engine_no'],text)[0] is None


def test_old_category_without_parentheses_joins_its_wrapped_body_description():
    rows=[line('(D.5) CINSI',x=100,y=100,w=120,idx=1),
          line('OTOMOBIL-AC',x=210,y=110,w=180,h=30,idx=2),
          line('STEYSIN',x=100,y=139,w=130,idx=3),
          line('(P.5) MOTOR NO',x=100,y=170,w=200,idx=4)]
    assert field(rows,'vehicle_category')['value']=='OTOMOBİL-AC STEYŞİN'
    assert validate(BY_KEY['vehicle_category'],'STEYSIN')[0] is None
    assert validate(BY_KEY['vehicle_category'],'(Q) GUC AGIRLIK ORANI')[0] is None


def test_missing_commercial_caption_is_a_low_confidence_layout_suggestion():
    rows=[line('MARKASI',x=100,y=100,w=150,idx=1),line('TIPI',x=500,y=110,w=100,idx=2),
          line('MODEL YILI',x=500,y=200,w=150,idx=3),line('PUMA',x=100,y=223,w=70,idx=4),
          line('CINSI',x=100,y=255,w=100,idx=5)]
    result=field(rows,'kind')
    assert result['value']=='PUMA' and result['method']=='layout'
    assert result['needs_review'] and result['confidence']<=.75
    assert any('çevredeki' in issue for issue in result['issues'])
    assert field(rows[:-1],'kind')['value'] is None


def test_hybrid_fuel_keeps_descriptive_text_and_turkish_spelling():
    assert validate(BY_KEY['fuel_type'],'BENZINLI (NOVC-HEV)')[0]=='BENZİNLİ (NOVC-HEV)'
    assert validate(BY_KEY['fuel_type'],'BENZIN - ELEKTRIK')[0]=='BENZİN - ELEKTRİK'


def test_grouped_measurements_do_not_become_decimal_litres_or_change_power():
    assert validate(BY_KEY['engine_capacity'],'1.597 cm3')[0]=='1597'
    assert validate(BY_KEY['engine_capacity'],'1,598')[0]=='1598'
    assert validate(BY_KEY['engine_capacity'],'0')[0]=='0'
    assert validate(BY_KEY['engine_power'],'1.597')[0]=='1.597'


def test_corrupt_short_caption_is_not_the_type_value():
    rows=[line('(D.2) TiPt',idx=1),line('R',y=36,w=25,idx=2)]
    assert field(rows,'type')['value']=='R'
    assert validate(BY_KEY['kind'],'(O.4) MODEL YULI')[0] is None
    assert validate(BY_KEY['kind'],'SEDAN)')[0] is None
    assert validate(BY_KEY['kind'],'MODEL Y')[0]=='MODEL Y'


def test_compact_caption_span_does_not_eat_the_first_value_character():
    assert field([line('(P.3) YAKITCINSIDIZEL')],'fuel_type')['value']=='DİZEL'
    assert field([line('(P-3) YAKITCINSIBENZINLI')],'fuel_type')['value']=='BENZİNLİ'
    assert field([line('(D.3) TICARIADIPUMA')],'kind')['value']=='PUMA'
    assert field([line('(D.S)CINSIOTOMOBIL')],'vehicle_category')['value']=='OTOMOBİL'
    assert field([line('(C.1.2) ADIL')],'owner_name')['value']=='ADIL'


def test_two_tone_color_keeps_both_lines_inside_its_cell():
    rows=[line('(R) RENGI',x=500,y=100,w=140,idx=1),
          line('SIYAH (YILDIZ)',x=620,y=125,w=210,h=25,idx=2),
          line('BEYAZ (FILDISI)',x=505,y=155,w=230,h=25,idx=3),
          line('(P.5) MOTOR NO',x=100,y=193,w=210,idx=4)]
    result=field(rows,'color')
    assert result['value']=='SİYAH (YILDIZ) BEYAZ (FİLDİŞİ)'
    assert len(result['line_ids'])==2


def test_two_tone_color_does_not_join_neighbor_or_next_field():
    rows=[line('(R) RENGI',x=500,y=100,w=140,idx=1),
          line('SIYAH',x=620,y=125,w=120,h=25,idx=2),
          line('BEYAZ',x=100,y=155,w=100,h=25,idx=3)]
    assert field(rows,'color')['value']=='SİYAH'
    rows[-1]=line('BEYAZ',x=505,y=180,w=100,h=25,idx=3)
    rows.append(line('MARKASI',x=500,y=157,w=140,idx=4))
    assert field(rows,'color')['value']=='SİYAH'


def test_skewed_color_lines_can_overlap_in_their_bounding_boxes():
    rows=[line('(R) RENGI',x=620,y=395,w=120,h=40,idx=1),
          line('SIYAH (YILDIZ)',x=750,y=408,w=170,h=46,idx=2),
          line('BEYAZ (FILDISI)',x=620,y=428,w=185,h=45,idx=3),
          line('(P.5) MOTOR NO',x=260,y=460,w=200,h=40,idx=4)]
    assert field(rows,'color')['value']=='SİYAH (YILDIZ) BEYAZ (FİLDİŞİ)'


def test_partial_category_caption_never_consumes_the_vehicle_word():
    rows=[line('(D.5) CINOTOMOBIL (AF',x=100,y=100,w=320,idx=1),
          line('COK AMACLI)',x=100,y=131,w=180,idx=2),
          line('(P.5) MOTOR NO',x=100,y=175,w=220,idx=3)]
    assert field(rows,'vehicle_category')['value']=='OTOMOBİL (AF ÇOK AMAÇLI)'
    assert field([line('(D.5) CINSITOMOBIL-AB')],'vehicle_category')['value'] is None
    assert validate(BY_KEY['vehicle_category'],'OTOMOBIL. (AA SEDAN)')[0]=='OTOMOBİL (AA SEDAN)'


def test_missing_fuel_caption_uses_visible_value_only_inside_technical_grid():
    rows=[line('SILINDIR HACMI',x=100,y=100,w=180,idx=1),
          line('MOTOR GUCU',x=500,y=100,w=140,idx=2),
          line('KULLANIM AMACI',x=100,y=230,w=220,idx=3),
          line('BENZIN',x=110,y=190,w=120,idx=4)]
    result=field(rows,'fuel_type')
    assert result['value']=='BENZİN' and result['method']=='layout'
    assert result['confidence']<=.70 and result['needs_review']
    assert field(rows[1:],'fuel_type')['value'] is None
    rows[-1]=line('BENZIN',x=700,y=190,w=120,idx=4)
    assert field(rows,'fuel_type')['value'] is None


def test_trailer_and_combined_weight_cells_cannot_fill_vehicle_weights():
    rows=[line('(G.1) NET AGIRLIGI',x=100,y=100,w=210,idx=1),
          line('(F.1) AZAMI YUKLU AGIRLIGI',x=500,y=100,w=260,idx=2),
          line('(G) KATAR AGIRLIGI',x=100,y=150,w=210,idx=3),
          line('(G.2) ROMORK AZAMI YUKLU AGIRLIGI',x=500,y=150,w=300,idx=4),
          line('1200',x=510,y=180,w=100,idx=5),
          line('3500',x=110,y=180,w=100,idx=6)]
    assert field(rows,'max_loaded_weight')['value'] is None
    assert field(rows,'net_weight')['value'] is None
    rows[4]=line('1200',x=790,y=180,w=100,idx=5)
    assert field(rows,'max_loaded_weight')['value'] is None
    assert field([line('ROMORK AZAMI YUKLU AGIRLIGI: 1500')],'max_loaded_weight')['value'] is None
    assert field([line('(G.2) AZAMI YUKLU AGIRLIGI: 1500')],'max_loaded_weight')['value'] is None
    assert field([line('(F.1) AZAMI YUKLU AGIRLIGI: 2400')],'max_loaded_weight')['value']=='2400'


def test_incomplete_category_cannot_swallow_an_engine_serial():
    rows=[line('(D.5) CINSI',x=100,y=100,w=120,idx=1),
          line('OTOMOBIL (AA',x=100,y=130,w=200,idx=2),
          line('SRISYOR NO 123ABC45678',x=100,y=161,w=300,idx=3)]
    result=field(rows,'vehicle_category')
    assert result['value']=='OTOMOBİL (AA' and result['needs_review']
    assert len(result['line_ids'])==1
