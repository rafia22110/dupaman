// דופמין — Live articles API
// מושך RSS ממקורות אמיתיים בזמן בקשה, מחזיר את המאמרים הכי טריים
// Cache: 5 דקות ב-CDN, כדי שהאתר יעודכן כל 5 דק' בלי שריפת קרדיטים

const SOURCES = [
  // ─── AI / Tech ───────────────────────────────────────────────
  { name: 'MIT Tech Review',      topic: 'ai',           topicHe: 'AI',           sub: 'טכנולוגיה',        url: 'https://www.technologyreview.com/feed/' },
  { name: 'Google AI Blog',       topic: 'ai',           topicHe: 'AI',           sub: 'Google AI',        url: 'https://blog.google/technology/ai/rss/' },
  { name: 'Google Gemini',        topic: 'ai',           topicHe: 'AI',           sub: 'Gemini',           url: 'https://blog.google/products/gemini/rss/' },
  { name: 'Google Blog',          topic: 'ai',           topicHe: 'AI',           sub: 'Google',           url: 'https://blog.google/rss/' },

  // ─── Neuroscience ────────────────────────────────────────────
  { name: 'Neuroscience News',    topic: 'neuroscience', topicHe: 'מדעי המוח',    sub: 'מחקר מוח',         url: 'https://neurosciencenews.com/feed/' },

  // ─── Psychology ──────────────────────────────────────────────
  { name: 'PsyPost',              topic: 'psychology',   topicHe: 'פסיכולוגיה',   sub: 'פסיכולוגיה',       url: 'https://www.psypost.org/feed/' },

  // ─── Physics ─────────────────────────────────────────────────
  { name: 'Phys.org — Physics',   topic: 'physics',      topicHe: 'פיזיקה',       sub: 'פיזיקה',           url: 'https://phys.org/rss-feed/physics-news/' },
  { name: 'ScienceDaily Physics', topic: 'physics',      topicHe: 'פיזיקה',       sub: 'פיזיקה',           url: 'https://www.sciencedaily.com/rss/matter_energy/physics.xml' },

  // ─── Astronomy / Space ───────────────────────────────────────
  { name: 'NASA',                 topic: 'astronomy',    topicHe: 'חלל',          sub: 'NASA',             url: 'https://www.nasa.gov/news-release/feed/' },
  { name: 'APOD',                 topic: 'astronomy',    topicHe: 'חלל',          sub: 'תמונת יום',        url: 'https://apod.nasa.gov/apod.rss' },
  { name: 'Phys.org — Space',     topic: 'astronomy',    topicHe: 'חלל',          sub: 'חלל',              url: 'https://phys.org/rss-feed/space-news/' },
  { name: 'Space.com',            topic: 'astronomy',    topicHe: 'חלל',          sub: 'חלל',              url: 'https://www.space.com/feeds.xml' },
  { name: 'ScienceDaily Space',   topic: 'astronomy',    topicHe: 'חלל',          sub: 'אסטרונומיה',       url: 'https://www.sciencedaily.com/rss/space_time/astronomy.xml' },

  // ─── General science ─────────────────────────────────────────
  { name: 'Live Science',         topic: 'science',      topicHe: 'מדע',          sub: 'מדע כללי',         url: 'https://www.livescience.com/feeds.xml' },
  { name: 'Phys.org — Earth',     topic: 'science',      topicHe: 'מדע',          sub: 'כדור הארץ',        url: 'https://phys.org/rss-feed/earth-news/' },
  { name: 'ScienceDaily Top',     topic: 'science',      topicHe: 'מדע',          sub: 'חדשות מדע',        url: 'https://www.sciencedaily.com/rss/top/science.xml' },
  { name: 'ScienceDaily Genetics',topic: 'science',      topicHe: 'מדע',          sub: 'גנטיקה',           url: 'https://www.sciencedaily.com/rss/plants_animals/genetics.xml' },
  { name: 'ScienceDaily Climate', topic: 'science',      topicHe: 'מדע',          sub: 'אקלים',            url: 'https://www.sciencedaily.com/rss/earth_climate/climate.xml' },
  { name: 'Nature',               topic: 'science',      topicHe: 'מדע',          sub: 'Nature',           url: 'https://www.nature.com/nature.rss' },
  { name: 'New Scientist',        topic: 'science',      topicHe: 'מדע',          sub: 'New Scientist',    url: 'https://www.newscientist.com/feed/home/' },
  { name: 'Quanta Magazine',      topic: 'science',      topicHe: 'מדע',          sub: 'Quanta',           url: 'https://api.quantamagazine.org/feed/' },
  { name: 'Reddit r/science',     topic: 'science',      topicHe: 'מדע',          sub: 'Reddit',           url: 'https://www.reddit.com/r/science/.rss' },
];

