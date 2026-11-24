export function activityCount(team,value){
 const keys={FRA:['approvals','finance_pending','finance_failed'],FIN:['finance_pending'],REV:['preparing','waiting','human'],SALE:['openTasks']}[team];
 if(!keys||!value||!keys.every(k=>Number.isSafeInteger(value[k])&&value[k]>=0))return null;
 return keys.reduce((n,k)=>n+value[k],0);
}
export function activityActive(record,now=Date.now()){return !!record&&Number.isSafeInteger(record.count)&&record.count>0&&now>=record.at&&now-record.at<90000;}
