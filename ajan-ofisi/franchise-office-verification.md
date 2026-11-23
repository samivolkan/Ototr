# Franchise office and 3D verification — 2026-11-23

- Removed the marked marketing heading and source-review banner from the office.
- Added a selectable Three.js 0.180.0 scene (vendored with MIT license), seated figures, furnished desks, official wall sign, orbit/zoom/reset and linked team labels. Original illustration retained.
- Added Franchise summary, pending board approvals (oldest 10), Finance outbox (latest 20), and editable five-field task card. Existing specialist ownership is preserved.
- Read-only process integration: no case, board, financial or outbox mutations. `processed` means technical processing, not payment or business acceptance.
- Summary source currently contains no cases/board/outbox rows. Empty live lists are labelled; no synthetic business rows inserted.
- Canonical ERP access uses the same private membership directory as the ERP session gate: active headquarters admin. No global role or business-table policies changed.
- Private definer functions expose only the limited office read model and validated, version-checked profile update. Public wrappers are invokers. Anonymous and unrelated accounts denied. Direct profile writes revoked.
- 32 Node tests passed, including office phase1, navigation, source report provenance, reply delay regressions and Franchise request/profile/count checks.
- SQL rollback checks: summary reads, valid save, stale version rejection, malformed profile rejection and unrelated role denial. RLS enabled. Security advisor returned no finding mentioning the new office objects.
- Desktop: real 3D rotation/reset, clickable Franchise desk, dialog; mobile: 390x844 scene fit and scrollable task card checked. Browser JS error log empty in local 3D check.
- Runtime specialist source-review agents remain read-only. Periodic UI refresh is not represented as an agent run.

References: https://threejs.org/docs/ and https://supabase.com/docs/guides/api/securing-your-api
