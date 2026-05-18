(function(){
  const model = {
    version: 'dealer-portal-api-v1',
    basePath: '/api/dealer-portal',
    entities: [
      { table: 'dealer_tenants', label: 'Bayi', key: 'dealer_id', purpose: 'Bayi sahibi, sözleşme, royalty ve marka standart kaydı' },
      { table: 'dealer_branches', label: 'Şube', key: 'branch_id', purpose: 'Lokasyon, kapasite, cihaz, kasa ve kalite kapsamı' },
      { table: 'dealer_staff', label: 'Personel', key: 'staff_id', purpose: 'Rol, yetki, evrak, vardiya, Academy ve aktif/pasif kullanıcı' },
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
      ['PATCH', '/tasks/:taskId/technical-entry', 'Usta tablet teknik girişlerini kaydetme'],
      ['POST', '/tasks/:taskId/evidence', 'Fotoğraf, cihaz çıktısı ve video kanıtı yükleme'],
      ['POST', '/reports/:reportId/manager-approval', 'Müdür onayı veya ustaya geri gönderme'],
      ['POST', '/reports/:reportId/delivery', 'PDF basım, QR gönderim ve dijital teslim kanıtı'],
      ['POST', '/reports/:reportId/revisions', 'Revizyon açma, eski versiyonu arşivde saklama'],
      ['POST', '/finance/royalty-disputes', 'Royalty itirazı ve belge yükleme akışı']
    ],
    reportMapping: [
      ['Araç kimliği', 'work_orders.vehicle_identity', 'Plaka, şasi, motor no, marka-model, yıl, kilometre'],
      ['Taraflar ve rıza', 'work_orders.parties_and_consents', 'Alıcı, satıcı, ruhsat sahibi, KVKK, yol testi, paylaşım izni'],
      ['Kaporta / boya', 'task_results.body_paint', '58 nokta, parça kodu, mikron, değişen/boya, fotoğraf'],
      ['Mekanik', 'task_results.mechanical', 'Motor, şanzıman, alt takım, fren, süspansiyon, yağ/sızıntı'],
      ['OBD / elektronik', 'task_results.obd', 'Modül tarama, aktif/geçmiş hata, airbag/SRS, akü, cihaz ekranı'],
      ['Test sonuçları', 'task_results.test_station', 'Fren, süspansiyon, dyno, lastik/DOT, yol testi gerekçesi'],
      ['Kalite kilitleri', 'report_quality_gates', 'Eksik foto, eksik cihaz çıktısı, kalibrasyon ve müdür onayı'],
      ['Teslim ve arşiv', 'report_delivery_archive', 'PDF, QR, müşteri/bayi nüshası, teslim kanıtı, revizyon geçmişi']
    ],
    rolePermissions: [
      ['Şube Sahibi', 'Kokpit, finans, kalite, personel, Academy, merkez talepleri', 'Teknik bulgu değiştiremez'],
      ['Şube Müdürü', 'Operasyon, usta görevleri, müdür onayı, geri gönderme', 'Müdür onayından sonra revizyon açılır'],
      ['Müşteri Kabul / Sekreterya', 'Randevu, iş emri, kabul, basım, QR teslim', 'Teknik bulgu değiştiremez'],
      ['Usta / Teknisyen', 'Kendi teknik görevi, kanıt, düzeltme', 'Finans ve ödeme bilgisi göremez'],
      ['Muhasebe / Kasa', 'Kasa, tahsilat, fatura, iade, royalty itiraz', 'Teknik rapor değiştiremez']
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
