# Codex Görevi — Windows PC'de Yerel Demo Başlatma

## Kök neden

Kullanıcı Windows PC'de `http://127.0.0.1:8787` adresini açamıyor.

`127.0.0.1`, internet üzerinde yayımlanan bir adres değildir. Yalnızca Node.js sunucusunun gerçekten çalıştığı aynı bilgisayarı gösterir. Uygulama daha önce başka bir çalışma ortamında çalıştırıldığı için kullanıcının PC'sindeki tarayıcı o sürece erişemez.

## Codex'e verilecek görev

Aşağıdaki talimatı `samivolkan/Ototr` deposunda, `codex/x-kaza-plaka-mvp` dalı seçiliyken çalıştır:

> `x-kaza-monitor` modülünü Windows 10/11 üzerinde temiz bir kurulum gibi çalıştır. Kullanıcının `http://127.0.0.1:8787` adresine girememesinin nedenini doğrula. Mevcut `AGENTS.md` talimatlarını uygula. Kök neden sunucu sürecinin kullanıcının PC'sinde başlamamış olmasıysa, bunu yalnız HOST değiştirerek kapatma. Teknik bilgisi sınırlı kullanıcı için tek tıkla çalışan `x-kaza-monitor/OTOTR_DEMO_BASLAT.bat` ve gerekirse PowerShell yardımcı betiği ekle. Başlatıcı Node.js 20+ ve npm kontrolü yapsın; eksikse Türkçe hata versin ve pencereyi kapatmasın. `server/.env` yoksa `.env.example` üzerinden oluştursun; yerel demo için `HOST=127.0.0.1`, `PORT=8787`, `DEMO_MODE=true` kullansın. `node_modules` yoksa `npm install` çalıştırsın. Sunucuyu başlatsın, `/api/health` 200 dönene kadar sınırlı süre beklesin ve ardından varsayılan tarayıcıyı otomatik açsın. Port doluysa PID/proses bilgisini anlaşılır göster veya güvenli alternatif port seç. Başarısızlıkta Türkçe hata özeti ve log dosyası konumu göster. Ayrıca `npm run doctor` veya eşdeğer bir tanı komutu ekle; işletim sistemi, Node/npm sürümü, çalışma dizini, gizli değerleri göstermeden env durumu, host/port, port kullanımı, node_modules, yazma izni, statik dosyalar ve health sonucu raporlansın. README'ye “Windows'ta en kolay çalıştırma” bölümü ekle ve `127.0.0.1` adresinin ancak uygulama aynı PC'de çalışıyorsa açılacağını açıkça yaz. `npm run check` ve `npm test` çalıştır; Windows yol ayırıcılarını, demo modunda X token olmadan açılışı ve ikinci kez başlatma davranışını doğrula. Değişiklikleri yeni bir Codex dalına commit et ve PR hazırla.`

## İncelenecek dosyalar

- `x-kaza-monitor/server/src/server.mjs`
- `x-kaza-monitor/server/src/env.mjs`
- `x-kaza-monitor/server/.env.example`
- `x-kaza-monitor/server/package.json`
- `x-kaza-monitor/README.md`

## Kabul ölçütleri

1. Kullanıcı repo veya ZIP klasörünü Windows PC'ye aldıktan sonra `OTOTR_DEMO_BASLAT.bat` dosyasına çift tıklayarak uygulamayı açabilir.
2. Başarılı durumda tarayıcı otomatik olarak doğru porta açılır.
3. Başarısız durumda konsol kapanmaz ve Türkçe, eyleme dönük hata verir.
4. X/OpenAI/API anahtarları kaynak koda veya loglara yazılmaz.
5. `/api/health` ve ana HTML 200 döner.
6. Mevcut testler bozulmaz.
7. Aynı bilgisayardan loopback erişimi ile başka cihazdan LAN erişimi README'de birbirinden ayrılır.
