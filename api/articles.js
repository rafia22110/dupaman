// דופמין — Live articles & HTMX API
// מושך RSS ממקורות אמיתיים ומאומתים, תומך בחיפוש מלא, סינון לפי תגיות, ללא הגבלת 60 שרירותית
// Cache: CDN cache עם stale-while-revalidate

const SOURCES = [
  // ─── AI / Machine Learning ──────────────────────────────────
  { name: 'MIT Tech Review AI',   topic: 'ai',           topicHe: 'AI',           sub: 'טכנולוגיה',        url: 'https://www.technologyreview.com/feed/' },
  { name: 'Google AI Blog',       topic: 'ai',           topicHe: 'AI',           sub: 'Google AI',        url: 'https://blog.google/technology/ai/rss/' },
  { name: 'Google Gemini',        topic: 'ai',           topicHe: 'AI',           sub: 'Gemini',           url: 'https://blog.google/products/gemini/rss/' },
  { name: 'Google Blog',          topic: 'ai',           topicHe: 'AI',           sub: 'Google',           url: 'https://blog.google/rss/' },
  { name: 'Hugging Face Blog',    topic: 'ai',           topicHe: 'AI',           sub: 'HuggingFace',      url: 'https://huggingface.co/blog/feed.xml' },
  { name: 'LangChain Blog',       topic: 'ai',           topicHe: 'AI',           sub: 'LangChain',        url: 'https://blog.langchain.dev/rss/' },
  { name: 'Anthropic Blog',       topic: 'ai',           topicHe: 'AI',           sub: 'Anthropic',        url: 'https://www.anthropic.com/feed.xml' },
  { name: 'OpenAI Blog',          topic: 'ai',           topicHe: 'AI',           sub: 'OpenAI',           url: 'https://openai.com/blog/rss.xml' },

  // ─── Neuroscience / Mind ─────────────────────────────────────
  { name: 'Neuroscience News',    topic: 'neuroscience', topicHe: 'מדעי המוח',    sub: 'מחקר מוח',         url: 'https://neurosciencenews.com/feed/' },

  // ─── Psychology ──────────────────────────────────────────────
  { name: 'PsyPost',              topic: 'psychology',   topicHe: 'פסיכולוגיה',   sub: 'פסיכולוגיה',       url: 'https://www.psypost.org/feed/' },

  // ─── Physics ─────────────────────────────────────────────────
  { name: 'Phys.org — Physics',   topic: 'physics',      topicHe: 'פיזיקה',       sub: 'פיזיקה',           url: 'https://phys.org/rss-feed/physics-news/' },
  { name: 'ScienceDaily Physics', topic: 'physics',      topicHe: 'פיזיקה',       sub: 'פיזיקה',           url: 'https://www.sciencedaily.com/rss/matter_energy/physics.xml' },

  // ─── Astronomy / Space ───────────────────────────────────────
  { name: 'NASA News',            topic: 'astronomy',    topicHe: 'חלל',          sub: 'NASA',             url: 'https://www.nasa.gov/news-release/feed/' },
  { name: 'Phys.org — Space',     topic: 'astronomy',    topicHe: 'חלל',          sub: 'חלל',              url: 'https://phys.org/rss-feed/space-news/' },
  { name: 'Space.com',            topic: 'astronomy',    topicHe: 'חלל',          sub: 'חלל',              url: 'https://www.space.com/feeds.xml' },
  { name: 'ScienceDaily Space',   topic: 'astronomy',    topicHe: 'חלל',          sub: 'אסטרונומיה',       url: 'https://www.sciencedaily.com/rss/space_time/astronomy.xml' },

  // ─── General Science / Nature ────────────────────────────────
  { name: 'Nature',               topic: 'science',      topicHe: 'מדע',          sub: 'Nature',           url: 'https://www.nature.com/nature.rss' },
  { name: 'Live Science',         topic: 'science',      topicHe: 'מדע',          sub: 'מדע כללי',         url: 'https://www.livescience.com/feeds.xml' },
  { name: 'Phys.org — Earth',     topic: 'science',      topicHe: 'מדע',          sub: 'כדור הארץ',        url: 'https://phys.org/rss-feed/earth-news/' },
  { name: 'ScienceDaily Top',     topic: 'science',      topicHe: 'מדע',          sub: 'חדשות מדע',        url: 'https://www.sciencedaily.com/rss/top/science.xml' },
  { name: 'New Scientist',        topic: 'science',      topicHe: 'מדע',          sub: 'New Scientist',    url: 'https://www.newscientist.com/feed/home/' },
  { name: 'Quanta Magazine',      topic: 'science',      topicHe: 'מדע',          sub: 'Quanta',           url: 'https://api.quantamagazine.org/feed/' },

  // ─── Education & EdTech ──────────────────────────────────────
  { name: 'Edutopia',             topic: 'education',    topicHe: 'חינוך',        sub: 'Edutopia',         url: 'https://www.edutopia.org/rss.xml' },
  { name: 'OECD Education',       topic: 'education',    topicHe: 'חינוך',        sub: 'OECD',             url: 'https://oecdedutoday.com/feed/' },
  { name: 'EdWeek',               topic: 'education',    topicHe: 'חינוך',        sub: 'Education Week',   url: 'https://www.edweek.org/feed' },

  // ─── Health / Medicine ───────────────────────────────────────
  { name: 'WHO News',             topic: 'health',       topicHe: 'בריאות',       sub: 'WHO',              url: 'https://www.who.int/rss-feeds/news-english.xml' },
  { name: 'New Scientist Health', topic: 'health',       topicHe: 'בריאות',       sub: 'בריאות',           url: 'https://www.newscientist.com/subject/health/feed/' },

  // ─── Guides / MLOps / Dev ────────────────────────────────────
  { name: 'FreeCodeCamp',         topic: 'guides',       topicHe: 'מדריכים',      sub: 'FreeCodeCamp',     url: 'https://www.freecodecamp.org/news/rss/' },
  { name: 'Dev.to',               topic: 'guides',       topicHe: 'מדריכים',      sub: 'Dev.to',           url: 'https://dev.to/feed' },
  { name: 'HackerNews Top',       topic: 'guides',       topicHe: 'מדריכים',      sub: 'HackerNews',       url: 'https://hnrss.org/frontpage' },
  { name: 'MLOps Community',      topic: 'guides',       topicHe: 'מדריכים',      sub: 'MLOps',            url: 'https://mlops.community/feed/' },
  { name: 'Weights & Biases',     topic: 'guides',       topicHe: 'מדריכים',      sub: 'W&B',              url: 'https://wandb.ai/company/blog/feed.xml' },
];

