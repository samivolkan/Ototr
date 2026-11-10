const angles = [
  ['front','Ön görünüm','Tam cephe'],['rear','Arka görünüm','Tam cephe'],
  ['leftFront','Sol ön çapraz','45° açı'],['rightFront','Sağ ön çapraz','45° açı'],
  ['leftRear','Sol arka çapraz','45° açı'],['rightRear','Sağ arka çapraz','45° açı'],
  ['leftSide','Sol yan görünüm','Tam profil'],['rightSide','Sağ yan görünüm','Tam profil']
];
const state={files:[],quality:[]};
const $=s=>document.querySelector(s);
const angleList=$('#angleList');
angles.forEach((a,i)=>angleList.insertAdjacentHTML('beforeend',`<div class="angle" data-i="${i}"><div class="angle-icon">▱</div><div><strong>${a[1]}</strong><small>${a[2]}</small></div><span class="angle-state"></span></div>`));

function toast(message){const t=$('#toast');t.textContent=message;t.classList.add('show');clearTimeout(t.timer);t.timer=setTimeout(()=>t.classList.remove('show'),2600)}
function formatBytes(n){return n>1048576?(n/1048576).toFixed(1)+' MB':Math.round(n/1024)+' KB'}
function render(){
  $('#thumbs').innerHTML='';
  state.files.forEach((item,i)=>{const el=document.createElement('div');el.className='thumb';el.innerHTML=`<img src="${item.url}" alt="Yüklenen araç fotoğrafı ${i+1}"><button aria-label="Fotoğrafı kaldır" data-remove="${i}">×</button><span>${i+1}. fotoğraf · ${formatBytes(item.file.size)}</span>`;$('#thumbs').append(el)});
  document.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{const i=+b.dataset.remove;URL.revokeObjectURL(state.files[i].url);state.files.splice(i,1);state.quality.splice(i,1);render();runAnalysis()});
  const done=Math.min(state.files.length,8);document.querySelectorAll('.angle').forEach((el,i)=>el.classList.toggle('done',i<done));
  const percent=Math.round(done/8*100);$('#progressValue').textContent=percent+'%';$('.ring').style.setProperty('--p',percent);$('#photoCount').textContent=`${done} / 8 açı tamamlandı`;$('#progressHint').textContent=done?`${8-done} zorunlu açı kaldı`:'Analize başlamak için fotoğraf yükleyin';$('#uploadCount').textContent=`${state.files.length} fotoğraf`;
  $('#gateText').textContent=done<8?`${8-done} zorunlu açı henüz eksik`:'Tüm zorunlu açılar yüklendi';
  $('#gateTitle').textContent=done<8?'Rapor kapatmaya hazır değil':'Eksper kontrolü bekleniyor';
  $('#gateDot').style.background=done<8?'var(--red)':'var(--amber)';
  $('#closeReport').disabled=done<8;$('#closeReport').classList.toggle('disabled',done<8);
}

function imageQuality(file){return new Promise(resolve=>{const img=new Image();const url=URL.createObjectURL(file);img.onload=()=>{const canvas=document.createElement('canvas');const max=180;const scale=Math.min(max/img.width,max/img.height,1);canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0,canvas.width,canvas.height);const d=ctx.getImageData(0,0,canvas.width,canvas.height).data;let lum=0,contrast=0,edges=0,prev=0;const vals=[];for(let i=0;i<d.length;i+=4){const v=.299*d[i]+.587*d[i+1]+.114*d[i+2];vals.push(v);lum+=v;if(i>0)edges+=Math.abs(v-prev);prev=v}lum/=vals.length;for(const v of vals)contrast+=(v-lum)**2;contrast=Math.sqrt(contrast/vals.length);edges/=vals.length;URL.revokeObjectURL(url);resolve({width:img.width,height:img.height,lum,contrast,edges,lowRes:img.width<900||img.height<600,dark:lum<55,bright:lum>220,soft:contrast<22||edges<12})};img.onerror=()=>{URL.revokeObjectURL(url);resolve({error:true})};img.src=url})}

async function handleFiles(files){const valid=[...files].filter(f=>f.type.startsWith('image/')&&f.size<=15*1024*1024);if(valid.length!==files.length)toast('Desteklenmeyen veya 15 MB üzeri dosyalar atlandı.');if(!valid.length)return;$('#analysisState').className='analysis-state running';$('#analysisState').innerHTML='<span></span>Görüntüler inceleniyor';for(const file of valid){state.files.push({file,url:URL.createObjectURL(file)});state.quality.push(await imageQuality(file));render()}runAnalysis()}

