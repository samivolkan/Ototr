import assert from'node:assert/strict';import{readFile}from'node:fs/promises';import test from'node:test';
const html=await readFile(new URL('../gm-franchise/index.html',import.meta.url),'utf8');
test('organization workspace provides direct GM authentication without storing a password',()=>{
 assert.match(html,/id="org-login-email"[^>]*autocomplete="username"/);assert.match(html,/id="org-login-password"[^>]*type="password"[^>]*autocomplete="current-password"/);
 assert.match(html,/franchiseLiveClient\.signIn\(\{email,password\}\)/);assert.doesNotMatch(html,/localStorage\.(?:setItem|getItem)\([^\n]*(?:password|org-login-password)/i);
});
test('organization live actions remain disabled until an authenticated session exists',()=>{
 assert.match(html,/LIVE_AUTH_STATE!=='authenticated'\?'disabled'/);assert.match(html,/franchiseLiveClient\.getSession\(\)/);assert.match(html,/franchiseLiveClient\.signOut\(\)/);
 assert.match(html,/Hesap varsa parola sıfırlama e-postası gönderildi/);
});
