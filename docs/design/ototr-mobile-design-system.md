# OTOTR Usta Mobil Uygulama — Design System

Bu dosya Codex için mobil uygulamanın ana tasarım sistemidir. Tüm ekranlar bu kurallara göre uygulanmalıdır.

## 1. Ana Tasarım Kararı

- Uygulama **dark theme** olmayacak.
- Ana tema: açık, kurumsal, premium, servis/otomotiv hissi veren mobil arayüz.
- Renk dili: beyaz, kırık beyaz, grafit ve OTOTR kırmızısı.
- Üst alan beyaz başlar, alta indikçe pastel kırmızı yoğunluğu artar.
- Zemin ve kartlarda çok hafif dalga/tarama/dot pattern kullanılır.
- Kartlar beyaz kalır ama düz/çiğ görünmez.
- Tasarım dili tüm ekranlarda aynı kalır.

## 2. Renk Tokenları

```txt
Primary Red: #E30613
Primary Red Dark: #B8000B
Primary Red Soft: #FFE5E3
Background Top: #FFFFFF
Background Mid: #FFF8F7
Background Bottom: #FFE7E5
Card: #FFFFFF
Graphite Text: #111827
Secondary Text: #64748B
Muted Text: #94A3B8
Border: #E5E7EB
Success: #16A34A
Warning: #F97316
Danger: #DC2626
Info: #2563EB
Evidence Purple: #7C3AED
```

## 3. Zemin Standardı

Tüm ana ekranlarda aşağıdaki mantık uygulanır:

- Üst kısım neredeyse beyaz.
- Orta alanda çok hafif pembe/kırmızı geçiş.
- Alt alanda pastel kırmızı daha hissedilir.
- Çok hafif dalga/tarama/dot pattern.
- Pattern metin okunabilirliğini bozmaz.

CSS yaklaşımı:

```css
.app-bg {
  background:
    radial-gradient(circle at 50% 100%, rgba(227, 6, 19, 0.13), transparent 42%),
    linear-gradient(180deg, #FFFFFF 0%, #FFF9F8 36%, #FFF3F2 68%, #FFE6E4 100%);
}
```

## 4. Kart Standardı

```txt
Background: #FFFFFF
Border: 1px solid #E5E7EB
Radius: 20-24px
Shadow: 0 10px 30px rgba(15,23,42,0.06)
Padding: 16-20px
```

Kart içinde düşük opaklıkta gri tarama/dalga dokusu olabilir. Kartlar kirli veya yoğun görünmemeli.

## 5. Butonlar

Primary button:

```css
background: linear-gradient(135deg, #E30613 0%, #B8000B 100%);
color: #FFFFFF;
border-radius: 16px;
```

Secondary button:
- Beyaz zemin
- Grafit metin
- İnce border
- Hafif gölge

Durum renkleri:
- Başarı: yeşil
- Uyarı: turuncu
- Kritik/hata: kırmızı
- Bilgi: mavi sadece bilgi durumunda kullanılabilir; ana tema mavi olmayacak.

## 6. Alt Navigasyon

Alt navigasyon tüm ana ekranlarda aynı olacak:

```txt
Ana Sayfa
İşlerim
Tara
Bildirimler
Profil
```

Kurallar:
- Ortadaki `Tara` FAB kırmızı, yuvarlak ve yükseltilmiş.
- Aktif sekme kırmızı.
- Pasif sekmeler grafit/gri.
- Bildirim badge kırmızı.
- CTA butonları alt navigasyonla çakışmayacak.

## 7. Tipografi

```txt
Ana başlık: 28-32px, 700-800
Ekran başlığı: 22-26px, 700
Kart başlığı: 16-18px, 700
Body: 13-15px, 400-500
Caption: 11-12px
Sayısal değer: 24-32px, 700-800
```

## 8. Görsel Kullanımı

- Araç görselleri sade, premium ve alanı verimli kullanır.
- Liste kartlarında araçlar çok büyük olmaz.
- Gerekirse hafif gölge/yansıma kullanılabilir.
- Kamera ve kanıt ekranlarında mock preview kullanılabilir.

## 9. Yasaklar

- Koyu tema üretme.
- Google / Apple giriş ekleme.
- Kayıt ol ekranı ekleme.
- Usta tipi seçim alanı ekleme.
- Mavi rengi ana tema yapma.
- Çiğ kırmızı veya aşırı yoğun zemin kullanma.
