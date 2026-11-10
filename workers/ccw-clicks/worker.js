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
// Canonical page paths of the site (built pages, normalized: percent-decoded,
// no trailing slash). Anything else is stored as '' so arbitrary URL text
// (e.g. a typed 404 URL) can never carry identifiers into the dataset.
const ALLOWED_PATHS = new Set([
  "/", "/2160-2", "/2177-2", "/2321-2",
  "/404", "/category/newsletter", "/en", "/en/1community-action-center",
  "/en/2019-december", "/en/about", "/en/activities", "/en/administrative-staff",
  "/en/audit-committee", "/en/board-of-directors", "/en/category/newsletter-en", "/en/ccw-founding-mother-judy-shotten-1924-2020",
  "/en/ccw-newsletter-november-2020", "/en/community-action-center", "/en/contact", "/en/counseling-center-for-women-invites-you-to-a-zoom-gathering",
  "/en/dec-2021-a-clients-perspective", "/en/donations", "/en/february-2023", "/en/happy-and-healthy-new-year-from-the-counseling-center-for-women",
  "/en/happy-passover-2021", "/en/hiring", "/en/home", "/en/in-review-2025",
  "/en/international-womens-day", "/en/invitation-to-counseling-center-for-women-webinar", "/en/jerusalem-branch", "/en/july-2020-newsletter",
  "/en/legacy", "/en/march-2020-ccw-in-corona-times", "/en/mid-year-snapshot-2026", "/en/news",
  "/en/newsletter-03-2023", "/en/newsletter-december-2021", "/en/newsletter-december-2023", "/en/newsletter-july-2024",
  "/en/newsletter-june-2023", "/en/newsletter-march-2024", "/en/newsletter-may-2021", "/en/newsletter-october-2023",
  "/en/non-profit-documents", "/en/october-2021-newsletter", "/en/our-clients-write", "/en/our-story",
  "/en/pesach-2020", "/en/press-and-media", "/en/privacy-policy", "/en/professional-articles",
  "/en/questions-and-answers", "/en/ramat-gan-branch", "/en/remembrance", "/en/staff",
  "/en/supporting-women-in-the-midst-of-it-all", "/en/this-passover-we-yearn-for-liberation", "/en/training-center-for-professionals", "/en/treatment-center",
  "/en/what-is-feminist-therapy", "/legacy-donation-program", "/newsletter-december-2023", "/אודות",
  "/בפסח-הזה-אנו-לא-רק-זוכרות-את-העבר-שלנו", "/ברכה-לפסח-2021", "/גם-בעין-הסערה-ממשיכות-לתמוך-בנשים", "/דרושות",
  "/הבית", "/החלה-ההרשמה-לקבוצת-הצמיחה-2022-2023", "/הסיפור-שלנו", "/ועדת-ביקורת",
  "/יום-האישה-הבינלאומי-2026", "/לזכרן", "/לתרומות", "/מאמרים",
  "/מאמרים-2", "/מדיניות-פרטיות", "/מהו-טיפול-פמיניסטי", "/מטופלות-כותבות",
  "/מסמכי-עמותה", "/מרכז-ההעשרה", "/מרכז-הכשרה", "/מרכז-העשרה",
  "/מרכז-טיפולי", "/נויזלטר-דצמבר-2021", "/ניוזלטר-אוגוסט-2024", "/ניוזלטר-אוקטור-2021",
  "/ניוזלטר-דצמבר-2019", "/ניוזלטר-דצמבר-2021", "/ניוזלטר-יולי-2020", "/ניוזלטר-יוני-2023",
  "/ניוזלטר-מרץ-2023", "/ניוזלטר-קורונה-מרץ-2020", "/סוף-2020-ומבט-מחדר-טיפול", "/סניף-ירושלים",
  "/סניף-רמת-גן", "/עדכון-אמצע-שנה-2026", "/עדכון-סוף-שנה-2025", "/פברואר-2023",
  "/פסח-2020", "/פעילות", "/צוות", "/צוות-מנהלה",
  "/צוות-ניהולי", "/צור-קשר", "/שאלות-ותשובות",
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
    let normPath = '';
    try {
      normPath = decodeURIComponent(p).replace(/\/+$/, '') || '/';
    } catch { normPath = ''; }
    const path = ALLOWED_PATHS.has(normPath) ? normPath : '';
    const okEvent = ALLOWED_EVENTS.has(e);
    const okLang = l === 'he' || l === 'en';
    if (okEvent && okLang) {
      try {
        env.CCW_CLICKS.writeDataPoint({ blobs: [e, path, d, l], doubles: [1], indexes: [e] });
      } catch (err) { /* counting must never fail the request */ }
    }
    return new Response(null, { status: 204, headers: cors });
  },
};
