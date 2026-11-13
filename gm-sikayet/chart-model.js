(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.OTOTRCharts=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  const wk=x=>Math.min(7,Math.floor(x.gun/7));
  function weekly(rows,pred){const n=Array(8).fill(0);rows.forEach(x=>{if(!pred||pred(x))n[7-wk(x)]++});return n}
  const delta=n=>({cur:n[7],prev:n[6],d:n[7]-n[6]});
  function trendSeries(rows){
    const yeni=weekly(rows),kap=weekly(rows,x=>x.s===7),asim=weekly(rows,x=>x.s<7&&x.left<0);
    let cu=0;const stok=yeni.map((v,i)=>{cu+=v-kap[i];return cu});
    const ma=yeni.map((_,i)=>{const s=yeni.slice(Math.max(0,i-2),i+1);return +(s.reduce((a,b)=>a+b,0)/s.length).toFixed(1)});
    return {yeni,kap,asim,stok,ma};
  }
  function used(x,slas){
    return x.left<0?100+Math.min(30,Math.round(100*Math.abs(x.left)/slas[x.o])):Math.round(100-Math.max(0,Math.min(100,100*x.left/slas[x.o])));
  }
  function bubbles(rows,o){
    return rows.filter(x=>x.s<7).map(x=>({id:x.id,t:x.t,o:x.o,b:x.b,x:used(x,o.sla),y:o.risk(x),tut:x.tut||0,r:Math.round(5+Math.min(13,Math.sqrt(x.tut||0)/9))}));
  }
  function calendar(rows,today){
    const day=864e5,t0=Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()),cnt={};
    rows.forEach(x=>{cnt[x.gun]=(cnt[x.gun]||0)+1});
    const out=[];
    for(let g=55;g>=0;g--){const ms=t0-g*day,d=new Date(ms),dd=Math.floor(ms/day);out.push({gun:g,date:d,n:cnt[g]||0,dow:(d.getUTCDay()+6)%7,w:Math.floor((dd+3)/7)})}
    return out;
  }
  function radar(rows,branches,evid){
    const axes=["Skor","SLA uyumu","Haklı bulunmayan oran","Kanıt yeterliliği","Yeniden açılmama"];
    const series=branches.map(b=>{
      const a=rows.filter(x=>x.b===b),n=Math.max(1,a.length),ih=a.filter(x=>x.s<7&&x.left<0).length,ky=a.filter(x=>x.o==="K"||x.o==="Y").length;
      const sc=Math.max(40,100-ky*9-ih*7),sla=Math.round(100*(1-ih/n)),hv=Math.round(100*(1-a.filter(x=>x.karar&&x.karar!=="Haksız").length/n));
      const ev=Math.round(a.reduce((s,x)=>s+evid(x),0)/n),ro=Math.round(100*(1-a.filter(x=>x.ro).length/n));
      return {b,n:a.length,v:[sc,sla,hv,ev,ro]};
    });
    return {axes,series};
  }
  function channelDecision(rows){
    const K=["Haklı","Kısmen haklı","Haksız","Karar bekliyor"],m={};
    rows.forEach(x=>{const c=x.ch||"Diğer",k=K.includes(x.karar)?x.karar:"Karar bekliyor";(m[c]=m[c]||Object.fromEntries(K.map(q=>[q,0])))[k]++});
    return {keys:K,rows:Object.entries(m).map(([ch,v])=>({ch,v,n:K.reduce((s,q)=>s+v[q],0)})).sort((a,b)=>b.n-a.n)};
  }
  return {weekly,delta,trendSeries,used,bubbles,calendar,radar,channelDecision};
});
