const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const vm=require('node:vm');
const {stamp}=require('../scripts/stamp-review-release.cjs');
const repo=path.resolve(__dirname,'..');
const metadata={version:'G900',commit:'a123456',run:900,date:'19.11.2026',time:'03:00 UTC'};
test('each release pins all review assets and replaces the document footer metadata',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'ototr-review-release-'));
 const files=['release.json','google-review-management.html'];
 t.after(()=>{files.forEach(f=>{const p=path.join(dir,f);if(fs.existsSync(p))fs.unlinkSync(p);});fs.rmdirSync(dir);});
 fs.copyFileSync(path.join(repo,files[1]),path.join(dir,files[1]));
 for(const meta of [metadata,{...metadata,version:'G901',run:901,commit:'b234567'}]){
  fs.writeFileSync(path.join(dir,files[0]),JSON.stringify(meta));
  assert.equal(stamp(dir),meta.version+'.'+meta.commit);
  const html=fs.readFileSync(path.join(dir,files[1]),'utf8');
  const links=[...html.matchAll(/(?:src|href)="(assets\/google-review-[^"]+)"/g)].map(m=>m[1]);
  assert.ok(links.length>=8);
  assert.ok(links.every(link=>link.endsWith('?v='+meta.version+'.'+meta.commit)));
  assert.equal((html.match(/window.OTOTRReviewDocumentRelease=/g)||[]).length,1);
  assert.ok(html.includes('"run":'+meta.run));
 }
 fs.writeFileSync(path.join(dir,files[0]),JSON.stringify({...metadata,commit:'bad<script>'}));
 assert.throws(()=>stamp(dir),/Invalid review release/);
});
test('a cached shell requests this release of every review module and stylesheet',async()=>{
 const html=fs.readFileSync(path.join(repo,'index.html'),'utf8');
 const start=html.indexOf('  // Google review helpers');
 const script=html.slice(start,html.indexOf('</script>',start));
 const modules=[],links=[{href:'assets/google-review-command-center.css?v=old',getAttribute(){return this.href;}}];
 const window={};
 const ctx=vm.createContext({window,URL,AbortSignal,location:{href:'https://samivolkan.github.io/Ototr/index.html'},setTimeout:fn=>fn(),fetch:async()=>({ok:true,json:async()=>metadata}),document:{querySelectorAll:()=>links,createElement:()=>({}),head:{appendChild:s=>{modules.push(s.src);s.onload();}}}});
 vm.runInContext(script,ctx);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(modules.length,5);
 assert.ok(modules.every(src=>new URL(src).searchParams.get('v')==='G900.a123456'));
 assert.equal(new URL(links[0].href).searchParams.get('v'),'G900.a123456');
 assert.equal(window.OTOTRReviewRelease.run,900);
});
test('the embedded review URL uses the same release as its parent shell',()=>{
 const window={OTOTRReviewRelease:metadata,OTOTRGoogleReputation:{},refreshGoogleReputationPage(){}};
 const ctx=vm.createContext({window,GoogleScreenshotDashboard(){},googleReputationState:{},googleDashboardState:{},setTimeout:()=>{},encodeURIComponent});
 vm.runInContext(fs.readFileSync(path.join(repo,'assets/google-review-command-center.js'),'utf8'),ctx);
 assert.match(window.GoogleScreenshotDashboard(),/variant=2&v=G900\.a123456/);
});
