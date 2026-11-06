import{readFile,writeFile}from'node:fs/promises';
import{pathToFileURL}from'node:url';

const SHA=/^[a-f0-9]{40}$/;
const API='https://bsjkohwbtrfwrqcyhsfz.supabase.co/functions/v1/public-api/franchise-applications';
const CONSENT='FR-KVKK-2026-11';
const count=(text,needle)=>text.split(needle).length-1;
const requireOnce=(text,needle,label)=>{if(count(text,needle)!==1)throw new Error(`${label} tam olarak bir kez bulunmalıdır.`)};

export function transformLiveFranchiseHtml(html,{sourceCommit,rollbackCommit,consentFragment}={}){
 if(typeof html!=='string'||!html.trim())throw new Error('Kaynak HTML zorunludur.');
 if(!SHA.test(sourceCommit||'')||!SHA.test(rollbackCommit||'')||sourceCommit===rollbackCommit)throw new Error('Farklı ve 40 haneli kaynak/rollback commitleri zorunludur.');
 if(typeof consentFragment!=='string'||!consentFragment.includes('name="processingConsent"'))throw new Error('Sürümlü izin parçası geçersizdir.');
 if(html.includes('data-live-franchise-form')||html.includes('OTOTR_FRANCHISE_PUBLIC_CONFIG'))throw new Error('Kaynak HTML daha önce dönüştürülmüş görünüyor.');
 const formMarker='data-demo-form="franchise"';
 const submitMarker='<div class="field full"><button class="btn red">Ön Başvuruyu Gönder →</button></div>';
 requireOnce(html,formMarker,'Franchise form işareti');
 requireOnce(html,submitMarker,'Franchise gönder düğmesi');
 requireOnce(html,'</body>','body kapanışı');
 let output=html.replace(formMarker,'data-live-franchise-form');
 output=output.replace(submitMarker,`${consentFragment.trim()}\n                        ${submitMarker}`);
 const config={apiUrl:API,consentVersion:CONSENT,deploymentIdentity:sourceCommit,rollbackReference:`revert:${rollbackCommit}`};
 const scripts=`    <!-- OTOTR Franchise controlled Edge handoff · ${sourceCommit} -->\n    <script>globalThis.OTOTR_FRANCHISE_PUBLIC_CONFIG=${JSON.stringify(config).replaceAll('<','\\u003c')};</script>\n    <script type="module" src="/assets/js/live-franchise-bootstrap.mjs?v=${sourceCommit}"></script>\n`;
 output=output.replace('</body>',`${scripts}</body>`);
 requireOnce(output,'data-live-franchise-form','Canlı Franchise form işareti');
 requireOnce(output,'name="kvkkConsent"','KVKK aydınlatma teyidi');
 requireOnce(output,'name="processingConsent"','Veri işleme izni');
 requireOnce(output,'name="contactConsent"','Ticari ileti izni');
 requireOnce(output,'OTOTR_FRANCHISE_PUBLIC_CONFIG','Canlı public config');
 requireOnce(output,'/assets/js/live-franchise-bootstrap.mjs','Canlı bootstrap');
 return output;
}

export async function runLiveSiteHtmlTransform({inputPath,outputPath,sourceCommit,rollbackCommit,consentPath=new URL('../franchise-basvuru/live-form-consent-fragment.html',import.meta.url)}={}){
 if(!inputPath||!outputPath||inputPath===outputPath)throw new Error('Ayrı giriş ve çıktı yolları zorunludur; kaynak dosyanın üzerine yazılmaz.');
 const [html,consentFragment]=await Promise.all([readFile(inputPath,'utf8'),readFile(consentPath,'utf8')]);
 const output=transformLiveFranchiseHtml(html,{sourceCommit,rollbackCommit,consentFragment});
 await writeFile(outputPath,output,{encoding:'utf8',flag:'wx'});
 return Object.freeze({outputPath,sourceCommit,rollbackCommit,bytes:Buffer.byteLength(output)});
}

if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [, ,inputPath,outputPath,sourceCommit,rollbackCommit]=process.argv;
 runLiveSiteHtmlTransform({inputPath,outputPath,sourceCommit,rollbackCommit}).then(result=>process.stdout.write(`${JSON.stringify(result,null,2)}\n`)).catch(error=>{process.stderr.write(`${error.message}\n`);process.exitCode=1});
}
