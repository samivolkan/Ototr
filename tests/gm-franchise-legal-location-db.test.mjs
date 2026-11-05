import assert from 'node:assert/strict'; import {readFile} from 'node:fs/promises'; import test from 'node:test';
const sql=await readFile(new URL('../supabase/migrations/20261105150000_franchise_legal_location_gates.sql',import.meta.url),'utf8');
const acc=await readFile(new URL('../supabase/ops/franchise-legal-location-acceptance.sql',import.meta.url),'utf8');
test('legal and location records are structured and RLS protected',()=>{for(const t of ['franchise_due_diligence_reviews','franchise_territory_protections','franchise_contracts','franchise_site_visits']) assert.match(sql,new RegExp(`alter table public\\.${t} enable row level security`,'i'));});
test('territory supports polygon district and radius',()=>{assert.match(sql,/protection_type in \('polygon','district','radius'\)/);assert.match(sql,/polygon_geojson->>'type'='Polygon'/);});
test('esign is provider neutral but must be completed before approval',()=>{assert.match(sql,/signature_provider text/);assert.match(sql,/signature_method='wet' or provider_status='completed'/);});
test('site visit requires coordinates four photos measurements and independent approval',()=>{assert.match(sql,/photo_count>=4/);assert.match(sql,/gross_area_m2/);assert.match(acc,/Kendi hukuk kaydını onayladı/);});
test('branch insert has a fail closed legal location trigger',()=>{assert.match(sql,/franchise_branch_legal_location_gate_trigger/);assert.match(acc,/Hukuk\/lokasyon kapısı açılmadı/);});
test('direct table updates cannot bypass maker checker',()=>{assert.match(sql,/franchise_legal_record_guard/);assert.match(sql,/Bağımsız kontrolör bilgisi geçersiz/);assert.match(sql,/kanıt ve kapsam alanları değiştirilemez/);assert.match(acc,/Doğrudan tablo güncellemesi maker-checker kontrolünü aştı/);});
