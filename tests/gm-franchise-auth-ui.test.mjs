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
test('organization exposes an all-or-nothing thirteen-owner roster picker',()=>{
 assert.match(html,/13 departmanlık atomik sorumlu kadrosu/);assert.match(html,/data-org-roster=/);assert.match(html,/!rosterReady\?'disabled'/);
 assert.match(html,/new Set\(users\)\.size!==13/);assert.match(html,/franchiseLiveClient\.assignDepartmentRoster\(\{roster\}\)/);
});
test('organization filters and validates candidates by authoritative department eligibility',()=>{
 assert.match(html,/x\.allowed_departments\?\.includes\(departmentCode\)/);assert.match(html,/candidate\?\.allowed_departments\?\.includes\(departmentCode\)/);
 assert.match(html,/ERP rolü departmanla uyumlu kullanıcı/);
});
test('organization proves a distinct role-compatible candidate exists for every department',()=>{
 assert.match(html,/function hasCompleteOrgRoster\(\)/);assert.match(html,/sort\(\(a,b\)=>a\.length-b\.length\)/);
 assert.match(html,/used\.has\(userId\)/);assert.match(html,/hasCompleteOrgRoster\(\)/);
 assert.match(html,/Rol kapsamı:/);assert.match(html,/orgCandidatesFor\(singleDepartment\)/);
 assert.match(html,/t\.id==='org-department'/);
});
test('organization loads the authoritative department and ERP role staffing report',()=>{
 assert.match(html,/listDepartmentStaffingRequirements\(\)/);assert.match(html,/LIVE_ORG_REQUIREMENTS/);
 assert.match(html,/requirement\?\.erp_role/);assert.match(html,/requirement\?\.eligible_candidate_count/);
});
test('organization shows the exact role seat deficit instead of double counting shared candidates',()=>{
 assert.match(html,/listRoleStaffingGaps\(\)/);assert.match(html,/LIVE_ORG_ROLE_GAPS/);
 assert.match(html,/missingSeats/);assert.match(html,/yeni rol-uyumlu ERP hesabı gerekiyor/);assert.match(html,/roleGapSummary/);
});
test('organization provides a password-free GM to IT invitation request queue',()=>{
 assert.match(html,/Kurumsal hesap davet talebi/);assert.match(html,/Parola oluşturulmaz/);assert.match(html,/data-org-invite-request/);
 assert.match(html,/listUserInvitationRequests\(\)/);assert.match(html,/franchiseLiveClient\.requestUserInvitation\(\{email,displayName,erpRole\}\)/);
 assert.match(html,/masked_email/);assert.match(html,/Auth hesabı henüz oluşturulmadı/);assert.match(html,/@ototr\.com kurumsal e-posta/);
});
