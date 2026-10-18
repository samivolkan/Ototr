"use strict";
(function(){
  let supported=false,region=null,key=null,drag=null,selecting=false,revision=0;
  const panel=node('div','retry-panel'),help=node('p','settings-note',''),actions=node('div','retry-actions');
  const choose=node('button','secondary-button','Fotoğrafta bölge seç'),run=node('button','dark-button','Bu alanı tekrar oku');
  const cancel=node('button','text-button','Bölge seçimini iptal et'),results=node('div','retry-results');
  help.setAttribute('role','status');cancel.hidden=true;
  actions.append(choose,run,cancel);panel.append(actions,help,results);$('evidence').append(panel);
  const box=node('div','retry-selection');box.hidden=true;$('imageStage').append(box);
  function sync(){choose.disabled=!supported||state.busy;run.disabled=!supported||state.busy||!region;}
  function stopSelection(){selecting=false;drag=null;cancel.hidden=true;$('imageStage').classList.remove('selecting-region');}
  function clear(){revision++;stopSelection();region=null;key=null;box.hidden=true;results.replaceChildren();panel.hidden=true;}
  function select(field,lines){
    clear();key=field.key;panel.hidden=!RuhsatDataPolicy.vehicleFields(state.result).some(f=>f.key===key);
    if(panel.hidden)return;
    if(lines.length){const points=lines.flatMap(l=>l.box),xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
      region={x:Math.max(0,Math.min(...xs)-15),y:Math.max(0,Math.min(...ys)-12)};
      region.w=Math.min(state.result.image.width-region.x,Math.max(...xs)-region.x+15);
      region.h=Math.min(state.result.image.height-region.y,Math.max(...ys)-region.y+12);
    }
    help.textContent=supported?'İlk okuma korunur. Seçilen alan iki modelle, normal ve kontrastlı olarak tekrar okunur. Sonucu siz seçip kontrol edersiniz.':'Alanı tekrar okumak için 0.3 OCR servisi gerekir.';sync();
  }
  function point(e){const r=$('previewImage').getBoundingClientRect(),im=state.result.image;return {x:Math.max(0,Math.min(im.width,(e.clientX-r.left)*im.width/r.width)),y:Math.max(0,Math.min(im.height,(e.clientY-r.top)*im.height/r.height))};}
  function showRegion(){const im=state.result.image;box.hidden=false;Object.assign(box.style,{left:100*region.x/im.width+'%',top:100*region.y/im.height+'%',width:100*region.w/im.width+'%',height:100*region.h/im.height+'%'});}
  choose.addEventListener('click',()=>{if(state.busy)return;selecting=true;region=null;results.replaceChildren();cancel.hidden=false;$('imageStage').classList.add('selecting-region');help.textContent='Fotoğrafta yalnız seçtiğiniz alanın değerini çevreleyen bir kutu çizin.';$('imageStage').scrollIntoView({block:'center',behavior:'smooth'});sync();});
  cancel.addEventListener('click',()=>{stopSelection();box.hidden=true;help.textContent='Bölge seçimi iptal edildi.';sync();});
  $('imageStage').addEventListener('pointerdown',e=>{if(!selecting||state.busy)return;e.preventDefault();drag=point(e);$('imageStage').setPointerCapture(e.pointerId);});
  $('imageStage').addEventListener('pointermove',e=>{if(!drag)return;const p=point(e);region={x:Math.min(p.x,drag.x),y:Math.min(p.y,drag.y),w:Math.abs(p.x-drag.x),h:Math.abs(p.y-drag.y)};showRegion();});
  $('imageStage').addEventListener('pointerup',()=>{if(!drag)return;stopSelection();if(!region||region.w<8||region.h<8||region.w*region.h>2000000){region=null;box.hidden=true;help.textContent='Bölge çok küçük veya büyük. Yalnız ilgili alanı seçin.';}else{help.textContent='Bölge seçildi. Bu alanı tekrar oku düğmesini kullanın.';drawCrop();}sync();});
  $('imageStage').addEventListener('pointercancel',()=>{stopSelection();region=null;box.hidden=true;sync();});
  function drawCrop(){const c=$('cropCanvas');c.hidden=false;c.width=Math.ceil(region.w);c.height=Math.ceil(region.h);c.getContext('2d').drawImage($('previewImage'),region.x,region.y,region.w,region.h,0,0,c.width,c.height);return c;}
  run.addEventListener('click',async()=>{
    if(!region||!key||state.busy)return;
    const generation=state.generation,current=revision,fieldKey=key;const original=allFields().find(f=>f.key===fieldKey);
    state.busy=true;updateControls();sync();results.replaceChildren();help.textContent='Seçilen alan tekrar okunuyor…';
    try{
      const blob=await new Promise(resolve=>drawCrop().toBlob(resolve,'image/png'));if(!blob)throw Error('Bölge hazırlanamadı.');
      const data=await apiRequest('/api/v1/ruhsat/tekrar?field='+encodeURIComponent(fieldKey),{method:'POST',headers:{'Content-Type':'image/png','X-OTOTR-Client':'ruhsat-lab'},body:blob});
      if(generation!==state.generation||current!==revision)return;
      results.append(node('p','field-original','İlk OCR: '+(original.value??'Okunamadı')));
      for(const candidate of data.candidates){const card=node('div','retry-candidate');card.append(node('strong','',candidate.value),node('small','',candidate.sources.map(s=>s.model+' / '+(s.variant==='original'?'normal':'kontrast')).join(' · ')));
        if(candidate.issues.length)card.append(node('p','field-issue',candidate.issues.join(' ')));
        const apply=node('button','secondary-button','Bu sonucu kullan');apply.addEventListener('click',()=>{if(generation!==state.generation||current!==revision||state.busy)return;state.edits[fieldKey]=candidate.value;state.confirmed.delete(fieldKey);renderFields();updateReview();renderRaw();help.textContent='Değer aktarıldı. Fotoğrafla karşılaştırıp “Kontrol ettim” seçeneğini işaretleyin.';});card.append(apply);results.append(card);
      }
      help.textContent=data.candidates.length?`${data.attempts} okuma · ${data.elapsed_seconds} sn. Aynı sonuç çıkması doğruluk garantisi değildir.`:'Bu bölgede değer bulunamadı. Bölgeyi yeniden seçebilir veya elle girebilirsiniz.';
    }catch(error){if(current===revision)help.textContent=error.message;}finally{state.busy=false;updateControls();sync();}
  });
  window.RuhsatRetry={select,clear,sync,health:info=>{supported=info.field_retry===true;sync();}};
  clear();
})();
