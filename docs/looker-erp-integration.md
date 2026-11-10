# OTOTR ERP · Looker canlı pano entegrasyonu

## Durum

ERP tarafındaki görünüm ve güvenli `/api/looker/embed-url` sözleşmesi hazırdır. Gerçek pano açılması için Looker Embed lisansı, Looker instance alan adı, dokuz dashboard kimliği ve sunucu tarafı API kimliği gerekir.

## Güvenlik modeli

1. ERP kullanıcısı mevcut oturumuyla kimlik doğrular.
2. Tarayıcı yalnızca izin verilen pano anahtarını (`ceo`, `region`, `branch` vb.) gönderir.
3. Sunucu rolü, şubeyi ve bölgeyi `req.user` üzerinden belirler. İstemciden rol/şube/bölge kabul edilmez.
4. Sunucu Looker `Create Signed Embed URL` API ile 15 dakikalık, tek kullanımlık URL üretir.
5. LookML `access_filter` kuralları `ototr_region_id` ve `ototr_branch_id` user attribute değerlerini veri satırlarına uygular.
6. URL yalnızca HTTPS yanıtında tarayıcıya döner; loglanmaz, diske yazılmaz ve önbelleğe alınmaz.

Örnek endpoint sözleşmesi:

```js
router.post('/api/looker/embed-url', requireSession, async (req,res,next) => {
  try {
    const result=await createSignedEmbedUrl({
      lookerApi:req.app.locals.lookerApi,
      user:req.user,
      dashboardKey:req.body.dashboard,
      lookerHost:process.env.LOOKER_HOST,
      embedDomain:process.env.ERP_EMBED_DOMAIN
    });
    res.set('Cache-Control','no-store').json(result);
  } catch (error) {
    res.status(error.status||500).json({message:error.status?error.message:'Looker oturumu oluşturulamadı.'});
  }
});
```

## LookML veri sınırı

Her Explore için yalnızca dashboard filtresi kullanmak yeterli değildir. Veri erişimi model katmanında zorunlu tutulmalıdır:

```lookml
access_filter: {
  field: dim_branch.region_id
  user_attribute: ototr_region_id
}
access_filter: {
  field: dim_branch.branch_id
  user_attribute: ototr_branch_id
}
```

Genel merkez için `%` kullanımının veri tabanında beklenen eşleme olduğunu doğrulayın; uygun değilse ayrı model/rol veya güvenli bir scope tablosu kullanın.

## Gerekli ortam değişkenleri

- `LOOKER_HOST=https://analytics.example.com`
- `ERP_EMBED_DOMAIN=https://oto-tr.com`
- `LOOKER_DASHBOARD_CEO` ve diğer sekiz dashboard kimliği
- Looker SDK/API kimliği yalnızca secret manager veya sunucu ortamında

## Canlıya geçiş kapıları

- Embed edition/lisans ve Embed Domain Allowlist doğrulandı.
- ERP rolleri gerçek kimlik sağlayıcısıyla eşlendi.
- Her rol için pozitif ve negatif veri sızıntısı testi yapıldı.
- LookML production deploy tamamlandı; geliştirme içeriğinin embed'de görünmeyeceği kontrol edildi.
- URL, token ve müşteri verilerinin loglara düşmediği doğrulandı.
- Performans, mobil görünüm, erişilebilirlik ve hata ekranı UAT'den geçti.
