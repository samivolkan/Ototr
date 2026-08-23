"use strict";
const DEFAULT_STATE_B64 = window.OTOTR_REPORT_DEFAULT_B64;
async function decodeDefaultState(){const bin=Uint8Array.from(atob(DEFAULT_STATE_B64),c=>c.charCodeAt(0));const stream=new Blob([bin]).stream().pipeThrough(new DecompressionStream("gzip"));return JSON.parse(await new Response(stream).text())}
const STORAGE_PREFIX = "ototr-report-web-v1:";
const CRM_DEMO_KEY = "ototr-dealer-live-workorders-v1";
const params = new URLSearchParams(location.search);
const workOrderId = params.get("workOrderId") || params.get("expertiseCaseId") || params.get("id") || "demo";
const reportId = params.get("reportId") || "";
let DEFAULT_STATE = null;
let state = null;
let currentPage = 1;
let showAll = false;
let selectedPath = "";
let selectedBefore = "";
let imageTarget = null;
let saveTimer = null;

const pageAssets = {
  5: ["../kaporta-boya-harita.png"],
  6: ["../../assets/body-design/v17/left.png","../../assets/body-design/v17/right.png","../../assets/body-design/v17/front.png","../../assets/body-design/v17/rear.png"],
  7: ["../../assets/chassis/v56/top.png"],
  8: ["../../assets/chassis/v56/side-left.png","../../assets/chassis/v56/side-right.png","../../assets/chassis/v56/front.png","../../assets/chassis/v56/rear.png"],
  12:["../obd-module-map.png"],
  16:["../airbag-srs-kontrol.png"]
};

