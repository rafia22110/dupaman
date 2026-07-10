# דופמין — Upgrade Summary

## Files modified

### `index.html`
- **Removed n8n entirely**: deleted the `SUBSCRIBE_WEBHOOK` constant (was line ~346, pointing to `https://n8n.alveare-ai.com/webhook/ssr-subscribe`) and the associated `fetch()` call inside `handleRegister()`. Registration now just validates the email locally and shows a "תודה, נרשמת" success message — zero backend calls, zero n8n. `grep -c "n8n\|SUBSCRIBE_WEBHOOK" index.html` returns `0`.
- **Real article pages instead of modal**: `renderGrid()` now emits `<a class="card" href="article/${id}.html" style="view-transition-name:card-${id}">` instead of a `<div onclick="openArticle(id)">`. Clicking a title/card navigates to a real static page, not a modal.
- **Removed the article modal entirely**: deleted the `#article-modal` markup, `.article-modal` CSS, and the `openArticle()` / `closeArticle()` JS functions. `grep -A1 'onclick="openArticle' index.html` returns nothing.
- **View Transitions**: added `@view-transition { navigation: auto; }` plus `::view-transition-group(*) { animation-duration: .35s; }` in the global CSS. Combined with matching `view-transition-name: card-${id}` on both the feed card and the article's `<h1>`, navigating from feed → article performs a native morph animation (Chrome/Edge; other browsers get a normal navigation, no breakage).
- **Scroll progress bar**: new `#scroll-progress` fixed bar at the top using `animation-timeline: scroll(root)` — fills as the user scrolls the page, no JS needed.
- **Auth "modal" → native Popover API**: `.moverlay`/`.modal` classes replaced by the `popover="auto"` attribute on `#auth-modal`. `openAuth()`/`closeAuth()` now call `showPopover()` / `hidePopover()`. Added `@starting-style` for a smooth scale/fade entry animation, and `::backdrop` styling to match the previous dark overlay look.
- **New "Modern HTML" popover** (`#info-modal`) in the header nav — a small `⚡ HTML מודרני` button opens a popover explaining the native features the site uses (View Transitions, Popover API, `:has()`, container queries, scroll-timeline, `text-wrap`).
- **Container queries**: `#grid-wrap` is now a query container (`container-type: inline-size; container-name: grid-wrap`), with `@container grid-wrap (max-width: 500px)` and `(min-width: 900px)` rules adjusting card padding/typography responsively based on the grid's own width, not the viewport.
- **`:has()` interactive hover demo**: `.grid:has(.card:hover) .card:not(:hover) { opacity: .7 }` — hovering any card dims its siblings.
- **`text-wrap`**: `balance` on card titles (`.card h3`) and article `<h1>`; `pretty` on card excerpt lines (`.sumlines li`) and article paragraphs.
- Preserved everything else untouched: dark black/green palette (no color changes), RTL Hebrew layout, search, topic tabs, sub-pills, sort/source filters, skeleton loader, grid/list view toggle, full i18n system (he/en/fr/es), and the `/api/sheets` → `articles-today.json` fallback chain.
- Verified: script content extracted and passed `node --check` with no syntax errors; HTML tag counts balanced (`<html>`, `<body>`, `<script>` all 1/1).

### `package.json`
- Added:
  ```json
  "scripts": {
    "vercel-build": "node build-articles.mjs",
    "build": "node build-articles.mjs"
  }
  ```
