# OTOTR Flutter Rapor Omurgası Uygulama Planı

Bu plan, `OTOTR_CODEX_TEK_DOSYA.md` içindeki doğru iş kurallarını mevcut Flutter/Dart MVP yapısına uyarlamak için hazırlanmıştır. Amaç yeni ve kopuk bir Next.js/Kotlin monorepo açmak değil, mevcut saha uygulamasını rapor doğruluğu, kanıt, onay, revizyon ve QR doğrulama akışına hazırlamaktır.

## Ana karar

Mevcut ürün omurgası Flutter/Dart olarak korunacak. Kotlin/Jetpack Compose ayrı bir uygulama kararı olarak şimdilik ertelenecek. Web admin gerekiyorsa backend şeması sabitlendikten sonra ayrıca değerlendirilecek.

Raporun müşteri çıktısı serbest metinden oluşmayacak. Usta ekranındaki yapılandırılmış kontrol maddeleri, kanıtlar, dış sorgular ve kalite onayı raporun tek veri kaynağı olacak.

## Faz 1 - Flutter yayın kilidi

Tamamlanan ilk teknik adım:

- `ReportConsistencyValidator` eklendi.
- `ReportGateIssueCode` ile makine tarafından okunabilir blokaj kodları eklendi.
- Mevcut `ReportGateCalculator` bu validator üzerinden çalışacak şekilde güncellendi.
- UI'nin kullandığı `blockingReasons` korunarak geriye uyumluluk sağlandı.

Bu fazın kapsadığı kurallar:

- Başlangıç kanıtı eksikse rapor kilitlenmez.
- Teknik görev tamamlanmadan rapor kilitlenmez.
- Riskli bulguda not zorunludur.
- Riskli bulguda kanıt gerekiyorsa fotoğraf/cihaz çıktısı zorunludur.
- Kontrol yapılamadıysa neden notu zorunludur.
- Tamamlanan görevde müşteri dili özeti boş bırakılamaz.
- Riskli bulgu varken müşteri özeti "sorunsuz/risk yok/problem yok" diyemez.
- Dış sorgular rapora aktarılmadan yayın kapısı açılmaz.
- KVKK, ödeme, sekreterya ve müdür onayı blokajları ayrı kodlarla izlenir.
- Senkron bekleyen kritik kayıt varsa yayın kapısı açılmaz.

## Faz 2 - Kalıcı veri modeli

Flutter modelleri sabitlendikten sonra Supabase/PostgreSQL tarafına şu çekirdek tablolar taşınmalı:

- `expertise_cases`
- `inspection_tasks`
- `inspection_item_values`
- `inspection_evidence_assets`
- `external_query_results`
- `report_gate_issues`
- `report_revisions`
- `report_audit_logs`

Kritik not: Kilitli raporda doğrudan update sadece uygulama servisinde değil, veritabanı seviyesinde de engellenmeli. Revizyon ve audit log kuralları trigger/RLS ile korunmalı.

İlk SQL taslağı hazırlandı:

- `docs/migrations/2026-05-24-expertise-report-backbone.sql`

Bu migration mevcut Flutter alanlarını şu şekilde karşılar:

- `TechnicianWorkOrder` -> `expertise_cases`
- `StartEvidence` -> `technician_start_evidence`
- `TechnicianTask` -> `inspection_tasks`
- `TechnicianChecklistItem` -> `inspection_item_values`
- `EvidenceAsset` -> `inspection_evidence_assets`
- `ExternalQuery` -> `external_query_results`
- `ReportGateIssue` -> `report_gate_issues`
- Müdür onayı/kilit -> `approve_expertise_case(...)`
- Revizyon açma -> `request_expertise_case_revision(...)`
- Audit geçmişi -> `report_audit_logs`

Migration Supabase SQL Editor veya migration runner ile çalıştırılmadan önce staging veritabanında denenmelidir. `auth.uid()` kullanan RLS fonksiyonları Supabase ortamı hedeflenerek yazılmıştır; düz PostgreSQL üzerinde test edilecekse Supabase auth şeması yoksa bu kısım geçici olarak yorum satırına alınmalıdır.

## Faz 3 - QR doğrulama

QR doğrulama public endpoint olarak tasarlanacak ama KVKK verisi göstermeyecek. Token ile dönecek veri minimum olmalı:

- Rapor no
- Şube adı
- Araç plaka maskesi veya kontrollü plaka gösterimi
- Marka/model/yıl
- Rapor durumu
- Revizyon no
- Onay/tarih bilgisi
- Müşteri raporu satırları

Telefon, T.C./vergi no, açık adres, ödeme ve iç kalite notları public doğrulamada dönmemeli.

## Faz 4 - Backend/API

Backend seçimi yapılırken mevcut mobil akış korunmalı. API önce Flutter uygulamasının ihtiyaçlarına göre tasarlanmalı:

- Günlük işler
- İşe başlama kanıtı
- Teknik görev kaydı
- Kanıt yükleme
- Rapor kapısı hesaplama
- Müdür onayı
- Rapor teslimi
- Revizyon talebi
- QR doğrulama

