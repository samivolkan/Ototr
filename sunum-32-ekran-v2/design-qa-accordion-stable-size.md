# Design QA — Akordeon Sabit Boyut

## Karşılaştırma hedefi

- Kaynak görsel: `C:\Users\SAMIVO~1\AppData\Local\Temp\codex-clipboard-2c47d1a1-830c-4f56-97bf-7c620f9204f2.png`
- Kaynak piksel ölçüsü: 509 × 853 px.
- Uygulama: `http://127.0.0.1:4176/sunum-32-ekran-v2/Main.dc.html?page=13&qa=fixed-accordion-width`
- Uygulama kanıtı: Codex in-app Browser üzerinde kapalı ve tümü açık akordeon ekran görüntüleri.
- Tarayıcı viewport: 1280 × 720 CSS px, DPR 1.
- Sunum sahnesi: 672 × 1000 CSS px tasarım; viewport içinde 0,72 oranında ölçeklendi.
- Durum: Beyin / OBD / Elektronik; tüm alt maddeler kapalı ve açık.

## Ölçüm karşılaştırması

- Kaydırma alanı kapalı/açık: 360,00 × 507,60 px / 360,00 × 507,60 px.
- Kaydırma alanı CSS istemci ölçüsü: 490 × 705 px / 490 × 705 px.
- Üst görsel genişliği: 350,64 px / 350,64 px.
- İlk kart genişliği: 350,64 px / 350,64 px.
- Motor ve Mekanik sayfalarında aynı ölçülerin korunduğu ayrıca doğrulandı.

## Görsel değerlendirme

- Yazı karakterleri, satır yükseklikleri ve kart hiyerarşisi değişmedi.
- Kaydırma payı kapalı durumda da ayrıldığı için kartlar açılırken yatay sıçrama oluşmuyor.
- İçerik alanı 705 px yüksekliğinde sabitlendiği için sayfa açılırken dikey ölçek değişmiyor.
- Görsel, renk ve metin içeriğine müdahale edilmedi.

## Bulgular ve karşılaştırma geçmişi

- P2: Akordeon açıldığında kaydırma alanı doğal içerik yüksekliğinden 705 px'e büyüyor ve kaydırma çubuğu genişlik değişimine neden oluyordu.
- Düzeltme: `height:705px`, `box-sizing:border-box` ve `scrollbar-gutter:stable` eklendi.
- Son kontrol: Motor, Mekanik ve standart test sayfalarında kapalı/açık ölçüleri eşleşti.
- Tarayıcı konsol hatası yok.

final result: passed
