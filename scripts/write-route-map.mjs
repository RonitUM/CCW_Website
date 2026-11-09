// Builds src/route-map.json from the MAP in public/404.html (one source of truth).
// The runtime router uses it to recognize mapped URL paths and to push canonical
// path-based URLs instead of hash URLs for routes that have a mapped path.
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const rootDir = join(here, '..');
const src = readFileSync(join(rootDir, 'public/404.html'), 'utf8');
const m = src.match(/var MAP = (\{[\s\S]*?\});\s*\n/);
if (!m) throw new Error('MAP not found in public/404.html');
const MAP = JSON.parse(m[1]);

// Where several old slugs reach the same route, the canonical slug is the one the
// old server actually served (verified 200 there); aliases keep working as pages.
const PREFER = {
  he: { community: 'מרכז-העשרה', post11: 'ניוזלטר-דצמבר-2021' },
  en: { community: 'community-action-center', post11: 'newsletter-december-2021' },
};

const match = { he: {}, en: {} };
const canonical = { he: {}, en: {} };

// Optional pilot scope: PILOT_SLUGS="slug,en/slug" limits the emitted tables to those
// paths, so the built bundle only recognizes those URLs and changes nothing else.
const PILOT = (process.env.PILOT_SLUGS || '').split(',').map((s) => s.trim()).filter(Boolean);
const inPilot = (lang, slug) => !PILOT.length || PILOT.indexOf((lang === 'en' ? 'en/' : '') + slug) !== -1;

function addLang(lang, table) {
  for (const [slug, route] of Object.entries(table)) {
    if (!inPilot(lang, slug)) continue;
    match[lang][slug] = route;
    const pref = PREFER[lang][route];
    if (!canonical[lang][route] || slug === pref) canonical[lang][route] = slug;
  }
}
addLang('he', MAP.pages_he);
addLang('he', MAP.posts_he);
addLang('en', MAP.pages_en);
addLang('en', MAP.posts_en);
if (!PILOT.length) {
  match.he['category/newsletter'] = 'newsletter';
  match.en['category/newsletter-en'] = 'newsletter';
  for (const s of MAP.en_only_posts) match.en[s] = 'newsletter';
  canonical.he['newsletter'] = 'category/newsletter';
}

const out = { match, canonical: { he: {}, en: {} } };
for (const [route, slug] of Object.entries(canonical.he)) out.canonical.he[route] = '/' + slug + '/';
for (const [route, slug] of Object.entries(canonical.en)) out.canonical.en[route] = '/en/' + slug + '/';
if (!PILOT.length) {
  out.canonical.he['home'] = '/';
  out.canonical.en['home'] = '/en/home/';
}

const target = join(rootDir, 'src/route-map.json');
writeFileSync(target, JSON.stringify(out, null, 2) + '\n');
console.log(`write-route-map: ${Object.keys(match.he).length} he paths, ${Object.keys(match.en).length} en paths`);
