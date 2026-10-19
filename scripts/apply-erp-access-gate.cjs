// GitHub Pages serves static UI files. Live data authorization is enforced in Supabase RLS.
// Inject the shared session gate into every published HTML entry, including direct module URLs.
const fs=require('node:fs');
const path=require('node:path');
const root=path.resolve(process.argv[2]||path.join(__dirname,'..'));
const marker='<!-- OTOTR_AUTH_GATE_V1 -->';
const head=`${marker}
<script>document.documentElement.classList.add('ototr-access-locked')</script>
<style>html.ototr-access-locked body{display:none!important}html.ototr-access-locked:after{content:'Oturum kontrol ediliyor…';display:block;padding:15vh 24px;text-align:center;font:16px system-ui;color:#171b20;background:#f3f5f7;min-height:100vh;box-sizing:border-box}#ototr-account-exit{position:fixed;right:16px;bottom:18px;z-index:9999;min-height:42px;border:1px solid #dfe3e8;border-radius:8px;background:#fff;color:#171b20;padding:10px 14px;font:600 12px system-ui;cursor:pointer}@media(max-width:640px){#ototr-account-exit{bottom:calc(78px + env(safe-area-inset-bottom));right:10px}}</style>
<script type="module" src="/Ototr/saha-satis/erp-access.js"></script>
<noscript><style>html:after{content:'ERP’ye giriş için JavaScript’i etkinleştirin.'!important}body{display:none!important}</style></noscript>`;
let count=0;
function walk(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){
 if(['.git','node_modules','saha-satis'].includes(item.name))continue;
 const file=path.join(dir,item.name);
 if(item.isDirectory())walk(file);
 else if(item.isFile()&&/\.html?$/i.test(item.name)){
  const html=fs.readFileSync(file,'utf8');
  if(html.includes(marker))continue;
  const updated=/<head(?:\s[^>]*)?>/i.test(html)?html.replace(/<head(?:\s[^>]*)?>/i,match=>match+'\n'+head):head+'\n'+html;
  fs.writeFileSync(file,updated);count++;
 }
}}
walk(root);console.log(`ERP session gate applied to ${count} HTML entries.`);
