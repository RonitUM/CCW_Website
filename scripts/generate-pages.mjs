// Prerenders every mapped route as a real static page at its own URL.
// GitHub Pages can only serve committed files, so each old WordPress URL gets a
// full index.html: the app's own markup with the target page pre-selected, its
// own <title>/meta description/canonical, and the same JS bundle on top (the app
// recognizes the path on boot and takes over without changing the URL).
// Runs as postbuild; also writes the full sitemap. MAP stays in public/404.html.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const here = dirname(fileURLToPath(import.meta.url));
const rootDir = join(here, '..');
const ROOT = 'https://ccw.org.il';

const src404 = readFileSync(join(rootDir, 'public/404.html'), 'utf8');
const mm = src404.match(/var MAP = (\{[\s\S]*?\});\s*\n/);
if (!mm) throw new Error('MAP not found in public/404.html');
const MAP = JSON.parse(mm[1]);
const routeMap = JSON.parse(readFileSync(join(rootDir, 'src/route-map.json'), 'utf8'));

async function loadBody(file, exportName) {
  const src = readFileSync(join(rootDir, 'src', file), 'utf8');
  const js = ts.transpileModule(src, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } }).outputText;
  const tmp = join(rootDir, 'node_modules', '.prerender-' + file + '.mjs');
  writeFileSync(tmp, js);
  const mod = await import('file://' + tmp);
  if (typeof mod[exportName] !== 'string') throw new Error('export not found: ' + exportName);
  return mod[exportName];
}
const htmlHe = await loadBody('body.ts', 'html');
const htmlEn = await loadBody('body-en.ts', 'htmlEn');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const stripTags = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

function pageTag(htmlStr, id) {
  const re = new RegExp(`<div class="page[^"]*" id="pg-${id}"[^>]*>`);
  const m = htmlStr.match(re);
  if (!m) throw new Error('page div not found in body html: ' + id);
  return { tag: m[0], start: m.index };
}

function pageFragment(htmlStr, id) {
  const { start } = pageTag(htmlStr, id);
  let end = htmlStr.indexOf('<div class="page', start + 1);
  if (end === -1) end = htmlStr.length;
  return htmlStr.slice(start, end);
}

// Same formulas the app uses in show(): title = h1 + ' | ' + org, description = first paragraph.
function pageMeta(htmlStr, id, lang) {
  const org = lang === 'he' ? 'מרכז יעוץ לאשה' : 'The Counseling Center for Women';
  const defTitle = 'מרכז יעוץ לאשה | The Counseling Center for Women';
  const defDesc = lang === 'he'
    ? 'מרכז יעוץ לאשה - מרכז טיפולי, מרכז הכשרה וקהילה'
    : 'The Counseling Center for Women - therapy center, training center and community';
  const frag = pageFragment(htmlStr, id);
  const hm = frag.match(/<h[12][^>]*>([\s\S]*?)<\/h[12]>/);
  const h1 = hm ? stripTags(hm[1]) : '';
  const pm = frag.match(/<p[ >][\s\S]*?<\/p>/);
  const d = pm ? stripTags(pm[0]).slice(0, 160) : '';
  return {
    title: (id === 'home' || !h1) ? defTitle : h1 + ' | ' + org,
    desc: (id === 'home' || !d) ? defDesc : d,
  };
}

