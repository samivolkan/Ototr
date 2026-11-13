const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(__dirname,'..','assets','app-core.js'),'utf8');

test('gelişmiş şikayet merkezi ERP sol menüsünde müşteri şikayetlerinin altındadır',()=>{
  assert.match(source,/id==='complaints'[\s\S]{0,260}sideComplaintItems/);
  assert.match(source,/Gelişmiş Şikayet Operasyon Merkezi/);
  assert.match(source,/data-complaint-advanced[\s\S]{0,220}gm-sikayet\/index\.html/);
});
