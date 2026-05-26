# Bayi Personel Gorev Yonetimi

Bu plan, bayi panelindeki personel gorev alaninin canli sisteme tasinirken korunmasi gereken kapsam ve kurallari ozetler.

## Kapsam

- Bayi veya sube muduru kendi subesindeki personele gorev acar.
- Gorev baslik, aciklama, kategori, oncelik, son teslim tarihi, tahmini sure ve checklist ile olusturulur.
- Personel sadece kendi rolune atanan gorevleri gorur.
- Bayi ve sube muduru tum sube gorevlerini, gecikenleri, onay bekleyenleri ve personel is yukunu gorur.
- Tamamlanan gorevler istege bagli bayi/mudur onayina duser.
- Geri gonderme, not ve kapanis bilgisi yorum/aktivite gecmisi olarak saklanir.
- Gorev silme yerine `Iptal`, `Geri Gonderildi` veya `Tamamlandi` durumlari kullanilir.

## Canli Veri Modeli

Ana tablolar:

- `dealer_staff_tasks`
- `dealer_staff_task_comments`
- `dealer_staff_task_attachments`
- `dealer_staff_task_checklist_items`
- `dealer_staff_task_activity_logs`

Temel alanlar:

- `dealer_id`
- `branch_id`
- `created_by_user_id`
- `assigned_to_user_id`
- `title`
- `description`
- `category`
- `priority`
- `status`
- `due_at`
- `estimated_minutes`
- `requires_approval`
- `approved_by_user_id`
- `approved_at`
- `completed_at`

## Yetki Kurallari

- `Sube Sahibi`: kendi subesindeki tum gorevleri gorur, acar, onaylar ve iade eder.
- `Sube Muduru`: kendi subesindeki operasyonel gorevleri gorur, acar, onaylar ve iade eder.
- `Musteri Kabul / Sekreterya`: sadece kendine veya rolune atanmis gorevleri gorur.
- `Usta / Teknisyen`: sadece kendi teknik/personel gorevlerini gorur.
- `Muhasebe / Kasa`: sadece finans/kasa kapsamindaki kendi gorevlerini gorur.

## Fazlar

1. MVP: gorev acma, atama, oncelik, son tarih, durum, onay ve gecikme takibi.
2. Operasyon: dosya eki, checklist maddesi tek tek kapatma, yorumlar ve detayli aktivite logu.
3. Otomasyon: bildirimler, tekrarlayan gorevler, sure uzatma talebi ve gecikme alarmi.
4. Raporlama: personel performansi, ortalama kapanis suresi, kategori bazli gecikme ve Excel disa aktarim.