function render(tpl, { id, lang, url, canonicalUrl, depth }) {
  const raw = lang === 'he' ? htmlHe : htmlEn;
  let bodyHtml = raw;
  if (id !== 'home') {
    // pg-home ships pre-selected in the static markup; only the target page may stay visible.
    bodyHtml = bodyHtml.replace('<div class="page on" id="pg-home">', '<div class="page" id="pg-home">');
    const { tag } = pageTag(bodyHtml, id);
    bodyHtml = bodyHtml.replace(tag, tag.replace('class="page', 'class="page on').replace(' id=', ' role="main" tabindex="-1" id='));
  } else {
    const { tag } = pageTag(bodyHtml, id);
    bodyHtml = bodyHtml.replace(tag, tag.replace(' id=', ' role="main" tabindex="-1" id='));
  }
  const { title, desc } = pageMeta(raw, id, lang);
  const dir = lang === 'he' ? 'rtl' : 'ltr';
  let out = tpl;
  out = out.replace('<html lang="he" dir="rtl">', `<html lang="${lang}" dir="${dir}">`);
  // Pages live below the site root and the bundle uses relative URLs (base './' for
  // staging), so each page gets a <base> back to the site root; this also covers
  // relative media URLs inside the content and assets resolved at runtime.
  const base = depth > 0 ? `\n    <base href="${'../'.repeat(depth)}">` : '';
  out = out.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />${base}\n    <script>try{localStorage.setItem('ccwLang','${lang}')}catch(e){}</script>`);
  out = out.replace(/<title>[\s\S]*?<\/title>/, `<title>${esc(title)}</title>`);
  out = out.replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${esc(desc)}" />`);
  out = out.replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${esc(title)}" />`);
  out = out.replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${esc(desc)}" />`);
  out = out.replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${esc(url)}" />`);
  out = out.replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${esc(canonicalUrl)}" />`);
  const fill = `<div id="root"><div class="ccw${id === 'home' ? '' : ' sp'}" id="ccw" dir="${dir}" lang="${lang}">${bodyHtml}</div></div>`;
  out = out.replace('<div id="root"></div>', fill);
  return out;
}

// Minimal redirect stub, kept only for URLs that have no page of their own
// (English posts that were never translated, and old PDF file URLs).
function stubPage(target, lang) {
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

const tpl = readFileSync(join(rootDir, 'dist/index.html'), 'utf8');
if (tpl.indexOf('<div id="root"></div>') === -1) throw new Error('dist/index.html template shape changed');
if (tpl.indexOf('<link rel="canonical"') === -1) throw new Error('canonical link missing from index.html template');

const dist = join(rootDir, 'dist');
let pages = 0, stubs = 0;
const written = new Set();

function writeOut(relPath, content) {
  const p = join(dist, relPath, 'index.html');
  mkdirSync(dirname(p), { recursive: true });
  writeFileSync(p, content);
}

for (const lang of ['he', 'en']) {
  const table = routeMap.match[lang];
  for (const [slug, id] of Object.entries(table)) {
    if (lang === 'en' && MAP.en_only_posts.indexOf(slug) !== -1) continue; // stubs below
    const relPath = (lang === 'en' ? 'en/' : '') + slug;
    const url = `${ROOT}/${relPath}/`;
    const canonicalUrl = ROOT + routeMap.canonical[lang][id];
    const depth = relPath.split('/').length;
    writeOut(relPath, render(tpl, { id, lang, url, canonicalUrl, depth }));
    written.add(relPath);
    pages++;
    if (lang === 'he' && id === 'home') {
      // The root URL serves the prerendered Hebrew home page instead of the bare JS shell.
      writeFileSync(join(dist, 'index.html'), render(tpl, { id, lang, url: ROOT + '/', canonicalUrl: ROOT + '/', depth: 0 }));
    }
  }
}

for (const slug of MAP.en_only_posts) {
  writeOut(`en/${slug}`, stubPage(`${ROOT}/en/news/`, 'en'));
  stubs++;
}
for (const [oldPath, file] of Object.entries(MAP.pdf)) {
  const target = file.charAt(0) === '#' ? `${ROOT}/מסמכי-עמותה/` : `${ROOT}/${file}`;
  writeOut(oldPath, stubPage(target, 'he'));
  stubs++;
}

// Full sitemap: root plus one entry per canonical route URL (both languages).
const locs = [ROOT + '/'];
const seen = new Set(locs);
for (const lang of ['he', 'en']) {
  for (const p of Object.values(routeMap.canonical[lang])) {
    const u = ROOT + p;
    if (!seen.has(u)) { seen.add(u); locs.push(u); }
  }
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${locs.map((u) => `  <url><loc>${encodeURI(u)}</loc></url>`).join('\n')}\n</urlset>\n`;
writeFileSync(join(rootDir, 'public/sitemap.xml'), sitemap);
writeFileSync(join(dist, 'sitemap.xml'), sitemap);

console.log(`generate-pages: wrote ${pages} prerendered pages, ${stubs} redirect stubs, sitemap with ${locs.length} URLs`);
