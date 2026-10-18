"use strict";
const clientConfig = window.RUHSAT_CONFIG || {};
const apiBase = String(clientConfig.apiBase || "").replace(/\/$/, "");
let healthTimer;
async function apiRequest(path, options={}) {
  const headers={...(path.startsWith('/api/v1/ruhsat/')?window.RuhsatLearning?.auth('ocr'):{}),...options.headers};
  const response = await fetch(apiBase + path, {...options, headers, cache:"no-store", credentials:apiBase?"omit":"same-origin",
    signal:AbortSignal.timeout(path==="/api/health"?12000:180000)});
  if (!(response.headers.get("content-type") || "").includes("application/json")) {
    throw Error("OCR bağlantısı giriş veya hata sayfasına yönlendi. Bağlantıyı yeniden kontrol edin.");
  }
  const data = await response.json();
  if (!response.ok) throw Error(typeof data.detail === "string" ? data.detail : `OCR sunucusu hata verdi (${response.status}).`);
  return data;
}
const $ = id => document.getElementById(id);
const state = {file:null,sourceUrl:null,result:null,rotation:0,zoom:1,filter:"all",selected:null,edits:{},confirmed:new Set(),ready:false,busy:false,sample:false,rawMode:"text",generation:0,enabled:new Set(RuhsatFieldSettings.defaults)};
let toastTimer;
let preferenceStorage=null;
try { preferenceStorage=window.localStorage; } catch { /* Preferences can still work for this session. */ }
function initializeSettings(){
  state.enabled=new Set(RuhsatFieldSettings.read(preferenceStorage));
  const groups=$("settingsGroups");
  for(const group of [...new Set(RuhsatFieldSettings.catalog.map(f=>f.group))]){
    const fields=RuhsatFieldSettings.catalog.filter(f=>f.group===group),fieldset=node("fieldset","settings-group"+(fields[0].transient?" transient":""));
    fieldset.append(node("legend","",group));
    for(const field of fields){
      const label=node("label","settings-option"),input=node("input");input.type="checkbox";input.dataset.settingKey=field.key;input.id="setting-"+field.key;input.checked=state.enabled.has(field.key);input.disabled=!!field.required;input.setAttribute("aria-label",field.label+" alanını kullan");
      input.addEventListener("change",()=>{const keys=new Set(state.enabled);if(input.checked)keys.add(field.key);else keys.delete(field.key);applyFieldSelection([...keys]);});
      label.append(input,node("span","",field.label));if(field.required)label.append(node("small","","Zorunlu"));fieldset.append(label);
    }
    if(fields[0].transient)fieldset.append(node("p","settings-group-note","Yalnız geçici öneri olarak gösterilir. JSON’a ve kalıcı kayda dahil edilmez."));
    groups.append(fieldset);
  }
  document.querySelectorAll("[data-preset]").forEach(button=>button.addEventListener("click",()=>applyFieldSelection(RuhsatFieldSettings.preset(button.dataset.preset))));
  syncSettings();
}
function syncSettings(){
  const selected=RuhsatFieldSettings.catalog.filter(f=>state.enabled.has(f.key));
  $("settingsCount").textContent=`${selected.filter(f=>!f.transient).length} araç · ${selected.filter(f=>f.transient).length} satıcı önerisi`;
  document.querySelectorAll("[data-setting-key]").forEach(input=>{input.checked=state.enabled.has(input.dataset.settingKey);input.disabled=state.busy||RuhsatFieldSettings.catalog.find(f=>f.key===input.dataset.settingKey).required===true;});
  document.querySelectorAll("[data-preset]").forEach(button=>button.disabled=state.busy);
}
function clearEvidence(){state.selected=null;$("evidence").hidden=true;$("evidenceLabel").textContent="";$("evidenceText").textContent="";$("cropCanvas").width=0;$("cropCanvas").height=0;}
function applyFieldSelection(keys){
  if(state.busy)return;
  state.enabled=new Set(RuhsatFieldSettings.normalize(keys));
  const saved=RuhsatFieldSettings.save(preferenceStorage,[...state.enabled]);
  $("settingsStatus").textContent=saved?"Kaydedildi · Bu tarayıcıda":"Bu oturumda uygulandı · Tarayıcıya kaydedilemedi";$("settingsStatus").classList.toggle("error",!saved);syncSettings();
  if(state.result){
    if(!state.enabled.has(state.selected))clearEvidence();
    renderFields();renderOverlay();updateReview();renderRaw();
  }
}

