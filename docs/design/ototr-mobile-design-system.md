# OTOTR Usta Mobil Uygulama — Design System

Bu dosya Codex için mobil uygulamanın ana tasarım sistemidir. Tüm ekranlar bu kurallara göre uygulanmalıdır.

## 1. Ana Tasarım Kararı

OTOTR Usta Mobil Uygulama açık, kurumsal, premium ve operasyon odaklı bir mobil arayüz olacaktır.

- Koyu tema kullanılmayacak.
- Ana renk dili: beyaz, kırık beyaz, grafit ve OTOTR kırmızısı.
- Uygulama profesyonel servis/otomotiv hissi vermeli.
- Ekranlar sade ama zengin görünmeli.
- Gereksiz ikon büyütme, aşırı gölge, yoğun gradient veya karmaşık arka plan kullanılmayacak.
- Mobil alan verimli kullanılacak.

## 2. Renk Paleti

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

Tüm ana ekranlarda üst alan beyazdan başlamalı, aşağı indikçe pastel kırmızı yoğunluğu artmalıdır.

Zeminde çok hafif dalga/tarama/dot pattern olmalıdır. Bu desen metni bastırmamalı, arka planı çiğ göstermemeli, sadece kurumsal bir doku vermelidir.

Örnek CSS yaklaşımı:

```css
.app-bg {
  background:
    radial-gradient(circle at 50% 100%, rgba(227, 6, 19, 0.13), transparent 42%),
    linear-gradient(180deg, #FFFFFF 0%, #FFF9F8 36%, #FFF3F2 68%, #FFE6E4 100%);
}
```

## 4. Kart Standardı

Kartlar beyaz ve kurumsal kalmalı, fakat düz/çiğ beyaz görünmemelidir.

```txt
Background: #FFFFFF
Border: 1px solid #E5E7EB
Radius: 20-24px
Shadow: 0 10px 30px rgba(15,23,42,0.06)
Padding: 16-20px
```

Kart içlerinde çok hafif gri tarama veya dalga dokusu kullanılabilir. Doku opaklığı düşük olmalıdır.

## 5. Buton Standardı

### Primary Button

- OTOTR kırmızısı gradient.
- Beyaz metin.
- Radius 16px civarı.
- Ana CTA ekranda tek ve net olmalı.

```css
background: linear-gradient(135deg, #E30613 0%, #B8000B 100%);
```

### Secondary Button

- Beyaz zemin.
- Grafit metin.
- İnce border.
- Hafif gölge.

### Danger / Warning / Success

- Danger: rapor engelleyici eksik, onaydan döndü, hata.
- Warning: uyarı, eksik ama raporu engellemeyen durum.
- Success: tamamlandı, onaylandı, senkronize edildi.

## 6. Alt Navigasyon

Alt navigasyon tüm ana ekranlarda tutarlı olacaktır:

```txt
Ana Sayfa
İşlerim
Tara
Bildirimler
Profil
```

Kurallar:

- Ortadaki `Tara` butonu kırmızı, yuvarlak ve yükseltilmiş FAB gibi olacak.
- Aktif sekme kırmızı olacak.
- Pasif ikonlar grafit/gri olacak.
- Bildirim badge kırmızı olacak.
- Alt navigasyon safe area ile uyumlu olacak.
- CTA butonları alt navigasyonla çakışmayacak.

## 7. Tipografi

```txt
Ana başlık: 28-32px / 700-800
Ekran başlığı: 22-26px / 700
Kart başlığı: 16-18px / 700
Body: 13-15px / 400-500
Caption: 11-12px
Sayısal değerler: 24-32px / 700-800
```

Türkçe karakterler doğru görünmelidir.

## 8. İkon ve Görsel Standardı

- İkonlar sade, çizgisel ve profesyonel olmalı.
- İkonlar gereksiz büyütülmemeli.
- Araç görselleri premium ama alanı boğmayacak boyutta olmalı.
- Liste ekranlarında araç görselleri kompakt kalmalı.
- Gerektiğinde hafif gölge/yansıma kullanılabilir ama kart yüksekliğini artırmamalıdır.

## 9. Component Standardı

Codex mümkün olduğunca reusable component oluşturmalıdır:

```txt
AppScreen
AppHeader
BottomNavigation
FloatingScanButton
PrimaryButton
SecondaryButton
OutlineButton
DangerButton
TextInput
PasswordInput
SearchBar
FilterButton
SegmentedTabs
Chip
Toggle
RadioRow
StatusBadge
StatCard
VehicleSummaryCard
WorkOrderCard
ProgressRing
ProgressBar
ModuleCard
ModuleRow
EvidenceCard
IssueCard
EmptyState
ErrorState
LoadingSkeleton
OfflineBanner
SyncStatusCard
Timeline
ActionPanel
BottomSheet
PhotoGrid
CameraOverlay
```

## 10. Yasaklar

- Koyu tema üretme.
- Google / Apple giriş ekleme.
- Kayıt ol ekranı ekleme.
- Usta tipi seçim alanı ekleme.
- Mavi rengi ana tema yapma.
- Mevcut ERP/CRM ana prototipini bozma.
