// Planning catalog; no agent execution or business policy changes.
export default {
  "version": 1,
  "preparedDate": "2026-11-24",
  "source": "office-data.json",
  "modules": [
    {
      "id": "FIN",
      "name": "Finans",
      "manager": "MGR-FIN",
      "kind": "existing",
      "mission": "Tahsilattan mutabakata tek iz",
      "window": "Gün 1–14",
      "phase": 1,
      "risk": "para",
      "href": "../muhasebe-v2/",
      "dependencies": [
        "FRA"
      ],
      "decision": "Bedel, royalty, iskonto veya prim kuralı değişecekse",
      "next": "Bayi tahsilat ve royalty çekirdeğinin kaynak incelemesini tamamla.",
      "mode": "Kaynak incelemesi kapsamı",
      "agents": [
        {
          "id": "FIN-01",
          "name": "Royalty ve tahakkuk",
          "scope": "Royalty matrahı, tahakkuk izi, iade ve ters kayıt",
          "deliverable": "Royalty hesaplama kaynakları ve ters kayıt senaryoları"
        },
        {
          "id": "FIN-02",
          "name": "Tahsilat ve bayi ekstresi",
          "scope": "Ödeme doğrulama, tahsis, açık kalem ve bayi ekstresi",
          "deliverable": "Ödeme eşleştirme ve bayi ekstresi kabul listesi"
        },
        {
          "id": "FIN-03",
          "name": "Mutabakat ve kontrol",
          "scope": "Dönem kilidi, mutabakat, finans onayları ve audit",
          "deliverable": "Mutabakat ve dönem kapatma kontrol listesi"
        },
        {
          "id": "FIN-04",
          "name": "Sözleşme ve finans kuralları",
          "scope": "Bedel kataloğu, finans kural sürümü ve etki analizi",
          "deliverable": "Sözleşme bedelleri ve kural sürümü etki analizi"
        }
      ]
    },
    {
      "id": "HR",
      "name": "İnsan Kaynakları (İK)",
      "manager": "MGR-HR",
      "kind": "existing",
      "mission": "Şubeye doğru kişi ve yeterlilik",
      "window": "Gün 22–30",
      "phase": 3,
      "risk": "yetki",
      "href": "../gm-ik/",
      "dependencies": [
        "FRA"
      ],
      "decision": "Yetki, organizasyon veya performans politikası değişecekse",
      "next": "Mevcut organizasyondan rol kaynaklarını eşleştir; şube personelini merkez ağacına ekleme.",
      "mode": "Etkinleştirme bekliyor",
      "agents": [
        {
          "id": "HR-01",
          "name": "Personel ve yetki",
          "scope": "Personel akışı, rol sınırları ve demo erişim senaryoları",
          "deliverable": "Mevcut organizasyonu koruyan merkez/şube rol matrisi"
        },
        {
          "id": "HR-02",
          "name": "Eğitim ve performans",
          "scope": "Eğitim, yeterlilik ve performans ekranlarının geliştirme planı",
          "deliverable": "Açılış öncesi eğitim ve yeterlilik takip planı"
        }
      ]
    },
    {
      "id": "COM",
      "name": "Müşteri Şikayetleri",
      "manager": "MGR-COM",
      "kind": "existing",
      "mission": "Her şikayetin bir sahibi olsun",
      "window": "Gün 22–30",
      "phase": 3,
      "risk": "veri",
      "href": null,
      "dependencies": [
        "HR"
      ],
      "decision": "Yetki dışı çözüm, hassas vaka veya ticari karar gerekiyorsa",
      "next": "Şikayetin alınması, sorumluya atanması ve kanıtlı kapanışını planla.",
      "mode": "Etkinleştirme bekliyor",
      "agents": [
        {
          "id": "COM-01",
          "name": "Şikayet akışı",
          "scope": "Kayıt, sınıflandırma, sahiplik ve takip",
          "deliverable": "Sınıflandırma, tek sahip ve takip kuyruğu"
        },
        {
          "id": "COM-02",
          "name": "Çözüm ve kalite",
          "scope": "Çözüm süreci, kanıt ve iç kalite ölçümleri; rapor bulgusunu değiştirmez",
          "deliverable": "Kanıta dayalı çözüm ve insan onaylı kapanış kontrolü"
        }
      ]
    },
    {
      "id": "REV",
      "name": "Yorum Ekibi",
      "manager": "MGR-REV",
      "kind": "existing",
      "mission": "Yorumları ve şube hedeflerini kaçırma",
      "window": "Mevcut akış · Gün 1–14 kontrol",
      "phase": 1,
      "risk": "veri",
      "href": "review-team.html",
      "dependencies": [],
      "decision": "İnsan incelemesi gerektiren yanıt veya yayın kuralı değişikliği varsa",
      "next": "Süre, iptal, gönderim hatası ve bildirimin doğru kayda gitmesini birlikte doğrula.",
      "mode": "Mevcut operasyon ekranı",
      "agents": [
        {
          "id": "REV-01",
          "name": "Yorum ve Yanıt Uzmanı",
          "scope": "Yeni yorum, yanıt taslağı, iki saatlik süre, insan incelemesi ve doğrulanmış yayın takibi",
          "deliverable": "Taslak hazır → iki saat → doğrulanmış yayın; hata ve insan incelemesi takibi"
        }
      ]
    },
    {
      "id": "SALE",
      "name": "Saha Satış",
      "manager": "MGR-SALE",
      "kind": "existing",
      "mission": "Ziyaretten aday devrine görünür satış",
      "window": "Gün 22–30",
      "phase": 3,
      "risk": "veri",
      "href": null,
      "dependencies": [
        "FRA"
      ],
      "decision": "Hedef, fiyat, iskonto veya sorumluluk istisnası varsa",
      "next": "Tekil fırsat kimliğini ve Franchise tarafından kabul koşulunu netleştir.",
      "mode": "Etkinleştirme bekliyor",
      "agents": [
        {
          "id": "SALE-01",
          "name": "Ziyaret ve fırsat",
          "scope": "Ziyaret, takvim ve satış fırsatı akışları",
          "deliverable": "Ziyaret → fırsat → Franchise aday devir paketi"
        },
        {
          "id": "SALE-02",
          "name": "CRM ve satış ölçümü",
          "scope": "Müşteri ilişki ekranları, tekrar kayıt ve ölçüm tutarlılığı",
          "deliverable": "Tekil müşteri, fırsat sahibi ve dönüşüm ölçümü"
        }
      ]
    },
    {
      "id": "FRA",
      "name": "Franchise",
      "manager": "MGR-FRA",
      "kind": "existing",
      "mission": "Başvurudan açılışa kontrollü ilerleme",
      "window": "Gün 1–14",
      "phase": 1,
      "risk": "yetki",
      "href": "franchise-specialist.html",
      "dependencies": [],
      "decision": "Kurul kararı, istisna veya açılış onayı gerekiyorsa",
      "next": "Ortak entegrasyon sözleşmesinin kaynağını doğrula; teknik teslimi Finans kabulünden ayır.",
      "mode": "Kaynak incelemesi kapsamı",
      "agents": [
        {
          "id": "FRA-01",
          "name": "Aday ve yaşam döngüsü",
          "scope": "Başvuru, aday, kurul ve aşama geçişleri",
          "deliverable": "14 aşamada sorumlu, belge ve sonraki adım"
        },
        {
          "id": "FRA-02",
          "name": "Sözleşme ve açılış kanıtı",
          "scope": "İmzalı sözleşme ve giriş bedeli kanıtının açılış akışı; hesaplama FIN-01/02 sahibi",
          "deliverable": "Sözleşme ve giriş bedeli kanıtlı Finans devir paketi"
        },
        {
          "id": "FRA-03",
          "name": "Kurulum ve departman kapıları",
          "scope": "Bayi kurulum bağımlılıkları ve açılış engelleri",
          "deliverable": "Departman açılış kapıları ve 30/60/90 takip listesi"
        },
        {
          "id": "FRA-04",
          "name": "Yetki ve bağımsız onay",
          "scope": "Franchise rol matrisi, hazırlayan/onaylayan ayrımı ve denetim izi",
          "deliverable": "Hazırlayan–onaylayan ayrımı ve revizyon kontrolü"
        }
      ]
    },
    {
      "id": "SEO",
      "name": "SEO ve Web Sitesi",
      "manager": "MGR-SEO",
      "kind": "existing",
      "mission": "Şube sayfalarından ölçülebilir talep",
      "window": "Gün 31–38",
      "phase": 4,
      "risk": "tasarım",
      "href": null,
      "dependencies": [
        "FRA"
      ],
      "decision": "Yeni içerik veya marka iddiası yayınlanacaksa",
      "next": "Kaynak sayfaları ve ölçüm erişimlerini doğrula; yorum yanıtlarını REV ekibinde tut.",
      "mode": "Etkinleştirme bekliyor",
      "agents": [
        {
          "id": "SEO-01",
          "name": "Teknik SEO",
          "scope": "Tarama, indeksleme, canonical, yapılandırılmış veri ve performans planı",
          "deliverable": "Tarama, canonical, indeksleme ve performans incelemesi"
        },
        {
          "id": "SEO-02",
          "name": "İçerik ve yerel SEO",
          "scope": "Sayfa içeriği ve yerel arama planı; Google yorum operasyonları REV ekibinde",
          "deliverable": "Onaya sunulan şube sayfası ve yerel içerik planı"
        }
      ]
    },
    {
      "id": "DEV",
      "name": "Yazılım",
      "manager": "Teknik lider · önerilen rol",
      "kind": "proposed",
      "mission": "Onaylı planı test edilmiş ürüne dönüştür",
      "window": "Gün 15–21 · kapı koşullu",
      "phase": 2,
      "risk": "yetki",
      "href": null,
      "dependencies": [
        "FRA",
        "FIN"
      ],
      "decision": "Faz 2 kapılarının kanıtı ve tek uzman pilot onayı",
      "next": "İzole alan, gizli anahtar yokluğu, üretim erişimi yokluğu, test ve diff şartlarını doğrula.",
      "mode": "Önerilen ekip · çalıştırılmadı",
      "agents": [
        {
          "id": "PLAN-DEV-01",
          "name": "Uygulama geliştiricisi",
          "scope": "Yalnız onaylı tek modül ve izole çalışma alanı",
          "deliverable": "Test ve diff raporlu teslim"
        },
        {
          "id": "PLAN-DEV-02",
          "name": "Test ve inceleme sorumlusu",
          "scope": "Üreticiden bağımsız kabul senaryoları",
          "deliverable": "Başarı, hata, yetki ve geri dönüş kontrol raporu"
        }
      ]
    },
    {
      "id": "SOC",
      "name": "Sosyal Medya",
      "manager": "İçerik sorumlusu · önerilen rol",
      "kind": "proposed",
      "mission": "Planlı, marka kurallarına uygun içerik",
      "window": "Gün 31–38",
      "phase": 4,
      "risk": "tasarım",
      "href": null,
      "dependencies": [
        "SEO"
      ],
      "decision": "İçerik, görsel ve hedef hesap için yayın onayı",
      "next": "Marka kuralları, içerik kaynakları ve insan onayını tanımla.",
      "mode": "Önerilen ekip · çalıştırılmadı",
      "agents": [
        {
          "id": "PLAN-SOC-01",
          "name": "İçerik ve takvim uzmanı",
          "scope": "İçerik taslağı ve yayın takvimi; otomatik yayın yok",
          "deliverable": "Hedef hesap ve görseliyle onaya hazır içerik paketi"
        }
      ]
    },
    {
      "id": "OPS",
      "name": "Ekspertiz Süreç Takibi",
      "manager": "Şube operasyon sorumlusu · rol eşlemesi bekliyor",
      "kind": "proposed",
      "mission": "İş emrinden teslim sonrası memnuniyete tek takip sorumlusu",
      "window": "Olay kaynakları doğrulandıktan sonra tek şube demo pilotu",
      "phase": 2,
      "risk": "veri",
      "href": "inspection-coordinator.html",
      "dependencies": [],
      "decision": "Pilot şube ve sorumlu; süre, sorgu bütçesi ve müşteri iletişim politikası",
      "next": "İş emri, usta girişi, sorgu, rapor sürümü, baskı, sunum ve teslim olaylarını eşleştir.",
      "mode": "Planlandı · canlı takip ve gönderim kapalı",
      "agents": [
        {
          "id": "PLAN-OPS-01",
          "name": "Ekspertiz Süreç Takip Ajanı",
          "scope": "Aşamaları ve istisnaları takip eder; rapor bulgusunu değiştirmez, gerçek müşteri mesajı göndermez.",
          "deliverable": "Şube bazlı eksik/geciken iş listesi, teslim kanıtı ve onaya hazır takip planı"
        }
      ]
    }
  ],
  "limits": {
    "queue": 10,
    "dailyMinutes": 45,
    "weeklyMinutes": 840
  },
  "managementRoles": [
    {
      "name": "Bölge müdürü",
      "parent": "FRA",
      "scope": "Bölge–şube–insan sorumlu eşleşmesi; mevcut personel kaynağı doğrulanacak."
    },
    {
      "name": "Satış müdürü",
      "parent": "SALE",
      "scope": "Fırsat ve hedeflerin yönetici görünümü; otomatik ticari karar yok."
    },
    {
      "name": "İK yöneticisi",
      "parent": "HR",
      "scope": "Mevcut MGR-HR rolü; merkez organizasyonu korunur."
    }
  ]
};
