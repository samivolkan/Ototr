export const demoApplication=Object.freeze({fullName:'DEMO Aday - Ajan Ofisi',phone:'00000000000',applicationType:'Sıfırdan franchise yatırımcısı',budget:'3M - 5M TL',region:'Marmara',province:'Bursa',district:'Osmangazi',hasLocation:'Görüşmek istiyorum',squareMeters:'450',dailyTarget:'10',note:'DEMO - Gerçek kişi değildir. Web başvurusu ve FRA-01 görev ataması bağlantı testi.'});
export function validDemoApplication(input){return !!input&&Object.keys(input).length===Object.keys(demoApplication).length&&Object.entries(demoApplication).every(([k,v])=>input[k]===v);}
export function mirrorDemoRecord(list,application,response){
 if(!validDemoApplication(application)||!response?.application_id||!response?.task_id)throw Error('Doğrulanmış demo başvuru yanıtı gerekli.');
 return [{...application,id:response.application_id,taskId:response.task_id,createdAt:response.created_at,cityDistrict:'Bursa / Osmangazi',source:'Web → sunucu → FRA-01 · DEMO',status:'Sunucu demo kaydı · FRA-01 yönetici incelemesi',demo:true},...(Array.isArray(list)?list:[]).filter(x=>x.id!==response.application_id)];
}
