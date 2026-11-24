export const steps=[
 {team:'FRA',owner:'OTOTR Franchise · başvuru uzmanı',title:'Örnek başvuru alındı',next:'İlçe, yatırım takvimi ve işletmeci deneyimi için ilk görüşme soruları hazırlanıyor.'},
 {team:'FRA',owner:'OTOTR Franchise · yönetici',title:'İlk görüşme paketi inceleniyor',next:'Demo adayın yanıtları ve eksik belgeleri kontrol ediliyor.'},
 {team:'FRA',owner:'OTOTR Franchise · yönetici',title:'Finans’a devir teklif edildi',next:'Alıcı kabulü bekleniyor. Sorumluluk hâlâ Franchise ekibinde.'},
 {team:'FIN',owner:'OTOTR Finans · inceleme uzmanı',title:'Finans devri kabul etti',next:'Kaynak paketini ve ödeme planı sorularını inceliyor. Gerçek tutar veya ticari kural belirlenmiyor.'},
 {team:'FIN',owner:'OTOTR Finans · inceleme uzmanı',title:'Finans değerlendirmesi hazır',next:'Eksik mali belgeler ve görüşme önerisi koordinatöre iletiliyor.'},
 {team:null,owner:'Sami · demo karar sahibi',title:'Senden karar bekleniyor',next:'Adayla ayrıntılı görüşmeye geçilsin mi? Bu karar bayi açılışı, sözleşme veya ödeme onayı değildir.'},
 {team:'FRA',owner:'OTOTR Franchise · başvuru uzmanı',title:'Demo karar ekibe iletildi',next:'Ayrıntılı görüşme hazırlık görevi tamamlanıyor. Adaya gerçek mesaj gönderilmiyor.'},
 {team:null,owner:'Koordinatör',title:'Örnek iş tamamlandı',next:'Başvuru incelendi, Finans devri kabul edildi, demo karar kaydedildi ve sonraki görüşme hazırlığı tamamlandı. Gerçek bayi açılmadı.'}
];
export function advanceSimulation(index,action='tick'){
 if(!Number.isInteger(index)||index<0||index>=steps.length)throw Error('Geçersiz adım');
 if(action==='restart')return 0;
 if(index===5)return action==='approve'?6:action==='revise'?1:5;
 if(action!=='tick')return index;
 return Math.min(index+1,steps.length-1);
}
