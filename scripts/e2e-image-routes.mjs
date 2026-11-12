// Real-click image-route regression suite for the 2026-11-12 broken-images incident.
// Boots the BUILT dist/ over a local static server and drives Chrome through the
// actual user tap flows (root -> menu -> deep page -> open image/doc), asserting
// images resolve at the site root and decode, on a pre-fix control build and the
// current build, mobile + desktop, plus deep reload, EN deep load, and subpath.
// Extended flows: EN language toggle with all 164 media refs (123 img src +
// 41 fullview href) resolved via the frozen base and HEAD-checked, active-image
// load+decode, EN deep load and HE/EN toggle round-trip under the /CCW_Website/
// staging prefix, fullview original-image real click (new tab), and the relative
// donate-button real click from root and from a deep page.
//
// Run:  npm run build && node scripts/e2e-image-routes.mjs
// Needs: puppeteer-core (npm i --no-save puppeteer-core, adds NO repo dependency)
//        and a Chrome binary (CHROME_BIN env, default /usr/bin/google-chrome).
// No repo dependencies are added; the entry popup is skipped via localStorage
// (human-verification is not under test). Screenshots land in /tmp/ccw-e2e-*.png.
import { createServer } from 'node:http';
import { readFileSync, existsSync, statSync, mkdtempSync, rmSync } from 'node:fs';
import { join, extname } from 'node:path';
import { tmpdir } from 'node:os';

const CHROME = process.env.CHROME_BIN || '/usr/bin/google-chrome';
const DIST = new URL('../dist', import.meta.url).pathname;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.json': 'application/json', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.txt': 'text/plain', '.xml': 'application/xml' };

function serve(root, prefix = '') {
  const srv = createServer((req, res) => {
    let p = decodeURIComponent((req.url || '/').split('?')[0]);
    if (prefix) { if (!p.startsWith(prefix)) { res.writeHead(404).end(); return; } p = p.slice(prefix.length) || '/'; }
    let f = join(root, p);
    if (existsSync(f) && statSync(f).isDirectory()) f = join(f, 'index.html');
    let status = 200;
    if (!existsSync(f)) { f = join(root, '404.html'); status = 404; }
    try { const b = readFileSync(f); res.writeHead(status, { 'content-type': MIME[extname(f)] || 'application/octet-stream' }); res.end(b); }
    catch { res.writeHead(404).end(); }
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r({ srv, port: srv.address().port })));
}

