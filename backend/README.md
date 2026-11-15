# OTOTR local backend

Production integration: `assets/google-review-management-bridge.js` reuses the parent ERP's authenticated Google/OpenAI gateway, persisted workflow and server-side publication checks. Production does not depend on localhost:4000. The standalone service below remains a separate demo core, not the production datastore.

Run from this directory:

    node configure.mjs
    docker compose up --build -d
    docker compose --profile seed run --rm seed
    node tests/smoke.mjs

Health: http://localhost:4000/api/health

Local demo accounts: admin@ototr.com, marmara@ototr.com, nilufer@ototr.com, legal@ototr.com, complaint@ototr.com. Generated password is DEMO_PASSWORD in the local ignored .env; it is not logged. All three stores are demo in this isolated database. The live ERP remains separate.

Implemented: migration, SQLite volume, role/store-scoped review access, demo drafting/approval, version checks, legal hold, idempotent simulated approval, routing cases, user creation/deactivation, simple templates, admin audit, read-only SLA, deduplicated SLA outbox, Docker health.

Not implemented: live Google adapter/sync/publication verification, actual OpenAI calls, SMTP/Slack/WhatsApp/webhook delivery, multi-level approval/delegation, full settings CRUD, CSV export, and frontend session/data adapter. Disabled features return errors instead of fabricated success. This is a running local core, not completion of the full supplied specification or a production release.

Tests create a synthetic QA review with each run and preserve it for inspection. Seed is idempotent and does not remove records. No external messages are sent.