function toast(message,error=false){$("toast").textContent=message;$("toast").classList.toggle("error",error);$("toast").hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$("toast").hidden=true,6500);}
function node(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
function setBusy(value){state.busy=value;document.body.classList.toggle("busy",value);$("progress").hidden=!value;$("analyzeLabel").textContent=value?"Ruhsat okunuyor…":"Ruhsatı oku";$("analyzeIcon").textContent=value?"◌":"✦";updateControls();}
function updateControls(){
  syncSettings();
  window.RuhsatLearning?.sync();window.RuhsatRetry?.sync();
  $("analyzeBtn").disabled=!state.file||!state.ready||state.busy;
  ["rotateBtn","zoomInBtn","zoomOutBtn","clearBtn"].forEach(id=>$(id).disabled=!state.file||state.busy);
  ["modeSelect","rectify","autoRotate","sampleBtn","replaceBtn","fileInput"].forEach(id=>$(id).disabled=state.busy);
}
async function pollHealth(){
  clearTimeout(healthTimer);
  try{const health=await apiRequest("/api/health");if(health.service!=="ototr-ruhsat-lab")throw Error("OCR servisi doğrulanamadı.");window.RuhsatLearning?.health(health);window.RuhsatRetry?.health(health);state.ready=health.status==="ready";const status=$("engineStatus");status.replaceChildren(node("i"),document.createTextNode(state.ready?(health.local_only?"Yerel · Motor hazır":"Web · Motor hazır"):health.status==="error"?"Motor başlatılamadı":"Motor hazırlanıyor"));status.className="status-pill "+(state.ready?"ready":health.status==="error"?"error":"");status.title=health.error||"";$("connectionHint").textContent=state.ready?"Motor hazır. Fotoğraf seçtikten sonra Ruhsatı oku düğmesini kullanın.":health.error||"OCR motoru hazırlanıyor; hazır olduğunda okuma etkinleşir.";
  }catch(error){state.ready=false;$("engineStatus").replaceChildren(node("i"),document.createTextNode("OCR bağlantısı kesildi"));$("engineStatus").className="status-pill error";$("connectionHint").textContent=(error.name==="TimeoutError"?"OCR sunucusu zamanında yanıt vermedi.":error.message)+" Servis durumunu ve bağlantı adresini kontrol edin.";}
  $("retryConnection").hidden=state.ready;updateControls();healthTimer=setTimeout(pollHealth,state.ready?20000:10000);
}
function clearResult(){window.RuhsatRetry?.clear();if($("qualityCondition"))$("qualityCondition").value="unknown";state.result=null;state.edits={};state.confirmed.clear();state.selected=null;state.filter="all";$("fieldSearch").value="";$("resultsContent").hidden=true;$("emptyResults").hidden=false;$("resultStatus").textContent="Belge bekleniyor";$("evidence").hidden=true;$("fields").replaceChildren();$("sellerFields").replaceChildren();$("sellerSuggestion").hidden=true;$("evidenceLabel").textContent="";$("evidenceText").textContent="";$("cropCanvas").width=0;$("cropCanvas").height=0;$("warnings").replaceChildren();$("overlay").replaceChildren();$("rawOutput").textContent="";document.querySelectorAll("[data-filter]").forEach(b=>b.classList.toggle("active",b.dataset.filter==="all"));}
function reset(force=false){if(state.busy&&!force)return;state.generation++;if(state.sourceUrl)URL.revokeObjectURL(state.sourceUrl);Object.assign(state,{file:null,sourceUrl:null,rotation:0,zoom:1,sample:false});clearResult();$("previewImage").removeAttribute("src");$("previewArea").hidden=true;$("dropZone").hidden=false;$("replaceBtn").hidden=true;$("fileLabel").textContent="Yeni inceleme";$("fileLabel").removeAttribute("title");$("fileInput").value="";updateControls();}
async function selectFile(file,isSample=false){
  if(state.busy||!file)return;
  if(file.size>20*1024*1024){toast("Fotoğraf en fazla 20 MB olabilir.",true);return;}
  if(!/\.(jpe?g|png|webp|heic|heif)$/i.test(file.name)&&!/^image\/(jpeg|png|webp|hei[cf])$/.test(file.type)){toast("JPG, PNG, WebP veya HEIC fotoğrafı seçin.",true);return;}
  reset();state.file=file;state.sample=isSample;state.sourceUrl=URL.createObjectURL(file);$("fileLabel").textContent=isSample?"Kurgusal test belgesi":file.name;$("fileLabel").title=file.name;$("dropZone").hidden=true;$("previewArea").hidden=false;$("replaceBtn").hidden=false;$("imageSize").textContent=(file.size/1024/1024).toFixed(1)+" MB · Hazır";$("previewImage").onerror=()=>{$("imageScroll").hidden=true;$("noPreview").hidden=false;};$("previewImage").onload=()=>{$("imageScroll").hidden=false;$("noPreview").hidden=true;};$("previewImage").src=state.sourceUrl;$("imageStage").style.width="100%";updateControls();
}
async function rotate(){if(!state.file||state.busy)return;clearResult();state.rotation=(state.rotation+90)%360;state.zoom=1;$("imageStage").style.width="100%";const image=new Image();image.onload=()=>{const swap=state.rotation%180!==0;const canvas=document.createElement("canvas");canvas.width=swap?image.height:image.width;canvas.height=swap?image.width:image.height;const c=canvas.getContext("2d");c.translate(canvas.width/2,canvas.height/2);c.rotate(state.rotation*Math.PI/180);c.drawImage(image,-image.width/2,-image.height/2);$("previewImage").src=canvas.toDataURL("image/jpeg",.9);};image.onerror=()=>toast("Döndürme, okuma sırasında uygulanacak.");image.src=state.sourceUrl;$("imageSize").textContent=state.rotation+"° · Yeniden okumaya hazır";}
async function analyze(){
  if(!state.file||!state.ready||state.busy)return;
  clearResult();setBusy(true);const started=Date.now();const generation=state.generation;let timer=setInterval(()=>{$("progressLabel").textContent=`OCR çalışıyor · ${Math.round((Date.now()-started)/1000)} sn · ${$("modeSelect").value==="detailed"?"İki model karşılaştırılıyor":"Metin ve alanlar ayrılıyor"}`;},1000);
  try{
    const params=new URLSearchParams({mode:$("modeSelect").value,rotation:String(state.rotation),rectify:String($("rectify").checked),auto_rotate:String($("autoRotate").checked),...window.RuhsatLearning?.parameters()});
    const data=await apiRequest("/api/v1/ruhsat/oku?"+params,{method:"POST",headers:{"Content-Type":state.file.type||"application/octet-stream","X-OTOTR-Client":"ruhsat-lab"},body:state.file});
    if(generation!==state.generation)return;
    state.result=data;state.result.synthetic_sample=state.sample;state.edits=Object.fromEntries(allFields().map(f=>[f.key,f.value??""]));$("previewImage").src=data.image.preview;$("imageStage").style.width="100%";state.zoom=1;$("imageSize").textContent=`${data.image.width} × ${data.image.height} · ${data.image.rotation}°${data.image.document_crop?" · Belgeye odaklanıldı":""}${data.image.perspective_corrected?" · Perspektif düzeltildi":""}`;$("resultStatus").textContent=state.sample?"KURGUSAL ÖRNEK":data.document_recognized?"İncelemeye hazır":"Belgeyi kontrol edin";$("emptyResults").hidden=true;$("resultsContent").hidden=false;$("readCount").textContent=data.summary.read;$("reviewCount").textContent=data.summary.review;$("elapsed").textContent=data.elapsed_seconds.toLocaleString("tr-TR");$("modelLabel").textContent=data.models.join(" + ");
    $("warnings").replaceChildren(...data.warnings.map(w=>node("p","",w)));$("warnings").hidden=!data.warnings.length;
    renderFields();renderOverlay();updateReview();renderRaw();
    if(vehicleFields().some(f=>f.value))selectField(vehicleFields().find(f=>f.value)?.key);
    toast(`${selectedFields().filter(f=>f.value!==null).length} seçili alan okundu. Fotoğrafla karşılaştırarak kontrol edin.`);
  }catch(error){toast(error.message||"Yerel sunucuya ulaşılamadı.",true);}finally{clearInterval(timer);setBusy(false);}
}
function allFields(){return [...RuhsatDataPolicy.vehicleFields(state.result),...RuhsatDataPolicy.suggestionFields(state.result)];}
function vehicleFields(){return RuhsatDataPolicy.vehicleFields(state.result).filter(f=>state.enabled.has(f.key));}
function selectedFields(){return allFields().filter(f=>state.enabled.has(f.key));}
function fieldValue(field){return state.edits[field.key]??field.value??"";}
function renderFields(){
  const vehicleContainer=$("fields"),sellerContainer=$("sellerFields");vehicleContainer.replaceChildren();sellerContainer.replaceChildren();if(!state.result)return;$("sellerSuggestion").hidden=!RuhsatDataPolicy.suggestionFields(state.result).some(f=>state.enabled.has(f.key));const search=$("fieldSearch").value.toLocaleLowerCase("tr");let lastGroup="";let shown=0;
  const groupOrder=["Araç bilgileri","Tescil bilgileri","Teknik bilgiler","Sahip bilgileri"];
  const sorted=selectedFields().sort((a,b)=>groupOrder.indexOf(a.group)-groupOrder.indexOf(b.group));
  for(const field of sorted){
    const isSuggestion=RuhsatDataPolicy.suggestionFields(state.result).some(f=>f.key===field.key);const container=isSuggestion?sellerContainer:vehicleContainer;
    if(search&&!`${field.label} ${field.key}`.toLocaleLowerCase("tr").includes(search))continue;
    if(state.filter==="review"&&(!field.needs_review||state.confirmed.has(field.key)))continue;
    if(state.filter==="missing"&&field.value!==null)continue;
    if(!isSuggestion&&field.group!==lastGroup){container.append(node("div","field-group",field.group));lastGroup=field.group;}
    shown++;const row=node("div","field-row"+(state.selected===field.key?" selected":""));row.dataset.key=field.key;
    const top=node("div","field-top"), label=node("button","field-label",field.label+" ↗");label.addEventListener("click",()=>selectField(field.key));
    const score=node("span","score-badge "+(field.status==="missing"?"missing":field.needs_review?"review":""),field.value===null?"Okunamadı":`${field.needs_review?"Kontrol · ":"Puan · "}${field.confidence.toLocaleString("tr-TR",{minimumFractionDigits:2,maximumFractionDigits:2})}`);score.title="Kalibre edilmemiş OCR / eşleme puanı; gerçek doğruluk olasılığı değildir.";top.append(label,score);row.append(top);
    const valueRow=node("div","field-value-row"),input=node("input","field-value");input.value=fieldValue(field);input.placeholder="Okunamadı · elle girebilirsiniz";input.setAttribute("aria-label",field.label);input.autocomplete="off";input.spellcheck=false;
    const confirmLabel=node("label","confirm-label"+(state.confirmed.has(field.key)?" checked":"")),check=node("input");check.type="checkbox";check.checked=state.confirmed.has(field.key);check.disabled=!input.value.trim();check.setAttribute("aria-label",field.label+" kontrol edildi");confirmLabel.append(check,document.createTextNode("Kontrol ettim"));
    input.addEventListener("focus",()=>selectField(field.key));input.addEventListener("input",()=>{state.edits[field.key]=input.value;state.confirmed.delete(field.key);check.checked=false;check.disabled=!input.value.trim();confirmLabel.classList.remove("checked");const oldNote=row.querySelector(".field-original");if(oldNote)oldNote.remove();if(input.value!==(field.value??""))row.append(node("p","field-original","İlk OCR: "+(field.value??"Okunamadı")+" · Elle düzenlendi"));updateReview();renderRaw();});
    input.addEventListener("change",()=>{const changed=fieldValue(field)!==(field.value??"");const old=row.querySelector(".field-original");if(old)old.remove();if(changed)row.append(node("p","field-original","İlk OCR: "+(field.value??"Okunamadı")+" · Elle düzenlendi"));});
    check.addEventListener("change",()=>{if(check.checked)state.confirmed.add(field.key);else state.confirmed.delete(field.key);confirmLabel.classList.toggle("checked",check.checked);updateReview();renderRaw();});
    valueRow.append(input,confirmLabel);row.append(valueRow);
    if(field.agreement)row.append(node("span","agreement","✓ İki okumada aynı değer"));
    if(field.issues.length)row.append(node("p","field-issue",field.issues.join(" ")));
    if(fieldValue(field)!==(field.value??""))row.append(node("p","field-original","İlk OCR: "+(field.value??"Okunamadı")+" · Elle düzenlendi"));
    for(const alt of field.alternatives){const b=node("button","alternative","Diğer okuma: "+alt.value);b.addEventListener("click",()=>{state.edits[field.key]=alt.value;state.confirmed.delete(field.key);renderFields();selectField(field.key,alt.line_ids);updateReview();renderRaw();});row.append(b);}
    container.append(row);
  }
  if(!shown)vehicleContainer.append(node("p","confidence-note","Bu filtreye uyan alan yok."));
}
function selectField(key,lineIds){if(!state.result||!key||!state.enabled.has(key))return;state.selected=key;document.querySelectorAll(".field-row").forEach(r=>r.classList.toggle("selected",r.dataset.key===key));const field=allFields().find(f=>f.key===key);const ids=lineIds??field.line_ids;const lines=state.result.lines.filter(l=>ids.includes(l.id));$("evidence").hidden=false;$("evidenceLabel").textContent=field.label;$("evidenceText").textContent=lines.length?lines.map(l=>l.text).join(" · "):"Bu alan için fotoğrafta eşleşen bir bölge bulunamadı.";const canvas=$("cropCanvas");canvas.hidden=!lines.length;if(lines.length){const xs=lines.flatMap(l=>l.box.map(p=>p[0])),ys=lines.flatMap(l=>l.box.map(p=>p[1]));const x=Math.max(0,Math.min(...xs)-12),y=Math.max(0,Math.min(...ys)-9),w=Math.min(state.result.image.width-x,Math.max(...xs)-x+12),h=Math.min(state.result.image.height-y,Math.max(...ys)-y+9);canvas.width=w;canvas.height=h;const img=$("previewImage");const draw=()=>canvas.getContext("2d").drawImage(img,x,y,w,h,0,0,w,h);if(img.complete&&img.naturalWidth)draw();else img.addEventListener("load",draw,{once:true});}renderOverlay(ids);window.RuhsatRetry?.select(field,lines);}
function renderOverlay(ids){const svg=$("overlay");svg.replaceChildren();if(!state.result)return;svg.setAttribute("viewBox",`0 0 ${state.result.image.width} ${state.result.image.height}`);const active=ids??allFields().find(f=>f.key===state.selected)?.line_ids??[];for(const line of state.result.lines){if(!$("showBoxes").checked&&!active.includes(line.id))continue;if($("showBoxes").checked&&line.model==="v6"&&!active.includes(line.id))continue;const p=document.createElementNS("http://www.w3.org/2000/svg","polygon");p.setAttribute("points",line.box.map(b=>b.join(",")).join(" "));if(active.includes(line.id))p.classList.add("active");svg.append(p);}}
function reviewReady(){if(!state.result)return false;const populated=vehicleFields().filter(f=>fieldValue(f).trim());return ["plate","vin"].every(k=>state.edits[k]?.trim()&&state.confirmed.has(k))&&populated.every(f=>state.confirmed.has(f.key));}
function updateReview(){window.RuhsatLearning?.sync();window.RuhsatRetry?.sync();if(!state.result)return;$("readCount").textContent=vehicleFields().filter(f=>f.value!==null).length;$("reviewCount").textContent=vehicleFields().filter(f=>f.needs_review&&f.value!==null&&!state.confirmed.has(f.key)).length;const populated=vehicleFields().filter(f=>fieldValue(f).trim());const count=populated.filter(f=>state.confirmed.has(f.key)).length;$("confirmedCount").textContent=count;$("reviewProgressText").textContent=`${count} / ${populated.length} dolu alan kontrol edildi`;$("reviewProgressBar").style.width=(populated.length?100*count/populated.length:0)+"%";$("exportBtn").disabled=!reviewReady();$("exportHint").textContent=reviewReady()?"Araç alanları kontrol edildi. Satıcı önerileri JSON dosyasına dahil edilmez.":"Dolu araç alanlarını kontrol edin. Plaka ve şasi dolu ve onaylı olmalı. Satıcı önerileri dışa aktarılmaz.";}
function exportData(reviewed=false){return RuhsatDataPolicy.buildExport(state.result,state.edits,state.confirmed,reviewed&&reviewReady(),state.sample,[...state.enabled]);}
function renderRaw(){if(!state.result)return;$("rawOutput").textContent=state.rawMode==="json"?JSON.stringify(exportData(false),null,2):state.result.lines.map(l=>`[${l.model} · ${l.score.toFixed(2)}] ${l.text}`).join("\n");}
function download(reviewed){if(!state.result)return;if(reviewed&&!reviewReady()){toast("Önce dolu alanları ve plaka/şasiyi kontrol edin.",true);return;}const blob=new Blob([JSON.stringify(exportData(reviewed),null,2)],{type:"application/json;charset=utf-8"});const url=URL.createObjectURL(blob);const a=node("a");a.href=url;a.download=`ototr-ruhsat-${state.sample?"ornek-":""}${reviewed?"kontrol-edildi":"taslak"}-${new Intl.DateTimeFormat("sv-SE",{timeZone:"Europe/Istanbul"}).format(new Date())}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast("JSON indirmesi başlatıldı.");}
$("dropZone").addEventListener("click",()=>{if(!state.busy)$("fileInput").click();});$("dropZone").addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();if(!state.busy)$("fileInput").click();}});$("replaceBtn").addEventListener("click",()=>$("fileInput").click());$("fileInput").addEventListener("change",e=>selectFile(e.target.files[0]));
for(const event of ["dragenter","dragover"]){$("dropZone").addEventListener(event,e=>{e.preventDefault();$("dropZone").classList.add("dragover");});}for(const event of ["dragleave","drop"]){$("dropZone").addEventListener(event,e=>{e.preventDefault();$("dropZone").classList.remove("dragover");if(event==="drop")selectFile(e.dataTransfer.files[0]);});}
document.addEventListener("paste",e=>{if(state.busy||e.target.matches("input,textarea"))return;const image=[...(e.clipboardData?.items??[])].find(i=>i.type.startsWith("image/"));if(image){const f=image.getAsFile();selectFile(new File([f],"panodan-ruhsat.png",{type:f.type}));}});
$("sampleBtn").addEventListener("click",async()=>{try{const r=await fetch(clientConfig.samplePath||"/assets/sample.png");if(!r.ok)throw Error();const blob=await r.blob();await selectFile(new File([blob],"kurgusal-test-belgesi.png",{type:"image/png"}),true);toast("Kurgusal örnek yüklendi. Ruhsatı oku düğmesi gerçek OCR işlemini başlatır.");}catch{toast("Örnek belge yüklenemedi.",true);}});
$("retryConnection").addEventListener("click",pollHealth);
$("clearBtn").addEventListener("click",()=>reset());$("rotateBtn").addEventListener("click",rotate);$("analyzeBtn").addEventListener("click",analyze);$("zoomInBtn").addEventListener("click",()=>{state.zoom=Math.min(3,state.zoom+.25);$("imageStage").style.width=100*state.zoom+"%";});$("zoomOutBtn").addEventListener("click",()=>{state.zoom=Math.max(1,state.zoom-.25);$("imageStage").style.width=100*state.zoom+"%";});$("showBoxes").addEventListener("change",()=>renderOverlay());$("fieldSearch").addEventListener("input",renderFields);
document.querySelectorAll("[data-filter]").forEach(button=>button.addEventListener("click",()=>{state.filter=button.dataset.filter;document.querySelectorAll("[data-filter]").forEach(b=>b.classList.toggle("active",b===button));renderFields();}));$("draftBtn").addEventListener("click",()=>download(false));$("exportBtn").addEventListener("click",()=>download(true));$("rawTextBtn").addEventListener("click",()=>{state.rawMode="text";renderRaw();});$("rawJsonBtn").addEventListener("click",()=>{state.rawMode="json";renderRaw();});initializeSettings();pollHealth();

// Clear the page before a browser back/forward cache can retain the document.
window.addEventListener("pagehide",()=>{reset(true);setBusy(false);});
window.addEventListener("pageshow",event=>{if(event.persisted){reset(true);setBusy(false);}});
