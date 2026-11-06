const panel = document.getElementById('financeWalkthrough');
if (panel && new URLSearchParams(location.search).get('walkthrough') === '1') {
  const steps = [
    ['Demo verisini yükle','B2 şubesinin bir günlük 3 araç senaryosu hazırlandı.','Veri hazır'],
    ['Araç 1 tahsilatını kesinleştir','Araç 1 müşteri tahsilatı ve %10 royalty tahakkuku oluşturuldu.','Royalty tahakkuku'],
    ['Araç 2 tahsilatını kesinleştir','Araç 2 tahsilatı işlendi; merkez alacağı büyüdü.','Kısmi tahsilat'],
    ['Araç 3 ve hizmet kalemlerini işle','TRAMER, KM ve TRAMER 360 hizmetleri şubeye yansıtıldı.','Hizmet yansıtma'],
    ['Bayi ödeme ekranını aç','Royalty + KDV ve hizmet yansıtma toplamı bayi ekranında gösterildi.','Ödeme bekliyor'],
    ['Demo ödemeyi kaydet','Bayi ödemesi simüle edildi; açık bakiye sıfırlandı.','Ödendi · 0 TL açık']
  ];
  const vehicles=[['Araç 1 · 34 DEMO 001',250000],['Araç 2 · 34 DEMO 002',350000],['Araç 3 · 34 DEMO 003',500000]];
  const services=[['TRAMER sorgu',25000],['KM sorgusu',35000],['TRAMER 360 sorgu',75000]];
  const money=new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}),fmt=c=>money.format(c/100),f=n=>panel.querySelector('[data-demo-'+n+']');
  const row=vs=>{const tr=document.createElement('tr');vs.forEach(v=>tr.insertCell().textContent=v);return tr};
  let step=0;
  function render(){
    const vs=step>=1?vehicles:[], rb=vs.reduce((s,x)=>s+x[1],0),r=Math.round(rb*.1),rv=Math.round(r*.2), sb=step>=3?services.reduce((s,x)=>s+x[1],0):0, sm=Math.round(sb*.1),sv=Math.round(sm*.2),due=r+rv+sb+sm+sv;
    f('vehicles').replaceChildren(...vs.map(x=>row([x[0],fmt(x[1]),fmt(Math.round(x[1]*.1)),fmt(Math.round(x[1]*.1*.2)),fmt(Math.round(x[1]*.12))])));
    f('services').replaceChildren(...(step>=3?services.map(x=>row([x[0],fmt(x[1]),fmt(Math.round(x[1]*.1)),fmt(Math.round(x[1]*.1*.2)),fmt(Math.round(x[1]*1.32))])):[]));
    f('events').replaceChildren(...[['Franchise','Şube B2 · 3 araç tamamlandı'],['İK','Günlük operasyon kaydı bağlandı'],['Finans','Royalty ve hizmet tahakkuku oluştu'],['Bayi portalı',step>=4?'Ödeme kalemi gösteriliyor':'Ödeme bekleniyor']].map(x=>{const d=document.createElement('div');d.className='finance-demo-event';d.innerHTML='<b>'+x[0]+'</b>'+x[1];return d}));
    const [a,s,i]=steps[step];f('status').textContent=s;f('invoice').textContent=i;f('step').textContent=step+' / 5';f('day-state').textContent=step?'DEMO · ADIM '+step+'/5':'VERİ YÜKLENMEDİ';f('dealer-due').textContent=fmt(step?due:0);f('royalty-total').textContent=fmt(r+rv);f('service-total').textContent=fmt(sb+sm+sv);f('payment-status').textContent=step>=4?(step===5?'Demo ödeme tamamlandı.':'Bayi ödeme ekranında ödeme bekliyor.'):'Demo adımı ilerletildiğinde tutar oluşur.';f('cash').textContent=fmt(rb);f('open').textContent=fmt(step===5?0:r+rv);f('back').disabled=step===0;f('next').disabled=step===5;f('next').textContent=a;
  }
  f('back').addEventListener('click',()=>{step=Math.max(0,step-1);render()});f('next').addEventListener('click',()=>{step=Math.min(5,step+1);render()});render();panel.hidden=false;if(location.hash==='#financeWalkthrough')panel.scrollIntoView();
}