const MOBILE = { width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
const DESKTOP = { width: 1280, height: 800 };
const UA = 'Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Optional flow filter for long/CI runs: E2E_ONLY=A,B,C,D,E,F,G,E2,E3,E4,E5,E6
// runs only the named flows; unset runs everything. Each flow is independent.
const ONLY = process.env.E2E_ONLY ? process.env.E2E_ONLY.split(',') : null;
const results = {};
let failures = 0;
const expect = (name, cond, detail) => { if (!cond) { failures++; console.error(`FAIL ${name}: ${detail}`); } else console.log(`ok ${name}`); };

async function run() {
  const puppeteer = await import('puppeteer-core');
  const { execSync } = await import('node:child_process');
  const { writeFileSync } = await import('node:fs');
  // Unique test-owned scratch dir under the OS temp root: created empty by this run,
  // so deleting it in finally can never touch pre-existing developer data.
  // ALL throwable setup (temp creation, copy, read, write, servers, browser launch)
  // sits inside the try so the finally releases whatever was actually acquired.
  let control = null, patched, unpatched, subpath, browser;
  try {
  // Pre-fix control: dist copy with the root page's <base> removed (exactly what
  // the old generator emitted; deep pages are identical in both builds).
  control = mkdtempSync(join(tmpdir(), 'ccw-e2e-control-'));
  execSync(`cp -r "${DIST}/." "${control}/"`);
  const idx = join(control, 'index.html');
  const html = readFileSync(idx, 'utf8');
  if (!html.includes('<base href="./">')) { console.error('control prep: dist root lacks <base href="./"> - is this the pre-fix build? control == current'); }
  else { writeFileSync(idx, html.replace('<base href="./">', '')); }

  patched = await serve(DIST);
  unpatched = await serve(control);
  subpath = await serve(DIST, '/CCW_Website');
  browser = await puppeteer.default.launch({ executablePath: CHROME, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage'] });

  async function newPage(viewport, base) {
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport(viewport);
    if (viewport.isMobile) await page.setUserAgent(UA);
    await page.evaluateOnNewDocument(() => { try { localStorage.setItem('ccwEntryPopupDone', '1'); } catch (e) {} });
    await page.goto(base + '/', { waitUntil: 'load', timeout: 45000 });
    await sleep(1500);
    return { ctx, page };
  }
  async function navTouch(page, go) {
    await page.tap('button.burger'); await sleep(550);
    await page.evaluate((g) => { const ni = [...document.querySelectorAll('.mn .ni')].find((n) => n.querySelector(`a[data-go="${g}"]`)); const dd = ni && ni.querySelector('a.dd'); if (dd) dd.setAttribute('data-e2e-grp', '1'); }, go);
    await page.tap('a[data-e2e-grp="1"]'); await sleep(550);
    await page.waitForSelector(`.ni.open a[data-go="${go}"]`, { visible: true, timeout: 8000 });
    await page.tap(`.ni.open a[data-go="${go}"]`); await sleep(1900);
  }
  async function navDesktop(page, go) {
    await page.evaluate((g) => { const ni = [...document.querySelectorAll('.mn .ni')].find((n) => n.querySelector(`a[data-go="${g}"]`)); const dd = ni && ni.querySelector('a.dd'); if (dd) dd.setAttribute('data-e2e-grp', '1'); }, go);
    await page.hover('a[data-e2e-grp="1"]'); await sleep(700);
    await page.waitForSelector(`.mn .ni a[data-go="${go}"]`, { visible: true, timeout: 8000 });
    await page.click(`.mn .ni a[data-go="${go}"]`); await sleep(1900);
  }
  async function docState(page, docText) {
    const found = await page.evaluate((t) => { const a = [...document.querySelectorAll('a[data-doc]')].find((x) => x.textContent.includes(t) && x.offsetParent); if (a) a.setAttribute('data-e2e-doc', '1'); return !!a; }, docText);
    if (!found) return { rowFound: false, ok: false };
    try { await page.tap('a[data-e2e-doc="1"]'); } catch { await page.click('a[data-e2e-doc="1"]'); }
    await page.waitForSelector('.docov-box img.docov-pg', { timeout: 8000 });
    await page.waitForFunction(() => { const i = document.querySelector('.docov-box img.docov-pg'); return i && i.complete; }, { timeout: 12000 });
    return page.evaluate(async () => {
      const i = document.querySelector('.docov-box img.docov-pg');
      let decoded; try { await i.decode(); decoded = true; } catch (e) { decoded = 'decode failed: ' + e.message; }
      return { rowFound: true, resolved: i.currentSrc || i.src, naturalWidth: i.naturalWidth, ok: i.complete && i.naturalWidth > 0, decoded };
    });
  }
  async function adState(page) {
    await page.waitForSelector('img[src*="hiring-therapists-ad"]', { timeout: 8000 });
    await page.evaluate(() => { document.querySelector('img[src*="hiring-therapists-ad"]').scrollIntoView({ block: 'center' }); });
    await page.waitForFunction(() => { const i = document.querySelector('img[src*="hiring-therapists-ad"]'); return i && i.complete; }, { timeout: 12000 });
    return page.evaluate(async () => {
      const i = document.querySelector('img[src*="hiring-therapists-ad"]');
      let decoded; try { await i.decode(); decoded = true; } catch (e) { decoded = 'decode failed: ' + e.message; }
      return { resolved: i.currentSrc || i.src, naturalWidth: i.naturalWidth, ok: i.complete && i.naturalWidth > 0, decoded };
    });
  }
  const docsFlow = async (page, nav, shot) => { await nav(page, 'docs'); const r = { pathname: new URL(page.url()).pathname, baseURI: await page.evaluate(() => document.baseURI) }; r.viewer = await docState(page, 'אישור ניכוי מס'); if (shot) await page.screenshot({ path: shot }); return r; };
  const careersFlow = async (page, nav, shot) => { await nav(page, 'careers'); const r = { pathname: new URL(page.url()).pathname, baseURI: await page.evaluate(() => document.baseURI) }; r.ad = await adState(page); if (shot) await page.screenshot({ path: shot }); return r; };

  if (!ONLY || ONLY.includes('A')) { // A. control build (pre-fix behavior), mobile taps - MUST FAIL images
    const { ctx, page } = await newPage(MOBILE, `http://127.0.0.1:${unpatched.port}`);
    results.A_control_docs = await docsFlow(page, navTouch, '/tmp/ccw-e2e-A1-control-docs.png');
    const { ctx: c2, page: p2 } = await newPage(MOBILE, `http://127.0.0.1:${unpatched.port}`);
    results.A_control_careers = await careersFlow(p2, navTouch, '/tmp/ccw-e2e-A2-control-careers.png');
    expect('A1 control doc image broken (naturalWidth 0)', results.A_control_docs.viewer.naturalWidth === 0, JSON.stringify(results.A_control_docs.viewer));
    expect('A2 control ad broken (naturalWidth 0)', results.A_control_careers.ad.naturalWidth === 0, JSON.stringify(results.A_control_careers.ad));
    await ctx.close(); await c2.close();
  }
  if (!ONLY || ONLY.includes('B')) { // B. current build, mobile taps
    const { ctx, page } = await newPage(MOBILE, `http://127.0.0.1:${patched.port}`);
    results.B_mobile_docs = await docsFlow(page, navTouch, '/tmp/ccw-e2e-B1-docs-mobile.png');
    const { ctx: c2, page: p2 } = await newPage(MOBILE, `http://127.0.0.1:${patched.port}`);
    results.B_mobile_careers = await careersFlow(p2, navTouch, '/tmp/ccw-e2e-B2-careers-mobile.png');
    expect('B1 doc image loads after menu nav', results.B_mobile_docs.viewer.ok === true && results.B_mobile_docs.viewer.decoded === true, JSON.stringify(results.B_mobile_docs.viewer));
    expect('B1 doc image resolves at site root', !results.B_mobile_docs.viewer.resolved.includes('%D7'), results.B_mobile_docs.viewer.resolved);
    expect('B2 ad loads after menu nav', results.B_mobile_careers.ad.ok === true && results.B_mobile_careers.ad.decoded === true, JSON.stringify(results.B_mobile_careers.ad));
    expect('B2 ad resolves at site root', !results.B_mobile_careers.ad.resolved.includes('%D7'), results.B_mobile_careers.ad.resolved);
    await ctx.close(); await c2.close();
  }
  if (!ONLY || ONLY.includes('C')) { // C. current build, desktop hover+click
    const { ctx, page } = await newPage(DESKTOP, `http://127.0.0.1:${patched.port}`);
    results.C_desktop_docs = await docsFlow(page, navDesktop, '/tmp/ccw-e2e-C1-docs-desktop.png');
    const { ctx: c2, page: p2 } = await newPage(DESKTOP, `http://127.0.0.1:${patched.port}`);
    results.C_desktop_careers = await careersFlow(p2, navDesktop);
    expect('C1 desktop doc image ok', results.C_desktop_docs.viewer.ok === true, JSON.stringify(results.C_desktop_docs.viewer));
    expect('C2 desktop ad ok', results.C_desktop_careers.ad.ok === true, JSON.stringify(results.C_desktop_careers.ad));
    await ctx.close(); await c2.close();
  }
  if (!ONLY || ONLY.includes('D')) { // D. deep-route reload, then open second document
    const { ctx, page } = await newPage(MOBILE, `http://127.0.0.1:${patched.port}`);
    await navTouch(page, 'docs');
    await page.reload({ waitUntil: 'load', timeout: 45000 });
    results.D_reload = { pathname: new URL(page.url()).pathname, viewer: await docState(page, 'אישור ניהול תקין') };
    expect('D deep reload + second doc ok', results.D_reload.viewer.ok === true, JSON.stringify(results.D_reload.viewer));
    await ctx.close();
  }
  if (!ONLY || ONLY.includes('E')) { // E. EN direct deep load
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport(MOBILE); await page.setUserAgent(UA);
    await page.evaluateOnNewDocument(() => { try { localStorage.setItem('ccwEntryPopupDone', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${patched.port}/en/non-profit-documents/`, { waitUntil: 'load', timeout: 45000 });
    results.E_en = { pathname: new URL(page.url()).pathname, viewer: await docState(page, '') };
    expect('E EN deep-load doc ok', results.E_en.viewer.ok === true, JSON.stringify(results.E_en.viewer));
    await ctx.close();
  }
  if (!ONLY || ONLY.includes('F')) { // F. subpath staging-style serving
    const { ctx, page } = await newPage(DESKTOP, `http://127.0.0.1:${subpath.port}/CCW_Website`);
    results.F_subpath = await careersFlow(page, navDesktop);
    expect('F subpath ad ok', results.F_subpath.ad.ok === true && results.F_subpath.ad.resolved.includes('/CCW_Website/'), JSON.stringify(results.F_subpath.ad));
    await ctx.close();
  }

  if (!ONLY || ONLY.includes('G')) { // G. every document, every page, after real menu navigation; count vs source manifest
    const countsSrc = readFileSync(new URL('../src/docs/pdf-pages.ts', import.meta.url), 'utf8');
    const manifest = Object.fromEntries([...countsSrc.matchAll(/'([\w-]+)':\s*(\d+)/g)].map((m) => [m[1], Number(m[2])]));
    const manifestTotal = Object.values(manifest).reduce((a, b) => a + b, 0);
    const { ctx, page } = await newPage(MOBILE, `http://127.0.0.1:${patched.port}`);
    await navTouch(page, 'docs');
    // favicon resolves at site root after deep navigation (was the same nested-404 class)
    const fav = await page.evaluate(async () => { const l = document.querySelector('link[rel="icon"]'); const u = new URL(l.getAttribute('href'), document.baseURI); const r = await fetch(u, { method: 'HEAD' }).catch(() => null); return { href: l.getAttribute('href'), resolved: String(u), status: r ? r.status : 0 }; });
    results.G_favicon = fav;
    expect('G favicon resolves at site root and 200s', fav.status === 200 && !fav.resolved.includes('%D7'), JSON.stringify(fav));
    const rows = await page.evaluate(() => [...document.querySelectorAll('a[data-doc]')].filter((a) => a.offsetParent).map((a, i) => { a.setAttribute('data-e2e-row', String(i)); return a.getAttribute('data-doc'); }));
    const perDoc = {};
    for (let i = 0; i < rows.length; i++) {
      try { await page.tap(`a[data-e2e-row="${i}"]`); } catch { await page.click(`a[data-e2e-row="${i}"]`); }
      await page.waitForSelector('.docov-box img.docov-pg', { timeout: 8000 });
      await page.waitForFunction(() => { const is = [...document.querySelectorAll('.docov-box img.docov-pg')]; return is.length > 0 && is.every((x) => x.complete); }, { timeout: 20000 });
      const st = await page.evaluate(() => { const is = [...document.querySelectorAll('.docov-box img.docov-pg')]; return { n: is.length, ok: is.every((x) => x.complete && x.naturalWidth > 0), bad: is.filter((x) => !(x.complete && x.naturalWidth > 0)).map((x) => x.getAttribute('src')) }; });
      perDoc[rows[i]] = st;
      await page.evaluate(() => { const x = document.querySelector('.docov-x'); if (x) x.click(); });
      await sleep(500);
    }
    results.G_all_docs = perDoc;
    const total = Object.values(perDoc).reduce((a, s) => a + s.n, 0);
    expect('G page total matches manifest', total === manifestTotal, `rendered ${total} vs manifest ${manifestTotal}`);
    for (const [k, m] of Object.entries(manifest)) expect(`G ${k} page count ${m}`, perDoc[k] && perDoc[k].n === m, JSON.stringify(perDoc[k]));
    for (const [k, s] of Object.entries(perDoc)) expect(`G ${k} all pages decode`, s.ok === true, JSON.stringify(s.bad));
    await ctx.close();
  }

  if (!ONLY || ONLY.includes('E2')) { // E2. EN toggle from root (pushState to /en/home/) - the original broken-carousel flow;
    //     EN media refs are relative and must resolve at the site root via the frozen base
    const { ctx, page } = await newPage(MOBILE, `http://127.0.0.1:${patched.port}`);
    await page.evaluate(() => { const a = [...document.querySelectorAll('a[data-lang="en"]')].find((x) => x.offsetParent); if (a) a.setAttribute('data-e2e-lang', '1'); });
    try { await page.tap('a[data-e2e-lang="1"]'); } catch { await page.click('a[data-e2e-lang="1"]'); }
    await sleep(2100);
    const en = await page.evaluate(async () => {
      const head = async (u) => { const r = await fetch(u, { method: 'HEAD' }).catch(() => null); return r ? r.status : 0; };
      const resolve = (ref) => new URL(ref, document.baseURI).href;
      const imgs = [...document.images].filter((i) => (i.getAttribute('src') || '').includes('media-posts/'));
      const hrefs = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => (h || '').includes('media-posts/'));
      const allResolved = [...imgs.map((i) => resolve(i.getAttribute('src'))), ...hrefs.map(resolve)];
      const statuses = {};
      await Promise.all(allResolved.map(async (u) => { const st = await head(u); statuses[st] = (statuses[st] || 0) + 1; }));
      const onPage = [...document.querySelectorAll('.page.on img')].filter((i) => (i.getAttribute('src') || '').includes('media-posts/'));
      const loaded = [];
      for (const i of onPage) {
        i.scrollIntoView({ block: 'center' });
        await new Promise((r) => { const t = setInterval(() => { if (i.complete) { clearInterval(t); r(); } }, 200); setTimeout(() => { clearInterval(t); r(); }, 8000); });
        let d; try { await i.decode(); d = true; } catch (e) { d = false; }
        loaded.push({ src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0, decoded: d });
      }
      const don = new URL('en/donations/', document.baseURI);
      const dr = await head(don);
      return { pathname: location.pathname, baseURI: document.baseURI, srcCount: imgs.length, hrefCount: hrefs.length, total: allResolved.length, nested: allResolved.filter((u) => u.includes('/en/')).length, statuses, sampleResolved: allResolved[0] || null, onPageLoaded: loaded, donateLink: { resolved: String(don), status: dr } };
    });
    results.E2_en_toggle = en;
    expect('E2 EN toggle lands on EN route', /\/en\//.test(en.pathname), en.pathname);
    expect('E2 EN media src count is 123', en.srcCount === 123, `srcs ${en.srcCount}`);
    expect('E2 EN fullview href count is 41', en.hrefCount === 41, `hrefs ${en.hrefCount}`);
    expect('E2 all 164 refs resolve unnested and HEAD 200', en.total === 164 && en.nested === 0 && (en.statuses['200'] || 0) === 164, JSON.stringify({ total: en.total, nested: en.nested, statuses: en.statuses, sample: en.sampleResolved }));
    expect('E2 on-page EN media load+decode', en.onPageLoaded.length > 0 && en.onPageLoaded.every((r) => r.ok && r.decoded), JSON.stringify(en.onPageLoaded.filter((r) => !r.ok)));
    expect('E2 relative donate self-link resolves at root and 200s', en.donateLink.status === 200 && !en.donateLink.resolved.includes('%D7'), JSON.stringify(en.donateLink));
    await page.evaluate(() => { const i = [...document.querySelectorAll('.page.on img')].find((x) => (x.getAttribute('src') || '').includes('media-posts/')); if (i) i.scrollIntoView({ block: 'center' }); });
    await sleep(800);
    await page.screenshot({ path: '/tmp/ccw-e2e-E2-en-media.png' });
    await ctx.close();
  }

  if (!ONLY || ONLY.includes('E3')) { // E3. EN direct deep load under the /CCW_Website/ staging prefix (base ../../ )
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.setViewport(MOBILE); await page.setUserAgent(UA);
    await page.evaluateOnNewDocument(() => { try { localStorage.setItem('ccwEntryPopupDone', '1'); } catch (e) {} });
    await page.goto(`http://127.0.0.1:${subpath.port}/CCW_Website/en/home/`, { waitUntil: 'load', timeout: 45000 });
    const r = await page.evaluate(async () => {
      const resolve = (ref) => new URL(ref, document.baseURI).href;
      const imgs = [...document.images].filter((i) => (i.getAttribute('src') || '').includes('media-posts/'));
      const hrefs = [...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => (h || '').includes('media-posts/'));
      const allResolved = [...imgs.map((i) => resolve(i.getAttribute('src'))), ...hrefs.map(resolve)];
      const onPage = [...document.querySelectorAll('.page.on img')].filter((i) => (i.getAttribute('src') || '').includes('media-posts/'));
      const loaded = [];
      for (const i of onPage) {
        i.scrollIntoView({ block: 'center' });
        await new Promise((res) => { const t = setInterval(() => { if (i.complete) { clearInterval(t); res(); } }, 200); setTimeout(() => { clearInterval(t); res(); }, 8000); });
        let d; try { await i.decode(); d = true; } catch (e) { d = false; }
        loaded.push({ src: i.getAttribute('src'), ok: i.complete && i.naturalWidth > 0, decoded: d });
      }
      return { pathname: location.pathname, baseURI: document.baseURI, srcCount: imgs.length, hrefCount: hrefs.length, total: allResolved.length, prefixed: allResolved.filter((u) => u.includes('/CCW_Website/media-posts/')).length, nested: allResolved.filter((u) => u.includes('/en/')).length, sampleResolved: allResolved[0] || null, onPageLoaded: loaded };
    });
    results.E3_subpath_en_deep = r;
    expect('E3 EN deep under prefix: frozen base ../../ is the prefixed site root', /\/CCW_Website\/$/.test(new URL(r.baseURI).pathname), r.baseURI);
    expect('E3 all 164 refs resolve at prefixed site root, none nested', r.srcCount === 123 && r.hrefCount === 41 && r.prefixed === r.total && r.nested === 0, JSON.stringify({ src: r.srcCount, href: r.hrefCount, prefixed: r.prefixed, total: r.total, nested: r.nested, sample: r.sampleResolved }));
    expect('E3 on-page EN media load+decode under prefix', r.onPageLoaded.length > 0 && r.onPageLoaded.every((x) => x.ok && x.decoded), JSON.stringify(r.onPageLoaded.filter((x) => !x.ok)));
    await ctx.close();
  }
  if (!ONLY || ONLY.includes('E4')) { // E4. root(HE) -> EN -> HE -> EN toggle round-trip under the staging prefix.
    //     Resolution-only: sitePath() prefixes the repo segment only on github.io hosts, so on
    //     localhost the URL bar drops /CCW_Website/ after a pushState - a host-router limitation
    //     of local emulation, exercised correctly on the real github.io staging host.
    const { ctx, page } = await newPage(MOBILE, `http://127.0.0.1:${subpath.port}/CCW_Website`);
    const toggle = async (lang) => {
      await page.evaluate((l) => { const a = [...document.querySelectorAll(`a[data-lang="${l}"]`)].find((x) => x.offsetParent); if (a) a.setAttribute('data-e2e-lang', l); }, lang);
      try { await page.tap(`a[data-e2e-lang="${lang}"]`); } catch { await page.click(`a[data-e2e-lang="${lang}"]`); }
      await sleep(1900);
    };
    const summary = async () => page.evaluate(() => {
      const resolve = (ref) => new URL(ref, document.baseURI).href;
      const refs = [...document.images].filter((i) => (i.getAttribute('src') || '').includes('media-posts/')).map((i) => resolve(i.getAttribute('src')))
        .concat([...document.querySelectorAll('a[href]')].map((a) => a.getAttribute('href')).filter((h) => (h || '').includes('media-posts/')).map(resolve));
      return { pathname: location.pathname, langAttr: document.documentElement.lang, dir: document.documentElement.dir, total: refs.length, prefixed: refs.filter((u) => u.includes('/CCW_Website/media-posts/')).length, nested: refs.filter((u) => u.includes('/en/')).length };
    });
    await toggle('en');
    const enA = await summary();
    await toggle('he');
    const he = await summary();
    await toggle('en');
    const enB = await summary();
    results.E4_subpath_roundtrip = { enA, he, enB };
    expect('E4 EN toggle under prefix: refs prefixed, none nested', enA.total === 164 && enA.prefixed === 164 && enA.nested === 0, JSON.stringify(enA));
    expect('E4 HE toggle back under prefix: refs still prefixed, none nested', he.total === 164 && he.prefixed === 164 && he.nested === 0, JSON.stringify(he));
    expect('E4 second EN toggle under prefix: refs prefixed, none nested', enB.total === 164 && enB.prefixed === 164 && enB.nested === 0, JSON.stringify(enB));
    await ctx.close();
  }
  if (!ONLY || ONLY.includes('E5')) { // E5. fullview href actual click: target=_blank opens the original image in a new tab
    const { ctx, page } = await newPage(MOBILE, `http://127.0.0.1:${patched.port}`);
    await page.evaluate(() => { const a = [...document.querySelectorAll('a[data-lang="en"]')].find((x) => x.offsetParent); if (a) a.setAttribute('data-e2e-lang', '1'); });
    try { await page.tap('a[data-e2e-lang="1"]'); } catch { await page.click('a[data-e2e-lang="1"]'); }
    await sleep(1900);
    // The 41 fullview anchors live on the inner media-post pages (pg-mpostN), reached by SPA nav
    await page.evaluate(() => { const a = document.querySelector('a[data-go="mpost0"]'); if (a) a.click(); });
    await sleep(1900);
    const marked = await page.evaluate(() => { const a = [...document.querySelectorAll('.page.on a[href*="media-posts/"]')].find((x) => x.offsetParent); if (a) { a.scrollIntoView({ block: 'center' }); a.setAttribute('data-e2e-fv', '1'); } return !!a; });
    expect('E5 fullview anchor present on EN page', marked, 'no visible media-posts anchor');
    const [target] = await Promise.all([
      browser.waitForTarget((t) => t.url().includes('media-posts/'), { timeout: 12000 }),
      page.click('a[data-e2e-fv="1"]'),
    ]);
    const fv = await target.page();
    await fv.waitForFunction(() => document.readyState === 'complete', { timeout: 15000 }).catch(() => {});
    const st = await fv.evaluate(async () => { const i = document.images[0]; let d; try { await i.decode(); d = true; } catch (e) { d = false; } return { url: location.pathname, ok: !!i && i.complete && i.naturalWidth > 0, decoded: d }; });
    results.E5_fullview_click = st;
    expect('E5 fullview click opens image at site root and it decodes', st.ok === true && st.decoded === true && !st.url.includes('/en/'), JSON.stringify(st));
    await fv.screenshot({ path: '/tmp/ccw-e2e-E5-fullview.png' });
    await ctx.close();
  }
  if (!ONLY || ONLY.includes('E6')) { // E6. donate button actual click (target=_blank) from HE root and from a direct deep HE page
    for (const [label, base] of [['root', `http://127.0.0.1:${patched.port}`], ['deep', `http://127.0.0.1:${patched.port}/legacy-donation-program`]]) {
      const { ctx, page } = await newPage(MOBILE, base);
      // The button lives on the HE donations post page (pg-post21); reach it by real SPA nav
      await page.evaluate(() => { const a = document.querySelector('a[data-go="post21"]'); if (a) a.click(); });
      await sleep(1900);
      const marked = await page.evaluate(() => { const a = [...document.querySelectorAll('.page.on a[href="en/donations/"]')].find((x) => x.offsetParent); if (a) { a.scrollIntoView({ block: 'center' }); a.setAttribute('data-e2e-don', '1'); } return !!a; });
      expect(`E6 donate button present (${label})`, marked, 'no visible a[href=en/donations/]');
      const [target] = await Promise.all([
        browser.waitForTarget((t) => t.url().includes('/en/donations/'), { timeout: 12000 }),
        page.click('a[data-e2e-don="1"]'),
      ]);
      const dp = await target.page();
      await dp.waitForFunction(() => document.readyState === 'complete', { timeout: 15000 }).catch(() => {});
      const st = await dp.evaluate(() => ({ url: location.pathname, hasContent: document.body.innerText.trim().length > 500 }));
      results[`E6_donate_${label}`] = st;
      expect(`E6 donate ${label} click lands on /en/donations/ and renders`, st.url === '/en/donations/' && st.hasContent, JSON.stringify(st));
      await ctx.close();
    }
  }

  } finally {
    if (browser) await browser.close().catch(() => {});
    for (const s of [patched, unpatched, subpath]) { if (s) s.srv.close(); }
    if (control) rmSync(control, { recursive: true, force: true });
  }
  console.log(JSON.stringify(results, null, 1));
  console.log(failures ? `E2E FAIL: ${failures} assertion(s)` : 'E2E PASS: all image-route flows');
  process.exit(failures ? 1 : 0);
}

run().catch((e) => { console.error(e); process.exit(1); });
