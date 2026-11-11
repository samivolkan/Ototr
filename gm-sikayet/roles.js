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
    "Genel Müdür":{scope:"all",lim:1e9,note:1,ayar:1,rap:1,hk:1,hkw:1,ikv:1,ikw:1,egt:1,apr:1},
    "Bölge Müdürü":{scope:"region",lim:5000,note:1,ayar:0,rap:1,ikv:1,egt:1,apr:1},
    "Şube Müdürü":{scope:"branch",lim:1000,note:0,ayar:0,rap:0},
    "Şikâyet Sorumlusu":{scope:"branch",lim:0,note:1,ayar:0,rap:0},
    "Hukuk":{scope:"all",lim:0,note:1,ayar:0,rap:1,hk:1,hkw:1},
    "Kalite":{scope:"all",lim:0,note:1,ayar:0,rap:1,hk:1,ikv:1,egt:1,apr:1,dofv:1},
    "Academy":{scope:"all",lim:0,note:0,ayar:0,rap:0,ikv:1,egt:1},
    "Gözlemci":{scope:"all",lim:0,note:0,ayar:0,rap:0,ro:1}
  };
  function visible(role,userBranch,row){
    const r=ROLES[role];
    if(!r||!row) return false;
    if(r.scope==="all") return true;
    if(r.scope==="region") return REGION_OF[row.b]===USER_REGION;
    return row.b===userBranch;
  }
  const filterRows=(role,userBranch,rows)=>rows.filter(x=>visible(role,userBranch,x));
  const canWriteCase=(role,userBranch,row)=>{const r=ROLES[role];return !!r&&!r.ro&&visible(role,userBranch,row)};
  return {ROLES,BRANCHES,REGION_OF,visible,filterRows,canWriteCase,names:()=>Object.keys(ROLES)};
});
