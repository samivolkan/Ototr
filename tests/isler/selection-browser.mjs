import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage();
const errors=[],authRequests=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(r.url().includes('/auth/v1/'))authRequests.push(r.url())});
const ready=()=>page.waitForFunction(()=>!document.querySelector('#new').disabled);
try{
 await page.goto('http://127.0.0.1:43824/isler/#ekip='+'a'.repeat(64));await page.waitForFunction(()=>!document.querySelector('#selection-user').disabled);
 assert.equal(new URL(page.url()).hash,'');assert.equal(await page.locator('#password').isVisible(),false);
 await page.locator('#selection-user').selectOption('10000000-0000-0000-0000-000000000002');await page.locator('#selection-submit').click();await page.locator('.app').waitFor({state:'visible'});await ready();
 assert.match(await page.locator('#identity').textContent(),/kullanıcı seçimi/);
 await page.locator('#new').click();await page.locator('#ft').fill('Kullanıcı seçimi testi');await page.locator('#f button[type=submit]').click();await page.locator('#dlg').waitFor({state:'hidden'});await ready();
 const card=page.locator('.card').filter({hasText:'Kullanıcı seçimi testi'}).last();await card.locator('[data-a=edit]').click();await page.locator('#ft').fill('Kullanıcı seçimi testi düzenlendi');await page.locator('#fpri').selectOption('yuksek');await page.locator('#f button[type=submit]').click();await page.locator('#dlg').waitFor({state:'hidden'});await ready();
 await page.reload();await page.locator('.app').waitFor({state:'visible'});await ready();assert.match(await card.textContent(),/düzenlendi/);assert.match(await card.getAttribute('class'),/p-yuksek/);
 await card.locator('.t').click();assert.match(await page.locator('#pb').textContent(),/kullanıcı seçimi/);await page.locator('#pclose').click();
 await page.locator('#logout').click();await page.locator('#selection-user').selectOption('10000000-0000-0000-0000-000000000001');await page.locator('#selection-submit').click();await page.locator('.app').waitFor({state:'visible'});await ready();
 assert.equal(await card.locator('[data-a=edit]').isDisabled(),true);assert.equal(await page.locator('#a-late').isDisabled(),true);
 assert.deepEqual(authRequests,[]);assert.equal(await page.evaluate(()=>localStorage.length),0);
 await page.goto('http://127.0.0.1:43824/isler/#ekip='+'b'.repeat(64));await page.waitForFunction(()=>document.querySelector('#selection-error').textContent.length>0);assert.equal(await page.locator('#selection-submit').isDisabled(),true);
 assert.deepEqual(errors,[]);console.log('PASS: no password/auth requests, private link user list, selection, create/edit/reload, actor label, switch identity, no admin escalation, invalid capability rejected.');
}finally{await browser.close()}
