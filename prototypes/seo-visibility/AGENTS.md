# Prototype Instructions

Run the local server yourself and open the preview in the browser available to this environment. Do not give the user server-start instructions when you can run it.

Before making substantial visual changes, use the Product Design plugin's `get-context` skill when the visual source is unclear or no longer matches the current goal. When the user gives durable prototype-specific design feedback, preferences, or decisions, record them in `AGENTS.md`.

When implementing from a selected generated mock, treat that image as the source of truth for layout, component anatomy, density, spacing, color, typography, visible content, and hierarchy.

Build app UI in `src/`. Keep `.openai/hosting.json`, `worker/index.js`, `scripts/prepare-sites-build.mjs`, and `tests/sites-worker.test.mjs` intact so the same local prototype can be handed to Sites. Before a Sites handoff, run `npm run build` and `npm run test:sites`; the build must leave `dist/client/index.html`, `dist/server/index.js`, and `dist/.openai/hosting.json`.

## Alternatif tasarım kararı — 22 Kasım 2026
Kullanıcı Efferd Dashboard 7 referansına benzer çalışan bir alternatif istedi. Mevcut klasik görünümü koru; `?design=alternative` ve görünüm düğmeleriyle aynı veri ve işlevler arasında geçiş sağla. Alternatifin görsel dili açık renk menü, ince gri çerçeve, monokrom grafikler ve hafif yeşil/kırmızı değişim etiketleridir. Efferd Pro kaynak paketi alınmadı; özgün yerel uygulama kullanılıyor.

## Studio tasarım kararı — 22 Kasım 2026
Kullanıcı Google Reviews ekranına benzer, farklı renkli ve ileri analiz grafikleri içeren bir üçüncü tasarım istedi. Varsayılan Studio: koyu lacivert yatay menü, altı KPI, mor/turkuaz analitik grafikler. Klasik ve Alternatif görünümü koru. Demo veri kullan; canlı kokpite dokunma. Ads'i organik metriklerden ayır; gelir doğrulanmadan ROAS üretme. Kullanıcı gerçek verileri sonraki gün sağlayacak; CSV hazırlığı ve yerel doğrulama akışı sun.
