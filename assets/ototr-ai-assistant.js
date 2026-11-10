(function(){
  'use strict';

  const state={busy:false,history:[]};
  const config=window.OTOTR_AI_CONFIG||{};

  function safeDb(){
    try{return typeof DB!=='undefined'&&DB?DB:null}catch(_){return null}
  }

  function snapshot(){
    const db=safeDb()||{};
    const ceo=db.ceoDashboard||{};
    const network=ceo.network||{};
    const alerts=Array.isArray(ceo.alerts)?ceo.alerts:[];
    const tasks=Array.isArray(ceo.actionTasks)?ceo.actionTasks:[];
    const ai=Array.isArray(db.aiRecommendations)?db.aiRecommendations:(Array.isArray(ceo.aiRecommendations)?ceo.aiRecommendations:[]);
    const branches=Array.isArray(db.branches)?db.branches:[];
    return {
      source:'ERP yönetim kokpiti',
      updatedAt:new Date().toISOString(),
      network:{activeBranches:network.activeBranches||branches.filter(x=>x.status==='Aktif').length,todayCars:network.todayCars||0,todayRevenue:network.todayRevenue||0,trustScore:network.trustScore||0,openComplaints:network.openComplaints||0},
      alerts:alerts.slice(0,8).map(x=>({severity:x.severity,branch:x.branch,text:x.text,route:x.route})),
      tasks:tasks.slice(0,8).map(x=>({title:x.title,priority:x.priority,status:x.status,branch:x.branch})),
      recommendations:ai.slice(0,8).map(x=>({title:x.title,impact:x.impact,risk:x.risk,category:x.category}))
    };
  }

  function formatMoney(value){return new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY',maximumFractionDigits:0}).format(Number(value)||0)}

  function localAnswer(question,context){
    const data=snapshot();
    const q=String(question||'').toLocaleLowerCase('tr-TR');
    const critical=data.alerts.filter(x=>x.severity==='critical');
    const late=data.tasks.filter(x=>x.status==='Gecikti');
    if(/kritik|risk|alarm|müdahale/.test(q)){
      const lead=critical[0]||data.alerts[0];
      return lead?`Öncelikli sinyal ${lead.branch} kaydında: ${lead.text}\n\nÖnerim: ilgili kayıt için sorumlu, 3 saatlik SLA ve kanıt kontrolü olan bir aksiyon açın. Dış iletişim gerekiyorsa hukuk ve kalite onayı olmadan gönderim yapılmamalı.`:'Şu anda kokpit verisinde kritik alarm görünmüyor. Açık görevlerin SLA ve kanıt durumunu kontrol etmenizi öneririm.';
    }
    if(/şube|performans|güven/.test(q)){
      return `Ağ görünümünde ${data.network.activeBranches} aktif şube ve ${data.network.trustScore}/100 güven skoru bulunuyor. Bugünkü işlem adedi ${data.network.todayCars}.\n\nÖnerim: güven skoru 75 altındaki şubeleri; şikâyet, rapor kalitesi ve teslim süresi kırılımıyla karşılaştırın.`;
    }
    if(/ciro|finans|royalty|gelir/.test(q)){
      return `Bugünkü ağ cirosu ${formatMoney(data.network.todayRevenue)}. Finans kararı vermeden önce gerçekleşen/tahmin ayrımını ve şube bazlı royalty durumunu doğrulayın.\n\nÖnerim: yüksek ciro sapmasını paket ortalaması, araç adedi ve tahsilat sağlığıyla birlikte inceleyin.`;
    }
    if(/şikayet|yorum|müşteri|itibar/.test(q)){
      return `Kokpitte ${data.network.openComplaints} açık şikâyet görünüyor. Kritik yorumları tek başına puana göre değil; açık şikâyet, tekrar eden kök neden ve hukuk riskiyle birlikte değerlendirin.\n\nÖnerim: cevap taslağı AI tarafından hazırlanabilir ancak yayın öncesi yetkili onayı zorunlu olmalı.`;
    }
    if(/görev|aksiyon|sla/.test(q)){
      return `${data.tasks.length} öncelikli görev örneği incelendi; ${late.length} kayıt gecikmiş durumda.\n\nÖnerim: önce kritik + gecikmiş görevleri, ardından kanıtı eksik kapanışları ele alın. AI önerisini doğrudan işlem yapmak yerine görev taslağına dönüştürün.`;
    }
    return `“${question}” için ERP bağlamını taradım. Mevcut görünümde ${critical.length} kritik alarm, ${late.length} gecikmiş görev ve ${data.network.openComplaints} açık şikâyet sinyali var.\n\nDaha kesin sonuç için sorunuzu şube, tarih aralığı veya modül adıyla daraltabilirsiniz.`;
  }

  async function ask(question,context){
    const endpoint=String(config.endpoint||'').trim();
    if(!endpoint)return {answer:localAnswer(question,context),mode:'demo'};
    const response=await fetch(endpoint,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-OTOTR-AI-Client':'erp-assistant-v1'},body:JSON.stringify({question,context,erpSnapshot:snapshot(),history:state.history.slice(-6)})});
    if(!response.ok)throw new Error('AI servisi şu anda yanıt vermiyor.');
    const payload=await response.json();
    return {answer:String(payload.answer||payload.message||'Yanıt üretilemedi.'),mode:'live',evidence:payload.evidence};
  }

  function template(){
    return `<button class="ototr-ai-launcher" id="ototrAiLauncher" type="button" aria-label="OTOTR AI asistanını aç" aria-expanded="false"><i data-lucide="sparkles"></i></button>
      <section class="ototr-ai-panel" id="ototrAiPanel" aria-label="OTOTR AI yardım merkezi" aria-hidden="true">
        <header class="ototr-ai-head"><span class="ototr-ai-mark"><i data-lucide="headphones"></i></span><span class="ototr-ai-title"><b>OTOTR AI Yönetim Asistanı</b><span class="ototr-ai-status">ERP verileriyle karar desteği</span></span><button class="ototr-ai-close" type="button" data-ai-close aria-label="Asistanı kapat"><i data-lucide="x"></i></button></header>
        <div class="ototr-ai-context"><label for="ototrAiContext">Bağlam</label><select id="ototrAiContext"><option value="dashboard">Yönetim Kokpiti</option><option value="operations">Operasyon</option><option value="branches">Bayiler & Şubeler</option><option value="complaints">Şikâyet & İtibar</option><option value="finance">Finans & Royalty</option><option value="quality">Kalite & Denetim</option><option value="academy">OTOTR Academy</option><option value="ai">AI Öneri Merkezi</option></select></div>
        <div class="ototr-ai-body" id="ototrAiBody"><div class="ototr-ai-intro"><b><i data-lucide="shield-check"></i>Size nasıl yardımcı olabilirim?</b><p>Kokpit sinyallerini özetler, riskleri açıklar ve ilgili ERP modülüne yönlendiririm. İnsan onayı olmadan işlem yapmam.</p></div><div class="ototr-ai-prompts"><button class="ototr-ai-prompt" type="button" data-ai-prompt="Bugün müdahale etmem gereken kritik riskler neler?"><i data-lucide="siren"></i><span>Bugünün kritik risklerini özetle</span><i class="chevron" data-lucide="chevron-right"></i></button><button class="ototr-ai-prompt" type="button" data-ai-prompt="Şube performansı ve güven skorunu yorumla."><i data-lucide="building-2"></i><span>Şube performansını yorumla</span><i class="chevron" data-lucide="chevron-right"></i></button><button class="ototr-ai-prompt" type="button" data-ai-prompt="Geciken görevler ve SLA aksiyonları neler?"><i data-lucide="list-checks"></i><span>Geciken görevleri analiz et</span><i class="chevron" data-lucide="chevron-right"></i></button></div><div class="ototr-ai-messages" id="ototrAiMessages" aria-live="polite"></div></div>
        <footer class="ototr-ai-foot"><form class="ototr-ai-form" id="ototrAiForm"><input class="ototr-ai-input" id="ototrAiInput" maxlength="500" autocomplete="off" placeholder="ERP verileri hakkında sorun…"><button class="ototr-ai-send" type="submit" aria-label="Soruyu gönder"><i data-lucide="send"></i></button></form><div class="ototr-ai-actions"><button class="ototr-ai-action" type="button" data-ai-route="ai">AI Öneri Merkezi</button><button class="ototr-ai-action" type="button" data-ai-route="actions">Görev Merkezi</button></div><p class="ototr-ai-disclaimer">AI karar destek amaçlıdır. Demo modunda örnek ERP verileri kullanılır; gerçek model bağlantısı güvenli sunucu uç noktası gerektirir.</p></footer>
      </section>`;
  }

  function icons(){try{window.lucide&&window.lucide.createIcons()}catch(_){}}
  function toggle(force){const panel=document.getElementById('ototrAiPanel'),launcher=document.getElementById('ototrAiLauncher');if(!panel||!launcher)return;const open=typeof force==='boolean'?force:!panel.classList.contains('open');panel.classList.toggle('open',open);panel.setAttribute('aria-hidden',String(!open));launcher.setAttribute('aria-expanded',String(open));launcher.setAttribute('aria-label',open?'OTOTR AI asistanını kapat':'OTOTR AI asistanını aç');launcher.innerHTML=`<i data-lucide="${open?'x':'sparkles'}"></i>`;icons();if(open)setTimeout(()=>document.getElementById('ototrAiInput')?.focus(),80)}
  function message(role,text,evidence){const wrap=document.getElementById('ototrAiMessages');if(!wrap)return null;const node=document.createElement('div');node.className=`ototr-ai-message ${role}`;node.textContent=text;if(evidence){const meta=document.createElement('span');meta.className='ototr-ai-evidence';meta.textContent=evidence;node.appendChild(meta)}wrap.appendChild(node);document.getElementById('ototrAiBody')?.scrollTo({top:99999,behavior:'smooth'});return node}
  async function submit(question){question=String(question||'').trim();if(!question||state.busy)return;state.busy=true;const send=document.querySelector('.ototr-ai-send');if(send)send.disabled=true;message('user',question);const thinking=message('assistant','ERP verileri analiz ediliyor…');thinking?.classList.add('ototr-ai-thinking');state.history.push({role:'user',content:question});try{const context=document.getElementById('ototrAiContext')?.value||'dashboard';const result=await ask(question,context);thinking?.remove();message('assistant',result.answer,result.mode==='live'?(result.evidence||'Kaynak: güvenli OTOTR AI servisi'):'Kaynak: ERP demo kokpit verisi · İnsan onayı gerekli');state.history.push({role:'assistant',content:result.answer})}catch(error){thinking?.remove();message('assistant',`${error.message||'AI servisine ulaşılamadı'} Yerel karar desteğiyle devam ediyorum.\n\n${localAnswer(question)}`,'Kaynak: ERP yerel yedek analizi')}finally{state.busy=false;if(send)send.disabled=false;const input=document.getElementById('ototrAiInput');if(input){input.value='';input.focus()}}}

  function init(){
    if(document.getElementById('ototrAiLauncher'))return;
    document.body.insertAdjacentHTML('beforeend',template());
    document.getElementById('ototrAiLauncher')?.addEventListener('click',()=>toggle());
    document.querySelector('[data-ai-close]')?.addEventListener('click',()=>toggle(false));
    document.getElementById('ototrAiForm')?.addEventListener('submit',event=>{event.preventDefault();submit(document.getElementById('ototrAiInput')?.value)});
    document.querySelectorAll('[data-ai-prompt]').forEach(button=>button.addEventListener('click',()=>submit(button.dataset.aiPrompt)));
    document.querySelectorAll('[data-ai-route]').forEach(button=>button.addEventListener('click',()=>{toggle(false);location.hash=`#${button.dataset.aiRoute}`}));
    document.addEventListener('keydown',event=>{if(event.key==='Escape')toggle(false);if(event.altKey&&event.shiftKey&&event.key.toLocaleLowerCase('tr-TR')==='a'){event.preventDefault();toggle()}});
    icons();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
  window.OTOTR_AI_ASSISTANT={open:()=>toggle(true),close:()=>toggle(false),ask:submit,snapshot};
})();