const FETCH_TIMEOUT = 9000;
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const HEADERS = {
  'User-Agent': UA,
  'Accept': 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
};

function parseXml(xml) {
  const items = [];
  const itemRegex = /<(item|entry)\b[\s\S]*?<\/\1>/g;
  const matches = xml.match(itemRegex) || [];

  for (const raw of matches) {
    const get = (tag) => {
      const m = raw.match(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
      return m ? m[1] : '';
    };
    const getAttr = (tag, attr) => {
      const m = raw.match(new RegExp(`<${tag}\\b[^>]*${attr}=["']([^"']+)["']`, 'i'));
      return m ? m[1] : '';
    };

    const title = decodeEntities(stripCdata(get('title'))).trim();
    let link = decodeEntities(stripCdata(get('link'))).trim();
    if (!link || link.startsWith('<')) link = getAttr('link', 'href');
    if (!link) {
      link = getAttr('id', '') || decodeEntities(stripCdata(get('guid'))).trim();
    }

    let description = get('description') || get('summary') || get('content:encoded') || get('content') || '';
    description = decodeEntities(stripCdata(description)).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    const pubDate = decodeEntities(stripCdata(get('pubDate') || get('published') || get('updated') || get('dc:date'))).trim();
    const author = decodeEntities(stripCdata(get('author') || get('dc:creator'))).replace(/<[^>]+>/g, '').trim();

    if (title && link) items.push({ title, link, description, pubDate, author, raw });
  }
  return items;
}

function stripCdata(s) {
  return String(s).replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1');
}
function decodeEntities(s) {
  return String(s)
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

function extractImage(raw, description) {
  const m1 = (raw.match(/<media:(?:content|thumbnail)[^>]+url=["']([^"']+)["']/i));
  if (m1) return m1[1];
  const m2 = (raw.match(/<enclosure[^>]+url=["']([^"']+\.(?:jpe?g|png|webp|gif))/i));
  if (m2) return m2[1];
  const m3 = (description || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  if (m3) return m3[1];
  return null;
}

async function fetchSource(src) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT);
  try {
    const r = await fetch(src.url, { headers: HEADERS, signal: controller.signal, redirect: 'follow' });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    const xml = await r.text();
    if (!xml.includes('<item') && !xml.includes('<entry')) throw new Error('No items in feed');

    const items = parseXml(xml);
    return items.map(it => ({
      title: it.title.slice(0, 240),
      description: (it.description || '').slice(0, 500),
      link: it.link,
      pubDate: it.pubDate,
      timestamp: parseDate(it.pubDate),
      author: (it.author || '').slice(0, 80),
      image: extractImage(it.raw, it.description),
      source: src.name,
      sourceUrl: src.url,
      topic: src.topic,
      topicHe: src.topicHe,
      sub: src.sub,
    }));
  } catch (e) {
    return { __error: true, source: src.name, message: String(e.message || e).slice(0, 100) };
  } finally {
    clearTimeout(timer);
  }
}

function parseDate(s) {
  if (!s) return Date.now();
  const t = new Date(s).getTime();
  return isFinite(t) ? t : Date.now();
}

function timeAgoHe(ts) {
  const diff = Math.max(0, Date.now() - ts);
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'עכשיו';
  if (m < 60) return `לפני ${m} דק׳`;
  const h = Math.floor(m / 60);
  if (h < 24) return `לפני ${h} שע׳`;
  const d = Math.floor(h / 24);
  if (d < 7) return `לפני ${d} ימים`;
  return new Date(ts).toLocaleDateString('he-IL');
}

function makeId(link) {
  let h = 5381;
  for (let i = 0; i < link.length; i++) {
    h = ((h << 5) + h + link.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

// Render HTML fragment for HTMX (no client JS needed)
function renderArticlesHtml(articles) {
  if (!articles.length) {
    return `
      <div class="col-span-full py-16 text-center text-gray-400 glass-card rounded-2xl">
        <div class="text-4xl mb-3">🔍</div>
        <p class="text-lg font-bold text-white mb-1">לא נמצאו כתבות תואמות</p>
        <p class="text-sm font-light text-gray-500">נסה לחפש מילות מפתח אחרות או לבחור תגית אחרת.</p>
      </div>
    `;
  }

  return articles.map(a => `
    <article class="glass-card rounded-2xl p-6 flex flex-col justify-between group transition-all duration-300 hover:border-brand-500/50 hover:shadow-xl hover:shadow-brand-500/10">
      <div>
        <div class="flex items-center justify-between gap-2 mb-4 text-xs">
          <span class="px-2.5 py-1 rounded-full badge-tag font-semibold">${escapeHtml(a.topicHe)} / ${escapeHtml(a.sub)}</span>
          <span class="text-gray-500 font-mono text-[11px]">${escapeHtml(a.age)}</span>
        </div>
        <h3 class="text-lg font-bold text-white mb-2 leading-snug group-hover:text-brand-300 transition-colors">
          <a href="${escapeHtml(a.link)}" target="_blank" rel="noopener noreferrer" class="hover:underline">
            ${escapeHtml(a.title)}
          </a>
        </h3>
        <p class="text-sm text-gray-400 font-light leading-relaxed mb-4 line-clamp-3">
          ${escapeHtml(a.description || 'לחץ לקריאת המאמר המלא מהמקור המאומת.')}
        </p>
      </div>
      <div class="pt-4 border-t border-gray-800/80 flex items-center justify-between text-xs">
        <span class="text-gray-500 font-medium">${escapeHtml(a.source)}</span>
        <a href="${escapeHtml(a.link)}" target="_blank" rel="noopener noreferrer" class="font-bold text-brand-400 hover:text-brand-300 flex items-center gap-1 transition-colors">
          <span>מקור מלא</span>
          <svg class="w-3.5 h-3.5 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
        </a>
      </div>
    </article>
  `).join('');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const topic = (req.query.topic || 'all').toLowerCase();
  const search = (req.query.q || req.query.search || '').trim().toLowerCase();
  const format = req.query.format || (req.headers['hx-request'] ? 'html' : 'json');
  const force = req.query.force === '1' || req.query.nocache === '1';

  if (force) {
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
  } else {
    res.setHeader('Cache-Control', 's-maxage=120, stale-while-revalidate=300');
  }

  const results = await Promise.all(SOURCES.map(s => fetchSource(s)));
  let articles = [];
  results.forEach(r => {
    if (!r.__error) {
      articles.push(...r);
    }
  });

  // Dedup by link
  const seen = new Set();
  articles = articles.filter(a => {
    if (!a.link || seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });

  // Sort newest first
  articles.sort((a, b) => b.timestamp - a.timestamp);

  articles = articles.map(a => ({
    id: makeId(a.link),
    ...a,
    age: timeAgoHe(a.timestamp),
    pubDateIso: new Date(a.timestamp).toISOString(),
  }));

  // Filtering: by topic
  let filtered = articles;
  if (topic !== 'all') {
    filtered = filtered.filter(a => a.topic === topic);
  }

  // Filtering: by search query across title, description, and source
  if (search) {
    filtered = filtered.filter(a => 
      a.title.toLowerCase().includes(search) || 
      (a.description && a.description.toLowerCase().includes(search)) ||
      a.source.toLowerCase().includes(search) ||
      a.sub.toLowerCase().includes(search)
    );
  }

  // HTMX HTML Response mode (pure HTML swap, no JS required on client)
  if (format === 'html') {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(renderArticlesHtml(filtered));
  }

  // JSON Response mode
  return res.status(200).json({
    articles: filtered,
    total: filtered.length,
    totalRaw: articles.length,
    updated: new Date().toISOString(),
    updatedTs: Date.now(),
    topics: ['all', 'ai', 'neuroscience', 'psychology', 'physics', 'astronomy', 'science', 'education', 'health', 'guides'],
  });
}
