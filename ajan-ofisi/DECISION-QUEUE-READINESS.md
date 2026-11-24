# Ortak karar kuyruğu

Durum: Yerel SQL ve sentetik uçtan uca testler hazır. Migration uygulanmadı, ekran bağlantısı yok; canlı ortak kuyruk henüz mevcut değil.

## Akış

Yetkili merkez yöneticisi kendi mevcut çalışma alanında karar masasını açıkça başlatır. Başlatan hesap masanın sahibi olur; başka hesap masayı ele geçiremez. Bu kayıt kişiyi otomatik olarak Sami diye tanımlamaz ve mevcut erişim yetkisini genişletmez.

Bir görev yöneticisi yalnız kaynak sürümü değişmemiş, ayrı kişi tarafından incelenmiş TASK2 teslimi için karar planı açabilir. Plan bulgu, incelenmiş kanıt, öneri, risk, efor ve istenen kararı içerir. Planın kendisini de üreticisinden farklı bir görev yöneticisi gerekçesiyle inceler. Ancak bundan sonra karar masasının sahibine yanıtlanabilir madde olarak görünür. Tüm risk sınıflarında inceleme uygulanır; örnekleme gevşetilmemiştir.

Karar sahibi yanıt veya gerekçeli iptal kaydeder. Yanıt görev durumunu, para kuralını, ekspertiz raporunu veya müşteri mesajını değiştirmez. Sonraki işin uygulanması ayrı yetkili kaynak adaptörüne aittir.

## Kapasite

- İnceleme bekleyen planlar ve yanıt bekleyen maddeler toplam en fazla 10 adettir. Masa satırı kilidi ortak kapasite kontrolünü sıralar.
- Aynı görev, kaynak sürümü ve karar anahtarı tekrar açılamaz. Ağ tekrarları ayrı iş oluşturmaz.
- Planlanan inceleme günü bugünden itibaren 14 günlük pencere içinde seçilir. Günlük rezervasyon ve gerçekleşmiş süre toplamı 45 dakikayı, haftalık toplam 840 dakikayı aşacak yeni kayıt açılmaz.
- Takvim Europe/Istanbul, hafta başlangıcı pazartesidir.
- Gerçek süre karar sahibinin beyanıdır; çalışma süresi ölçen arka plan zamanlayıcısı değildir. Gerçekte oluşan aşım gizlenmez veya kaydı reddedilmez; yeni rezervasyonlar durur.
- Kaynağı değişen madde güncel değil diye görünür, yanıtlanamaz; kapasiteden düşmesi için sahibi gerekçeyle iptal eder.

## Kanıt ve sınırlar

`tests/office-decision-queue-sql.test.mjs` gerçek migration SQL'ini izole PGlite üzerinde sentetik hesaplarla çalıştırır. Masa sahipliği, şema erişimi, zorunlu plan, incelenmiş kaynak, tekrar istek, bağımsız plan incelemesi, yalnız sahibin yanıtlaması, etkin inceleyen, on birinci maddenin reddi, eski kaynak ve zaman bütçesi test edilir. Gerçek çalışan veya karar kaydı oluşturulmadı.

Bu altyapı henüz tüm ERP süreçleri için merkezi durdurma mekanizması değildir. Bağlanacak üretici adaptörleri kapasiteye uymalı; eski görev düzenleyicisi ve ayrı modüller otomatik olarak bu kuyruğa bağlanmış sayılmaz. Departman sorumlusu eşlemesi bulunmadan bir ajanın insan adına yetkili işlem yaptığı iddia edilemez.

## Kalan entegrasyon

1. Açık masa kurulumu, iki ayrı inceleme/karar listesi ve güncel kaynak uyarılı ekran.
2. Kaynak sürümü ve kayıt sürümü ile işlem yapan istemci; ağ tekrarında sabit istek kimliği.
3. Ofis özetinde gerçek kuyruk kapsamı, kapasite ve yalnız sahibinin kararları.
4. Migration uygulama, anonim/rol kontrolleri, canlı salt-okunur ve mobil doğrulama.
5. Gerçek departman sahipliği, diğer kaynak adaptörleri ve iş üretim kapıları.
