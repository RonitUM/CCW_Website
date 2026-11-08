// Generates static redirect pages for old WordPress URLs into dist/.
// GitHub Pages cannot return a real 301, but it serves a committed file with
// 200; a 0-delay meta refresh is treated by Google like a permanent redirect.
// The MAP is parsed out of public/404.html so there is one source of truth.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const src = readFileSync(new URL('../public/404.html', import.meta.url), 'utf8');
const m = src.match(/var MAP = (\{[\s\S]*?\});\s*\n/);
if (!m) throw new Error('MAP not found in public/404.html');
const MAP = JSON.parse(m[1]);

const ROOT = 'https://ccw.org.il/';
const out = [];

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

function page(target, lang) {
  const he = lang === 'he';
  return `<!doctype html>
<html lang="${he ? 'he' : 'en'}" dir="${he ? 'rtl' : 'ltr'}">
<head>
<meta charset="utf-8">
<script>try{localStorage.setItem('ccwLang','${he ? 'he' : 'en'}')}catch(e){}</script>
<meta http-equiv="refresh" content="0; url=${esc(target)}">
<link rel="canonical" href="${esc(target)}">
<title>${he ? 'הדף הועבר | מרכז יעוץ לאשה' : 'Page moved | The Counseling Center for Women'}</title>
</head>
<body style="font-family:Arial,sans-serif;text-align:center;padding:60px 20px;color:#4a2b4d">
<p>${he ? 'הדף הועבר לכתובת חדשה.' : 'This page moved.'}</p>
<p><a href="${esc(target)}">${he ? 'מעבר לעמוד' : 'Continue to the page'}</a></p>
<script>location.replace(${JSON.stringify(target)})</script>
</body>
</html>
`;
}

function add(oldPath, target, lang) {
  out.push({ oldPath: oldPath.replace(/^\/+|\/+$/g, ''), target, lang });
}

for (const [slug, route] of Object.entries(MAP.pages_he)) add(slug, `${ROOT}#/${route}`, 'he');
for (const [slug, route] of Object.entries(MAP.pages_en)) add(`en/${slug}`, `${ROOT}#/${route}`, 'en');
for (const [slug, route] of Object.entries(MAP.posts_he)) add(slug, `${ROOT}#/${route}`, 'he');
for (const [slug, route] of Object.entries(MAP.posts_en)) add(`en/${slug}`, `${ROOT}#/${route}`, 'en');
for (const slug of MAP.en_only_posts) add(`en/${slug}`, `${ROOT}#/newsletter`, 'en');
add('category/newsletter', `${ROOT}#/newsletter`, 'he');
add('en/category/newsletter-en', `${ROOT}#/newsletter`, 'en');
for (const [oldPath, file] of Object.entries(MAP.pdf)) {
  if (file.charAt(0) === '#') add(oldPath, `${ROOT}#/docs`, 'he');
  else add(oldPath, `${ROOT}${file}`, 'he');
}

const dist = new URL('../dist/', import.meta.url).pathname;
let n = 0;
for (const r of out) {
  const p = join(dist, r.oldPath, 'index.html');
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, page(r.target, r.lang));
  n++;
}
console.log(`generate-redirects: wrote ${n} redirect pages`);
