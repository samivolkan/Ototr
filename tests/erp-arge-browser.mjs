import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {chromium}=require('./kokpit/node_modules/playwright');
const base=process.env.ERP_BASE_URL||'http://127.0.0.1:4173/index.html';
const executablePath=process.env.CHROME_PATH||'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser=await chromium.launch({headless:true,executablePath});
try{
  for(const viewport of [{name:'desktop',width:1440,height:1000},{name:'mobile',width:390,height:844}]){
    const page=await browser.newPage({viewport:{width:viewport.width,height:viewport.height}});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(`${base}#erp-arge/arge-03`,{waitUntil:'domcontentloaded'});
    await page.waitForSelector('[data-arge-detail="arge-03"]',{timeout:20000});
    const result=await page.evaluate(()=>{
      const argeButtons=[...document.querySelectorAll('.nav-sub [data-nav-route^="erp-arge/"]')];
      const active=argeButtons.filter(button=>button.classList.contains('active'));
      const nav=document.querySelector('#nav');
      const detail=document.querySelector('[data-arge-detail="arge-03"]');
      return {
        count:argeButtons.length,
        labels:argeButtons.map(button=>button.textContent.trim()),
        active:active.map(button=>button.dataset.navRoute),
        hash:location.hash,
        detail:detail?.dataset.argeDetail,
        preparing:detail?.textContent.includes('Hazırlanıyor'),
        fakeExternal:!!detail?.querySelector('a[target="_blank"]'),
        bodyOverflow:document.documentElement.scrollWidth>document.documentElement.clientWidth,
        navOverflow:nav?nav.scrollWidth>nav.clientWidth:false
      };
    });
    assert.equal(result.count,10,`${viewport.name}: 10 ARGE alt menüsü görünmeli`);
    assert.equal(new Set(result.labels).size,10,`${viewport.name}: menü adları ayırt edilebilir olmalı`);
    assert.deepEqual(result.active,['erp-arge/arge-03'],`${viewport.name}: seçili modül belirgin olmalı`);
    assert.equal(result.hash,'#erp-arge/arge-03');
    assert.equal(result.detail,'arge-03');
    assert.equal(result.preparing,true);
    assert.equal(result.fakeExternal,false);
    assert.equal(result.bodyOverflow,false,`${viewport.name}: yatay sayfa taşması olmamalı`);
    assert.equal(result.navOverflow,false,`${viewport.name}: navigasyon yatay taşmamalı`);
    assert.deepEqual(errors,[],`${viewport.name}: tarayıcı JS hatası olmamalı`);
    await page.close();
  }
  console.log('ERP ARGE browser smoke: desktop + 390x844 mobile passed');
}finally{
  await browser.close();
}