function deepClone(v){return JSON.parse(JSON.stringify(v));}
function escapeHtml(v){return String(v??"").replace(/[&<>"]/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));}
function getByPath(path){return path.split(".").reduce((o,k)=>o?.[k],state)}
function setByPath(path,value){const a=path.split(".");let o=state;for(let i=0;i<a.length-1;i++)o=o[a[i]];o[a.at(-1)]=value;}
function toast(text){const d=document.createElement("div");d.className="toast";d.textContent=text;document.body.appendChild(d);setTimeout(()=>d.remove(),2200)}
function storageKey(){return STORAGE_PREFIX + workOrderId;}
function saveLocal(silent=false){
  try{localStorage.setItem(storageKey(),JSON.stringify(state));document.getElementById("saveStatus").textContent="Taslak: "+new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"});if(!silent)toast("Web rapor taslağı kaydedildi.");}
  catch(e){console.warn(e);if(!silent)toast("Yerel taslak kaydedilemedi.");}
}
function queueSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveLocal(true),450)}
function loadLocal(){try{const x=localStorage.getItem(storageKey());if(x)state=Object.assign(deepClone(DEFAULT_STATE),JSON.parse(x));}catch(e){console.warn(e)}}
function flattenObject(obj,prefix="",out={}){if(!obj||typeof obj!=="object")return out;for(const [k,v] of Object.entries(obj)){const p=prefix?prefix+"."+k:k;if(v&&typeof v==="object")flattenObject(v,p,out);else out[p.toLowerCase()]=v;}return out;}
function findRecursiveById(root,id){if(!root||typeof root!=="object")return null;if(String(root.id??root.workOrderId??root.expertiseCaseId??"")===String(id))return root;for(const v of Object.values(root)){if(v&&typeof v==="object"){const f=findRecursiveById(v,id);if(f)return f;}}return null;}
function setMatchingText(pageNo,prefix,value){if(value==null||value==="")return;const p=state.pages[pageNo-1];for(const s of p.sections)for(const f of s.fields)if(f.text.toLocaleLowerCase("tr-TR").startsWith(prefix.toLocaleLowerCase("tr-TR")))f.text=prefix+" — "+value;}
function hydrateFromCrmDemo(){
  try{const raw=localStorage.getItem(CRM_DEMO_KEY);if(!raw)return false;const db=JSON.parse(raw);const wo=findRecursiveById(db,workOrderId)||(!workOrderId||workOrderId==="demo"?null:db);if(!wo)return false;const f=flattenObject(wo);
    const pick=(...keys)=>{for(const key of keys){const hit=Object.entries(f).find(([k])=>k===key||k.endsWith("."+key));if(hit&&hit[1]!=null)return hit[1];}return "";};
    const reportNo=pick("reportno","report_no","raporno"); if(reportNo)state.global.reportNo=String(reportNo);
    const plate=pick("plate","plaka"); const vin=pick("vin","chassisno","chassis_no","sasino","şasino"); const brand=pick("brand","marka"); const model=pick("model"); const year=pick("modelyear","model_year","modelyili","modelyılı"); const km=pick("mileage","km","kilometre"); const fuel=pick("fuel","fueltype","yakit","yakıt"); const trans=pick("transmission","gear","vites");
    if(brand||model){setMatchingText(1,"MARKA / MODEL",[brand,model].filter(Boolean).join(" "));setMatchingText(3,"Marka / Model",[brand,model].filter(Boolean).join(" "));}
    if(year){setMatchingText(1,"MODEL YILI",year);setMatchingText(3,"Model yılı",year);}
    if(km){setMatchingText(1,"KİLOMETRE",km+(/km/i.test(String(km))?"":" km"));setMatchingText(3,"Kilometre",km+(/km/i.test(String(km))?"":" KM"));}
    if(vin){setMatchingText(1,"ŞASE NUMARASI",vin);setMatchingText(3,"Şasi no",vin);}
    if(fuel){setMatchingText(1,"YAKIT TÜRÜ",fuel);setMatchingText(3,"Yakıt tipi",fuel);}
    if(trans){setMatchingText(1,"VİTES TÜRÜ",trans);setMatchingText(3,"Vites tipi",trans);}
    if(plate) setMatchingText(3,"Plaka",plate);
    return true;
  }catch(e){console.warn("CRM demo hydrate",e);return false;}
}
function saveIntoCrmDemo(){
 try{const raw=localStorage.getItem(CRM_DEMO_KEY);if(!raw)return false;const db=JSON.parse(raw);const wo=findRecursiveById(db,workOrderId);if(!wo)return false;wo.webReport={version:state.schemaVersion,updatedAt:new Date().toISOString(),payload:state};localStorage.setItem(CRM_DEMO_KEY,JSON.stringify(db));return true;}catch(e){console.warn(e);return false;}
}
async function saveCrm(){
  saveLocal(true); let saved=saveIntoCrmDemo();
  const message={type:"ototr:report-web:save",workOrderId,reportId,payload:state};
  if(window.opener&&!window.opener.closed){window.opener.postMessage(message,location.origin);saved=true;}
  if(window.parent&&window.parent!==window){window.parent.postMessage(message,location.origin);saved=true;}
  if(window.OTOTR_REPORT_WEB_ADAPTER?.save){try{await window.OTOTR_REPORT_WEB_ADAPTER.save(message);saved=true;}catch(e){console.error(e)}}
  toast(saved?"CRM web raporu kaydedildi.":"Taslak kaydedildi; CRM adaptörü bekleniyor.");
}
function pageLineCount(p){return p.hero.length+p.sections.reduce((n,s)=>n+s.fields.length+1,0)}
function editableSpan(path,text,extra=""){return `<span class="editable ${extra}" contenteditable="true" spellcheck="false" data-path="${escapeHtml(path)}">${escapeHtml(text)}</span>`}
function mediaHtml(pageNo,slot,src,label){
 const key=`p${String(pageNo).padStart(2,"0")}.media.${slot}`; const stored=state.media[key]; const url=stored||src||"";
 return `<div class="visual-stage" data-media-key="${key}">${url?`<img src="${escapeHtml(url)}" alt="${escapeHtml(label)}">`:""}<div class="visual-label">${escapeHtml(label)}</div><button class="media-btn" data-media-edit="${key}">Görseli Değiştir</button></div>`;
}
function renderHero(p){if(!p.hero.length)return "";return `<div class="hero-grid">${p.hero.map((h,i)=>`<div class="hero-card">${editableSpan(`pages.${p.no-1}.hero.${i}.text`,h.text)}</div>`).join("")}</div>`}
function renderLoose(p){if(!p.loose?.length)return "";return `<div class="hero-grid loose-grid">${p.loose.map((f,i)=>`<div class="hero-card">${editableSpan(`pages.${p.no-1}.loose.${i}.text`,f.text)}</div>`).join("")}</div>`}
function renderSectionCard(p,section,si){return `<section class="section-card"><h2>${editableSpan(`pages.${p.no-1}.sections.${si}.title`,section.title)}</h2><div class="rows">${section.fields.map((f,fi)=>`<div class="field-row">${editableSpan(`pages.${p.no-1}.sections.${si}.fields.${fi}.text`,f.text)}</div>`).join("")}</div></section>`}
function renderPageVisual(p){
 if(p.no===1) return `<div class="cover-layout"><div class="cover-main">${mediaHtml(1,"vehicle","","ARAÇ ÖN GENEL FOTOĞRAFI")}</div><div class="seal-box"><img src="../1000km-garanti.png" alt="1000 KM garanti"><div class="section-card"><h2>RAPORU DOĞRULA</h2><div class="rows"><div class="field-row"><span>QR / doğrulama bağlantısı CRM’den gelir.</span></div></div></div></div></div>`;
 if(p.no===6||p.no===8){const a=pageAssets[p.no]||[];return `<div class="four-views">${a.map((src,i)=>mediaHtml(p.no,"view"+i,src,["Sol Görünüş","Sağ Görünüş","Ön Görünüş","Arka Görünüş"][i]||"Görünüş")).join("")}</div>`}
 if(p.no===19){const fields=p.sections[0]?.fields||[];return `<div class="evidence-grid">${fields.map((f,i)=>`<div class="evidence-card"><div class="evidence-media" data-media-key="p19.media.evidence${i}">${state.media[`p19.media.evidence${i}`]?`<img src="${escapeHtml(state.media[`p19.media.evidence${i}`])}">`:"FOTOĞRAF"}<button class="media-btn" data-media-edit="p19.media.evidence${i}">Değiştir</button></div><div class="field-row">${editableSpan(`pages.18.sections.0.fields.${i}.text`,f.text)}</div></div>`).join("")}</div>`}
 const a=pageAssets[p.no]; if(a?.length)return mediaHtml(p.no,"main",a[0],p.subtitle||p.title);
 if([13,17].includes(p.no))return mediaHtml(p.no,"main","",p.no===13?"YOL TESTİ GÖRSELİ":"TEST ANLIK GÖRSELİ");
 return "";
}
function renderPage(p){
 const count=pageLineCount(p);const density=count>58?"ultra-dense":count>40?"dense":"";const visual=renderPageVisual(p);let sections=p.sections;
 if(p.no===19) sections=sections.slice(1);
 const single=[5,7,11,12,13,16,17,19].includes(p.no);
 return `<article class="report-page edit-mode ${density}" data-page="${p.no}" ${(!showAll&&p.no!==currentPage)?"hidden":""}>
 <div class="dynamic-head"><div class="head-pair"><label>Rapor No</label>${editableSpan("global.reportNo",state.global.reportNo)}</div><div class="head-pair"><label>Tarih – Saat</label>${editableSpan("global.dateTime",state.global.dateTime)}</div><div class="head-pair"><label>Geçerlilik</label>${editableSpan("global.validity",state.global.validity)}</div></div>
 <div class="page-counter">${String(p.no).padStart(2,"0")} / 19</div>
 <div class="content"><div class="page-title"><h1>${editableSpan(`pages.${p.no-1}.title`,p.title)}</h1><p>${editableSpan(`pages.${p.no-1}.subtitle`,p.subtitle)}</p></div>${renderHero(p)}${renderLoose(p)}${visual}<div class="section-grid ${single?"single":""}">${sections.map((s,i)=>renderSectionCard(p,s,p.sections.indexOf(s))).join("")}</div></div>
 </article>`;
}
function renderNav(){document.getElementById("pageNav").innerHTML=state.pages.map(p=>`<button data-nav="${p.no}" class="${p.no===currentPage&&!showAll?"active":""}"><span class="num">${String(p.no).padStart(2,"0")}</span><span class="text">${escapeHtml(p.title)}</span></button>`).join("")}
function renderAll(){document.getElementById("toolbarReportNo").textContent=state.global.reportNo;document.getElementById("toolbarWorkOrder").textContent=workOrderId!=="demo"?"İş Emri: "+workOrderId:"CRM Web Rapor Editörü";renderNav();document.getElementById("pagesHost").innerHTML=state.pages.map(renderPage).join("");bindPageEvents();}
function bindPageEvents(){
 document.querySelectorAll("[contenteditable][data-path]").forEach(el=>{el.addEventListener("focus",()=>selectField(el));el.addEventListener("input",()=>{setByPath(el.dataset.path,el.innerText.trim());if(el.dataset.path==="global.reportNo")document.getElementById("toolbarReportNo").textContent=el.innerText.trim();queueSave();});});
 document.querySelectorAll("[data-media-edit]").forEach(btn=>btn.addEventListener("click",e=>{e.preventDefault();imageTarget=btn.dataset.mediaEdit;document.getElementById("imageFile").click();}));
}
function selectField(el){selectedPath=el.dataset.path;selectedBefore=getByPath(selectedPath);document.getElementById("fieldPath").value=selectedPath;document.getElementById("fieldEditor").value=el.innerText;}
function applyInspector(){if(!selectedPath)return;const val=document.getElementById("fieldEditor").value;setByPath(selectedPath,val);renderAll();queueSave();toast("Alan güncellendi.");}
function undoInspector(){if(!selectedPath)return;setByPath(selectedPath,selectedBefore);renderAll();queueSave();}
function navigate(n){showAll=false;currentPage=n;renderAll();requestAnimationFrame(()=>document.querySelector(`[data-page="${n}"]`)?.scrollIntoView({behavior:"smooth",block:"start"}));}
function collectAllText(){return state.pages.flatMap(p=>[p.title,p.subtitle,...p.hero.map(h=>h.text),...(p.loose||[]).map(f=>f.text),...p.sections.flatMap(s=>[s.title,...s.fields.map(f=>f.text)])]);}
function validateState(){
 const issues=[];const all=collectAllText();
 const reportNos=[state.global.reportNo,...all.flatMap(t=>String(t).match(/\bOT(?:O)?R-\d{4}-\d+\b/g)||[])];const rn=[...new Set(reportNos.map(x=>x.trim()))];if(rn.length>1)issues.push({level:"bad",text:"Rapor numarası formatları birbiriyle tutarlı değil: "+rn.join(" / ")});
 const pageRefs=all.flatMap(t=>[...String(t).matchAll(/Sayfa\s+(\d+)/gi)].map(m=>Number(m[1])));const badRefs=[...new Set(pageRefs.filter(n=>n>state.pages.length))];if(badRefs.length)issues.push({level:"bad",text:"19 sayfalık raporda bulunmayan sayfa referansları var: "+badRefs.join(", ")});
 if(all.some(t=>/\bkm\s*\/\s*s\b/i.test(String(t))))issues.push({level:"bad",text:"Hız biriminde km/s kullanımı var. Rapor için km/sa veya km/h kullanılmalı."});
 const p15=state.pages[14];const p15text=[p15.title,...p15.sections.flatMap(s=>[s.title,...s.fields.map(f=>f.text)])].join(" ");if(/KOLTUKLAR|İÇ MEKAN|Radyo \/ multimedya/i.test(p15text))issues.push({level:"bad",text:"Dış Donanım sayfasında İç Donanım maddeleri bulunuyor; dış donanım ağacıyla değiştirilmesi gerekiyor."});
 const p7=JSON.stringify(state.pages[6]);const p18=JSON.stringify(state.pages[17]);if(/HASARLI|DEĞİŞEN|İŞLEMLİ/i.test(p7)&&/yapısal işlem bulgusu tespit edilmedi/i.test(p18))issues.push({level:"bad",text:"Şasi/Yapısal bulguları ile Nihai Kanaat metni çelişiyor."});
 const p12=JSON.stringify(state.pages[11]);const p2p19=JSON.stringify([state.pages[1],state.pages[18]]);if(/Hata kodu yok/i.test(p12)&&/geçmiş ABS hata kaydı/i.test(p2p19))issues.push({level:"warn",text:"OBD sayfası hata kodu yok derken özet/kanıt sayfası geçmiş ABS kaydı gösteriyor. Aktif/Geçmiş DTC ayrımı yapılmalı."});
 const vehicleTexts=[...state.pages[0].sections.flatMap(s=>s.fields.map(f=>f.text)),...state.pages[2].sections.flatMap(s=>s.fields.map(f=>f.text))];const models=vehicleTexts.filter(t=>/MARKA \/ MODEL|Marka \/ Model/.test(t)).map(t=>t.split("—").slice(1).join("—").trim()).filter(Boolean);if(new Set(models).size>1)issues.push({level:"bad",text:"Kapak ile Araç Bilgileri sayfasında farklı marka/model verileri var: "+[...new Set(models)].join(" / ")});
 const kmVals=all.flatMap(t=>{if(!/kilometre|kayıtlı km|gösterge/i.test(String(t)))return [];return [...String(t).matchAll(/\b(\d{2,3}[.\s]\d{3})\s*km/gi)].map(m=>m[1]);});if(new Set(kmVals).size>2)issues.push({level:"warn",text:"Raporda birden fazla farklı kilometre değeri bulunuyor; araç km senaryosu tek kaynaktan beslenmeli."});
 if(!issues.length)issues.push({level:"ok",text:"Otomatik kontrolde kritik veri çelişkisi bulunmadı."});return issues;
}
function showValidation(){const issues=validateState();const host=document.getElementById("validationList");host.innerHTML=issues.map(i=>`<div class="validation-item ${i.level}">${escapeHtml(i.text)}</div>`).join("");document.getElementById("validationPanel").hidden=false;const bad=issues.filter(i=>i.level==="bad").length,warn=issues.filter(i=>i.level==="warn").length;const s=document.getElementById("warningSummary");s.className="sidebar-card warning-card "+(bad?"bad":warn?"":"ok");s.innerHTML=`<b>Tutarlılık</b><span>${bad?bad+" kritik hata":warn?warn+" uyarı":"Uygun"}</span>`;if(!showAll&&innerWidth>1250)document.getElementById("validationPanel").scrollIntoView({behavior:"smooth",block:"nearest"})}
function exportJson(){const blob=new Blob([JSON.stringify(state,null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`OTOTR-${state.global.reportNo||workOrderId}-web-report.json`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
async function handleImage(file){if(!file||!imageTarget)return;const data=await compressImage(file,1100,.78);state.media[imageTarget]=data;queueSave();renderAll();toast("Görsel rapora eklendi.");}
function compressImage(file,max,q){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>{const img=new Image();img.onload=()=>{let w=img.width,h=img.height;const scale=Math.min(1,max/Math.max(w,h));w=Math.round(w*scale);h=Math.round(h*scale);const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(img,0,0,w,h);res(c.toDataURL("image/jpeg",q));};img.onerror=rej;img.src=r.result;};r.onerror=rej;r.readAsDataURL(file);})}
function importJson(file){const r=new FileReader();r.onload=()=>{try{state=JSON.parse(r.result);renderAll();saveLocal(true);toast("JSON raporu yüklendi.");}catch(e){toast("JSON dosyası okunamadı.")}};r.readAsText(file,"utf-8")}
function initMessages(){window.addEventListener("message",e=>{if(e.origin!==location.origin)return;const d=e.data||{};if(d.type==="ototr:report-web:hydrate"&&d.payload){state=d.payload;renderAll();saveLocal(true);toast("CRM verisi web rapora aktarıldı.");}});const ready={type:"ototr:report-web:ready",workOrderId,reportId};if(window.opener&&!window.opener.closed)window.opener.postMessage(ready,location.origin);if(window.parent&&window.parent!==window)window.parent.postMessage(ready,location.origin);}
function crmBack(){if(history.length>1)history.back();else location.href="../../index.html?portal=dealer#dealer";}

async function boot(){DEFAULT_STATE=await decodeDefaultState();state=structuredClone(DEFAULT_STATE);loadLocal();if(!localStorage.getItem(storageKey()))hydrateFromCrmDemo();document.body.classList.add("edit-mode");renderAll();initMessages();}
boot();
document.getElementById("pageNav").addEventListener("click",e=>{const b=e.target.closest("[data-nav]");if(b)navigate(Number(b.dataset.nav));});
document.getElementById("btnAll").addEventListener("click",()=>{showAll=!showAll;document.getElementById("btnAll").textContent=showAll?"Tek Sayfa":"Tüm Rapor";renderAll();});
document.getElementById("btnSave").addEventListener("click",saveCrm);document.getElementById("btnValidate").addEventListener("click",showValidation);document.getElementById("btnPrint").addEventListener("click",()=>window.print());document.getElementById("btnExport").addEventListener("click",exportJson);document.getElementById("btnImport").addEventListener("click",()=>document.getElementById("jsonFile").click());document.getElementById("btnCrm").addEventListener("click",crmBack);document.getElementById("btnApplyField").addEventListener("click",applyInspector);document.getElementById("btnUndoField").addEventListener("click",undoInspector);
document.getElementById("jsonFile").addEventListener("change",e=>{if(e.target.files[0])importJson(e.target.files[0]);e.target.value="";});document.getElementById("imageFile").addEventListener("change",async e=>{if(e.target.files[0])await handleImage(e.target.files[0]);e.target.value="";});
document.getElementById("fieldEditor").addEventListener("input",()=>{if(selectedPath){setByPath(selectedPath,document.getElementById("fieldEditor").value);queueSave();}});