- Deliberately did **not** add `"type": "module"` — instead the build script uses the `.mjs` extension, which is always treated as an ES module by Node regardless of `package.json`. This avoids any risk of changing module resolution for `api/sheets/index.js` (which Vercel's serverless build pipeline already handles independently via its own bundler). `googleapis` dependency preserved as-is.

### `vercel.json`
- No changes needed. It only rewrites `/api/sheets` → `/api/sheets/index.js`. Static files under `article/*.html` at the project root are served automatically by Vercel with no extra rewrite/route required.

## Files created

### `build-articles.mjs` (project root)
Node ES-module script that:
- Reads `public/articles-today.json`.
- Generates one static HTML file per article at `article/{id}.html` (10 files for the current dataset, ids 2–11).
- Escapes all dynamic content (`&`, `<`, `>`, `"`, `'`) via a dedicated `esc()` helper — safe against the Hebrew titles/quotes/apostrophes present in the source data.
- Maps `topic` → a per-topic accent hex color (ai → green, psychology → purple, neuroscience → pink, education → yellow, health → red, science → cyan, physics → indigo, astronomy → orange, tutorials → teal) exposed as `--topic-color` CSS variable, used for badges, progress bar, and links.
- Each generated article page includes:
  - Same dark theme, RTL, `lang="he"`, font stack (`-apple-system,'Segoe UI',Arial,sans-serif`).
  - `<h1 style="view-transition-name:card-${id}">` matching the feed card for morph transitions.
  - Top scroll-progress bar using `animation-timeline: scroll(root)`.
  - Topic badge, sub-topic badge, source, date, title (`text-wrap:balance`), all `lines[]` as `<p>` paragraphs (`text-wrap:pretty`), life quote ("💡 משפט לחיים"), question ("🤔 שאלה להיום"), estimated reading time, and view/save counts (falls back to a stable pseudo-count derived from the id when `r.v`/`r.s` are 0).
  - `.article-body` container query (`container-type: inline-size`) with breakpoints at `min-width:700px` (wider type) and `max-width:480px` (tighter badges).
  - "המשך קריאה במקור →" external link (`target="_blank" rel="noopener"`) to `article.link`.
  - Back link to `../index.html` ("← חזרה לפיד").
  - Optional `<dialog id="share-dialog">` share panel using the new `command`/`commandfor` invoker attributes (with a small JS fallback for browsers that don't yet support the invoker API), including a "copy link" button.
  - Optional `popover="auto"` meta-info panel showing source/category/sub-topic/date and up to 4 related articles in the same topic.
- Run via `node build-articles.mjs`; wired into `vercel-build`/`build` npm scripts so Vercel regenerates all article pages on every deploy.

### `article/2.html` … `article/11.html` (10 files)
Generated output from the build script — one real static page per article, verified to render valid HTML with correct titles/content (spot-checked `article/2.html`, all 10 files tag-balance-checked).

## Modern HTML/CSS features used (and where)

| Feature | Location |
|---|---|
| `@view-transition { navigation: auto }` | `index.html` `<style>`, all `article/*.html` |
| `view-transition-name: card-${id}` | feed card (`index.html` `renderGrid`) + article `<h1>` (`build-articles.mjs`) |
| `animation-timeline: scroll(root)` | `#scroll-progress` bar, `index.html` and every article page |
| `popover` attribute + `showPopover()`/`hidePopover()` | auth modal, "Modern HTML" info modal (`index.html`); meta-info panel (article pages) |
| `@starting-style` | popover entry animation, `index.html` and article pages |
| `:has()` | `.grid:has(.card:hover) .card:not(:hover){opacity:.7}` in `index.html` |
| Container queries (`container-type: inline-size`) | `#grid-wrap` in `index.html`; `.article-body` in article pages |
| `text-wrap: balance` | card titles + article `<h1>` |
| `text-wrap: pretty` | card excerpt lines + article paragraphs |
| `<dialog>` + `command`/`commandfor` invoker | share panel on article pages |
| `color-mix()` | topic badge background/border tinting on article pages |

## Notes for the parent agent (Vercel deploy)

1. `node build-articles.mjs` was run locally and produced 10 files in `article/` — confirmed present and well-formed.
2. Since `vercel-build` is now defined, Vercel will run it automatically before deploy, regenerating `article/*.html` from whatever `public/articles-today.json` contains at deploy time. If `/api/sheets` starts returning fresh data from Google Sheets, note that **only the feed (`index.html`) reflects it live** — the static article pages are only as fresh as the last `public/articles-today.json` snapshot baked in at build time (this matches the brief's design: "עמודי המאמר הסטטיים יהיו בסיס מה-JSON").
3. `command`/`commandfor` (native HTML invoker attributes) is a very new API (Chrome 135+/Safari TP as of writing) — the share dialog includes a JS fallback (`showModal()`/`close()`) so it still works everywhere.
4. `@view-transition` and cross-document View Transitions currently only animate in Chromium-based browsers; other browsers fall back to a normal instant navigation — no functional breakage anywhere.
5. No color/palette changes were made — the black/green/white dark theme is 100% preserved across feed and article pages.
6. Did not touch `style.css` (a legacy, unused purple-themed stylesheet not referenced by `index.html`) or `admin.html`, `privacy.html`, `terms.html`, `success.html`, `unsubscribe.html` — out of scope per the brief.
7. Did not run `vercel deploy` per instructions — that's left to the parent agent.
