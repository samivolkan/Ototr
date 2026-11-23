import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
const source=fs.readFileSync('assets/app-core.js','utf8');
function routes(s){const part=s.slice(s.indexOf('const navGroups = ')+18,s.indexOf('const titles ='));return vm.runInNewContext(part.replace(/;\s*$/,'')).flatMap(g=>g[1].map(r=>r[0]));}
test('SEO route preserves every existing ERP menu entry',()=>{const before=routes(execFileSync('git',['show','d6e85e1:assets/app-core.js'],{encoding:'utf8',maxBuffer:20e6}));const after=routes(source);assert.deepEqual(Array.from(after.filter(x=>x!=='seo-visibility')),Array.from(before));assert.equal(after.filter(x=>x==='seo-visibility').length,1);assert.match(source,/pageShell\('seo-visibility'/);assert.match(source,/src="seo-visibility\/index.html/);});
test('Published SEO bundle uses deployed base and excludes private reports',()=>{const html=fs.readFileSync('seo-visibility/index.html','utf8');assert.match(html,/\/Ototr\/seo-visibility\/assets\//);const files=fs.readdirSync('seo-visibility',{recursive:true}).filter(x=>fs.statSync('seo-visibility/'+x).isFile());assert.ok(files.length>2);for(const f of files){assert.doesNotMatch(f,/oauth|api-cache|private|\.csv$/);const body=fs.readFileSync('seo-visibility/'+f,'utf8');assert.doesNotMatch(body,/GOCSPX-|ya29\./);}});
