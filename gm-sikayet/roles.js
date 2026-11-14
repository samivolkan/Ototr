(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.OTOTRRoles=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const BRANCHES=["Kocaeli Gebze","Bursa İnegöl","Bursa Nilüfer"];
  const REGION_OF={"Kocaeli Gebze":"Marmara","Bursa İnegöl":"Marmara","Bursa Nilüfer":"Marmara"};
  const USER_REGION="Marmara";
  // scope: all = tüm veri, region = kullanıcının bölgesi, branch = yalnız kullanıcının şubesi
  const ROLES={
    "Genel Müdür":{scope:"all",lim:1e9,note:1,ayar:1,rap:1,hk:1,hkw:1,ikv:1,ikw:1,egt:1,apr:1,caseWrite:1,inboxWrite:1,reviewWrite:1,perfWrite:1},
    "Bölge Müdürü":{scope:"region",lim:5000,note:1,ayar:0,rap:1,ikv:1,egt:1,apr:1,caseWrite:1,inboxWrite:1,reviewWrite:1,perfWrite:1},
    "Şube Müdürü":{scope:"branch",lim:1000,note:0,ayar:0,rap:0,caseWrite:1,inboxWrite:1,reviewWrite:1},
    "Şikâyet Sorumlusu":{scope:"branch",lim:0,note:1,ayar:0,rap:0,caseWrite:1,inboxWrite:1,reviewWrite:1},
    "Hukuk":{scope:"all",lim:0,note:1,ayar:0,rap:1,hk:1,hkw:1,caseWrite:0,inboxWrite:0,reviewWrite:0},
    "Kalite":{scope:"all",lim:0,note:1,ayar:0,rap:1,hk:1,ikv:1,egt:1,apr:1,dofv:1,caseWrite:1,inboxWrite:0,reviewWrite:0},
    "Academy":{scope:"all",lim:0,note:0,ayar:0,rap:0,ikv:1,egt:1,caseWrite:0,inboxWrite:0,reviewWrite:0},
    "Gözlemci":{scope:"all",lim:0,note:0,ayar:0,rap:0,ro:1,caseWrite:0,inboxWrite:0,reviewWrite:0,perfWrite:0}
  };
  function visible(role,userBranch,row){
    const r=ROLES[role];
    if(!r||!row) return false;
    if(r.scope==="all") return true;
    if(r.scope==="region") return REGION_OF[row.b]===USER_REGION;
    return row.b===userBranch;
  }
  const filterRows=(role,userBranch,rows)=>rows.filter(x=>visible(role,userBranch,x));
  const canWriteCase=(role,userBranch,row)=>{const r=ROLES[role];return !!r&&!!r.caseWrite&&visible(role,userBranch,row)};
  const canWriteInbox=(role,userBranch,branch)=>{const r=ROLES[role];return !!r&&!!r.inboxWrite&&visible(role,userBranch,{b:branch})};
  const canWriteReview=(role,userBranch,branch)=>{const r=ROLES[role];return !!r&&!!r.reviewWrite&&visible(role,userBranch,{b:branch})};
  const canManagePerformance=role=>!!ROLES[role]?.perfWrite;
  return {ROLES,BRANCHES,REGION_OF,visible,filterRows,canWriteCase,canWriteInbox,canWriteReview,canManagePerformance,names:()=>Object.keys(ROLES)};
});
