// Run on the Pages staging checkout after release.json is generated.
// Pin the embedded HTML, its assets, and its visible footer to one release.
const fs = require('node:fs');
const path = require('node:path');
function stamp(root) {
  const meta = JSON.parse(fs.readFileSync(path.join(root,'release.json'),'utf8'));
  if (!/^G\d+$/.test(meta.version) || !/^[a-f0-9]{7,40}$/.test(meta.commit) || !Number.isSafeInteger(meta.run)) throw new Error('Invalid review release metadata');
  const file = path.join(root,'google-review-management.html');
  const key = meta.version+'.'+meta.commit;
  let html = fs.readFileSync(file,'utf8');
  html = html.replace(/((?:src|href)="assets\/google-review-[^"?]+\.(?:js|css))(?:\?[^"\s]*)?"/g, '$1?v='+key+'"');
  html = html.replace(/<!-- OTOTR_REVIEW_RELEASE -->[\s\S]*?<!-- \/OTOTR_REVIEW_RELEASE -->\s*/g,'');
  const metadata = JSON.stringify(meta).replace(/</g,'\\u003c');
  html = html.replace('</head>','<!-- OTOTR_REVIEW_RELEASE --><script>window.OTOTRReviewDocumentRelease='+metadata+';</script><!-- /OTOTR_REVIEW_RELEASE --></head>');
  if(!html.includes('window.OTOTRReviewDocumentRelease=')) throw new Error('Review document head not found');
  fs.writeFileSync(file,html);
  return key;
}
if(require.main===module) console.log('Review document release: '+stamp(path.resolve(process.argv[2]||path.join(__dirname,'..'))));
module.exports={stamp};
