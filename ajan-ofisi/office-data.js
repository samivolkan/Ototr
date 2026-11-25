window.OFFICE_DATA = {
  "version": 1,
  "phase": 1,
  "createdAt": "2026-11-23T01:51:00.453Z",
  "pilotStart": "2026-11-23",
  "pilotEnd": "2026-12-06",
  "activationAfterPilot": "Otomatik genişleme yok; Sami kararı gerekir.",
  "departments": [
    {
      "id": "FIN",
      "name": "Finans",
      "color": "#8972b9",
      "icon": "landmark",
      "manager": "MGR-FIN",
      "managerName": "OTOTR Finans",
      "active": true,
      "agents": [
        {
          "id": "FIN-01",
          "name": "Royalty ve tahakkuk",
          "scope": "Royalty matrahı, tahakkuk izi, iade ve ters kayıt"
        },
        {
          "id": "FIN-02",
          "name": "Tahsilat ve bayi ekstresi",
          "scope": "Ödeme doğrulama, tahsis, açık kalem ve bayi ekstresi"
        },
        {
          "id": "FIN-03",
          "name": "Mutabakat ve kontrol",
          "scope": "Dönem kilidi, mutabakat, finans onayları ve audit"
        },
        {
          "id": "FIN-04",
          "name": "Sözleşme ve finans kuralları",
          "scope": "Bedel kataloğu, finans kural sürümü ve etki analizi"
        }
      ]
    },
    {
      "id": "HR",
      "name": "İnsan Kaynakları (İK)",
      "color": "#aa7d98",
      "icon": "graduation-cap",
      "manager": "MGR-HR",
      "active": false,
      "agents": [
        {
          "id": "HR-01",
          "name": "Personel ve yetki",
          "scope": "Personel akışı, rol sınırları ve demo erişim senaryoları"
        },
        {
          "id": "HR-02",
          "name": "Eğitim ve performans",
          "scope": "Eğitim, yeterlilik ve performans ekranlarının geliştirme planı"
        }
      ]
    },
    {
      "id": "COM",
      "name": "Müşteri Şikayetleri",
      "color": "#bb885f",
      "icon": "messages-square",
      "manager": "MGR-COM",
      "active": false,
      "agents": [
        {
          "id": "COM-01",
          "name": "Şikayet akışı",
          "scope": "Kayıt, sınıflandırma, sahiplik ve takip"
        },
        {
          "id": "COM-02",
          "name": "Çözüm ve kalite",
          "scope": "Çözüm süreci, kanıt ve iç kalite ölçümleri; rapor bulgusunu değiştirmez"
        }
      ]
    },
    {
      "id": "REV",
      "name": "Yorum Ekibi",
      "color": "#668e9c",
      "icon": "message-square-text",
      "manager": "MGR-REV",
      "active": false,
      "agents": [
        {
          "id": "REV-01",
          "name": "Yorum ve Yanıt Uzmanı",
          "scope": "Yeni yorum, yanıt taslağı, iki saatlik süre, insan incelemesi ve doğrulanmış yayın takibi"
        }
      ],
      "workspace": "review-specialist.html"
    },
    {
      "id": "SALE",
      "name": "Saha Satış",
      "color": "#9a9259",
      "icon": "route",
      "manager": "MGR-SALE",
      "active": false,
      "agents": [
        {
          "id": "SALE-01",
          "name": "Ziyaret ve fırsat",
          "scope": "Ziyaret, takvim ve satış fırsatı akışları"
        },
        {
          "id": "SALE-02",
          "name": "CRM ve satış ölçümü",
          "scope": "Müşteri ilişki ekranları, tekrar kayıt ve ölçüm tutarlılığı"
        }
      ]
    },
    {
      "id": "FRA",
      "name": "Franchise",
      "color": "#4d8671",
      "icon": "network",
      "manager": "MGR-FRA",
      "managerName": "OTOTR Franchise",
      "active": true,
      "agents": [
        {
          "id": "FRA-01",
          "name": "Aday ve yaşam döngüsü",
          "scope": "Başvuru, aday, kurul ve aşama geçişleri"
        },
        {
          "id": "FRA-02",
          "name": "Sözleşme ve açılış kanıtı",
          "scope": "İmzalı sözleşme ve giriş bedeli kanıtının açılış akışı; hesaplama FIN-01/02 sahibi"
        },
        {
          "id": "FRA-03",
          "name": "Kurulum ve departman kapıları",
          "scope": "Bayi kurulum bağımlılıkları ve açılış engelleri"
        },
        {
          "id": "FRA-04",
          "name": "Yetki ve bağımsız onay",
          "scope": "Franchise rol matrisi, hazırlayan/onaylayan ayrımı ve denetim izi"
        }
      ]
    },
    {
      "id": "SEO",
      "name": "SEO ve Web Sitesi",
      "color": "#7c8d61",
      "icon": "globe",
      "manager": "MGR-SEO",
      "active": false,
      "agents": [
        {
          "id": "SEO-01",
          "name": "Teknik SEO",
          "scope": "Tarama, indeksleme, canonical, yapılandırılmış veri ve performans planı"
        },
        {
          "id": "SEO-02",
          "name": "İçerik ve yerel SEO",
          "scope": "Sayfa içeriği ve yerel arama planı; Google yorum operasyonları REV ekibinde"
        },
        {
          "id": "SEO-03",
          "name": "Sosyal Medya ve SEO İçerik Ajanı",
          "scope": "Doğrulanmış saha vakalarından blog ve LinkedIn taslakları; Codex’te talep üzerine"
        }
      ]
    }
  ],
  "plans": [
    {
      "id": "P01",
      "owner": "FIN-04",
      "department": "FIN",
      "title": "Finans kural sürümlerinin sahipliği",
      "finding": "Ekran tanımı sözleşme sürümü, geçerlilik, onay kanıtı ve sentetik simülasyonu ayrı alanlar olarak listeliyor. Bu alıntı sunucu tarafı uygulamayı kanıtlamaz.",
      "evidence": [
        {
          "file": "muhasebe-v2/assets/finance-ui.js",
          "start": 7,
          "end": 8,
          "hash": "53f7be243f6c59e28519ba1d346428876bf90f984b21c2ade23ab9d8f90d2780",
          "excerpt": "    ['SCR-03','Sözleşme ve Kural Sürümleri',['Sözleşme listesi','Sürüm zaman çizgisi','Kural aileleri','Geçerlilik','Onay kanıtı','Etki önizleme'],['Taslak oluştur','Onaya gönder','Onayla / reddet','Sürüm karşılaştır']],\n    ['SCR-04','Bedel Kataloğu ve Kural Simülasyonu',['Bedel ailesi','Kapsam ve tetikleyici','Matrah ve hesaplama','Vergi ve vade','İptal / iade','Muhasebe eşlemesi'],['Taslağı düzenle','Sentetik simülasyon','Onaya gönder','Yayınla']],"
        }
      ],
      "recommendation": "Sözleşme sürümü → bedel kuralı → tahakkuk bağını demo senaryolarıyla izleme planı çıkar. Mevcut kuralı değiştirmeden seçenek ve etkilerini karşılaştır.",
      "risk": "para",
      "effort": "4–6 saat",
      "decision": "Royalty matrahı ve oranı gibi ticari kurallar için Sami’nin onaylı politika referansı gerekli; yeni oran önerisi uygulanmayacak.",
      "questions": [
        "FR-şube kimliği, sözleşme sürümü ve geçerlilik tarihi için tek veri sözlüğü",
        "Demo: eski/yeni sürümün aynı olaya uygulanmaması",
        "Sami’nin mevcut onaylı kural belgesi nerede?"
      ],
      "priority": 1,
      "reviewMinutes": 5,
      "status": "draft",
      "author": "Kurulum asistanı",
      "review": {
        "structural": "pending",
        "semantic": "pending",
        "reviewer": "BEK-01"
      }
    },
    {
      "id": "P02",
      "owner": "FIN-01",
      "department": "FIN",
      "title": "Royalty tahakkuku ve ters kayıt izi",
      "finding": "Tahakkuk ekranında kaynak olay; hesaplama izinde sözleşme/kural sürümü, matrah bileşenleri ve ters kayıt zinciri tanımlı.",
      "evidence": [
        {
          "file": "muhasebe-v2/assets/finance-ui.js",
          "start": 9,
          "end": 10,
          "hash": "aa612be4aff8364c582b87b494ccb4ab51be3b06fd1f0c0e90f96ebf27b43f4e",
          "excerpt": "    ['SCR-05','Tahakkuklar',['Filtreler','Kaynak olay','Bedel ailesi','Net / KDV / brüt','Fatura ve açık kalem durumu','Dönem ve istisna'],['Detayı aç','Ters kayıt talep et','İtiraz başlat','Yetkili seçimi dışa aktar']],\n    ['SCR-06','Tahakkuk ve Hesaplama İzi',['Kaynak olay','Sözleşme ve kural sürümü','Matrah bileşenleri','Hesaplama adımları','Defter ve açık kalem','Ters kayıt zinciri'],['Açıklamayı indir','Kaynağı aç','Sözleşme sürümünü aç','İtiraz başlat']],"
        }
      ],
      "recommendation": "Kaynak olaydan royalty tahakkukuna kadar tekil kimlik ve hesaplama izi için salt-okunur inceleme matrisi hazırla; iade etkisini ayrı seçenek olarak raporla.",
      "risk": "para",
      "effort": "6–8 saat",
      "decision": "Tahsilat, iade ve iskonto matrah etkilerini Sami belirler; inceleme bunları değiştirmez.",
      "questions": [
        "Demo tekrar olayında çift tahakkuk oluşmaması için önerilen test",
        "İade/ters kayıt bağının orijinal kayıtla eşleşme kontrolü",
        "Gerçek hesaplama servisi ve onaylı matrah politikası henüz bu alıntıyla doğrulanmadı."
      ],
      "priority": 2,
      "reviewMinutes": 5,
      "status": "draft",
      "author": "Kurulum asistanı",
      "review": {
        "structural": "pending",
        "semantic": "pending",
        "reviewer": "BEK-01"
      }
    },
    {
      "id": "P03",
      "owner": "FIN-02",
      "department": "FIN",
      "title": "Bayi tahsilatı ve ödeme tahsisi",
      "finding": "Bayi ekstresi açık kalem, yaşlandırma ve tahsisleri; ödeme ekranı doğrulama kanıtı, dağıtılmamış bakiye ve geri alma zincirini listeliyor.",
      "evidence": [
        {
          "file": "muhasebe-v2/assets/finance-ui.js",
          "start": 11,
          "end": 12,
          "hash": "81153cfb2ca34150e48247c943247242788716104ca35435b1a37900222a8bfb",
          "excerpt": "    ['SCR-07','Bayi Ekstresi ve Açık Kalemler',['Açılış bakiyesi','Hareket ve yürüyen bakiye','Açık kalemler','Yaşlandırma','Ödeme ve tahsisler','Kapanış bakiyesi'],['Filtrele','CSV indir','Ekstre indir','İtiraz başlat']],\n    ['SCR-08','Ödeme ve Tahsis',['Ödeme listesi','Doğrulama kanıtı','Dağıtılmamış bakiye','Aday açık kalemler','Tahsis geçmişi','Ters kayıt zinciri'],['Ödeme kaydet','Doğrula','Tahsis et','Tahsis geri al']],"
        }
      ],
      "recommendation": "Demo ödeme → doğrulama → açık kaleme tahsis → ekstre akışının veri sözleşmesini incele. Kısmi, fazla ve tekrar ödeme durumlarını kabul testlerine dönüştür.",
      "risk": "para",
      "effort": "6–8 saat",
      "decision": "Fazla ödemenin mahsup/iade yöntemi ve tahsis önceliği için mevcut Sami politikası gerekli.",
      "questions": [
        "Demo 100 birim ödeme / 60 birim tahsis / 40 birim dağıtılmamış bakiye senaryosu",
        "Tekrarlı ödeme bildirimi için idempotency kanıtı aranacak",
        "Canlı banka ya da gerçek tahsilat kullanılmayacak."
      ],
      "priority": 3,
      "reviewMinutes": 5,
      "status": "draft",
      "author": "Kurulum asistanı",
      "review": {
        "structural": "pending",
        "semantic": "pending",
        "reviewer": "BEK-01"
      }
    },
    {
      "id": "P04",
      "owner": "FIN-03",
      "department": "FIN",
      "title": "Mutabakat ve dönem kilidi",
      "finding": "Dönem kilidi, export kontrol toplamları, hata kuyruğu, riskli onaylar ve audit ekranları ayrı tanımlanmış.",
      "evidence": [
        {
          "file": "muhasebe-v2/assets/finance-ui.js",
          "start": 16,
          "end": 20,
          "hash": "1ffe2349c980ff263455a0a0eaae610aa20e2a7c582ae498f552a08373847414",
          "excerpt": "    ['SCR-12','Dönem, Mutabakat ve Kilit',['Dönem durumu','Kaynak dondurma','Kapanış ön kontrolleri','Bayi mutabakatı','İstisnalar','Onay ve yeniden açma'],['Ön kontrol çalıştır','Mutabakat gönder','Kilitle','Yeniden açma talep et']],\n    ['SCR-13','Faturalama ve Muhasebe Export Paketleri',['Uygun tahakkuklar','Paket kontrol toplamları','Eşleme sürümü','Export durumu','Harici fatura geri bildirimi','Mutabakat farkı'],['Paket oluştur','Doğrula','Export et','Idempotent tekrar','Geri bildirim kaydet']],\n    ['SCR-14','Entegrasyon İzleme ve Hata Kuyruğu',['Inbox / outbox','Gecikme','Retry','Dead-letter','Şema sürümü','Correlation izi'],['Maskeli payload incele','Tekrar dene','Çöz','Ata','Maskeli tanı indir']],\n    ['SCR-15','Bekleyen Onaylar',['Risk seviyesi','Tutar','Talep sahibi','Kapsam','Kanıt','Politika sürümü','Karar geçmişi'],['Onayla','Reddet','Kanıt iste','Kaynak kaydı aç']],\n    ['SCR-16','Audit ve Değişiklik İzi',['Aktör','Aksiyon','Varlık','Zaman','Gerekçe','Correlation','Bütünlük zinciri'],['Filtrele','Correlation izini aç','Yetkili seçimi dışa aktar']],"
        }
      ],
      "recommendation": "Tahakkuk–ödeme–ekstre toplamları için demo mutabakat matrisi, kilit sonrası düzeltme ve yeniden açma karar akışını incele.",
      "risk": "para",
      "effort": "4–6 saat",
      "decision": "Dönemi yeniden açma ve finansal istisna kararları yalnız Sami’ye sunulacak.",
      "questions": [
        "Demo toplam farkının görünür hata üretmesi",
        "Kilit sonrası değişiklik için önerilen red/istisna testi",
        "Ekran listesi güvenli sunucu denetiminin kanıtı değildir."
      ],
      "priority": 4,
      "reviewMinutes": 5,
      "status": "draft",
      "author": "Kurulum asistanı",
      "review": {
        "structural": "pending",
        "semantic": "pending",
        "reviewer": "BEK-01"
      }
    },
    {
      "id": "P05",
      "owner": "FRA-01",
      "department": "FRA",
      "title": "Aday kurulunda bağımsız onay",
      "finding": "Kurul taslağını fd rolü hazırlar; ikinci onay gm rolüne ve farklı checkerId değerine bağlanmış.",
      "evidence": [
        {
          "file": "gm-franchise/franchise-core.mjs",
          "start": 76,
          "end": 93,
          "hash": "4a5ba22d21ba7902fbc9e07598d5073d1bff700b946b43d578ba8e86b08b3093",
          "excerpt": "export function submitBoardDecision(franchiseCase, input = {}) {\n  if (input.makerRole !== \"fd\") throw new Error(\"Kurul kararını Franchise Sorumlusu hazırlamalıdır.\");\n  if (candidateScoreValue(franchiseCase) === null) throw new Error(\"Yedi aday skoru tamamlanmalıdır.\");\n  if (![\"approved\", \"conditionally_approved\", \"rejected\"].includes(input.decision)) throw new Error(\"Geçersiz kurul kararı.\");\n  if (input.decision === \"conditionally_approved\" && String(input.conditions || \"\").trim().length < 5) throw new Error(\"Şartlı onay koşulları zorunludur.\");\n  franchiseCase.boardDecision = { decision: input.decision, conditions: String(input.conditions || \"\").trim() || null, makerId: input.makerId, makerRole: input.makerRole, status: \"pending_second_approval\", checkerId: null, checkerRole: null };\n  return franchiseCase.boardDecision;\n}\n\nexport function reviewBoardDecision(franchiseCase, input = {}) {\n  const decision = franchiseCase.boardDecision;\n  if (!decision || decision.status !== \"pending_second_approval\") throw new Error(\"İkinci onay bekleyen kurul kararı bulunamadı.\");\n  if (!input.checkerId || input.checkerId === decision.makerId) throw new Error(\"Kararı hazırlayan kendi kararını onaylayamaz.\");\n  if (input.checkerRole !== \"gm\") throw new Error(\"Kurul ikinci onayını Genel Müdür vermelidir.\");\n  decision.status = input.approve ? \"approved\" : \"rejected\";\n  decision.checkerId = input.checkerId;\n  decision.checkerRole = input.checkerRole;\n  return decision;"
        }
      ],
      "recommendation": "Aday yaşam döngüsünde hazırlayan/onaylayan ayrımının çağıran katmanda da korunup korunmadığını demo kimliklerle incele.",
      "risk": "yetki",
      "effort": "3–4 saat",
      "decision": "Ek karar yok; rol kuralı değişikliği gerekirse seçenekleri Sami’ye sun.",
      "questions": [
        "Aynı maker/checker için red senaryosu",
        "Yetkisiz rol için red senaryosu",
        "Gerçek oturum ve sunucu yetkilendirmesi bu dosya parçasından doğrulanamaz."
      ],
      "priority": 5,
      "reviewMinutes": 5,
      "status": "draft",
      "author": "Kurulum asistanı",
      "review": {
        "structural": "pending",
        "semantic": "pending",
        "reviewer": "BEK-01"
      }
    },
    {
      "id": "P06",
      "owner": "FRA-02",
      "department": "FRA",
      "title": "Sözleşme ve giriş bedeli kanıtı",
      "finding": "Açılış kanıt listesinde yüzde 100 giriş bedeli, imzalı sözleşme, saha ziyareti ve faaliyet/ruhsat kaydı var; her kayıt kaynak referansı ve kanıt özeti alanıyla başlıyor.",
      "evidence": [
        {
          "file": "gm-franchise/franchise-core.mjs",
          "start": 96,
          "end": 104,
          "hash": "50a43d0db89e14234a5ebb6939e39ca2c1fcbfebeb989737eef3efb2765eaf27",
          "excerpt": "export const OPENING_EVIDENCE_GATES = Object.freeze([\n  { code: \"entry_fee_payment\", label: \"%100 giriş bedeli tahsilatı\", ownerRole: \"fn\" },\n  { code: \"franchise_contract\", label: \"İmzalı franchise sözleşmesi\", ownerRole: \"hk\" },\n  { code: \"site_visit\", label: \"Konum / fotoğraf / ölçüm / denetçi saha ziyareti\", ownerRole: \"op\" },\n  { code: \"operating_license\", label: \"Geçerli faaliyet ve ruhsat kaydı\", ownerRole: \"hk\" }\n]);\n\nexport function createOpeningEvidencePlan() {\n  return OPENING_EVIDENCE_GATES.map((gate) => ({ ...gate, status: \"missing\", makerId: null, makerRole: null, checkerId: null, checkerRole: null, evidenceSha256: null, sourceReference: null }));"
        }
      ],
      "recommendation": "İmzalı sözleşme kanıtı ile finans tahsilat kanıtını ayrı tutan bağımlılık matrisi hazırla. Tahsilat hesabının sahibi FIN-02, sözleşme belgesinin sahibi FRA-02 olsun.",
      "risk": "para",
      "effort": "3–5 saat",
      "decision": "Mevcut yüzde 100 giriş bedeli kapısı aynen korunur; istisna kararı ajan tarafından alınmaz.",
      "questions": [
        "Eksik kanıtın açılış kapısını kapalı tutması",
        "Demo sözleşme kimliğinin doğru şubeye bağlanması",
        "Gerçek sözleşme ve kişisel belge okunmayacak."
      ],
      "priority": 6,
      "reviewMinutes": 5,
      "status": "draft",
      "author": "Kurulum asistanı",
      "review": {
        "structural": "pending",
        "semantic": "pending",
        "reviewer": "BEK-01"
      }
    },
    {
      "id": "P07",
      "owner": "FRA-03",
      "department": "FRA",
      "title": "Kurulumda eksik görev bilgisinin ele alınması",
      "finding": "openingBlockers içinde options.taskDone verilmezse true kabul ediliyor (satır 256). Bu yerel fonksiyon davranışıdır; çağıranların eksik bilgi gönderdiği henüz kanıtlanmadı.",
      "evidence": [
        {
          "file": "gm-franchise/franchise-core.mjs",
          "start": 254,
          "end": 269,
          "hash": "d0a04ad4195f689e0999e13ce8185718a0d0e2e50d949480edc966acb8ce1063",
          "excerpt": "export function openingBlockers(franchiseCase, options = {}) {\n  const blockers = [];\n  const taskDone = options.taskDone ?? true;\n  const taskTotal = options.taskTotal ?? 0;\n  if (franchiseCase.consents < 3) blockers.push(\"KVKK izinleri eksik\");\n  if (franchiseCase.documents < franchiseCase.documentsTotal) blockers.push(`Zorunlu belgeler eksik (${franchiseCase.documents}/${franchiseCase.documentsTotal})`);\n  if (franchiseCase.paid < 100) blockers.push(\"Açılış öncesi tahsilat %100 değil\");\n  if (!taskDone) blockers.push(`Departman görevleri eksik (${options.taskCount || 0}/${taskTotal})`);\n  if (franchiseCase.exceptions.some((item) => item.status === \"pending_second_approval\")) blockers.push(\"İkinci onay bekleyen istisna bulunuyor\");\n  for (const gate of ensureOpeningEvidence(franchiseCase)) if (gate.status !== \"approved\") blockers.push(`${gate.label}: bağımsız onay eksik`);\n  for (const member of franchiseCase.staffing) {\n    if (member.recruitmentStatus !== \"hired\") blockers.push(`${member.role}: işe alım tamamlanmadı`);\n    else if (!member.employmentDocumentsComplete || !member.contractSigned) blockers.push(`${member.role}: özlük veya sözleşme eksik`);\n    else if (!hasValidCertificate(member, options.today)) blockers.push(`${member.role}: rol sertifikası geçersiz`);\n  }\n  return blockers;"
        }
      ],
      "recommendation": "Çağıran noktaların taskDone değerini açıkça sağlayıp sağlamadığını incele. Eksik bilgi için kapalı kalma seçeneğini ve uyumluluk etkisini raporla; kodu değiştirme.",
      "risk": "yetki",
      "effort": "3–4 saat",
      "decision": "Eksik görev bilgisinde fail-closed davranışına geçiş ancak etki analizi ve Sami onayı sonrasında değerlendirilir.",
      "questions": [
        "Demo taskDone=false ile engel oluşumu",
        "Demo taskDone alanı yokken mevcut davranışın belgelenmesi",
        "Çağıran noktalar doğrulanana kadar üretim açığı hükmü verilmez."
      ],
      "priority": 7,
      "reviewMinutes": 5,
      "status": "draft",
      "author": "Kurulum asistanı",
      "review": {
        "structural": "pending",
        "semantic": "pending",
        "reviewer": "BEK-01"
      }
    },
    {
      "id": "P08",
      "owner": "FRA-04",
      "department": "FRA",
      "title": "Kanıt kaydında hazırlayan/onaylayan ayrımı",
      "finding": "Kanıt gönderimi rol, SHA-256 ve kaynak referansı ister; onay işlevi aynı hazırlayan kimliğini reddeder ve gm/fd rolünü kontrol eder.",
      "evidence": [
        {
          "file": "gm-franchise/franchise-core.mjs",
          "start": 115,
          "end": 133,
          "hash": "b856541735370542225850e07e6b7b31b65c37e83826bded3f4aaeb8c7d8b63d",
          "excerpt": "export function submitOpeningEvidence(franchiseCase, gateCode, input = {}) {\n  const gate = ensureOpeningEvidence(franchiseCase).find((item) => item.code === gateCode);\n  if (!gate) throw new Error(\"Bilinmeyen açılış kanıtı.\");\n  if (!input.makerId || !input.makerRole) throw new Error(\"Kanıt hazırlayan kimliği ve rolü zorunludur.\");\n  if (input.makerRole !== gate.ownerRole && !new Set([\"gm\", \"fd\"]).has(input.makerRole)) throw new Error(\"Bu kanıt ilgili departman tarafından hazırlanmalıdır.\");\n  if (!/^[a-f0-9]{64}$/.test(String(input.evidenceSha256 || \"\"))) throw new Error(\"Kanıt SHA-256 özeti zorunludur.\");\n  if (String(input.sourceReference || \"\").trim().length < 3) throw new Error(\"Kanıt kaynak referansı zorunludur.\");\n  Object.assign(gate, { status: \"submitted\", makerId: input.makerId, makerRole: input.makerRole, checkerId: null, checkerRole: null, evidenceSha256: input.evidenceSha256, sourceReference: String(input.sourceReference).trim() });\n  return gate;\n}\n\nexport function reviewOpeningEvidence(franchiseCase, gateCode, review = {}) {\n  const gate = ensureOpeningEvidence(franchiseCase).find((item) => item.code === gateCode);\n  if (!gate || gate.status !== \"submitted\") throw new Error(\"İncelenecek gönderilmiş kanıt bulunamadı.\");\n  if (!review.checkerId || review.checkerId === gate.makerId) throw new Error(\"Kanıtı hazırlayan kişi kendi kaydını onaylayamaz.\");\n  if (!new Set([\"gm\", \"fd\"]).has(review.checkerRole)) throw new Error(\"İkinci onay yalnız GM veya Franchise Sorumlusu tarafından verilebilir.\");\n  if (!new Set([\"approved\", \"rejected\"]).has(review.decision)) throw new Error(\"Geçersiz kanıt kararı.\");\n  Object.assign(gate, { status: review.decision, checkerId: review.checkerId, checkerRole: review.checkerRole });\n  return gate;"
        }
      ],
      "recommendation": "Kanıtın kimlik, rol ve hash doğrulamasını demo senaryolarla incele; aynı kimlikle kendi kaydını onaylama yolunun tüm girişlerde kapalı olduğunu kanıtlamaya yönelik plan hazırla.",
      "risk": "yetki",
      "effort": "3–4 saat",
      "decision": "Ek karar yok; kimlik/rol istisnası açılmaz.",
      "questions": [
        "Geçersiz hash için red senaryosu",
        "Aynı hazırlayan/onaylayan için red senaryosu",
        "Sunucu katmanı ve bütün API yolları bu alıntıyla doğrulanmış sayılmaz."
      ],
      "priority": 8,
      "reviewMinutes": 5,
      "status": "draft",
      "author": "Kurulum asistanı",
      "review": {
        "structural": "pending",
        "semantic": "pending",
        "reviewer": "BEK-01"
      }
    }
  ],
  "limits": {
    "activeExperts": 20,
    "samiQueue": 10,
    "dailyMinutes": 45,
    "weeklyMinutes": 840,
    "lowRiskSampleRate": 0.25
  },
  "capabilities": {
    "codeWrite": false,
    "modelExecution": false,
    "externalMessaging": false,
    "productionAccess": false,
    "secretAccess": false
  },
  "engineNote": "Önceki Codex pilotu MCP başlatma/kimlik doğrulama hatası verdi. İzole bağlantı doğrulanmadı; model yürütücüsü bu sürüme dahil edilmedi.",
  "source": {
    "commit": "d0a5cc6",
    "scope": "Yalnız seçili kaynak kod aralıkları. Canlı veri, müşteri ve araç kayıtları yok.",
    "capturedAt": "2026-11-23T01:51:00.454Z"
  }
};
