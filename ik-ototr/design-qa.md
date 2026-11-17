# İK OTOTR görsel kontrolü

18 Kasım 2026. Referans: korunan G708 İK2 şablonu. Bu çalışma yeni OTOTR varyantıdır; merkez/bayi paneli ve birim seçici bilinçli eklemelerdir.

Korunanlar: sol menü, renkler, ikonlar, çalışan kartları, özlük kartları, tablo/form düzeni ve mobil alt gezinme. Yeni panelde dört birim kartı, çalışan/talep/eğitim/ücret göstergeleri, doğum günleri ve bekleyen işler yer alır.

Masaüstü ve 390×844 mobil görünüm incelendi. Mobilde tek sütun birim kartları, iki sütun göstergeler ve erişilebilir birim seçici görüldü; document genişliği375px ve viewport390px, yatay sayfa taşması yok. İlk sekmenin ekran yakalama ölçeği bozulduğunda yeni önizleme sekmesinden gerçek ölçekte tekrar kontrol edildi. Yerel kanıtlar görev outputs/ik2-gorsel/ototr klasöründedir; kaynak kişisel veriler repoya eklenmedi.

İşlev kontrolünde seçili bayi dışında kişilerin çalışan listesi ve bordroda görünmediği, merkez görünümüne dönüşte tüm12 kişinin korunduğu, düzenlenen özlük bilgisinin merkezde de göründüğü doğrulandı. Bayi müdürünün merkez yöneticisinin form seçeneklerinden düşmesi düzeltildi ve regresyon testi eklendi. Kontrol edilen ekranlarda engelleyici görsel hata veya tarayıcı konsol hatası gözlenmedi.


## 18 Kasım 2026 — gerçek hesap kapsamı ve eşitleme

Sunucuda dört ayrı birim belgesi, özel üyelik tablosu, RLS ve sürüm kontrollü kayıt RPCsi uygulandı. 125 CI testi, SQL rol/yetki/çakışma testleri geçti. İnegöl örnek kullanıcı bağlantısı transaction içinde sınanıp geri alındı; gerçek giriş hesabı oluşturulmadı. Canlı Gebze hesabı yalnızca kendi 3 çalışanını görüyor. İki sekmede DEMO-SYNC-008 telefon denemesi aktarıldı ve DEMO-TEL-008 değerine geri alındı.
