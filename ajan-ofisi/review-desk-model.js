(function(root){'use strict';
 const delay=7200000;
 function seed(){return [{id:'demo-1',stars:5,comment:'İşlemler açık anlatıldı, ekibe teşekkür ederiz.',text:'',readyAt:null,dueAt:null,cancelled:false},{id:'demo-2',stars:4,comment:'Bilgilendirme iyiydi; randevu başlangıcında biraz bekledik.',text:'',readyAt:null,dueAt:null,cancelled:false}];}
 function ready(item,text,now=Date.now()){if(!text.trim()||text.length>4000)throw Error('Yanıt 1–4000 karakter olmalı.');return {...item,text:text.trim(),readyAt:now,dueAt:now+delay,cancelled:false};}
 function cancel(item){return {...item,cancelled:true,dueAt:null};}
 function state(item,now=Date.now()){if(item.cancelled)return 'İptal edildi · gönderim yok';if(!item.readyAt)return 'Yeni yorum · taslak hazırlanmadı';if(now>=item.dueAt)return 'Süre doldu · demo olduğu için gönderilmez';const minutes=Math.ceil((item.dueAt-now)/60000);return `Taslak hazır · ${Math.floor(minutes/60)} sa ${minutes%60} dk kaldı`;}
 const api={seed,ready,cancel,state,delay};if(typeof module!=='undefined')module.exports=api;root.ReviewDesk=api;
})(typeof window!=='undefined'?window:globalThis);