Supabase Storage veya S3 uyumlu storage kullanılacaksa dosya tipi, boyut, imzalı URL, silme yetkisi ve kalite reddi politikası ayrıca tanımlanmalı.

## Faz 5 - Flutter remote repository katmanı

İlk geçiş katmanı hazırlandı:

- `lib/data/remote/work_order_remote_dto.dart`
- `lib/data/remote/work_order_remote_data_source.dart`
- `lib/data/services/work_order_remote_mapper.dart`
- `lib/data/repositories/remote_work_order_repository.dart`
- `lib/data/repositories/supabase_work_order_repository.dart`

Bu fazda gerçek Supabase paketi bilinçli olarak eklenmedi. Amaç mevcut demo uygulamayı bozmadan, Supabase client geldiğinde sadece `WorkOrderRemoteDataSource` implementasyonu yazılacak hale getirmektir.

Geçiş mantığı:

- SQL satırları DTO sınıflarına alınır.
- `WorkOrderRemoteMapper` DTO bundle'ı `TechnicianWorkOrder` domain modeline çevirir.
- `SupabaseWorkOrderRepository` async repository kontratını uygular.
- Mevcut `DummyWorkOrderRepository` yerinde kalır; ekranlar hazır olduğunda dependency injection ile remote repository'ye geçirilebilir.

Güncel durum:

- `supabase_flutter` bağımlılığı eklendi.
- `lib/data/remote/supabase_work_order_data_source.dart` eklendi.
- Data source şu işlemleri gerçek Supabase tablolarına göre hazırlar:
  - görünür iş emirlerini listeleme,
  - tek iş emri bundle okuma,
  - işi sahiplenme,
  - başlangıç kanıtı upsert,
  - teknik görev update,
  - teknik görevi submit etme.

Not: Uygulama henüz default olarak Supabase repository'ye geçirilmedi. Bunun için Supabase URL/anon key ve giriş akışı netleşince `Supabase.initialize(...)` ve repository seçimi eklenmelidir.

Güncel bağlantı durumu:

- `main.dart` içinde `AppRepositories.instance.configureSupabase()` çağrısı eklendi.
- Supabase konfigürasyonu `--dart-define` ile okunur:
  - `OTOTR_SUPABASE_URL`
  - `OTOTR_SUPABASE_ANON_KEY`
- Staging test login'i için opsiyonel değerler:
  - `OTOTR_SUPABASE_TEST_EMAIL`
  - `OTOTR_SUPABASE_TEST_PASSWORD`
- Bu değerler yoksa demo repository çalışmaya devam eder.
- Bu değerler varsa `Supabase.initialize(...)` çalışır ve `SupabaseWorkOrderRepository` aktif olur.
- `TechnicianJobsScreen`, `TechnicianTasksScreen`, `StartEvidenceScreen`, `TechnicianTaskFormScreen` ve `TechnicianReportGateScreen` remote repository varsa Supabase akışını kullanacak şekilde bağlandı.

Çalıştırma örneği:

```bash
flutter run \
  --dart-define=OTOTR_SUPABASE_URL=https://YOUR_PROJECT.supabase.co \
  --dart-define=OTOTR_SUPABASE_ANON_KEY=YOUR_ANON_KEY \
  --dart-define=OTOTR_SUPABASE_TEST_EMAIL=ahmet.usta@ototr.test \
  --dart-define=OTOTR_SUPABASE_TEST_PASSWORD=demo123456
```

Güvenlik notu: `anon key` istemci uygulamada kullanılabilir public anahtardır; service role key kesinlikle Flutter uygulamasına konulmamalıdır.

## Faz 6 - Supabase staging seed

Staging ortamında gerçek bağlantı testi için demo seed dosyası hazırlandı:

- `docs/migrations/2026-05-24-demo-seed-expertise-case.sql`

Uygulama sırası:

1. Supabase SQL Editor'da `2026-05-24-expertise-report-backbone.sql` çalıştır.
2. Supabase Authentication altında test kullanıcısı oluştur.
3. Test kullanıcısının `auth.users.id` değerini al.
4. Seed dosyasında `app_users.auth_user_id` için `null` olan Ahmet Usta satırını bu UUID ile değiştir veya seed sonrasında şu update'i çalıştır:

```sql
update app_users
set auth_user_id = 'AUTH_USER_UUID_BURAYA'
where email = 'ahmet.usta@ototr.test';
```

5. `2026-05-24-demo-seed-expertise-case.sql` dosyasını çalıştır.
6. Flutter'ı Supabase `URL` ve `anon key` ile başlat.

Seed şu demo akışını oluşturur:

- OTOTR Bursa Nilüfer şubesi
- Ahmet Usta teknisyen kullanıcısı
- Murat Kaya şube müdürü
- Mehmet Yılmaz müşteri kaydı
- 2020 Volkswagen Passat aracı
- Premium 360 paketli bir ekspertiz dosyası
- Kaporta, mekanik, OBD ve yol testi görevleri
- Başlangıç kanıtı eksik demo hali
- Riskli kaporta bulgusu
- Bekleyen Tramer/SBM dış sorgusu
- Rapor kapısında görünmesi gereken blokaj örnekleri
