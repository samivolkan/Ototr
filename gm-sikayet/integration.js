(function(){
  const PM=window.OTOTRComplaintPerformance;
  const KEY="ototr_complaint_performance_v1", BRIDGE="ototr_complaint_bridge_v1", ACTIONS="ototr_action_center_bridge_v1";
  const regionOf=b=>/İstanbul/.test(b)?"Marmara":/Ankara/.test(b)?"İç Anadolu":/İzmir/.test(b)?"Ege":"Diğer";
  const esc=s=>String(s??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));
  function read(){try{return JSON.parse(localStorage.getItem(KEY))||{goals:[],actions:[]}}catch(e){return {goals:[],actions:[]}}}
  function write(v){localStorage.setItem(KEY,JSON.stringify(v));}
  function keys(level){
    if(level==="Bölge") return [...new Set(D.map(x=>regionOf(x.b)))];
    if(level==="Şube") return [...new Set(D.map(x=>x.b))];
    return [...new Set(D.map(x=>x.u))];
  }
  const performanceRows=()=>D.map(x=>({...x,region:regionOf(x.b)}));
  function targetFor(level,key){const s=read(),found=s.goals.find(g=>g.level===level&&g.key===key);return PM.normalizeTarget(level,found||{});}
  function saveGoal(){
    const level=document.getElementById("pfLevel").value,key=document.getElementById("pfKey").value;
    const target=PM.normalizeTarget(level,{sla:pfSla.value,recovery:pfRecovery.value,repeatMax:pfRepeat.value,csat:pfCsat.value});
    const s=read(),next={id:level+":"+key,level,key,...target,owner:pfOwner.value,due:pfDue.value,updatedAt:new Date().toISOString()};
    s.goals=s.goals.filter(g=>g.id!==next.id);s.goals.push(next);write(s);syncBridge();toast("Performans hedefi kaydedildi");performancePage();
  }
  function createAction(level,key){
    const metric=PM.aggregate(performanceRows(),level,key),rec=PM.actionFor(metric),s=read();
    const action={id:"CMP-"+Date.now(),source:"Müşteri Şikâyetleri",scope:level,scopeName:key,priority:metric.sla<80?"P1":"P2",module:rec.type,owner:rec.owner,title:rec.text,status:"Açık",createdAt:new Date().toISOString(),metrics:metric};
    s.actions.unshift(action);write(s);
    const shared=JSON.parse(localStorage.getItem(ACTIONS)||"[]");shared.unshift(action);localStorage.setItem(ACTIONS,JSON.stringify(shared.slice(0,200)));
    AUD.push({r:ROLE,id:"—",t:`Performans aksiyonu: ${key} → ${rec.owner}`,ts:new Date().toLocaleString("tr-TR")});
    toast("İlgili kişiye performans aksiyonu iletildi");performancePage();
  }
  function syncBridge(){
    const s=read();
    const tickets=D.map(x=>({id:x.id,customer:x.mus,plate:x.pl,branch:x.b,region:regionOf(x.b),owner:x.u,team:x.u||"Şube Müdürü",priority:ON[x.o],status:ST[x.s],sla:x.left<0?"Aşıldı":x.bekle?"Durdu":"İçinde",type:KAT[x.k],source:x.ch,legalRisk:x.k===2?"Yüksek":"Düşük",lastAction:x.tl.at(-1)?.t||"Kayıt açıldı",nextAction:ST[Math.min(7,x.s+1)],compensation:x.tut?tl(x.tut):"—",rootCause:x.kok||"İnceleme bekliyor"}));
    const payload={version:1,updatedAt:new Date().toISOString(),complaintTickets:tickets,performanceGoals:s.goals,performanceActions:s.actions,summary:{open:tickets.filter(x=>x.status!=="Kapandı").length,breached:tickets.filter(x=>x.sla==="Aşıldı").length,critical:tickets.filter(x=>x.priority==="Kritik").length}};
    localStorage.setItem(BRIDGE,JSON.stringify(payload));
  }
  function performancePage(){
    const level=document.getElementById("pfLevel")?.value||"Bölge", list=keys(level), selected=document.getElementById("pfKey")?.value||list[0], s=read();
    const rows=list.map(key=>{const m=PM.aggregate(performanceRows(),level,key),t=targetFor(level,key),sc=PM.score(m,t),act=PM.actionFor(m);return {key,m,t,sc,act};});
    document.getElementById("m").innerHTML=`<h1>Performans & Hedef Merkezi</h1><p class="sub">Şikâyet sonuçlarını bölge, şube ve kişi hedeflerine bağlar; aksiyonları ilgili yönetici, Kalite, İK/Academy veya CRM kuyruğuna yönlendirir.</p>
    <div class="al o"><b>ERP entegrasyonu aktif</b>Hedefler ve aksiyonlar tarayıcıda saklanır; ana ERP için <code>${BRIDGE}</code> veri sözleşmesi güncellenir.</div>
    <div class="box"><div class="bar2"><label>Seviye <select id="pfLevel" onchange="performancePage()">${PM.LEVELS.map(x=>`<option ${x===level?"selected":""}>${x}</option>`).join("")}</select></label><label>Kapsam <select id="pfKey" onchange="performancePage()">${list.map(x=>`<option ${x===selected?"selected":""}>${esc(x)}</option>`).join("")}</select></label></div>
    <div class="grid k4"><label>SLA hedefi %<input id="pfSla" type="number" value="${targetFor(level,selected).sla}"></label><label>Geri kazanım %<input id="pfRecovery" type="number" value="${targetFor(level,selected).recovery}"></label><label>Tekrar üst sınırı %<input id="pfRepeat" type="number" value="${targetFor(level,selected).repeatMax}"></label><label>CSAT hedefi<input id="pfCsat" type="number" step="0.1" value="${targetFor(level,selected).csat}"></label></div>
    <div class="bar2"><label>Hedef sahibi <input id="pfOwner" value="${esc(s.goals.find(g=>g.level===level&&g.key===selected)?.owner||ROLE)}"></label><label>Termin <input id="pfDue" type="date" value="${s.goals.find(g=>g.level===level&&g.key===selected)?.due||new Date(Date.now()+14*864e5).toISOString().slice(0,10)}"></label><button class="btn p" onclick="OTOTRComplaintIntegration.saveGoal()">Hedefi kaydet</button></div></div>
    <div class="box wrap" style="margin-top:16px"><table><thead><tr><th>${level}</th><th>Vaka</th><th>SLA</th><th>Geri kazanım</th><th>Tekrar</th><th>CSAT</th><th>Performans</th><th>Önerilen yönlendirme</th><th>Aksiyon</th></tr></thead><tbody>${rows.map(r=>`<tr><td><b>${esc(r.key)}</b></td><td>${r.m.count}</td><td>%${r.m.sla} / %${r.t.sla}</td><td>%${r.m.recovery} / %${r.t.recovery}</td><td>%${r.m.repeatRate} / ≤%${r.t.repeatMax}</td><td>${r.m.csat} / ${r.t.csat}</td><td><b class="${r.sc>=80?"ok":r.sc>=65?"Y":"K"}">${r.sc}</b><br><span class="mu">${PM.status(r.sc)}</span></td><td><b>${r.act.owner}</b><br><span class="mu">${r.act.text}</span></td><td><button class="btn" onclick='OTOTRComplaintIntegration.createAction(${JSON.stringify(level)},${JSON.stringify(r.key)})'>İlet</button></td></tr>`).join("")}</tbody></table></div>
    <div class="grid k2"><div class="box"><h2>Atanan hedefler</h2>${s.goals.length?s.goals.map(g=>`<p><b>${esc(g.level)} · ${esc(g.key)}</b><br><span class="mu">SLA %${g.sla} · Geri kazanım %${g.recovery} · Tekrar ≤%${g.repeatMax} · ${esc(g.owner||"—")}</span></p>`).join(""):"<p class=mu>Henüz hedef atanmadı.</p>"}</div><div class="box"><h2>İletilen performans aksiyonları</h2>${s.actions.slice(0,8).map(a=>`<p><b>${esc(a.scopeName)} → ${esc(a.owner)}</b><br><span class="mu">${esc(a.title)} · ${esc(a.status)}</span></p>`).join("")||"<p class=mu>Henüz aksiyon yok.</p>"}</div></div>`;
  }
  const originalNav=nav, originalDraw=draw;
  nav=function(){originalNav();const n=document.getElementById("nav");if(!n.querySelector('[data-performance-route]')){const b=document.createElement("button");b.dataset.performanceRoute="1";b.className=V==="performance"?"on":"";b.innerHTML='<span>Performans & Hedefler</span><i>ERP</i>';b.onclick=()=>{V="performance";SEL=null;draw()};n.appendChild(b);const a=document.createElement("button");a.innerHTML='<span>Ana ERP’ye dön</span><i>↗</i>';a.onclick=()=>location.href="../index.html#complaints";n.appendChild(a)}};
  draw=function(){syncBridge();if(V==="performance"){nav();hd();performancePage();return}originalDraw();};
  window.OTOTRComplaintIntegration={saveGoal,createAction,syncBridge,performancePage};
  syncBridge();draw();
})();
