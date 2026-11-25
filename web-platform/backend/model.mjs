export const ORIGINS=['https://oto-tr.com','https://www.oto-tr.com','https://samivolkan.github.io','http://127.0.0.1:8878'];
export const PACKAGES=['Temel','Uzman','Dolu Dolu','OTOTR 360 Güvence','Kararsızım'];
export function validateIntake(kind,input,today=new Date().toLocaleDateString('en-CA',{timeZone:'Europe/Istanbul'})){
 if(!['appointment','franchise'].includes(kind)||!input||Array.isArray(input))throw Error('Geçersiz form.');
 const s=(name,max=160)=>String(input[name]??'').trim().slice(0,max);
 if(s('website'))throw Error('Form doğrulanamadı.');
 const phone=s('phone').replace(/[\s()+-]/g,'').replace(/^90/,'0');
 if(s('fullName').length<3||!/^05\d{9}$/.test(phone))throw Error('Ad soyad ve geçerli cep telefonu gerekli.');
 if(input.kvkkConsent!==true)throw Error('Aydınlatma metnini okuduğunu belirtmelisin.');
 const p={fullName:s('fullName',120),phone,kvkkConsent:true,note:s('note',1200),test:input.test===true};
 if(kind==='appointment'){
  if(!/^[a-z0-9-]{2,101}$/.test(s('branchSlug'))||!PACKAGES.includes(s('service')))throw Error('Şube ve paket seçmelisin.');
  const date=s('preferredDate'),parsed=new Date(date+'T12:00:00Z');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(parsed.getTime())||parsed.toISOString().slice(0,10)!==date||date<today||parsed-new Date(today+'T12:00:00Z')>90*86400000)throw Error('Önümüzdeki 90 gün içinde geçerli bir tarih seç.');
  const time=s('preferredTime');if(!['Sabah','Öğleden sonra','Fark etmez'].includes(time))throw Error('Saat tercihini seç.');
  return {...p,branchSlug:s('branchSlug'),service:s('service'),preferredDate:date,preferredTime:time};
 }
 if(s('province').length<2||s('district').length<2||input.processingConsent!==true)throw Error('İl, ilçe ve başvuru değerlendirme izni gerekli.');
 if(!['Yeni yatırım','Mevcut işletmeyi dönüştürme'].includes(s('applicationType')))throw Error('Başvuru türünü seç.');
 if(!['Henüz belirlenmedi','Yer araştırıyorum','Yerim hazır'].includes(s('hasLocation')))throw Error('Yer durumunu seç.');
 return {...p,province:s('province',80),district:s('district',80),applicationType:s('applicationType'),hasLocation:s('hasLocation'),budget:s('budget',80),processingConsent:true};
}
export function validateContent(input){
 const s=(k,n)=>String(input[k]??'').trim().slice(0,n);
 if(!['branch','blog'].includes(input.kind)||!['draft','published','archived'].includes(input.status))throw Error('İçerik türü veya durum geçersiz.');
 if(!/^[a-z0-9][a-z0-9-]{1,100}$/.test(s('slug',101))||s('title',180).length<3)throw Error('Başlık ve geçerli sayfa adresi gerekli.');
 const d=input.details||{}; const details={};
 for(const k of ['city','district','address','phone','hours','mapsUrl','author','category'])details[k]=String(d[k]??'').trim().slice(0,500);
 if(details.mapsUrl&&!/^https:\/\/(?:www\.)?(?:google\.com\/maps|maps\.google\.com\/|maps\.app\.goo\.gl\/)/.test(details.mapsUrl))throw Error('Geçerli Google Haritalar bağlantısı gerekli.');
 if(input.status==='published'&&(s('summary',500).length<30||s('body',30000).length<100))throw Error('Yayın için özgün özet ve en az 100 karakter içerik gerekli.');
 if(input.kind==='branch'&&input.status==='published'&&(!details.address||!details.phone||!details.city||!details.district||!input.branch_id))throw Error('Yayın için ERP şubesi, adres ve telefon gerekli.');
 if(input.kind==='branch'&&input.status==='published'&&!/^\+?[0-9 ()-]{10,20}$/.test(details.phone))throw Error('Geçerli şube telefonu gerekli.');
 return {kind:input.kind,slug:s('slug',101),title:s('title',180),summary:s('summary',500),body:s('body',30000),details,status:input.status,branch_id:input.kind==='branch'?input.branch_id||null:null};
}
