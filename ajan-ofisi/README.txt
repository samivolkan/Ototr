OTOTR AJAN OFISI — FAZ 1

Guncel teslim: 7 ekip, 18 uzman (8 aktif kapsam / 10 beklemede).
Onceki 199 ajanli prototip gecersiz; teknik arsiv olarak tutuldu.

ACMA
1. Node.js kurulu olmali (bu bilgisayarda mevcut).
2. Bu klasorde Baslat.cmd dosyasini acin veya terminalde: node runtime/server.cjs
3. http://127.0.0.1:8874/ adresini acin.
4. Sunucusuz delivery.html dosyasi tek basina okunabilir.

DURUM
Kod yazma, dis mesaj, uretim baglantisi ve otomatik Codex yurutucusu yok.
Yerel kaynak snapshot/plan denetimi gercek; bagimsiz anlamsal bekci baglantisi bekleniyor.
Sunucu yalniz 127.0.0.1 adresinde dinler. Bosken model/token kullanmaz.
Calismasi icin bilgisayar ve sunucu acik olmali; bu bir bulut hizmeti degildir.
Kayitlar runtime/data/state.json icinde kalir; disariya gonderilmez.
Plan kanitlari snapshot'tir; kaynaktaki sonraki degisiklikler otomatik alinmaz.
Sami karari web ekraninda elle kaydedilir; kod/finans kuralini otomatik degistirmez.

TEST
node --test runtime/phase1.test.cjs

Teslim dosyasi: delivery.html
Gorsel denetim: design-qa.md
Dogrulama kaydi: verification.json

SABAH OZETI
Sunucu aciksa her gun 08:30 Turkiye saatinde runtime/data/summaries/YYYY-MM-DD.json olusur. Sunucu kapaliysa sonraki acilista o gunun ozeti telafi edilir. Dis mesaj veya model cagrisi yapilmaz.

ERP ENTEGRASYONU
ERP menusunun en ustunde Ajan Ofisi basligi bulunur. Barindirilan sayfa salt-okunurdur; /api istekleri veya localhost baglantisi otomatik yapilmaz. Canli kuyruk/karar islemleri icin PC uzerinde yerel sunucu gerekir. GitHub Pages Node sunucusunu calistirmaz.
Yeni Yazilim/Sosyal Medya ekipleri ve yonetici rolleri roadmap.json icinde planlidir; henuz uygulanmadi.

23 KASIM KAYNAK INCELEMESI
Finans ve Franchise bu Codex oturumunda iki ayri incelemeciyle incelendi.
6 cikti BEK-01 tarafindan bagimsiz kaynak denetiminden gecti. Uygulama onayi yok.
review-state.json yalniz kamuya uygun durum/rapor kaydidir; ham ajan gunlugu degildir.
Sayfa 15 saniyede bir dosyayi okur; GitHub Pages yayin gecikmesi olabilir.
Bu bir surekli ajan sunucusu veya otomatik calistirma servisi degildir.
Yeni kosularin durumlari koordinator tarafindan yayinlanmalidir.
ERP yazma, gercek veri, ticari karar ve dis mesaj yetkileri kapali kalir.
