# Design QA — Toplu Akordeon Kontrolü

## Karşılaştırma hedefi

- Kaynak görsel: `C:\Users\SAMIVO~1\AppData\Local\Temp\codex-clipboard-08854307-c59c-45e1-a02d-e99df4ca26da.png`
- Kaynak piksel ölçüsü: 710 × 921 px.
- Uygulama: `http://127.0.0.1:4176/sunum-32-ekran-v2/Main.dc.html?page=12&qa=accordion-all`
- Uygulama kanıtı: Codex in-app Browser üzerinde kapalı, tümü açık ve koyu tema ekran görüntüleri.
- Tarayıcı viewport: 1280 × 720 CSS px, DPR 1.
- Sunum sahnesi: 672 × 1000 CSS px tasarım; viewport içinde 483.84 × 720 px ölçüsüne orantılı ölçeklendi.
- Durum: Mekanik Ekspertiz; toplu akordeon kapalı/açık ve açık/koyu tema.

## Tam görünüm karşılaştırması

- Başlık simgesi, kaynak görselde işaretlenen aynı konum ve 52 × 52 px boyutta korundu.
- Simge artık tüm alt grupları birlikte açıp kapatıyor; `AÇ` / `KAPAT` rozeti eylemi görünür kılıyor.
- Kart sırası, görsel, tipografi, renkler, alt özet ve navigasyon değişmeden korundu.
- Tüm gruplar açıkken mevcut içerik alanındaki dikey kaydırma sayesinde alt maddeler erişilebilir kalıyor.

## Odaklı karşılaştırma

- Başlık kontrolünün tıklama alanı, durum rozeti, odak ve `aria-expanded` durumu kontrol edildi.
- Tekil akordeonlar toplu kontrolden sonra da bağımsız açılıp kapanıyor.
- Koyu temada rozet, ikon, başlık ve kart kontrastı korunuyor.
- Motor ve Beyin / OBD sayfalarında aynı davranış ayrıca doğrulandı.

## Bulgular ve karşılaştırma geçmişi

- P0/P1/P2 görsel veya işlevsel bulgu yok.
- Tarayıcı konsol hatası yok.
- İlk uygulamada toplu aç/kapat işlevi, görünür durum rozeti ve doğru erişilebilirlik durumu eklendi.
- Son kontrolde mekanik, motor ve standart test sayfalarında toplu açma/kapatma; tekil akordeon; kaydırma; açık/koyu tema doğrulandı.

## Takip cilası

- P3: İstenirse `AÇ / KAPAT` rozeti sonraki tasarım turunda yalnızca ikon durumuna indirgenebilir; mevcut metinli rozet uzaktan kullanımda daha anlaşılırdır.

final result: passed