function runAnalysis(){if(!state.files.length){$('#emptyResults').hidden=false;$('#results').hidden=true;$('#analysisState').className='analysis-state';$('#analysisState').innerHTML='<span></span>Analiz bekleniyor';return}const warnings=[];let score=100;state.quality.forEach((q,i)=>{if(q.error){warnings.push(`${i+1}. fotoğraf okunamadı`);score-=25}else{if(q.lowRes){warnings.push(`${i+1}. fotoğrafın çözünürlüğü düşük`);score-=10}if(q.dark){warnings.push(`${i+1}. fotoğraf karanlık görünüyor`);score-=12}if(q.bright){warnings.push(`${i+1}. fotoğrafta aşırı pozlama var`);score-=10}if(q.soft){warnings.push(`${i+1}. fotoğraf netlik kontrolü gerektiriyor`);score-=12}}});score=Math.max(18,Math.round(score/Math.max(1,Math.ceil(state.files.length/3))));
  $('#emptyResults').hidden=true;$('#results').hidden=false;$('#analysisState').className='analysis-state done';$('#analysisState').innerHTML='<span></span>Yerel kontrol tamamlandı';$('#score').textContent=score;$('#scoreRing').style.borderColor=score>75?'var(--green)':score>50?'var(--amber)':'var(--red)';$('#resultTitle').textContent=warnings.length?'Kontrol gereken noktalar var':'Görüntü kalitesi uygun';$('#resultSummary').textContent=`${state.files.length} fotoğraf tarayıcı içinde incelendi. ${warnings.length} kalite uyarısı bulundu.`;
  const duplicate=state.files.some((x,i)=>state.files.some((y,j)=>j<i&&x.file.name===y.file.name&&x.file.size===y.file.size));let html=`<div class="finding"><span class="status">✓</span><div><strong>Fotoğraf gizliliği</strong><small>Dosyalar bu demoda cihazınızdan dışarı gönderilmedi.</small></div><b>UYGUN</b></div>`;if(duplicate)warnings.push('Aynı dosya birden fazla kez seçilmiş olabilir');if(!warnings.length)html+=`<div class="finding"><span class="status">✓</span><div><strong>Temel kalite kontrolü</strong><small>Işık, çözünürlük ve netlik eşikleri uygun.</small></div><b>UYGUN</b></div>`;warnings.slice(0,4).forEach(w=>html+=`<div class="finding warn"><span class="status">!</span><div><strong>Eksper kontrolü gerekli</strong><small>${w}</small></div><b>KONTROL</b></div>`);if(state.files.length<8)html+=`<div class="finding warn"><span class="status">!</span><div><strong>Eksik çekim açısı</strong><small>${8-state.files.length} zorunlu açı için fotoğraf bekleniyor.</small></div><b>EKSİK</b></div>`;html+=`<div class="finding warn"><span class="status">AI</span><div><strong>Hasar modeli bağlı değil</strong><small>Çizik, göçük ve parça analizi bu prototipte simüle edilmez.</small></div><b>DEMO</b></div>`;$('#findings').innerHTML=html;
}

const drop=$('#dropzone'),input=$('#fileInput');$('#chooseFiles').onclick=e=>{e.stopPropagation();input.click()};drop.onclick=()=>input.click();drop.onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();input.click()}};input.onchange=e=>handleFiles(e.target.files);['dragenter','dragover'].forEach(n=>drop.addEventListener(n,e=>{e.preventDefault();drop.classList.add('drag')}));['dragleave','drop'].forEach(n=>drop.addEventListener(n,e=>{e.preventDefault();drop.classList.remove('drag')}));drop.addEventListener('drop',e=>handleFiles(e.dataTransfer.files));
$('#resetButton').onclick=()=>{state.files.forEach(x=>URL.revokeObjectURL(x.url));state.files=[];state.quality=[];input.value='';render();runAnalysis();toast('Test alanı sıfırlandı.')};$('#saveDraft').onclick=()=>toast('Demo taslağı yalnızca bu oturumda tutuluyor.');$('#closeReport').onclick=()=>toast('Fotoğraf seti tamamlandı. Nihai karar için eksper onayı gerekir.');$('#plate').oninput=e=>e.target.value=e.target.value.toUpperCase();render();


