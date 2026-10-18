import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true});
const errors=[],page=await browser.newPage({viewport:{width:1440,height:1000}});
page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>{errors.push('Unexpected dialog');d.dismiss()});
const ready=p=>p.waitForFunction(()=>!document.querySelector('#new').disabled);
const login=async(p,who)=>{await p.goto('http://127.0.0.1:43824/isler/');await p.locator('#erp-login').evaluate(el=>{el.open=true});await p.locator('#email').fill(who+'@example.invalid');await p.locator('#password').fill('local-test-only');await p.locator('#signin').click();await p.locator('.app').waitFor({state:'visible'})};
try{
 await login(page,'admin');await ready(page);assert.match(await page.locator('#identity').textContent(),/Yönetici/);
 await page.locator('#new').click();await page.locator('#ft').fill('Tarayıcı testi <img src=x onerror=alert(1)>');await page.locator('#fd').fill('Açıklama');
 await page.locator('#fw').selectOption('10000000-0000-0000-0000-000000000002');await page.locator('#fh').selectOption('10000000-0000-0000-0000-000000000001');
 const today=new Date().toISOString().slice(0,10);await page.locator('#fdue').fill(today);await page.locator('#fpr').fill('QA');await page.locator('#frec').selectOption('hafta');
 await page.locator('#f button[type=submit]').click();await page.locator('#dlg').waitFor({state:'hidden'});await ready(page);
 const card=page.locator('.card').filter({has:page.locator('.t',{hasText:'Tarayıcı testi'})}).first();
 await card.locator('.sa').fill('Alt görev');await card.locator('.sa').press('Enter');await card.locator('[data-a=sub]').waitFor();await ready(page);await card.locator('[data-a=sub]').check();await ready(page);
 await card.locator('[data-a=tm]').click();await page.waitForFunction(()=>document.querySelector('.card[data-id="2"] [data-tm]')?.textContent.includes('⏸'));await ready(page);
 await page.reload();await page.locator('.app').waitFor({state:'visible'});await ready(page);assert.match(await card.locator('[data-tm]').textContent(),/⏸/);
 await card.locator('[data-a=tm]').click();await ready(page);
 await card.locator('.t').click();await page.locator('#panel.open').waitFor();await page.locator('[data-p=cm]').fill('<svg onload=alert(1)>yorum');await page.locator('[data-p=cm]').press('Enter');await page.locator('.cm').waitFor();await ready(page);assert.match(await page.locator('.cm').textContent(),/Yönetici/);assert.equal(await page.locator('.cm svg').count(),0);await page.locator('#pclose').click();
 for(const v of ['list','cal','gantt','board']){await page.locator('#v-'+v).click();assert.ok(await page.locator('#view').textContent());if(v==='cal')assert.ok(await page.locator('.ghost').count()>0)}
 await page.keyboard.press('Control+k');await page.locator('#pi').fill('Görünüm: Liste');await page.locator('#pi').press('Enter');assert.ok(await page.locator('table').count());await page.locator('#v-board').click();
 await page.locator('#q').fill('Tarayıcı');await page.locator('#savef').click();await page.locator('#ai').fill('Benim testim');await page.locator('#aok').click();await page.locator('#savedf button').waitFor();await ready(page);
 await page.reload();await page.locator('.app').waitFor({state:'visible'});await ready(page);assert.equal(await page.locator('#savedf button').count(),1);
 await card.locator('[data-a=del]').click();await page.locator('#tu').waitFor();assert.equal(await card.count(),0);await page.locator('#tu').click();await card.waitFor();await ready(page);
 await card.locator('[data-a=selc]').check();await page.locator('#bpr').selectOption('yuksek');await ready(page);assert.ok((await card.getAttribute('class')).includes('p-yuksek'));await page.locator('#bclr').click();
 // Two isolated login sessions see changes via the 15s poll without a reload.
 const second=await browser.newPage();await login(second,'worker');await ready(second);
 await page.locator('#quick').fill('Ortak pano testi @çalışan #canlı !y yarın');await page.locator('#quick').press('Enter');await ready(page);
 await second.locator('.card').filter({hasText:'Ortak pano testi'}).waitFor({timeout:22000});await second.close();
 const target=page.locator('.card').filter({hasText:'Yerel kontrol işi'});await card.dragTo(target);await ready(page);assert.equal(await page.locator('#sort').inputValue(),'man');
 await card.locator('.t').click();await page.locator('[data-p=st]').selectOption('bitti');await ready(page);await page.locator('#pclose').click();assert.equal(await page.locator('.card').filter({hasText:'Tarayıcı testi'}).count(),2);
 const csvEvent=page.waitForEvent('download');await page.locator('#csv').click();const csv=await csvEvent,bytes=await fs.readFile(await csv.path());assert.deepEqual([...bytes.subarray(0,3)],[239,187,191]);assert.match(bytes.toString('utf8'),/"Başlık";"Açıklama"/);
 const jsonEvent=page.waitForEvent('download');await page.locator('#export').click();const download=await jsonEvent,exported=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.ok(exported.tasks.length>=4);assert.equal(exported.saved.length,1);
 await page.locator('#file').setInputFiles({name:'import.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify([{...exported.tasks[0],title:'İçe aktarılan görev',rec:''}]))});await page.locator('.card').filter({hasText:'İçe aktarılan görev'}).waitFor();await ready(page);
 await page.route('**/api/isler',r=>r.request().method()==='POST'?r.fulfill({status:500,contentType:'application/json',body:'{"error":"Test sunucu hatası"}'}):r.continue());
 await page.locator('#new').click();await page.locator('#ft').fill('Kaydedilmemeli');await page.locator('#f button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#toast').textContent==='Test sunucu hatası');assert.ok(await page.locator('#dlg').isVisible());await page.locator('#cancel').click();await page.unroute('**/api/isler');
 assert.equal(await page.evaluate(()=>Object.keys(localStorage).length),0);
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.locator('.app').waitFor({state:'visible'});await ready(page);
 const cached=await page.evaluate(async()=>{const c=await caches.open('ototr-isler-static-v24-2');return(await c.keys()).map(r=>r.url)});assert.ok(cached.some(u=>u.endsWith('/app.js')));assert.ok(cached.every(u=>!u.includes('/api/')&&!u.includes('/auth/')));
 assert.equal(await page.locator('#bulk').isVisible(),false);
 const out=new URL('../../../../outputs/',import.meta.url);await fs.mkdir(out,{recursive:true});await page.screenshot({path:fileURLToPath(new URL('isler-v24-desktop.png',out)),fullPage:true});
 await page.locator('#logout').click();await login(page,'viewer');assert.ok(await page.locator('#new').isDisabled());assert.ok(await page.locator('[data-a=del]').first().isDisabled());assert.equal(await page.locator('#savedf button').count(),0);
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:fileURLToPath(new URL('isler-v24-mobile.png',out)),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.context().setOffline(true);await page.reload();await page.locator('#login').waitFor({state:'visible'});assert.ok(await page.locator('#login-error').textContent());await page.context().setOffline(false);
 assert.deepEqual(errors,[]);console.log('PASS: CRUD, XSS, subtasks, server timer/reload, comments/history, four views, recurring ghosts, palette, private filters, undo, bulk, multiuser polling, drag order, recurrence, CSV BOM, JSON import/export, failure toast, no localStorage, PWA static-only cache/offline, viewer and mobile.');
}finally{await browser.close()}
