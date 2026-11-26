import {reportProgress,taskProgress,elapsed} from './branch-operations-model.mjs';
export function customerView(c,now=Date.now()){
 const tasks=c.tasks||[],presentation=tasks.find(t=>t.station==='presentation');
 const verifiedReady=c.presentationReady===true&&!!c.reportVersion&&c.printedReportVersion===c.reportVersion&&c.presentationReadyVersion===c.reportVersion;
 const presenting=presentation?.status==='active',finished=presentation?.status==='completed';
 const report=reportProgress(c),ready=verifiedReady&&report.pct===100,intake=taskProgress(tasks.find(t=>t.station==='intake'));
 const techItems=tasks.filter(t=>['body','mechanical'].includes(t.station)).flatMap(t=>t.items||[]).filter(i=>i.required!==false&&i.applicable!==false);
 const tech=techItems.length?Math.round(techItems.filter(i=>i.done===true).length/techItems.length*100):null;
 const status=finished?'Sunum tamamlandı':presenting?'Raporunuz anlatılıyor':ready?'Aracınız sunuma hazır':report.pct===100?'Raporunuz son kontrolde':'Ekspertiz devam ediyor';
 return {id:c.id,plate:c.plate,ready:ready&&!presenting&&!finished,status,message:finished?'Teslim işlemleri için müşteri danışmanınız sizi yönlendirecek.':presenting?'Uzmanımız sonuçları sizinle birlikte değerlendiriyor.':ready?'Lütfen sunum alanına geçiniz.':report.pct===100?'Son kontrolün ardından sizi sunum alanına davet edeceğiz.':'Kontroller tamamlandığında sizi sunum alanına davet edeceğiz.',reportPct:report.pct,elapsedMinutes:Number.isFinite(elapsed(c,now))?Math.floor(elapsed(c,now)/60000):null,steps:[{title:'Araç kabul',value:intake.pct===null?'Bilgi bekleniyor':'%'+intake.pct,done:intake.pct===100},{title:'Teknik kontroller',value:tech===null?'Bilgi bekleniyor':'%'+tech,done:tech===100},{title:'Rapor hazırlığı',value:report.pct===null?'Bilgi bekleniyor':'%'+report.pct,done:report.pct===100},{title:'Rapor sunumu',value:finished?'Tamamlandı':presenting?'Sunumda':ready?'Hazır':'Sırada',done:finished}]};
}
