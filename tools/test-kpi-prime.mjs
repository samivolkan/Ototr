import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const require=createRequire(import.meta.url);
const playwrightPath=require.resolve("playwright",{paths:[root,...(process.env.NODE_PATH?process.env.NODE_PATH.split(path.delimiter):[])]});
const {chromium}=require(playwrightPath);
const executablePath=["C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe","C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"].find(fs.existsSync);
if(!executablePath)throw new Error("Chrome veya Edge bulunamadı.");
const browser=await chromium.launch({headless:true,executablePath});
const page=await browser.newPage({viewport:{width:1440,height:1000}});
const errors=[];
page.on("pageerror",e=>errors.push(e.message));
page.on("console",m=>{if(m.type()==="error"&&!m.text().includes("ERR_CERT_COMMON_NAME_INVALID"))errors.push(m.text());});
await page.addInitScript(()=>localStorage.clear());
await page.goto("file:///"+path.join(root,"index.html").replace(/\\/g,"/"),{waitUntil:"load"});
await page.locator('#nav [data-nav-route="kpi-prime"]').click();
await page.waitForSelector("#page-kpi-prime.active [data-kp-root]");
const liveState=await page.evaluate(()=>({
  demoBadge:document.body.innerText.includes('DEMO · KAYDEDİLMEZ'),
  missingRows:[...document.querySelectorAll('#page-kpi-prime tbody tr')].filter(x=>x.textContent.includes('Eksik Veri')).length
}));
await page.locator('[data-kp-mode="demo"]').click();
await page.getByText("DEMO · KAYDEDİLMEZ").waitFor();
const demoRows=await page.locator("#page-kpi-prime tbody tr").count();
const storageBefore=await page.evaluate(()=>localStorage.getItem("ototr-kpi-prime-v1"));
await page.locator('[data-kp-tab="plan"]').click();
await page.locator('[data-kp-weight="financial"]').fill("54");
const disabledSavePrevented=await page.evaluate(()=>{
  const root=document.querySelector('#page-kpi-prime');
  root.querySelector('[data-kp-save-plan]').click();
  return localStorage.getItem('ototr-kpi-prime-v1')===null;
});
await page.locator('[data-kp-weight="financial"]').fill("55");
await page.locator('[data-kp-save-plan]').click();
const planSaved=await page.evaluate(()=>JSON.parse(localStorage.getItem("ototr-kpi-prime-v1")||"null"));
const engine=await page.evaluate(()=>({
  multipliers:[60,100,120,140].map(s=>window.KpiPrime.multiplier(s)),
  weightInvalid:window.KpiPrime.validateWeights({a:55,b:44}).valid,
  dedupe:window.KpiPrime.dedupeEvents([{sourceSystem:'ERP',sourceId:'1'},{sourceSystem:'ERP',sourceId:'1'}]).length,
  refundNet:window.KpiPrime.aggregateFinancialEvents([{sourceSystem:'ERP',sourceId:'A',type:'sale',completed:true,collected:true,netAmount:100000},{sourceSystem:'ERP',sourceId:'A',type:'sale',completed:true,collected:true,netAmount:100000},{sourceSystem:'ERP',sourceId:'R',type:'refund',netAmount:15000},{sourceSystem:'ERP',sourceId:'U',type:'sale',completed:true,collected:false,netAmount:50000}]),
  creditValid:window.KpiPrime.validateCredits([{percent:50},{percent:50}]).valid&&!window.KpiPrime.validateCredits([{percent:60},{percent:50}]).valid,
  unpaidAmount:window.KpiPrime.calculate({...window.KpiPrime.demoScenario(),gates:{completed:true,collected:false},plan:window.KpiPrime.repository.load()}).amount,
  shadowCreatesPayroll:Boolean(localStorage.getItem('payroll')||localStorage.getItem('bordro')),
  missing:window.KpiPrime.calculate({role:'field',grossSalary:50000,gates:{completed:true,collected:true},metrics:{financial:{target:null,actual:1}},plan:window.KpiPrime.repository.load()}).status
}));
await page.locator('[data-kp-tab="simulation"]').click();
await page.locator('[data-kp-mode="demo"]').click();
const demoStored=await page.evaluate(()=>localStorage.getItem("ototr-kpi-demo"));
await browser.close();
const result={liveState,demoRows,storageBefore,disabledSavePrevented,planVersion:planSaved?.version,engine,demoStored,errors};
console.log(JSON.stringify(result,null,2));
if(errors.length)throw new Error("KPI ekranında console/page hatası bulundu.");
if(liveState.demoBadge||liveState.missingRows<1||demoRows!==1)throw new Error("Canlı/DEMO veri ayrımı başarısız.");
if(!disabledSavePrevented||planSaved?.version!==2)throw new Error("Plan ağırlık doğrulaması veya sürümleme başarısız.");
if(JSON.stringify(engine.multipliers)!==JSON.stringify([0,1,1.5,2]))throw new Error("Ödeme eğrisi sınır testi başarısız.");
if(engine.weightInvalid||engine.dedupe!==1||engine.refundNet!==85000||!engine.creditValid||engine.unpaidAmount!==0)throw new Error("Hesaplama güvenlik kuralları başarısız.");
if(engine.shadowCreatesPayroll||engine.missing!=="DATA_MISSING")throw new Error("Gölge/eksik veri güvenliği başarısız.");
if(demoStored!==null)throw new Error("DEMO verisi kalıcı depoya yazıldı.");
