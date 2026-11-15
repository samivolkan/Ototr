# OTOTR integration contract

Production Google/OpenAI calls use the existing ERP Supabase gateway, not this local SQLite service. Never copy private keys or refresh tokens into the browser. Preserve the DeepSeek layout and reuse the authenticated parent ERP workflow.

- Bursa Nilüfer (`branch-google-nilufer`) is the only live branch.
- Gebze and İnegöl are demo; never publish their reviews or create external tasks.
- All stores in the standalone SQLite test service are demo, with generated credentials.
- Real drafts, approvals, publication verification, legal and complaint tasks use OTOTRGoogleReviewAI and server authorization.
- Never label a local save as Google publication or persist embedded customer data in demo localStorage.
- Run bridge behavior, existing workflow UI/card and local backend smoke tests before release.
- Exclude backend, .env, SQLite and node_modules from public Pages artifacts.

The supplied standalone spec also describes SMTP/Slack/WhatsApp delivery, multi-level delegation and full settings CRUD. These remain outside this local demo core; example UI controls must not be presented as live capabilities. See README.md for exact limitations.
