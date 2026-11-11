(function(){
  const PM=window.OTOTRComplaintPerformance;
  const KEY="ototr_complaint_performance_v1",BRIDGE="ototr_complaint_bridge_v1",ACTIONS="ototr_action_center_bridge_v1";
  const regionOf=b=>/Gebze|İnegöl|Nilüfer|Kocaeli|Bursa/.test(b)?"Marmara":"Diğer";
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const canEdit=()=>window.OTOTRRoles.canManagePerformance(ROLE);
  const mem={},sget=k=>{try{return localStorage.getItem(k)}catch(e){return k in mem?mem[k]:null}},sset=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){mem[k]=v}};
  function read(){try{return JSON.parse(sget(KEY))||{goals:[],actions:[]}}catch(e){return {goals:[],actions:[]}}}
  function write(v){sset(KEY,JSON.stringify(v));}
  function keys(level){if(level==="Bölge")return[...new Set(DV().map(x=>regionOf(x.b)))];if(level==="Şube")return[...new Set(DV().map(x=>x.b))];return[...new Set(DV().map(x=>x.u))]}
  const performanceRows=()=>DV().map(x=>({...x,region:regionOf(x.b)}));
  function goalVisible(g){const r=R();if(r.scope==="all")return true;if(r.scope==="region"){if(g.level==="Bölge")return g.key===regionOf(UB);if(g.level==="Şube")return regionOf(g.key)===regionOf(UB);return keys("Kişi").includes(g.key)}return g.level==="Şube"&&g.key===UB}
  function actionVisible(a){const r=R();if(r.scope==="all")return true;if(r.scope==="region")return a.region===regionOf(UB)||(a.scope==="Şube"&&regionOf(a.scopeName)===regionOf(UB))||(a.scope==="Kişi"&&keys("Kişi").includes(a.scopeName));return a.scope==="Şube"&&a.scopeName===UB}
  function targetFor(level,key){const s=read(),found=s.goals.find(g=>g.level===level&&g.key===key);return PM.normalizeTarget(level,found||{})}
  function saveGoal(){
    if(!canEdit())return toast("Bu rol performans hedefi değiştiremez.");
    const level=pfLevel.value,key=pfKey.value,owner=pfOwner.value.trim(),due=pfDue.value,today=new Date().toISOString().slice(0,10);
    if(!keys(level).includes(key))return toast("Hedef kapsamı rol görünümüyle uyuşmuyor.");
    if(!owner)return toast("Hedef sahibi zorunludur.");
    if(!due||due<today)return toast("Termin bugün veya gelecekte olmalıdır.");
    const target=PM.normalizeTarget(level,{sla:pfSla.value,recovery:pfRecovery.value,repeatMax:pfRepeat.value,csat:pfCsat.value});
    const s=read(),next={id:level+":"+key,level,key,...target,owner,due,updatedAt:new Date().toISOString()};
    s.goals=s.goals.filter(g=>g.id!==next.id);s.goals.push(next);write(s);syncBridge();toast("Performans hedefi kaydedildi");performancePage();
  }
  function createAction(level,key){
    if(!canEdit())return toast("Bu rol performans aksiyonu iletemez.");
    if(!PM.LEVELS.includes(level)||!keys(level).includes(key))return toast("Aksiyon kapsamı rol görünümüyle uyuşmuyor.");
    const metric=PM.aggregate(performanceRows(),level,key),rec=PM.actionFor(metric),s=read();
    const action={id:"CMP-"+Date.now(),source:"Müşteri Şikâyetleri",sourceModule:"Müşteri Şikâyetleri",category:rec.type,scope:level,scopeName:key,branch:level==="Şube"?key:"Genel Merkez",region:level==="Bölge"?key:regionOf(key),priority:metric.sla<80?"Kritik":"Yüksek",module:rec.type,owner:rec.owner,ownerRole:rec.owner,title:rec.text,description:`${level}: ${key} · SLA %${metric.sla}`,status:"Açık",createdAt:new Date().toISOString(),nextAction:rec.text,metrics:metric};
    s.actions.unshift(action);write(s);let shared=[];try{shared=JSON.parse(sget(ACTIONS)||"[]")||[]}catch(e){}shared.unshift(action);sset(ACTIONS,JSON.stringify(shared.slice(0,200)));
    AUD.push({r:ROLE,id:"—",t:`Performans aksiyonu: ${key} → ${rec.owner}`,ts:new Date().toLocaleString("tr-TR")});syncBridge();toast("İlgili kişiye performans aksiyonu iletildi");performancePage();
  }
  function syncBridge(){
    const s=read();
    const tickets=D.map(x=>{const sources=typeof caseChannels==="function"?caseChannels(x):[x.ch];return{id:x.id,customer:x.mus,plate:x.pl,branch:x.b,region:regionOf(x.b),owner:x.u,team:x.u||"Şube Müdürü",priority:ON[x.o],status:ST[x.s],sla:x.left<0?"Aşıldı":x.bekle?"Durdu":"İçinde",type:KAT[x.k],source:sources.join(" + "),sources,legalRisk:x.k===2?"Yüksek":"Düşük",lastAction:x.tl.at(-1)?.t||"Kayıt açıldı",nextAction:ST[Math.min(7,x.s+1)],compensation:x.tut?tl(x.tut):"—",rootCause:x.kok||"İnceleme bekliyor"}});
    const payload={version:1,updatedAt:new Date().toISOString(),complaintTickets:tickets,performanceGoals:s.goals,performanceActions:s.actions,summary:{total:tickets.length,open:tickets.filter(x=>x.status!=="Kapandı").length,closed:tickets.filter(x=>x.status==="Kapandı").length,breached:tickets.filter(x=>x.sla==="Aşıldı").length,critical:tickets.filter(x=>x.priority==="Kritik").length}};
    sset(BRIDGE,JSON.stringify(payload));
  }
  function performancePage(resetKey=false){
    const level=document.getElementById("pfLevel")?.value||"Bölge",list=keys(level),currentKey=document.getElementById("pfKey")?.value,selected=!resetKey&&list.includes(currentKey)?currentKey:list[0],s=read(),visibleGoals=s.goals.filter(goalVisible),visibleActions=s.actions.filter(actionVisible),disabled=canEdit()?"":'disabled aria-disabled="true" title="Bu rol performans hedeflerini yalnızca okuyabilir"';
    const rows=list.map(key=>{const m=PM.aggregate(performanceRows(),level,key),t=targetFor(level,key),sc=PM.score(m,t),act=PM.actionFor(m);return{key,m,t,sc,act}});
    document.getElementById("m").innerHTML=`<h1>Performans & Hedef Merkezi</h1><p class="sub">Şikâyet sonuçlarını bölge, şube ve kişi hedeflerine bağlar; aksiyonları ilgili yönetici, Kalite, İK/Academy veya CRM kuyruğuna yönlendirir.</p>
    <div class="al o"><b>ERP demo köprüsü aktif</b>Hedefler ve aksiyonlar bu tarayıcıda saklanır; ana ERP veri sözleşmesi güncellenir. Çok kullanıcılı merkezi kayıt henüz bağlı değildir.</div>
    <div class="box"><div class="bar2"><label>Seviye <select id="pfLevel" onchange="OTOTRComplaintIntegration.performancePage(true)">${PM.LEVELS.map(x=>`<option ${x===level?"selected":""}>${x}</option>`).join("")}</select></label><label>Kapsam <select id="pfKey" onchange="OTOTRComplaintIntegration.performancePage()">${list.map(x=>`<option ${x===selected?"selected":""}>${esc(x)}</option>`).join("")}</select></label></div>
    <div class="grid k4"><label>SLA hedefi %<input id="pfSla" type="number" min="1" max="100" value="${targetFor(level,selected).sla}" ${disabled}></label><label>Geri kazanım %<input id="pfRecovery" type="number" min="1" max="100" value="${targetFor(level,selected).recovery}" ${disabled}></label><label>Tekrar üst sınırı %<input id="pfRepeat" type="number" min="1" max="100" value="${targetFor(level,selected).repeatMax}" ${disabled}></label><label>CSAT hedefi<input id="pfCsat" type="number" min="1" max="5" step="0.1" value="${targetFor(level,selected).csat}" ${disabled}></label></div>
    <div class="bar2"><label>Hedef sahibi <input id="pfOwner" required value="${esc(s.goals.find(g=>g.level===level&&g.key===selected)?.owner||ROLE)}" ${disabled}></label><label>Termin <input id="pfDue" type="date" min="${new Date().toISOString().slice(0,10)}" value="${s.goals.find(g=>g.level===level&&g.key===selected)?.due||new Date(Date.now()+14*864e5).toISOString().slice(0,10)}" ${disabled}></label><button class="btn p" ${disabled} onclick="OTOTRComplaintIntegration.saveGoal()">Hedefi kaydet</button></div></div>
    <div class="box wrap" style="margin-top:16px"><table><thead><tr><th>${level}</th><th>Vaka</th><th>SLA</th><th>Geri kazanım</th><th>Tekrar</th><th>CSAT</th><th>Performans</th><th>Önerilen yönlendirme</th><th>Aksiyon</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.key)}</b></td><td>${r.m.count}</td><td>%${r.m.sla} / %${r.t.sla}</td><td>%${r.m.recovery} / %${r.t.recovery}</td><td>%${r.m.repeatRate} / ≤%${r.t.repeatMax}</td><td>${r.m.csat} / ${r.t.csat}</td><td><b class="${r.sc>=80?"ok":r.sc>=65?"Y":"K"}">${r.sc}</b><br><span class="mu">${PM.status(r.sc)}</span></td><td><b>${r.act.owner}</b><br><span class="mu">${r.act.text}</span></td><td><button class="btn" ${disabled} onclick='OTOTRComplaintIntegration.createAction(${JSON.stringify(level)},${JSON.stringify(r.key)})'>İlet</button></td></tr>`).join("")}</tbody></table></div>
    <div class="grid k2"><div class="box"><h2>Atanan hedefler</h2>${visibleGoals.length?visibleGoals.map(g=>`<p><b>${esc(g.level)} · ${esc(g.key)}</b><br><span class="mu">SLA %${g.sla} · Geri kazanım %${g.recovery} · Tekrar ≤%${g.repeatMax} · ${esc(g.owner||"—")}</span></p>`).join(""):"<p class=mu>Bu kapsamda atanmış hedef yok.</p>"}</div><div class="box"><h2>İletilen performans aksiyonları</h2>${visibleActions.slice(0,8).map(a=>`<p><b>${esc(a.scopeName)} → ${esc(a.owner)}</b><br><span class="mu">${esc(a.title)} · ${esc(a.status)}</span></p>`).join("")||"<p class=mu>Bu kapsamda iletilmiş aksiyon yok.</p>"}</div></div>`;
  }
  const originalNav=nav,originalDraw=draw;
  nav=function(){originalNav();const n=document.getElementById("nav");if(!n.querySelector('[data-performance-route]')){const b=document.createElement("button");b.dataset.performanceRoute="1";b.className=V==="performance"?"on":"";b.innerHTML='<span>Performans & Hedefler</span><i>ERP</i>';b.onclick=()=>{V="performance";SEL=null;draw()};n.appendChild(b);const a=document.createElement("button");a.innerHTML='<span>Ana ERP’ye dön</span><i>↗</i>';a.onclick=()=>location.href="../index.html#complaints";n.appendChild(a)}};
  draw=function(){syncBridge();if(V==="performance"){const Df=D;D=DV();try{nav();hd();performancePage()}finally{D=Df}return}originalDraw()};
  window.OTOTRComplaintIntegration={saveGoal,createAction,syncBridge,performancePage};syncBridge();draw();
})();