// Timeout per source
const FETCH_TIMEOUT = 9000;

// Realistic browser UA — some feeds block plain crawlers
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
const HEADERS = {
  'User-Agent': UA,
  'Accept': 'application/rss+xml, application/atom+xml, application/xml;q=0.9, text/xml;q=0.8, */*;q=0.5',
  'Accept-Language': 'en-US,en;q=0.9',
  'Cache-Control': 'no-cache',
};

// Minimal RSS/Atom parser — no dependency
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
      // Reddit atom uses <link href="..." /> — also try guid
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
    return items.slice(0, 6).map(it => ({
      title: it.title.slice(0, 220),
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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const topic = (req.query.topic || 'all').toLowerCase();
  const force = req.query.force === '1' || req.query.nocache === '1';

  if (force) {
    res.setHeader('Cache-Control', 'no-store, must-revalidate');
  } else {
    // CDN caches for 3 min. Between hits, users get instant response.
    // stale-while-revalidate: serve old while fetching new in background.
    res.setHeader('Cache-Control', 's-maxage=180, stale-while-revalidate=600');
  }

  const t0 = Date.now();
  const results = await Promise.all(SOURCES.map(s => fetchSource(s)));
  const fetchMs = Date.now() - t0;

  const errors = [];
  const sourceStats = {};
  let articles = [];
  results.forEach((r, i) => {
    const name = SOURCES[i].name;
    if (r.__error) {
      errors.push({ source: r.source, message: r.message });
      sourceStats[name] = { ok: false, count: 0, error: r.message };
    } else {
      sourceStats[name] = { ok: true, count: r.length };
      articles.push(...r);
    }
  });

  // Dedup by link
  const seen = new Set();
  articles = articles.filter(a => {
    if (!a.link) return false;
    if (seen.has(a.link)) return false;
    seen.add(a.link);
    return true;
  });

  // Sort newest first
  articles.sort((a, b) => b.timestamp - a.timestamp);

  // Add derived fields
  articles = articles.map(a => ({
    id: makeId(a.link),
    ...a,
    age: timeAgoHe(a.timestamp),
    pubDateIso: new Date(a.timestamp).toISOString(),
  }));

  // Available topics/subs based on what actually came back
  const topicsSet = new Set();
  const subsByTopic = {};
  const topicsHe = {};
  articles.forEach(a => {
    topicsSet.add(a.topic);
    topicsHe[a.topic] = a.topicHe;
    if (!subsByTopic[a.topic]) subsByTopic[a.topic] = new Set();
    subsByTopic[a.topic].add(a.sub);
  });
  const subs = {};
  Object.keys(subsByTopic).forEach(t => { subs[t] = [...subsByTopic[t]]; });

  // Filter by topic AFTER building the topic list
  let filtered = articles;
  if (topic !== 'all') {
    filtered = filtered.filter(a => a.topic === topic);
  }
  filtered = filtered.slice(0, 60);

  return res.status(200).json({
    articles: filtered,
    total: filtered.length,
    totalRaw: articles.length,
    updated: new Date().toISOString(),
    updatedTs: Date.now(),
    fetchMs,
    topics: [...topicsSet],
    topicsHe,
    subs,
    sources: SOURCES.map(s => ({
      name: s.name,
      topic: s.topic,
      topicHe: s.topicHe,
      sub: s.sub,
      url: s.url,
      status: sourceStats[s.name] || { ok: false, count: 0 },
    })),
    errors: errors.length ? errors : undefined,
  });
}
