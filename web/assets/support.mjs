const dialog=document.querySelector('#customerSupport');
const answers={
 home:{title:'Doğru ekibe ulaşın.',text:'Konunuzu seçerek kısa bilgiye ve ilgili işlem ekranına ulaşabilirsiniz.',links:[]},
 packages:{title:'Önce kontrol kapsamını seçin.',text:'Temel, Uzman, Dolu Dolu ve OTOTR 360 Güvence paketlerinin içeriklerini karşılaştırın. Kararsızsanız randevu formunda Kararsızım seçebilirsiniz; şubemizle birlikte netleştirebilirsiniz.',links:[['Paketleri karşılaştır','/web/paketler#comparison'],['Paket seçmeden talep bırak','/web/randevu?paket=Karars%C4%B1z%C4%B1m']]},
 booking:{title:'Randevu talebiniz nasıl ilerler?',text:'Şube ve paketi seçin, iletişim bilgilerinizi ve tarih tercihinizi iletin. Kaydınız tamamlanınca talep numaranızı görürsünüz. Tarih ve saat şubeyle görüşülerek kesinleşir. Mevcut talebiniz için şubenize kayıt numaranızla ulaşabilirsiniz.',links:[['Randevu talebi oluştur','/web/randevu'],['Şubeye ulaş','/web/subeler']]},
 report:{title:'Raporunuzla ilgili destek',text:'Mevcut raporunuzu OTOTR doğrulama ekranından kontrol edebilirsiniz. Bir bulguyu anlamak veya geri bildirim iletmek için raporu düzenleyen şubeyle görüşün. Bu bilgi merkezi araç hakkında teşhis koymaz ve rapor bulgularını değiştirmez.',links:[['Raporu doğrula','https://ototr.com/rapor-sorgula'],['Geri bildirim ve iletişim','/web/iletisim']]},
 franchise:{title:'OTOTR iş ortaklığı',text:'İlgilendiğiniz bölgeyi, yer durumunu ve yatırım planınızı başvuru formuyla paylaşın. Başvurunuz franchise ekibince değerlendirilir. Başvuru tek başına bayilik hakkı veya ticari taahhüt oluşturmaz.',links:[['Franchise başvurusu','/web/franchise']]}
};
const answer=document.querySelector('#supportAnswer');
function topic(name){const a=answers[name]||answers.home;answer.replaceChildren();const h=document.createElement('h3'),p=document.createElement('p');h.textContent=a.title;p.textContent=a.text;answer.append(h,p);for(const [label,url]of a.links){const link=document.createElement('a');link.className='text-link';link.href=url;link.textContent=label;answer.append(link);}dialog.querySelectorAll('[data-topic]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.topic===name)));}
let opener=null;
document.querySelectorAll('[data-support]').forEach(button=>button.addEventListener('click',()=>{opener=button;topic(button.dataset.support);dialog.showModal();if(button.dataset.support==='whatsapp')branch.focus();else dialog.querySelector('.support-close').focus();document.documentElement.classList.add('support-open');}));
dialog.querySelector('.support-close').addEventListener('click',()=>dialog.close());
dialog.addEventListener('close',()=>{document.documentElement.classList.remove('support-open');opener?.focus();});
const branch=document.querySelector('#supportBranch'),whatsapp=document.querySelector('#supportWhatsapp');
const approvedNumbers=new Set(['905355684260','905304463306']);
function updateWhatsApp(){const ok=approvedNumbers.has(branch.value);whatsapp.hidden=!ok;if(ok)whatsapp.href='https://wa.me/'+branch.value+'?text='+encodeURIComponent('Merhaba, OTOTR ekspertiz hizmetleri hakkında bilgi almak istiyorum.');else whatsapp.removeAttribute('href');}
branch.addEventListener('change',updateWhatsApp);updateWhatsApp();
dialog.querySelectorAll('[data-topic]').forEach(b=>b.addEventListener('click',()=>topic(b.dataset.topic)));
