# Bağımsız ruhsat servisi — 0.2.0

Bu paket `oto-tr.com` dosyalarını, veritabanını ve mevcut web sunucusunu değiştirmez. Kurulum henüz yapılmış değildir. Hosting sağlayıcısı, işletim sistemi, boş kaynaklar ve ayrı süreç/alt alan desteği doğrulanmadan canlı sunucuda komut çalıştırılmamalıdır.

## Barındırma kararı

- Mevcut hosting Linux container/kalıcı Python süreci ve yeterli bağımsız kaynak sağlıyorsa ayrı uygulama ve ayrı dizin kullanın. Başlangıç kaynak sınırı 2 CPU / 4 GB RAM'dir; gerçek yükte gecikme ve bellek ölçülerek boyutlandırılmalıdır. Eğitim bu süreçte çalışmaz.
- Paylaşımlı Windows/IIS veya yalnız dosya yükleme destekli hosting bu paketin çalışacağı anlamına gelmez. Ayrı Linux sanal sunucuya kurup ERP ile HTTPS API üzerinden bağlayın.
- `ocr.oto-tr.com` yalnız önerilen adrestir; oluşturulmuş değildir. Mevcut `oto-tr.com` DNS kaydını değiştirmeyin.
- CPU sınırı toplam makine izolasyonu sağlamaz; çalışan ERP ile kaynak paylaşılacaksa ayrı VM/container kapasitesi ve bakım planı onaylanmalıdır.

## Ayrı Linux ortamında kurulum

1. Bu klasörü ayrı bir dizine alın. Örnek fotoğraf kurgusaldır; müşteri ruhsatları, eski runtime klasörü ve Windows venv kopyalanmaz.
2. `.env.example` dosyasını `.env` olarak kopyalayın, `chmod 600 .env` uygulayın. HTTPS adresini ve iki ayrı rastgele anahtarı ayarlayın (ör. `python -c "import secrets; print(secrets.token_urlsafe(32))"` komutunu güvenilir sunucu terminalinde iki kez). Anahtarları sohbete, Git'e veya web kaynak koduna koymayın.
3. `docker compose build` ve `docker compose up -d` çalıştırın. Uygulama yalnız sunucunun `127.0.0.1:18765` adresine açılır; 80/443 portlarını veya mevcut ERP'yi devralmaz.
4. `curl --fail http://127.0.0.1:18765/api/ready` ile modellerin hazır olduğunu kontrol edin. `/api/health` sunucu modunu bildirir. Tek worker kullanılır; aynı anda ikinci okuma 429 döndürür.
5. Ayrı alt alan için TLS reverse proxy kurun. `Caddyfile.example` sadece yeni sanal host örneğidir; mevcut proxy dosyasının yerine yazılmaz. Yönetim erişimini mümkünse VPN/ERP yönetici yetkisiyle sınırlandırın.
6. Önce kurgusal `web/sample.png` ile uçtan uca test edin. Bilgisayardaki tüneli durdurmadan, yeni sunucunun ayrı adresinden çalıştığını ve yeniden başlatma sonrası hazır olduğunu doğrulayın.

## ERP sınırı

Tarayıcıdan doğrudan kullanımda OCR ve yönetim kodu sayfa belleğinde girilir; e-posta girişi yoktur. Üretim ERP entegrasyonunda mevcut oturum ve rol kontrolünü kullanan dar bir sunucu adaptörü tercih edilir. OCR anahtarı ERP sunucusunda tutulur; OCR servisine mevcut ERP veritabanı erişimi verilmez. Adaptörün eklenmesi mevcut yazılımcıyla ayrı değişiklik olarak değerlendirilmelidir.

OCR uç noktası `POST /api/v1/ruhsat/oku` ham görsel baytlarını alır. Başlıklar: `Authorization: Bearer <OCR anahtarı>`, `X-OTOTR-Client: ruhsat-lab`, `Content-Type: image/jpeg`. Parametreler: `mode=fast|detailed`, `preprocessing=standard|contrast`, `review_threshold=0.90`, `vin_threshold=0.95`, `rotation=0|90|180|270`, `auto_rotate=true`, `rectify=false`. JSON `analysed.Data` araç alanlarıdır. `seller_suggestion` sadece geçici bellekte gösterilir; adres ve sahip bilgileri iş emrine yazılmaz.

GitHub Pages frontend'i için `python publish_web.py --output ../ruhsat --api-base https://<doğrulanmış-OCR-host> --server` kullanılabilir. Önce HTTPS/CORS/anahtar ve örnek okuma doğrulanmalıdır. Komut kendi başına GitHub'a push veya dağıtım yapmaz. Üretim `oto-tr.com` tarayıcısı için CORS mevcut haliyle açık değildir; ERP sunucu adaptörü CORS gerektirmez. Domain izinleri ayrıca açık bir allowlist ile eklenmelidir.

## Gizlilik, geri bildirim ve eğitim

Ham fotoğraf/alan değeri kaydedilmez. Sahip bilgileri geçicidir. Anonim geri bildirim yalnız alan adı, düzeltme bayrağı, ilk okumada boş olma, puan, yöntem/sürüm ve rastgele istek kimliği içerir. SQLite yalnız `feedback` volume'ündedir. Yedekleme bu volume için yapılır; görüntü yedeği yoktur. Request body ve Authorization başlıklarını proxy/APM loglarına eklemeyin. Uygulama erişim logu kapalıdır.

Geri bildirim otomatik model eğitimi değildir. Gerçek eğitim ayrı, kullanıcı tarafından onaylanan bir veri toplama adımıdır. Önce farklı ışık/açı/belge türlerini kapsayan küçük bir pilot; ardından yüzlerce doğrulanmış örnek. Aynı belgeye/araç kimliğine ait kırpımlar aynı veri bölümünde kalmalı; eğitim, doğrulama ve hiç görülmemiş test setleri ayrılmalıdır. Sahip kimliği/adresi ve tam ruhsatlar eğitim deposuna otomatik alınmaz. Plaka/şasi de bağlanabilir tanımlayıcılardır; açık onay olmadan eğitim için saklanmaz.

Yeni OCR ağı ayrı GPU ortamında eğitilip ONNX'e aktarılır. Alan bazında tam eşleşme, karakter hatası, boş alan oranı, yanlış kabul ve gecikme mevcut modelle karşılaştırılır. Başarılı aday ayrı sürüm olarak insan onayıyla açılır. Bu sürümde eğitim, model yükleme ve otomatik terfi uç noktası yoktur.

## Geri dönüş ve kabul

Önceki container görüntüsünü sürüm etiketiyle saklayın; yeni görüntüyü ayrı portta kurgusal testle kontrol edin. Geçişte yalnız OCR proxy hedefi/API adresi değişir. Sorunda eski OCR görüntüsüne dönün; ERP veritabanı migrasyonu yoktur. `docker compose down` kalıcı feedback volume'ünü korur; `down -v` kullanmayın.

Canlı kabul: TLS, yetkisiz OCR/yönetim 401, `/api/ready` 200, kurgusal alanların eşleşmesi, feedback'te metin saklanmaması, servis restart sonrası çalışma, gerçek müşteri verisi olmadan ERP taslağına aktarım ve bilgisayar kapalıyken bağımsız sunucudan çalışma.
