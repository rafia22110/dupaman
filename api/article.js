// דופמין — Single article page (server-rendered from RSS)
// URL: /api/article?url=<encoded article URL>
// מחזיר עמוד HTML מלא לצפייה במאמר עם View Transitions

import articlesHandler from './articles.js';

function escapeHtml(s) {
  return String(s || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const TOPIC_COLORS = {
  ai: '#00ff88',
  neuroscience: '#a855f7',
  science: '#22d3ee',
  health: '#ec4899',
  education: '#fbbf24',
  default: '#00ff88',
};

async function fetchAllArticles(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  try {
    const r = await fetch(`${proto}://${host}/api/articles`, {
      headers: { 'Cache-Control': 'no-cache' }
    });
    if (r.ok) return await r.json();
  } catch (e) {}
  return null;
}

function pageHtml(article, allArticles) {
  const color = TOPIC_COLORS[article.topic] || TOPIC_COLORS.default;
  const related = (allArticles || [])
    .filter(a => a.topic === article.topic && a.link !== article.link)
    .slice(0, 4);

  const t = escapeHtml;
  const paragraphs = (article.description || '')
    .split(/\s*(?:\.\s+|\n+)\s*/)
    .filter(p => p.trim().length > 20)
    .slice(0, 5);

  return `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${t(article.title)} – דופמין</title>
<meta name="description" content="${t(article.description.slice(0, 160))}">
<style>
:root {
  --bg:#000;--bg2:#0d0d0d;--bg3:#141414;--bg4:#1a1a1a;
  --border:#1e1e1e;--border2:#2a2a2a;
  --green:#00ff88;--green-dim:#00cc6a;
  --white:#fff;--gray1:#ccc;--gray2:#888;--gray3:#444;
  --topic:${color};
}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,'Segoe UI',Arial,sans-serif;background:var(--bg);color:var(--white);direction:rtl;min-height:100vh;line-height:1.7}
@view-transition{navigation:auto}
::view-transition-group(*){animation-duration:.35s}
.progress{position:fixed;top:0;left:0;height:3px;background:var(--topic);width:100%;transform-origin:0 50%;z-index:1000;animation:prog linear;animation-timeline:scroll(root)}
@keyframes prog{from{transform:scaleX(0)}to{transform:scaleX(1)}}
header.nav{position:sticky;top:0;z-index:100;background:rgba(0,0,0,.85);backdrop-filter:blur(10px);border-bottom:1px solid var(--border2);padding:12px 20px;display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap}
header.nav a{color:var(--gray1);text-decoration:none;font-size:14px;font-weight:500}
header.nav a:hover{color:var(--white)}
.back{padding:6px 12px;border:1px solid var(--border2);border-radius:6px;transition:all .15s}
.back:hover{border-color:var(--green);color:var(--green)}
.logo{display:flex;align-items:center;gap:8px;color:var(--white)!important;font-weight:700}
.logo-icon{width:24px;height:24px;background:var(--green);border-radius:5px;display:flex;align-items:center;justify-content:center;color:#000;font-weight:900;font-size:12px}
main{max-width:760px;margin:0 auto;padding:40px 20px 100px;container-type:inline-size}
.meta-top{display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:20px;font-size:13px;color:var(--gray2)}
.pill{background:color-mix(in oklch,var(--topic) 15%,transparent);color:var(--topic);border:1px solid color-mix(in oklch,var(--topic) 40%,transparent);border-radius:20px;padding:4px 12px;font-size:12px;font-weight:600}
.age{color:var(--topic)}
h1{font-size:clamp(28px,5vw,44px);font-weight:800;letter-spacing:-.5px;line-height:1.25;text-wrap:balance;view-transition-name:card-${t(article.id)};margin-bottom:16px}
.subtitle{font-size:18px;color:var(--gray1);text-wrap:pretty;margin-bottom:32px}
.hero-img{width:100%;height:auto;max-height:400px;object-fit:cover;border-radius:12px;margin-bottom:32px;border:1px solid var(--border2)}
.article-body{text-wrap:pretty;color:var(--gray1);font-size:17px}
.article-body p{margin-bottom:18px}
.article-body p:first-of-type::first-letter{font-size:3em;line-height:.9;float:right;margin-left:12px;margin-top:4px;color:var(--topic);font-weight:800}
.source-cta{margin:40px 0;padding:24px;background:linear-gradient(135deg,color-mix(in oklch,var(--topic) 12%,transparent),transparent);border:1px solid color-mix(in oklch,var(--topic) 30%,transparent);border-radius:14px;text-align:center}
.source-cta h3{font-size:14px;color:var(--gray2);font-weight:500;margin-bottom:12px}
.source-cta a{display:inline-flex;align-items:center;gap:10px;background:var(--topic);color:#000;padding:12px 24px;border-radius:8px;font-weight:700;text-decoration:none;transition:transform .15s}
.source-cta a:hover{transform:translateY(-2px)}
.share-btn{display:inline-block;margin-right:12px;background:transparent;border:1px solid var(--border2);color:var(--white);padding:12px 20px;border-radius:8px;cursor:pointer;font-family:inherit;font-size:14px;transition:all .15s}
.share-btn:hover{border-color:var(--topic);color:var(--topic)}
dialog{background:var(--bg3);color:var(--white);border:1px solid var(--border2);border-radius:12px;padding:24px;max-width:400px;margin:auto}
dialog::backdrop{background:rgba(0,0,0,.7);backdrop-filter:blur(4px)}
.related{margin-top:60px;padding-top:40px;border-top:1px solid var(--border2)}
.related h2{font-size:22px;font-weight:700;margin-bottom:20px}
.related-grid{display:grid;grid-template-columns:1fr;gap:12px}
@container (min-width:600px){.related-grid{grid-template-columns:1fr 1fr}}
.related-card{background:var(--bg3);border:1px solid var(--border2);border-radius:10px;padding:16px;text-decoration:none;color:var(--white);transition:all .15s;display:block}
.related-card:hover{border-color:var(--topic);transform:translateY(-2px)}
.related-title{font-size:14px;font-weight:600;line-height:1.4;text-wrap:balance;margin-bottom:8px}
.related-meta{font-size:11px;color:var(--gray2);display:flex;gap:8px;align-items:center}
footer{text-align:center;color:var(--gray3);font-size:12px;padding:40px 20px}
footer a{color:var(--gray2);text-decoration:none}
footer a:hover{color:var(--green)}
</style>
</head>
<body>
<div class="progress" aria-hidden="true"></div>

<header class="nav">
  <a href="/" class="logo"><span class="logo-icon">D</span><span>דופמין</span></a>
  <a href="/" class="back">← חזרה לפיד</a>
</header>

<main>
  <div class="meta-top">
    <span class="pill">${t(article.topicHe || article.topic)}</span>
    <span>${t(article.source)}</span>
    ${article.author ? `<span>· ${t(article.author)}</span>` : ''}
    <span class="age">· ${t(article.age)}</span>
  </div>

  <h1>${t(article.title)}</h1>

  ${article.image ? `<img class="hero-img" src="${t(article.image)}" alt="" loading="lazy">` : ''}

  <div class="article-body">
    ${paragraphs.length
      ? paragraphs.map(p => `<p>${t(p.trim())}${p.endsWith('.') ? '' : '.'}</p>`).join('\n    ')
      : `<p>${t(article.description || 'המאמר המלא זמין באתר המקור.')}</p>`}
  </div>

  <div class="source-cta">
    <h3>המאמר המלא במקור:</h3>
    <a href="${t(article.link)}" target="_blank" rel="noopener">
      ${t(article.source)} →
    </a>
    <button class="share-btn" onclick="document.getElementById('share').showModal()">↗ שתף</button>
  </div>

  <dialog id="share">
    <h3 style="margin-bottom:16px">שתף את המאמר</h3>
    <p style="color:var(--gray2);font-size:13px;margin-bottom:16px;word-break:break-all">${t(article.link)}</p>
    <button class="share-btn" onclick="navigator.clipboard.writeText('${t(article.link)}');this.textContent='הועתק ✓'">העתק קישור</button>
    <button class="share-btn" onclick="document.getElementById('share').close()">סגור</button>
  </dialog>

  ${related.length ? `
  <section class="related">
    <h2>עוד ב${t(article.topicHe || article.topic)}</h2>
    <div class="related-grid">
      ${related.map(r => `
      <a class="related-card" href="/a/${t(r.id)}" style="view-transition-name:card-${t(r.id)}">
        <div class="related-title">${t(r.title)}</div>
        <div class="related-meta">
          <span>${t(r.source)}</span>
          <span>·</span>
          <span>${t(r.age)}</span>
        </div>
      </a>`).join('')}
    </div>
  </section>` : ''}
</main>

<footer>
  <p>דופמין · חדשות חיות ממקורות אמיתיים · <a href="/">חזרה לפיד</a></p>
</footer>
</body>
</html>`;
}

export default async function handler(req, res) {
  const id = req.query.id || (req.url.match(/\/a\/([^\/\?]+)/) || [])[1];
  if (!id) {
    res.status(400).send('Missing article id');
    return;
  }

  const data = await fetchAllArticles(req);
  if (!data || !data.articles) {
    res.status(503).send('Article feed unavailable');
    return;
  }

  const article = data.articles.find(a => a.id === id);
  if (!article) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.status(404).send(`<!doctype html><html dir="rtl" lang="he"><head><meta charset="utf-8"><title>לא נמצא</title><style>body{font-family:-apple-system,Arial,sans-serif;background:#000;color:#fff;text-align:center;padding:80px 20px}h1{color:#00ff88}</style></head><body><h1>המאמר לא נמצא</h1><p>ייתכן שהמאמר ירד מהפיד. <a href="/" style="color:#00ff88">חזרה לפיד</a></p></body></html>`);
    return;
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=600');
  res.status(200).send(pageHtml(article, data.articles));
}
