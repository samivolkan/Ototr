(function(root,factory){
  const api=factory();
  if(typeof module!=="undefined"&&module.exports) module.exports=api;
  root.OTOTREvidence=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  // Sentetik demo modeli: kural tabanlıdır, kesin hüküm vermez; insan incelemesi gerekir.
  const CLAIMS=[
    [{i:"Boya/değişen tespiti yanlış raporlanmış",b:"Arka çamurluk: orijinal olarak işaretli",e:"Fotoğraf ve boya ölçümü"},{i:"Hasar kaydı raporda yok",b:"Hasar kaydı: bulunmadı",e:"Fotoğraf"}],
    [{i:"Ölçüm değerleri tutarsız",b:"Boya kalınlık ölçer değerleri raporda yer alıyor",e:"Cihaz kalibrasyon kaydı"}],
    [{i:"Usta ile satıcı arasında çıkar ilişkisi iddiası",b:"Rapor tarafsızlık beyanı: imzalı",e:"Usta ifadesi ve şube kaydı"}],
    [{i:"Randevu veya hizmet gecikmesi",b:"Randevu ve işlem zaman damgaları kayıtlı",e:"Randevu kaydı"}],
    [{i:"Fiyat veya paket farkı",b:"Paket kaydı",e:"Fatura ve paket kaydı"}],
    [{i:"Rapor sonrası kusur çıktı",b:"Mekanik: ön kontrol yapıldı, ayrıntı yok",e:"Servis raporu"}]
  ];
  function sufficiency(x){
    const kn=x.kn||[],items=[["Rapor PDF’i",true],["Rapor fotoğrafları incelendi",!!kn[0]]];
    if(x.k===0||x.k===1) items.push(["Cihaz kalibrasyon kaydı kontrol edildi",!!kn[1]]);
    items.push(["Usta ve müşteri görüşü alındı",!!kn[2]],["Müşteri belgesi / ekran görüntüsü",(x.msgs||[]).some(m=>/belge/i.test(m.m))],["Karar gerekçesi yazıldı",(x.gerek||"").length>=10]);
    const ok=items.filter(i=>i[1]).length;
    return {items,pc:Math.round(100*ok/items.length),missing:items.filter(i=>!i[1]).map(i=>i[0])};
  }
  function analyze(x,ctx){
    ctx=ctx||{};const date=ctx.date||(g=>String(g));
    const suff=sufficiency(x),flags=[];
    const rows=(CLAIMS[x.k]||CLAIMS[0]).map(c=>{
      let st,ic;
      if(!x.karar&&suff.pc<60){st="Kanıt eksik";ic="⚠"}
      else if(!x.karar){st="İnceleme bekliyor";ic="⏳"}
      else if(x.karar==="Haklı"){st="İddia doğrulandı";ic="✓"}
      else if(x.karar==="Kısmen haklı"){st="Kısmen doğrulandı";ic="◐"}
      else{st="İddia doğrulanmadı";ic="✗"}
      return {i:c.i,b:c.b+(x.k===4?": "+x.paket:""),e:c.e,st,ic};
    });
    if(x.k===0) flags.push("İddia (boyalı) ile rapor bulgusu (orijinal) çelişiyor; fotoğraf ve ölçüm yeniden incelenmeli.");
    if(ctx.deviceBad&&(x.k===0||x.k===1)) flags.push("Cihaz kalibrasyonu geçersiz veya kontrol bekliyor: ölçüm bulgularının güvenilirliği şüpheli.");
    if(x.karar&&suff.pc<100) flags.push("Karar kanıt eksikken verilmiş ("+suff.missing.join(", ")+").");
    if(x.k===5) flags.push("Rapor sonrası kusur: rapor tarihi ("+date(x.gun+8)+") ile şikâyet ("+date(x.gun+2)+") arasında 6 gün var; sorumluluk kapsamı kontrol edilmeli.");
    return {suff,rows,flags};
  }
  return {CLAIMS,sufficiency,analyze};
});
