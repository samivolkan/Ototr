const {chromium}=require('playwright');
const http=require('http');
const fs=require('fs');
const path=require('path');

const root=path.resolve(__dirname,'..');
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.webmanifest':'application/manifest+json'};
const server=http.createServer((request,response)=>{
  let file=path.join(root,decodeURIComponent(request.url.split('?')[0]));
  if(file.endsWith(path.sep))file=path.join(file,'index.html');
  if(!file.startsWith(root)||!fs.existsSync(file)){response.writeHead(404);response.end();return}
  response.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');
  fs.createReadStream(file).pipe(response);
});

const assert=(value,message)=>{if(!value)throw new Error(message)};

(async()=>{
  await new Promise(resolve=>server.listen(4179,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,executablePath:'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'});
  const context=await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  const page=await context.newPage();
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:4179/task-merkezi-v2/',{waitUntil:'networkidle'});
  await page.locator('#loginForm').waitFor();
  assert(await page.getByRole('heading',{name:'OTOTR hesabınızla devam edin'}).isVisible(),'Giriş ekranı görünmüyor.');
  assert(await page.locator('input[type="password"]').getAttribute('autocomplete')==='current-password','Şifre alanı güvenli değil.');
  assert(!(await page.locator('body').innerText()).includes('Supabase bağlantı ayarı'),'Eski runtime config uyarısı hâlâ görünüyor.');
  assert(await page.locator('body').evaluate(element=>element.scrollWidth<=390),'Mobil yatay taşma var.');
  assert(errors.length===0,errors.join('; '));
  const blockedPage=await context.newPage();
  await blockedPage.route('**/task-merkezi-v2/js/vendor/supabase.js',route=>route.abort());
  await blockedPage.goto('http://127.0.0.1:4179/task-merkezi-v2/',{waitUntil:'networkidle'});
  await blockedPage.getByRole('heading',{name:'Oturum kontrolü tamamlanamadı'}).waitFor();
  assert(!(await blockedPage.locator('#app').innerText()).includes('Oturum kontrol ediliyor'),'Başlangıç ekranı hata halinde takılı kalıyor.');
  console.log('PASS — V2 giriş ekranı, yerel istemci hatası, runtime config ve mobil görünüm');
  await browser.close();
  server.close();
})().catch(error=>{console.error(error);server.close();process.exit(1)});
