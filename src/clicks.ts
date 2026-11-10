// Anonymous aggregate click counters for ccw.org.il.
//
// Requested by Shai 2026-11-10 ("I want clicks analysis as well"). Counts
// taps on key actions (donate, request-therapy, phone/email, outbound links,
// form submit attempts) and sends ONLY: event name + page path (no query,
// no hash) + language +, for outbound links, the destination HOSTNAME only
// (fixed allowlist enforced server-side in workers/ccw-clicks/worker.js) or,
// for form attempts, the page id. No identity, no persistent ID, no session
// stitching, no cookies or storage, no form values, no link text, no search
// terms, no query strings.
//
// DISABLED BY DEFAULT: with CLICK_ENDPOINT empty nothing is sent and this
// module adds no network calls. The endpoint is the ccw-clicks Cloudflare
// Worker on the existing CCW account (workers/ccw-clicks in this repo);
// it is public by design once deployed, like the Web Analytics token.
// "Attempt" events record a tap/submit action only; actual form delivery
// success is counted separately, server-side, by the forms Worker.
const CLICK_ENDPOINT = '';

type ClickEvent =
  | 'cta_request_therapy'
  | 'cta_donate_page'
  | 'cta_donate_external'
  | 'cta_call'
  | 'cta_email'
  | 'cta_social'
  | 'cta_outbound'
  | 'popup_submit_attempt'
  | 'form_submit_attempt';

const SOCIAL = ['facebook.com', 'instagram.com', 'linkedin.com', 'youtube.com', 'wa.me', 'whatsapp.com'];
const DONATE = ['jgive.co.il', 'igul.org.il'];

// The ONLY values the detail field may ever transmit: the external hosts this
// site links to, and the site's form page ids. Mirrors the allowlist enforced
// again server-side in workers/ccw-clicks/worker.js, so what is sent already
// matches the privacy policy (no other hostname, no link text, no query data).
// When the site adds an outbound link or a form page, add it here AND in the
// worker; unlisted clicks are still counted, with an empty detail.
const ALLOWED_DETAIL = new Set([
  // outbound link destinations (hostnames only, 'www.' stripped)
  'jgive.co.il', 'igul.org.il', 'web.causematch.com',
  'facebook.com', 'instagram.com', 'linkedin.com', 'youtube.com',
  'wa.me', 'whatsapp.com',
  'ynet.co.il', 'haaretz.co.il', 'maariv.co.il', '103fm.maariv.co.il',
  'betipulnet.co.il', 'onlife.co.il', 'drove.com',
  'creativecommons.org', 'commons.wikimedia.org',
  // form page ids
  'about', 'activity', 'articles', 'audit', 'board', 'careers', 'community',
  'contact', 'docs', 'donate', 'faq', 'home', 'jlm', 'legacy', 'media',
  'mediaposts', 'memorial', 'mgmt', 'newsletter', 'patients', 'privacy',
  'rg', 'story', 'team', 'train', 'treat', 'whatis', 'unknown',
]);

function allowedDetail(d?: string): string {
  return d && ALLOWED_DETAIL.has(d) ? d : '';
}

function pagePath(): string {
  // Path only: query and hash never leave the browser.
  return location.pathname || '/';
}

function lang(): string {
  try { return localStorage.getItem('ccwLang') === 'en' ? 'en' : 'he'; } catch (e) { return 'he'; }
}

function send(e: ClickEvent, detail?: string): void {
  if (!CLICK_ENDPOINT) return;
  try {
    const body = JSON.stringify({ e, p: pagePath(), l: lang(), d: (detail || '').slice(0, 60) });
    if (navigator.sendBeacon) {
      navigator.sendBeacon(CLICK_ENDPOINT, new Blob([body], { type: 'application/json' }));
    } else {
      fetch(CLICK_ENDPOINT, { method: 'POST', body, keepalive: true, mode: 'cors' }).catch(() => {});
    }
  } catch (e2) { /* never break the site for a counter */ }
}

function classify(a: HTMLAnchorElement): { e: ClickEvent; d?: string } | null {
  const href = a.getAttribute('href') || '';
  if (href.startsWith('tel:')) return { e: 'cta_call' };
  if (href.startsWith('mailto:')) return { e: 'cta_email' };
  const go = a.getAttribute('data-go') || '';
  if (go === 'donate' || a.classList.contains('donate')) return { e: 'cta_donate_page' };
  if (go === 'contact' && a.classList.contains('btn')) return { e: 'cta_request_therapy' };
  if (/^https?:\/\//.test(href)) {
    let host = '';
    try { host = new URL(href).hostname.replace(/^www\./, ''); } catch (e) { return null; }
    if (DONATE.some((d) => host.endsWith(d))) return { e: 'cta_donate_external', d: host };
    if (SOCIAL.some((d) => host.endsWith(d))) return { e: 'cta_social', d: host };
    return { e: 'cta_outbound', d: host };
  }
  return null;
}

export function initClicks(): void {
  if (!CLICK_ENDPOINT) return;
  document.addEventListener('click', (ev) => {
    if (!ev.isTrusted) return;
    const t = ev.target as Element | null;
    if (!t || !t.closest) return;
    const a = t.closest('a') as HTMLAnchorElement | null;
    if (a) { const c = classify(a); if (c) send(c.e, allowedDetail(c.d)); return; }
    const ov = t.closest('.pop-ov');
    if (ov && t.closest('.sbm')) send('popup_submit_attempt');
  }, { capture: true, passive: true });
  document.addEventListener('submit', (ev) => {
    if (!ev.isTrusted) return;
    const f = ev.target as HTMLFormElement | null;
    if (!f) return;
    const pg = f.closest('.page');
    send('form_submit_attempt', allowedDetail(pg ? pg.id.replace(/^pg-/, '') : 'unknown'));
  }, { capture: true, passive: true });
}
