import{readOperationalSource}from'./operations-api.mjs?v=inspection-1';
import{inspectionHealth}from'./inspection-health.mjs';
const button=document.querySelector('#inspectionRefresh'),status=document.querySelector('#inspectionHealth'),list=document.querySelector('#inspectionCounts');
button.addEventListener('click',async()=>{button.disabled=true;list.replaceChildren();status.textContent='Şube kapsamı ve kaynak kontrol ediliyor…';
 try{const view=inspectionHealth(await readOperationalSource('inspection'));status.textContent=view.message;list.replaceChildren(...view.rows.map(text=>{const li=document.createElement('li');li.textContent=text;return li;}));}
 catch{status.textContent='Şube özeti doğrulanamadı. Bu durum sıfır iş anlamına gelmez; mevcut ERP oturumunu ve yetkini kontrol et.';}
 finally{button.disabled=false;}
});
