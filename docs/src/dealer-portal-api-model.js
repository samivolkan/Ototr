(function(){
  const model = {
    version: 'dealer-portal-api-v1',
    basePath: '/api/dealer-portal',
    entities: [
      { table: 'dealer_tenants', label: 'Bayi', key: 'dealer_id', purpose: 'Bayi sahibi, sözleşme, royalty ve marka standart kaydı' },
      { table: 'dealer_branches', label: 'Şube', key: 'branch_id', purpose: 'Lokasyon, kapasite, cihaz, kasa ve kalite kapsamı' },
      { table: 'dealer_staff', label: 'Personel', key: 'staff_id', purpose: 'Rol, yetki, evrak, vardiya, Academy ve aktif/pasif kullanıcı' },
      { table: 'dealer_staff_tasks', label: 'Personel görevi', key: 'staff_task_id', purpose: 'Bayi içi görev, öncelik, süre, onay ve gecikme takibi' },
      { table: 'dealer_staff_task_comments', label: 'Görev yorumu', key: 'comment_id', purpose: 'Görev notu, geri gönderme gerekçesi ve aktivite geçmişi' },
      { table: 'dealer_appointments', label: 'Randevu', key: 'appointment_id', purpose: 'Telefon, WhatsApp, web, Google ve genel merkez kaynaklı randevu' },
      { table: 'dealer_work_orders', label: 'İş emri', key: 'work_order_id', purpose: 'Araç kabul, paket, ödeme, KVKK ve teslim hedefi' },
      { table: 'dealer_tasks', label: 'Usta görevi', key: 'task_id', purpose: 'Paket kapsamına göre istasyon bazlı teknik giriş' },
      { table: 'dealer_reports', label: 'Rapor', key: 'report_id', purpose: 'PDF, QR, müdür onayı, revizyon ve teslim durumu' },
      { table: 'dealer_devices', label: 'Cihaz', key: 'device_id', purpose: 'OBD, mikron, fren, dyno ve kalibrasyon riski' },
      { table: 'dealer_cashbox', label: 'Kasa', key: 'cashbox_id', purpose: 'POS, nakit, havale, fatura, iade ve gün sonu kapanış' },
      { table: 'dealer_file_archive', label: 'Dosya arşivi', key: 'file_id', purpose: 'Fotoğraf, cihaz çıktısı, QR teslim kanıtı ve revizyon eki' }
    ],
    endpoints: [
      ['GET', '/me', 'Login olan kullanıcının bayi, şube, rol ve yetki kapsamı'],
      ['GET', '/branches/:branchId/dashboard', 'Günlük şube kokpiti, KPI ve risk uyarıları'],
      ['POST', '/appointments/:id/convert', 'Randevudan iş emri oluşturma'],
      ['POST', '/work-orders', 'Paket seçimiyle iş emri ve usta görevlerini üretme'],
      ['GET', '/vin/decode/:vin', 'VIN format, WMI, decoder ve seçili araç uyum kontrolü'],
      ['GET', '/staff-tasks', 'Bayi yetkisine göre personel görev listesi ve iş yükü özeti'],
      ['POST', '/staff-tasks', 'Bayi veya şube müdürü tarafından personele görev açma'],
      ['PATCH', '/staff-tasks/:taskId/status', 'Personel görevi başlatma, tamamlamaya gönderme veya iptal etme'],
      ['POST', '/staff-tasks/:taskId/comments', 'Göreve not, açıklama veya geri gönderme gerekçesi ekleme'],
      ['POST', '/staff-tasks/:taskId/approval', 'Tamamlanan personel görevini onaylama veya personele iade etme'],
      ['PATCH', '/tasks/:taskId/technical-entry', 'Usta tablet teknik girişlerini kaydetme'],
      ['POST', '/tasks/:taskId/evidence', 'Fotoğraf, cihaz çıktısı ve video kanıtı yükleme'],
      ['POST', '/reports/:reportId/manager-approval', 'Müdür onayı veya ustaya geri gönderme'],
      ['POST', '/reports/:reportId/delivery', 'PDF basım, QR gönderim ve dijital teslim kanıtı'],
      ['POST', '/reports/:reportId/revisions', 'Revizyon açma, eski versiyonu arşivde saklama'],
      ['POST', '/finance/royalty-disputes', 'Royalty itirazı ve belge yükleme akışı']
    ],
    reportMapping: [
      ['Araç kimliği', 'work_orders.vehicle_identity', 'Plaka, şasi/VIN, normalize VIN, motor no, marka-model, yıl, kilometre'],
      ['VIN doğrulama', 'work_orders.vin_validation', 'VIN decode sonucu, kaynak, güven skoru, manuel inceleme ve duplicate kontrolü'],
      ['Taraflar ve rıza', 'work_orders.parties_and_consents', 'Alıcı, satıcı, ruhsat sahibi, KVKK, yol testi, paylaşım izni'],
      ['Kaporta / boya', 'task_results.body_paint', '59 nokta, parça kodu, mikron, değişen/boya, fotoğraf'],
      ['Motor üst mekanik', 'task_results.engine_checkup', '37 nokta motor, sıvı, kaçak, ses, akü, triger, yakıt ve soğutma kontrolü'],
      ['Alt / ön mekanik', 'task_results.underbody_mechanical', '40 nokta lift altı, aks, rot, salıncak, takoz, şanzıman, diferansiyel'],
      ['OBD / beyin test', 'task_results.obd_modules', '10 nokta beyin/modül tarama, aktif/geçmiş hata ve cihaz ekranı'],
      ['Airbag / SRS', 'task_results.airbag_srs', '9 nokta airbag ışığı, modül tarama, söküm yöntemi, emniyet kemeri'],
      ['Test sonuçları', 'task_results.test_station', 'Fren, süspansiyon, dyno, lastik/DOT, yanal kayma ve yol testi gerekçesi'],
      ['İç / dış kondisyon', 'task_results.condition_trim', 'Dış kondisyon, lastik, aydınlatma, iç trim, donanım ve kullanım izleri'],
      ['Conta kaçak testi', 'task_results.gasket_leak_test', 'Conta kaçak testi ölçümü, görsel kanıt ve teknisyen notu'],
      ['Kalite kilitleri', 'report_quality_gates', 'Eksik foto, eksik cihaz çıktısı, kalibrasyon ve müdür onayı'],
      ['Teslim ve arşiv', 'report_delivery_archive', 'PDF, QR, müşteri/bayi nüshası, teslim kanıtı, revizyon geçmişi']
    ],
    inspectionCatalog: [
      { source: 'İŞ EMRİ / ARAÇ KABUL FORMU', ototr: 'Araç Kabul / İş Emri', mobileTitle: 'Kabul ve Rıza', itemCount: 5, owner: 'Müşteri Kabul / Sekreterya', reportSection: 'Araç ve Taraf Bilgileri', inputPattern: 'Evet/Hayır, belge, fotoğraf, açıklama', evidence: 'Ruhsat, KM, kabul fotoğrafı, KVKK' },
      { source: 'ARAÇ DOSYA EKSPERTİZ RAPORU', ototr: 'Kayıt / Hasar / KM Sorguları', mobileTitle: 'Sorgu ve Dosya', itemCount: 9, owner: 'Müşteri Kabul / Sekreterya', reportSection: 'Hasar / KM / Kayıt', inputPattern: 'Var/Yok, tutar, tarih, açıklama', evidence: 'SBM, KM, vergi, muayene ekranı' },
      { source: 'MOTOR EKSPERTİZ VE CHECK-UP', ototr: 'Motor Üst Mekanik', mobileTitle: 'Motor Check-up', itemCount: 37, owner: 'Mekanik + OBD Ustası', reportSection: 'Motor-Mekanik Üst', inputPattern: 'İyi/Orta/Kötü, ölçüm, not, fotoğraf', evidence: 'Motor bölümü, sıvı, kaçak, akü, cihaz değeri' },
      { source: 'ALT / ÖN / MEKANİK EKSPERTİZ ve CHECK-UP', ototr: 'Alt / Ön Mekanik', mobileTitle: 'Lift Altı Kontrol', itemCount: 40, owner: 'Mekanik + OBD Ustası', reportSection: 'Alt / Ön Mekanik', inputPattern: 'İyi/Orta/Kötü, hasar/kaçak, not, fotoğraf', evidence: 'Lift altı, aks, rot, salıncak, şanzıman, diferansiyel' },
      { source: 'KAPORTA - BOYA EKSPERTİZ VE CHECK-UP', ototr: 'Kaporta / Boya Analizi', mobileTitle: 'Kaporta 59 Nokta', itemCount: 59, owner: 'Kaporta Ustası', reportSection: 'Kaporta-Boya Analizi', inputPattern: 'O/B/LB/D/ST/İ/PP, mikron, risk, fotoğraf', evidence: 'Mikron cihazı, parça fotoğrafı, boya haritası' },
      { source: 'OBD/BEYİN TEST', ototr: 'OBD / Beyin Test', mobileTitle: 'OBD Modül Taraması', itemCount: 10, owner: 'Mekanik + OBD Ustası', reportSection: 'Elektronik / OBD', inputPattern: 'Arıza yok/var, aktif/geçmiş kod, cihaz ekranı', evidence: 'OBD ekran çıktısı, modül listesi' },
      { source: 'FREN / SÜSPANSİYON TESTİ', ototr: 'Fren / Süspansiyon Testi', mobileTitle: 'Fren ve Süspansiyon', itemCount: 9, owner: 'Test Operatörü', reportSection: 'Fren / Süspansiyon / Lastik', inputPattern: 'Ölçüm, sapma, kabul limiti, sonuç', evidence: 'Fren/süspansiyon cihaz çıktısı' },
      { source: 'DYNO/ YOL TESTİ', ototr: 'Dyno / Yol Testi', mobileTitle: 'Dyno ve Yol Testi', itemCount: 5, owner: 'Test Operatörü', reportSection: 'Fren / Süspansiyon / Lastik', inputPattern: 'Güç, tork, ivmelenme, vites geçişi, çıktı', evidence: 'Dyno veya yol testi cihaz çıktısı' },
      { source: 'GENEL KONDİSYON / DIŞ EKSPERTİZ VE CHECK-UP', ototr: 'Genel Dış Kondisyon', mobileTitle: 'Dış Kondisyon', itemCount: 35, owner: 'Müşteri Kabul / Sekreterya', reportSection: 'Kondisyon / Donanım', inputPattern: 'İyi/Orta/Kötü, çalışıyor/çalışmıyor, fotoğraf', evidence: 'Dış genel, lastik, far, stop, jant fotoğrafları' },
      { source: 'İÇ EKSPERTİZ VE CHECK-UP', ototr: 'İç Ekspertiz ve Donanım', mobileTitle: 'İç Mekan / Donanım', itemCount: 46, owner: 'Müşteri Kabul / Sekreterya', reportSection: 'Kondisyon / Donanım', inputPattern: 'Çalışıyor/çalışmıyor, iyi/orta/kötü, not', evidence: 'İç mekan, torpido, klima, multimedya, döşeme' },
      { source: 'Airbag (Hava Yastıkları) Kontrol Testi', ototr: 'Airbag / SRS Kontrol Testi', mobileTitle: 'Airbag Kontrolü', itemCount: 9, owner: 'Mekanik + OBD Ustası', reportSection: 'Airbag / SRS', inputPattern: 'Işık, OBD, fiziki kontrol yöntemi, rıza, fotoğraf', evidence: 'Airbag/SRS ekranı, izin formu, kemer/toka fotoğrafı' },
      { source: 'CONTA KAÇAK TESTİ', ototr: 'Conta Kaçak Testi', mobileTitle: 'Conta Testi', itemCount: 1, owner: 'Mekanik + OBD Ustası', reportSection: 'Motor-Mekanik Üst', inputPattern: 'Test sonucu, ölçüm, not, fotoğraf', evidence: 'Conta kaçak test cihazı ve sonuç fotoğrafı' }
    ],
    rolePermissions: [
      ['Şube Sahibi', 'Kokpit, finans, kalite, personel, görev yönetimi, Academy, merkez talepleri', 'Teknik bulgu değiştiremez'],
      ['Şube Müdürü', 'Operasyon, usta görevleri, personel görevleri, müdür onayı, geri gönderme', 'Müdür onayından sonra revizyon açılır'],
      ['Müşteri Kabul / Sekreterya', 'Randevu, iş emri, kabul, basım, QR teslim, kendi görevleri', 'Teknik bulgu değiştiremez'],
      ['Usta / Teknisyen', 'Kendi teknik görevi, kendi personel görevi, kanıt, düzeltme', 'Finans ve ödeme bilgisi göremez'],
      ['Muhasebe / Kasa', 'Kasa, tahsilat, fatura, iade, royalty itiraz, kendi görevleri', 'Teknik rapor değiştiremez']
    ],
    archivePolicy: [
      'Silme yok; iptal, pasif, revizyon ve arşiv durumu var.',
      'Her dosya work_order_id, task_id veya report_id ile ilişkilendirilir.',
      'Müdür onayından sonra teknik alanlar kilitlenir; değişiklik revizyon oluşturur.',
      'QR teslim kanıtı, alıcı cihazı, gönderim zamanı ve kullanıcı ile saklanır.',
      'Cihaz çıktısı kalibrasyon durumuyla birlikte rapora bağlanır.'
    ]
  };
  window.OTOTR_DEALER_API_MODEL = model;
})();
