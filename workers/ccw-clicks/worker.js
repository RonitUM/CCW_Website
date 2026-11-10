// ccw-clicks: anonymous aggregate click counters for ccw.org.il.
// Receives {e, p, l, d} from the site, validates each field against a fixed
// allowlist, and writes one Analytics Engine data point:
// blobs [event, path, detail, lang]. 'detail' is ONLY ever one of: an
// external hostname from ALLOWED_DETAILS (the fixed list of sites this
// website links to) or a form page id from the same list. Anything else is
// replaced with '' before storage, so no link text, URL query, or
// attacker-chosen string can reach the dataset.
// Deliberately stores no IP, no user agent, no cookie, no identity, no
// timestamp of its own (Analytics Engine adds its ingest time only).
// No per-IP rate limiting, by design: that would require storing IPs.
// Worst case under abuse, counting stops at the Workers Free daily cap;
// the site itself is never affected (calls are fire-and-forget).

const ALLOWED_EVENTS = new Set([
  'cta_request_therapy',
  'cta_donate_page',
  'cta_donate_external',
  'cta_call',
  'cta_email',
  'cta_social',
  'cta_outbound',
  'popup_submit_attempt',
  'form_submit_attempt',
]);
const ALLOWED_ORIGINS = new Set([
  'https://ccw.org.il',
  'https://www.ccw.org.il',
  'https://ronitum.github.io',
]);
// Every value 'detail' may ever hold: the external hosts the site links to
// (client strips 'www.'), and the site's form page ids (client strips 'pg-').
// When the site adds an outbound link or a form page, add it here; unlisted
// values are dropped to '' (the click still counts, without a detail).
const ALLOWED_DETAILS = new Set([
  '',
  // outbound link destinations (hostnames only)
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

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = {
      'Access-Control-Allow-Origin': ALLOWED_ORIGINS.has(origin) ? origin : 'https://ccw.org.il',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Max-Age': '86400',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return new Response('not found', { status: 404 });
    let body;
    try { body = await request.json(); } catch { return new Response(null, { status: 204, headers: cors }); }
    const e = String((body && body.e) || '');
    const p = String((body && body.p) || '');
    const l = String((body && body.l) || '');
    const rawDetail = String((body && body.d) || '').slice(0, 60);
    const d = ALLOWED_DETAILS.has(rawDetail) ? rawDetail : '';
    const okEvent = ALLOWED_EVENTS.has(e);
    const okPath = /^\/[a-zA-Z0-9\-_/%.]{0,140}$/.test(p) && !p.includes('..');
    const okLang = l === 'he' || l === 'en';
    if (okEvent && okPath && okLang) {
      try {
        env.CCW_CLICKS.writeDataPoint({ blobs: [e, p, d, l], doubles: [1], indexes: [e] });
      } catch (err) { /* counting must never fail the request */ }
    }
    return new Response(null, { status: 204, headers: cors });
  },
};
