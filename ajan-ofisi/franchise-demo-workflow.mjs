// Fixed synthetic scenario. It does not claim expert execution or business approval.
export const stages=['Yönetici incelemesi','Görevler devredildi','Demo alındı kayıtları','Hazırlık paketleri hazır','Sami karar başlıkları'];
export const actions=['Demo incelemeyi ilerlet ve görevleri devret','Demo alındı kayıtlarını işle','Demo hazırlık paketlerini oluştur','Koordinatör karar özetini hazırla'];
export const packages=[
 {id:'FRA-02',manager:'MGR-FRA',team:'FRA',title:'Sözleşme ve izin kanıtları',finding:'Demo adayın iletişim ve veri işleme izinleri yok.',recommendation:'İzin kanıtları ve sözleşme sürümü doğrulanmadan gerçek iletişim başlatma.',risk:'veri',effort:'5 dk inceleme önerisi',decision:'Gerçek iletişim için önce izin kanıtı gerekir.',evidence:'supabase/migrations/20261123221232_franchise_web_demo_agent_task.sql:25-28'},
 {id:'FRA-03',manager:'MGR-FRA',team:'FRA',title:'Lokasyon hazırlığı',finding:'Demo başvuruda lokasyon için görüşme talebi var; ruhsat kanıtı yok.',recommendation:'Adres, kullanım amacı, ruhsat ve teknik uygunluk belgelerini soru listesine ekle.',risk:'veri',effort:'5 dk inceleme önerisi',decision:'Eksik kanıt toplama planı mı, bekletme mi?',evidence:'ajan-ofisi/franchise-web-demo-model.mjs:1-8'},
 {id:'FIN-04',manager:'MGR-FIN',team:'FIN',title:'Bedel ve royalty seçenekleri',finding:'Demo bütçe beyanı finansal yeterlilik kanıtı değildir; bedel veya oran kararı yok.',recommendation:'Mevcut onaylı kural sürümü ve yeterlilik kanıtı geldikten sonra seçenek/etki analizi hazırla.',risk:'para',effort:'5 dk inceleme önerisi',decision:'Seçenek analizi hazırlansın mı? Bedel, oran ve iskonto onayı ayrı kalır.',evidence:'ajan-ofisi/management-data.mjs:1-58'},
 {id:'FIN-02',manager:'MGR-FIN',team:'FIN',title:'Tahsilat hazırlık kontrolü',finding:'Bu demo için ödeme, banka kanıtı veya tahsilat yetkisi oluşturulmadı.',recommendation:'Onaylı sözleşme, bayi kimliği ve finans kabulü gelene kadar tahsilatı kapalı tut.',risk:'para',effort:'5 dk inceleme önerisi',decision:'Tahsilat kararı istenmiyor; kanıt ve yetki kapısı kapalı.',evidence:'ajan-ofisi/management-data.mjs:1-58'}
];
export function workflowView(task){
 const step=Number.isInteger(task.workflow_step)&&task.workflow_step>=0&&task.workflow_step<=4?task.workflow_step:0;
 return {step,title:stages[step],next:actions[step]||null,taskStatus:step===0?'Yönetici incelemesi bekliyor':step===4?'Sami karar başlıkları hazır · DEMO':stages[step],
 packages:step?packages.map(p=>({...p,key:`${task.task_id}:${p.id}`,status:step===1?'Devredildi · demo':step===2?'Alındı · demo':'Hazırlık hazır · denetim bekliyor'})):[],
 decisions:step===4?[
 {id:'D1',title:'Eksik kanıtları toplama planıyla devam mı, adayı bekletme mi?',recommendation:'Öneri: önce eksik kanıt listesi. Gerçek temas, izin kanıtı gelene kadar kapalı.',effect:'Devam seçeneği yalnız hazırlık kapsamını belirler; yatırımcı kabulü veya açılış onayı değildir.',minutes:5},
 {id:'D2',title:'Finans mevcut kurallarla seçenek ve etki analizi hazırlasın mı?',recommendation:'Öneri: onaylı kural sürümü ve yeterlilik kanıtı beklenerek analiz kapsamını belirle.',effect:'Bedel, royalty, iskonto ve tahsilat değişmez. BEK-01 bağımsız denetimi yapılmadan mali onay istenmez.',minutes:5}
 ]:[]};
}
