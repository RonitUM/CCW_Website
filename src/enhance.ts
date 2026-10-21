// Working search and working contact forms, added on top of the static page markup.
// Forms post to the address in VITE_FORM_ENDPOINT. When it is not set, the form says it is not connected
// and sends nothing. The receiving inbox is chosen on the server, never in the browser.

type Lang = 'he' | 'en';

const T = {
  he: {
    searchPh: 'חיפוש באתר', searchBtn: 'חיפוש', close: 'סגירה', none: 'לא נמצאו תוצאות', hint: 'יש להקליד לפחות 2 תווים',
    name: 'שם', phone: 'טלפון', email: 'אימייל', branch: 'הפניה לסניף', pick: 'יש לבחור את הסניף הרצוי מהרשימה',
    rg: 'סניף רמת גן והמרכז', jlm: 'סניף ירושלים והסביבה', ph: 'פרדס חנה', kt: 'קריית טבעון', md: 'מודיעין', send: 'שליחה', sending: 'שולח...',
    req: 'יש למלא את השדה', needOne: 'יש למלא טלפון או אימייל', needPhone: 'יש למלא מספר טלפון', badEmail: 'כתובת אימייל לא תקינה', badPhone: 'מספר טלפון לא תקין', consent: 'יש לאשר את מדיניות הפרטיות',
    ok: 'תודה, ההודעה נשלחה. נחזור אליך בהקדם.', fail: 'השליחה נכשלה. אפשר לנסות שוב או ליצור קשר בטלפון.',
    off: 'הטופס עדיין לא מחובר לשליחה, ולכן לא נשלח דבר. אפשר ליצור קשר בטלפון או במייל המופיעים בעמוד.',
    popTitle: 'מעוניינת בטיפול?', popSub: 'השאירי שם וטלפון, ונחזור אלייך לתיאום שיחת היכרות.', popLater: 'לא עכשיו', popClose: 'סגירת החלונית', popConsent: 'אני מאשרת את <a href="#/privacy" data-go="privacy">מדיניות הפרטיות של מרכז יעוץ לאישה</a>',
    a11yBtn: 'כלי נגישות', a11yBig: 'הגדל טקסט', a11ySmall: 'הקטן טקסט', a11yGray: 'גווני אפור', a11yHc: 'ניגודיות גבוהה', a11yLinks: 'הדגשת קישורים', a11yFont: 'פונט קריא', a11yReset: 'איפוס', a11yClose: 'סגירה',
  },
  en: {
    searchPh: 'Search the site', searchBtn: 'Search', close: 'Close', none: 'No results found', hint: 'Type at least 2 characters',
    name: 'Name', phone: 'Phone', email: 'Email', branch: 'Referral to branch', pick: 'Please select the desired branch from the list',
    rg: 'Ramat Gan and the Area', jlm: 'Jerusalem and the Area', ph: 'Pardes Hanna, Hadera and the Area', kt: 'Kiryat Tivon', md: 'Modiin and the Area', send: 'Send', sending: 'Sending...',
    req: 'Please fill in this field', needOne: 'Please enter a phone number or an email', needPhone: 'Please enter a phone number', badEmail: 'Invalid email address', badPhone: 'Invalid phone number', consent: 'Please accept the privacy policy',
    ok: 'Thank you, your message was sent. We will get back to you shortly.', fail: 'Sending failed. Please try again or contact us by phone.',
    off: 'This form is not connected to sending yet, so nothing was sent. Please use the phone or email shown on the page.',
    popTitle: 'Interested in therapy?', popSub: 'Leave your name and phone number and we will call you back to schedule an introductory call.', popLater: 'Not now', popClose: 'Close popup', popConsent: 'I agree to the <a href="#/privacy" data-go="privacy">Counseling Center for Women Privacy Policy</a>',
    a11yBtn: 'Accessibility Tools', a11yBig: 'Increase Text', a11ySmall: 'Decrease Text', a11yGray: 'Grayscale', a11yHc: 'High Contrast', a11yLinks: 'Highlight Links', a11yFont: 'Readable Font', a11yReset: 'Reset', a11yClose: 'Close',
  },
} as const;

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
const norm = (s: string) => s.toLowerCase().replace(/[\u0591-\u05C7]/g, '').replace(/\s+/g, ' ').trim();

export function enhance(root: HTMLElement, lang: Lang): () => void {
  const t = T[lang];
  const cleanups: Array<() => void> = [];

  // ---------- Search ----------
  const pages = Array.from(root.querySelectorAll('.page[id^="pg-"]')) as HTMLElement[];
  const index = pages.map((p) => {
    const h1 = p.querySelector('h1');
    const title = ((h1 && h1.textContent) || '').trim();
    const html = p.innerHTML.replace(/<svg[\s\S]*?<\/svg>/g, ' ').replace(/<div class="crumbs">[\s\S]*?<\/div>/, ' ').replace(/<(script|style)[\s\S]*?<\/\1>/g, ' ').replace(/<[^>]+>/g, ' ');
    const ta = document.createElement('textarea'); ta.innerHTML = html;
    const text = ta.value.replace(/\s+/g, ' ').trim();
    return { id: p.id.slice(3), title, text, ntitle: norm(title), ntext: norm(text) };
  }).filter((e) => e.id !== 'home' || e.text.length > 0);

  const ov = document.createElement('div');
  ov.className = 'srch-ov';
  ov.hidden = true;
  ov.innerHTML =
    '<div class="srch-box" role="dialog" aria-modal="true" aria-label="' + esc(t.searchBtn) + '">' +
    '<div class="srch-bar"><input class="srch-in" type="search" autocomplete="off" placeholder="' + esc(t.searchPh) + '" aria-label="' + esc(t.searchPh) + '">' +
    '<button type="button" class="srch-x" aria-label="' + esc(t.close) + '">\u2715</button></div>' +
    '<div class="srch-res" aria-live="polite"></div></div>';
  root.appendChild(ov);
  const input = ov.querySelector('.srch-in') as HTMLInputElement;
  const res = ov.querySelector('.srch-res') as HTMLElement;
  const closeS = () => { ov.hidden = true; input.value = ''; res.innerHTML = ''; };
  const openS = () => { ov.hidden = false; input.focus(); res.innerHTML = '<p class="srch-hint">' + esc(t.hint) + '</p>'; };

  const run = () => {
    const q = norm(input.value);
    if (q.length < 2) { res.innerHTML = '<p class="srch-hint">' + esc(t.hint) + '</p>'; return; }
    const words = q.split(' ').filter(Boolean);
    const hits = index.map((e) => {
      let score = 0;
      for (const w of words) {
        if (e.ntitle.includes(w)) score += 10;
        const m = e.ntext.indexOf(w);
        if (m >= 0) score += 1; else { score = -1; break; }
      }
      return { e, score };
    }).filter((h) => h.score > 0).sort((a, b) => b.score - a.score).slice(0, 20);
    if (!hits.length) { res.innerHTML = '<p class="srch-hint">' + esc(t.none) + '</p>'; return; }
    res.innerHTML = hits.map(({ e }) => {
      const i = e.ntext.indexOf(words[0]);
      const at = i >= 0 ? Math.max(0, i - 50) : 0;
      const snip = e.text.slice(at, at + 140);
      return '<a class="srch-hit" href="#/' + e.id + '" data-go="' + e.id + '"><b>' + esc(e.title || e.id) + '</b><span>' + esc(snip) + '</span></a>';
    }).join('');
  };
  input.addEventListener('input', run);
  const onOvClick = (e: MouseEvent) => {
    const el = e.target as HTMLElement;
    if (el === ov || el.closest('.srch-x') || el.closest('.srch-hit')) closeS();
  };
  ov.addEventListener('click', onOvClick);
  const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !ov.hidden) closeS(); };
  document.addEventListener('keydown', onKey);
  const icon = root.querySelector('header .tools > svg') as SVGElement | null;
  if (icon) {
    icon.setAttribute('role', 'button'); icon.setAttribute('tabindex', '0'); icon.setAttribute('aria-label', t.searchBtn);
    (icon as unknown as HTMLElement).style.cursor = 'pointer';
    const go = () => openS();
    const kd = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openS(); } };
    icon.addEventListener('click', go); icon.addEventListener('keydown', kd as EventListener);
    cleanups.push(() => { icon.removeEventListener('click', go); icon.removeEventListener('keydown', kd as EventListener); });
  }
  const burger = root.querySelector('header .burger');
  if (burger) {
    const mb = document.createElement('button');
    mb.type = 'button'; mb.className = 'srch-m'; mb.setAttribute('aria-label', t.searchBtn);
    mb.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';
    mb.addEventListener('click', openS);
    burger.parentElement!.insertBefore(mb, burger);
    cleanups.push(() => { mb.removeEventListener('click', openS); mb.remove(); });
  }
  cleanups.push(() => { document.removeEventListener('keydown', onKey); ov.remove(); });


  // ---------- Legacy video (click to load, privacy-enhanced domain, no third-party request before play) ----------
  Array.from(root.querySelectorAll('.vfac')).forEach((b) => {
    const btn = b as HTMLButtonElement;
    const go = () => {
      const id = btn.getAttribute('data-yt') || '', st = Number(btn.getAttribute('data-start') || 0);
      const f = document.createElement('iframe');
      f.src = 'https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0' + (st ? '&start=' + st : '');
      f.title = btn.getAttribute('aria-label') || 'Video';
      f.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      f.setAttribute('allowfullscreen', '');
      f.referrerPolicy = 'strict-origin-when-cross-origin';
      btn.replaceWith(f);
      f.focus();
    };
    btn.addEventListener('click', go);
  });



  // ---------- Safari hero clip: WebKit ignores clip-path:url(#ref) on HTML elements; compute an equivalent px path() ----------
  const HERO_CLIP_OBB = 'M0,0 L0.9976,0 L0.9976,0.0035 L0.9976,0.0071 L0.9976,0.0106 L0.9976,0.0141 L0.9976,0.0177 L0.9976,0.0212 L0.9976,0.0247 L0.9976,0.0282 L0.9976,0.0318 L0.9976,0.0353 L0.9976,0.0388 L0.9975,0.0424 L0.9973,0.0459 L0.9970,0.0494 L0.9967,0.0530 L0.9963,0.0565 L0.9958,0.0600 L0.9952,0.0635 L0.9945,0.0671 L0.9938,0.0706 L0.9929,0.0741 L0.9921,0.0777 L0.9911,0.0812 L0.9902,0.0847 L0.9891,0.0883 L0.9879,0.0918 L0.9868,0.0953 L0.9856,0.0989 L0.9846,0.1024 L0.9835,0.1059 L0.9824,0.1094 L0.9813,0.1130 L0.9803,0.1165 L0.9792,0.1200 L0.9782,0.1236 L0.9772,0.1271 L0.9762,0.1306 L0.9752,0.1342 L0.9742,0.1377 L0.9732,0.1412 L0.9723,0.1447 L0.9714,0.1483 L0.9705,0.1518 L0.9697,0.1553 L0.9688,0.1589 L0.9680,0.1624 L0.9673,0.1659 L0.9665,0.1695 L0.9658,0.1730 L0.9651,0.1765 L0.9644,0.1801 L0.9638,0.1836 L0.9631,0.1871 L0.9625,0.1906 L0.9620,0.1942 L0.9614,0.1977 L0.9609,0.2012 L0.9604,0.2048 L0.9599,0.2083 L0.9595,0.2118 L0.9590,0.2154 L0.9586,0.2189 L0.9583,0.2224 L0.9579,0.2259 L0.9576,0.2295 L0.9573,0.2330 L0.9570,0.2365 L0.9567,0.2401 L0.9565,0.2436 L0.9563,0.2471 L0.9563,0.2507 L0.9562,0.2542 L0.9561,0.2577 L0.9561,0.2613 L0.9561,0.2648 L0.9561,0.2683 L0.9562,0.2718 L0.9563,0.2754 L0.9564,0.2789 L0.9567,0.2824 L0.9569,0.2860 L0.9571,0.2895 L0.9574,0.2930 L0.9577,0.2966 L0.9580,0.3001 L0.9583,0.3036 L0.9586,0.3071 L0.9590,0.3107 L0.9594,0.3142 L0.9598,0.3177 L0.9603,0.3213 L0.9607,0.3248 L0.9611,0.3283 L0.9616,0.3319 L0.9621,0.3354 L0.9625,0.3389 L0.9630,0.3425 L0.9635,0.3460 L0.9640,0.3495 L0.9646,0.3530 L0.9651,0.3566 L0.9657,0.3601 L0.9661,0.3636 L0.9667,0.3672 L0.9672,0.3707 L0.9676,0.3742 L0.9682,0.3778 L0.9686,0.3813 L0.9692,0.3848 L0.9696,0.3883 L0.9701,0.3919 L0.9705,0.3954 L0.9709,0.3989 L0.9714,0.4025 L0.9718,0.4060 L0.9721,0.4095 L0.9725,0.4131 L0.9728,0.4166 L0.9731,0.4201 L0.9734,0.4237 L0.9737,0.4272 L0.9739,0.4307 L0.9740,0.4342 L0.9741,0.4378 L0.9742,0.4413 L0.9743,0.4448 L0.9743,0.4484 L0.9742,0.4519 L0.9740,0.4554 L0.9738,0.4590 L0.9736,0.4625 L0.9733,0.4660 L0.9730,0.4695 L0.9726,0.4731 L0.9722,0.4766 L0.9716,0.4801 L0.9711,0.4837 L0.9706,0.4872 L0.9701,0.4907 L0.9695,0.4943 L0.9689,0.4978 L0.9681,0.5013 L0.9675,0.5049 L0.9667,0.5084 L0.9660,0.5119 L0.9653,0.5154 L0.9645,0.5190 L0.9637,0.5225 L0.9628,0.5260 L0.9619,0.5296 L0.9610,0.5331 L0.9601,0.5366 L0.9592,0.5402 L0.9582,0.5437 L0.9571,0.5472 L0.9561,0.5508 L0.9551,0.5543 L0.9540,0.5578 L0.9530,0.5613 L0.9519,0.5649 L0.9508,0.5684 L0.9495,0.5719 L0.9483,0.5755 L0.9471,0.5790 L0.9459,0.5825 L0.9447,0.5861 L0.9435,0.5896 L0.9423,0.5931 L0.9410,0.5966 L0.9397,0.6002 L0.9384,0.6037 L0.9370,0.6072 L0.9356,0.6108 L0.9342,0.6143 L0.9328,0.6178 L0.9314,0.6214 L0.9299,0.6249 L0.9284,0.6284 L0.9268,0.6320 L0.9253,0.6355 L0.9236,0.6390 L0.9219,0.6425 L0.9204,0.6461 L0.9188,0.6496 L0.9170,0.6531 L0.9153,0.6567 L0.9136,0.6602 L0.9118,0.6637 L0.9099,0.6673 L0.9080,0.6708 L0.9061,0.6743 L0.9041,0.6778 L0.9022,0.6814 L0.9002,0.6849 L0.8983,0.6884 L0.8963,0.6920 L0.8942,0.6955 L0.8920,0.6990 L0.8898,0.7026 L0.8876,0.7061 L0.8854,0.7096 L0.8831,0.7132 L0.8808,0.7167 L0.8785,0.7202 L0.8762,0.7237 L0.8739,0.7273 L0.8806,0.7308 L0.8782,0.7343 L0.8757,0.7379 L0.8732,0.7414 L0.8706,0.7449 L0.8722,0.7485 L0.8696,0.7520 L0.8669,0.7555 L0.8642,0.7590 L0.8615,0.7626 L0.8595,0.7661 L0.8575,0.7696 L0.8548,0.7732 L0.8519,0.7767 L0.8565,0.7802 L0.8467,0.7838 L0.8441,0.7873 L0.8492,0.7908 L0.8511,0.7944 L0.8480,0.7979 L0.8407,0.8014 L0.8375,0.8049 L0.8343,0.8085 L0.8311,0.8120 L0.8277,0.8155 L0.8244,0.8191 L0.8196,0.8226 L0.8160,0.8261 L0.8236,0.8297 L0.8242,0.8332 L0.8254,0.8367 L0.8196,0.8402 L0.8093,0.8438 L0.7985,0.8473 L0.8019,0.8508 L0.7981,0.8544 L0.8056,0.8579 L0.8046,0.8614 L0.8005,0.8650 L0.7962,0.8685 L0.7919,0.8720 L0.7875,0.8756 L0.7830,0.8791 L0.7696,0.8826 L0.7553,0.8861 L0.7439,0.8897 L0.7359,0.8932 L0.7305,0.8967 L0.7249,0.9003 L0.7135,0.9038 L0.7058,0.9073 L0.6926,0.9109 L0.6630,0.9144 L0.6337,0.9179 L0.6042,0.9214 L0.5747,0.9250 L0.5450,0.9285 L0.5153,0.9320 L0.4856,0.9356 L0.4559,0.9391 L0.4264,0.9426 L0.3970,0.9462 L0.3678,0.9497 L0.3388,0.9532 L0.3101,0.9568 L0.2818,0.9603 L0.2518,0.9638 L0.2347,0.9673 L0.2295,0.9709 L0.2256,0.9744 L0.2229,0.9779 L0.2204,0.9815 L0.2179,0.9850 L0.2156,0.9885 L0.2132,0.9921 L0.2109,0.9956 L0.2086,0.9991 L0.2086,1 L0,1 Z'; // exact sweep extracted from hero.jpg (Shai's big wave, image-true)
  const HERO_CLIP_MOBILE = 'M0,0 H1 V0.62 C0.75,0.85 0.45,1 0,1 Z'; // portrait hero: bottom edge wave, cream + leaf branch below
  const obbToPx = (d: string, w: number, h: number): string => {
    const t = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) || [];
    let out = '', i = 0, cx = 0, cy = 0;
    const num = () => parseFloat(t[i++]);
    while (i < t.length) {
      const c = t[i++];
      if (c === 'M' || c === 'L') { const x = num() * w, y = num() * h; out += `${c}${x.toFixed(1)},${y.toFixed(1)} `; cx = x; cy = y; }
      else if (c === 'H') { const x = num() * w; out += `L${x.toFixed(1)},${cy.toFixed(1)} `; cx = x; }
      else if (c === 'V') { const y = num() * h; out += `L${cx.toFixed(1)},${y.toFixed(1)} `; cy = y; }
      else if (c === 'C') { const pp: number[] = []; for (let k = 0; k < 6; k += 2) { pp.push(num() * w, num() * h); } out += `C${pp.map((n) => n.toFixed(1)).join(',')} `; cx = pp[4]; cy = pp[5]; }
      else if (c === 'Z' || c === 'z') { out += 'Z'; }
    }
    return out.trim();
  };
  const fixHeroClip = (v: HTMLVideoElement) => {
    if (!/url\(\s*["']?#heroclip/.test(v.style.clipPath || '')) { return; }
    let shown = false;
    const apply = () => {
      if (window.innerWidth <= 1100) {
        const r = v.getBoundingClientRect();
        if (r.width < 2 || r.height < 2) { return; }
        v.style.clipPath = `path("${obbToPx(HERO_CLIP_MOBILE, r.width, r.height)}")`;
        if (!shown) { shown = true; v.style.visibility = ''; }
        return;
      }
      const r = v.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) { return; }
      v.style.clipPath = `path("${obbToPx(HERO_CLIP_OBB, r.width, r.height)}")`;
      if (!shown) { shown = true; v.style.visibility = ''; }
    };
    // Hide until the first settled-layout measurement, so no wrong-shape frame can paint (Safari flicker).
    v.style.visibility = 'hidden';
    apply();
    requestAnimationFrame(() => requestAnimationFrame(apply));
    window.addEventListener('load', apply);
    if (document.fonts && document.fonts.ready) { document.fonts.ready.then(apply).catch(() => {}); }
    window.addEventListener('resize', apply);
    if (typeof ResizeObserver !== 'undefined') { new ResizeObserver(apply).observe(v); }
  };

  // ---------- Feature line animation: pause control, respects reduced motion ----------
  Array.from(root.querySelectorAll('.feature .ph, .hero')).forEach((sec) => {
    const v = sec.querySelector('video') as HTMLVideoElement | null, b = sec.querySelector('.mpb') as HTMLButtonElement | null;
    if (!v || !b) return;
    const sync = () => { const paused = v.paused; b.classList.toggle('is-paused', paused); b.setAttribute('aria-label', b.getAttribute(paused ? 'data-play' : 'data-pause') || ''); };
    fixHeroClip(v);
    // Safari autoplay needs the muted ATTRIBUTE present; property alone is not enough.
    v.setAttribute('muted', ''); v.defaultMuted = true; v.muted = true;
    v.setAttribute('playsinline', ''); v.setAttribute('webkit-playsinline', '');
    // iOS Safari can freeze after the 2nd native loop on some encodes (paused stays false, no
    // 'ended' fires), so loop is owned by JS: 'ended' restarts below, revive() unsticks freezes.
    v.removeAttribute('loop'); v.loop = false;
    const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let userPaused = false;
    const tryPlay = () => {
      if (reduceMotion || userPaused || !v.paused || !(v.currentSrc || v.src) || v.offsetParent === null) return;
      if (document.visibilityState && document.visibilityState !== 'visible') return;
      const pr = v.play(); if (pr && typeof pr.catch === 'function') { pr.catch(() => {}); }
    };
    if (reduceMotion) { v.removeAttribute('autoplay'); v.pause(); }
    else { tryPlay(); }
    b.addEventListener('click', () => { if (v.paused) { userPaused = false; v.removeAttribute('data-up'); tryPlay(); } else { userPaused = true; v.setAttribute('data-up', '1'); v.pause(); } });
    // Safari can drop loop on blob/short sources: restart on ended as a fallback.
    v.addEventListener('ended', () => { if (userPaused) return; try { v.currentTime = 0; } catch (e) { /* ignore */ } const pr = v.play(); if (pr && typeof pr.catch === 'function') { pr.catch(() => {}); } });
    v.addEventListener('canplay', tryPlay);
    v.addEventListener('loadeddata', tryPlay);
    document.addEventListener('visibilitychange', tryPlay);
    window.addEventListener('pageshow', tryPlay);
    // Watchdog: catches Safari self-pausing mid-loop and frozen playback; hard-restarts at the end.
    let lastCT = -1, still = 0;
    const revive = () => {
      if (reduceMotion || userPaused || (!v.src && !v.currentSrc) || v.offsetParent === null) return;
      if (document.visibilityState && document.visibilityState !== 'visible') return;
      const dur = v.duration || 0;
      if (!v.paused && v.currentTime !== lastCT) { still = 0; lastCT = v.currentTime; return; }
      still += 1;
      if (v.ended || (dur > 0 && dur - v.currentTime < 0.4)) { try { v.currentTime = 0; } catch (e) { /* ignore */ } }
      if (!v.paused && still >= 2) { try { v.currentTime = 0; } catch (e) { /* ignore */ } } // frozen-not-paused (iOS loop freeze): hard restart
      if (v.paused || still >= 2) { const pr = v.play(); if (pr && typeof pr.catch === 'function') { pr.catch(() => {}); } }
      lastCT = v.currentTime;
    };
    window.setInterval(revive, 1000);
    v.addEventListener('play', sync); v.addEventListener('pause', sync); sync();
  });

  // ---------- Flyers: tap to enlarge (the capped thumbnails are small by design; open the full image on tap) ----------
  let imgov: HTMLElement | null = null;
  const closeImgov = () => { if (imgov) { imgov.remove(); imgov = null; } };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeImgov(); });
  Array.from(root.querySelectorAll('.flyers .fig')).forEach((fig) => {
    const el = fig as HTMLElement;
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', lang === 'en' ? 'Enlarge image' : 'הגדלת התמונה');
    const open = () => {
      const m = /url\(["']?([^"')]+)["']?\)/.exec(el.style.backgroundImage || getComputedStyle(el).backgroundImage || '');
      if (!m) return;
      closeImgov();
      imgov = document.createElement('div');
      imgov.className = 'imgov';
      imgov.innerHTML = '<div class="imgov-box"><button type="button" class="imgov-x" aria-label="' + T[lang].close + '">✕</button><img class="imgov-img" src="' + m[1] + '" alt="" /></div>';
      imgov.addEventListener('click', (e) => { if (e.target === imgov) closeImgov(); });
      const x = imgov.querySelector('.imgov-x'); if (x) x.addEventListener('click', closeImgov);
      document.body.appendChild(imgov);
    };
    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => { const k = (e as KeyboardEvent).key; if (k === 'Enter' || k === ' ') { e.preventDefault(); open(); } });
  });

  // ---------- Home: social posts slideshow (auto-advance, pausable, respects reduced motion) ----------
  Array.from(root.querySelectorAll('.mps')).forEach((sec) => {
    const track = sec.querySelector('.mps-t') as HTMLElement | null;
    const pp = sec.querySelector('.mps-pp') as HTMLButtonElement | null;
    const prev = sec.querySelector('.mps-prev') as HTMLButtonElement | null;
    const next = sec.querySelector('.mps-next') as HTMLButtonElement | null;
    if (!track || !pp || !prev || !next) return;
    const rtl = () => getComputedStyle(track).direction === 'rtl';
    const slides = () => Array.from(track.children) as HTMLElement[];
    const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    let playing = !reduceMotion, hover = false, timer = 0;
    const idx = () => { const tr = track.getBoundingClientRect(); const s = slides(); let best = 0, bd = 1e9; s.forEach((el, i) => { const r = el.getBoundingClientRect(); const d = Math.abs(rtl() ? tr.right - r.right : r.left - tr.left); if (d < bd) { bd = d; best = i; } }); return best; };
    const go = (i: number) => { const s = slides(); const n = ((i % s.length) + s.length) % s.length; const el = s[n]; const tr = track.getBoundingClientRect(); const r = el.getBoundingClientRect(); const delta = rtl() ? r.right - tr.right : r.left - tr.left; track.scrollTo({ left: track.scrollLeft + delta, behavior: reduceMotion ? 'auto' : 'smooth' }); };
    const atEnd = () => Math.abs(track.scrollLeft) + track.clientWidth >= track.scrollWidth - 4;
    const step = (d: number) => { if (d > 0 && atEnd()) { go(0); } else { go(idx() + d); } };
    const sync = () => { pp.classList.toggle('is-paused', !playing); pp.setAttribute('aria-label', pp.getAttribute(playing ? 'data-pause' : 'data-play') || ''); };
    const stop = () => { if (timer) { window.clearInterval(timer); timer = 0; } };
    const start = () => { stop(); if (playing && !hover && !reduceMotion) { timer = window.setInterval(() => { if (document.visibilityState === 'visible' && (track as HTMLElement).offsetParent !== null) step(1); }, 4500); } };
    pp.addEventListener('click', () => { playing = !playing; sync(); start(); });
    prev.addEventListener('click', () => { step(-1); });
    next.addEventListener('click', () => { step(1); });
    // Pause-on-hover/focus only where hover exists: on touch, a tap inside the section fires a
    // sticky mouseenter/focusin with no leave (iOS :hover sticks), which silently stopped rotation.
    const canHover = !!(window.matchMedia && window.matchMedia('(hover: hover)').matches);
    if (canHover) {
      sec.addEventListener('mouseenter', () => { hover = true; start(); });
      sec.addEventListener('mouseleave', () => { hover = false; start(); });
      sec.addEventListener('focusin', () => { hover = true; start(); });
      sec.addEventListener('focusout', () => { hover = false; start(); });
    }
    sync(); start();
  });

  // ---------- Forms ----------
  const endpoint = ((import.meta as any).env && (import.meta as any).env.VITE_FORM_ENDPOINT) || '';
  const buildForm = (box: HTMLElement, pageId: string, opts?: { hasMsg?: boolean; hasBranch?: boolean; fields?: Array<'name' | 'phone' | 'email'>; dryRun?: boolean }) => {
    const dryRun = !!(opts && opts.dryRun);
    const hasMsg = opts && opts.hasMsg !== undefined ? opts.hasMsg : !!box.querySelector('.f.full');
    const hasBranch = opts && opts.hasBranch !== undefined ? opts.hasBranch : (!hasMsg && box.querySelectorAll('.f').length >= 4);
    const olab = Array.from(box.querySelectorAll('.f label')).map((l) => (l.textContent || '').trim());
    const privacy = box.querySelector('.chk a') as HTMLAnchorElement | null;
    const privHtml = privacy ? privacy.outerHTML : '';
    const consentText = (box.querySelector('.chk span') as HTMLElement).innerHTML;
    void privHtml;
    const field = (id: string, label: string, type: string) =>
      '<div class="f"><label for="' + id + '">' + esc(label) + '</label><input id="' + id + '" name="' + id + '" type="' + type + '" autocomplete="' + (id.endsWith('name') ? 'name' : type === 'tel' ? 'tel' : type === 'email' ? 'email' : 'off') + '" maxlength="200"><small class="err" aria-live="polite"></small></div>';
    const uid = pageId + '-';
    box.innerHTML =
      '<form novalidate method="post" action="#" onsubmit="return false" class="frm-real"><div class="g">' +
      (hasMsg ? field(uid + 'name', olab[0] || t.name, 'text') + field(uid + 'email', olab[1] || t.email, 'email') + field(uid + 'phone', olab[2] || t.phone, 'tel') + '<div class="f full"><label for="' + uid + 'message">' + esc(olab[3] || '') + '</label><textarea id="' + uid + 'message" name="message" rows="4" maxlength="2000"></textarea><small class="err" aria-live="polite"></small></div>' : (opts && opts.fields ? opts.fields : (['name', 'phone', 'email'] as Array<'name' | 'phone' | 'email'>)).map((fn) => field(uid + fn, fn === 'name' ? t.name : fn === 'phone' ? t.phone : t.email, fn === 'email' ? 'email' : fn === 'phone' ? 'tel' : 'text')).join('')) +
      (hasBranch ? '<div class="f"><label for="' + uid + 'branch">' + esc(t.branch) + '</label><select id="' + uid + 'branch" name="branch"><option value="">' + esc(t.pick) + '</option><option value="rg">' + esc(t.rg) + '</option><option value="jlm">' + esc(t.jlm) + '</option><option value="ph">' + esc(t.ph) + '</option><option value="kt">' + esc(t.kt) + '</option><option value="md">' + esc(t.md) + '</option></select><small class="err" aria-live="polite"></small></div>' : '') +
      '</div><div class="hp" aria-hidden="true"><label>Website<input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<div class="chk"><input type="checkbox" id="' + uid + 'consent" name="consent"><label for="' + uid + 'consent">' + consentText + '</label></div><small class="err cerr" aria-live="polite"></small>' +
      '<button type="submit" class="sbm">' + esc(t.send) + '</button><p class="frm-msg" role="status" aria-live="polite"></p></form>';
    const form = box.querySelector('form') as HTMLFormElement;
    const msg = form.querySelector('.frm-msg') as HTMLElement;
    const setErr = (el: Element | null, m: string) => { const s = el && (el.closest('.f') || el.parentElement)?.querySelector('.err'); if (s) s.textContent = m; };
    const submit = async (ev: Event) => {
      ev.preventDefault();
      const g = (n: string) => ((form.elements.namedItem(n) as HTMLInputElement | null)?.value || '').trim();
      const nm = form.elements.namedItem(uid + 'name') as HTMLInputElement, ph = form.elements.namedItem(uid + 'phone') as HTMLInputElement | null, em = form.elements.namedItem(uid + 'email') as HTMLInputElement | null;
      const br = form.elements.namedItem('branch') as HTMLSelectElement | null, cs = form.elements.namedItem('consent') as HTMLInputElement;
      let ok = true;
      form.querySelectorAll('.err').forEach((s) => (s.textContent = ''));
      if (!nm.value.trim()) { setErr(nm, t.req); ok = false; }
      const digits = ph ? ph.value.replace(/\D/g, '') : '';
      if (ph && !ph.value.trim() && (!em || !em.value.trim())) { setErr(ph, em ? t.needOne : t.needPhone); ok = false; }
      if (ph && ph.value.trim() && (digits.length < 7 || digits.length > 15)) { setErr(ph, t.badPhone); ok = false; }
      if (em && em.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim())) { setErr(em, t.badEmail); ok = false; }
      if (br && !br.value) { setErr(br, t.req); ok = false; }
      if (!cs.checked) { (form.querySelector('.cerr') as HTMLElement).textContent = t.consent; ok = false; }
      msg.textContent = ''; msg.className = 'frm-msg';
      if (!ok) return;
      if (g('website')) { msg.textContent = t.ok; msg.classList.add('ok'); form.reset(); return; } // spam trap: pretend success, send nothing
      if (!endpoint || dryRun) { msg.textContent = t.off; msg.classList.add('warn'); return; }
      const btn = form.querySelector('.sbm') as HTMLButtonElement; btn.disabled = true; btn.textContent = t.sending;
      try {
        const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ form: pageId, name: nm.value.trim(), phone: ph ? ph.value.trim() : '', email: em ? em.value.trim() : '', branch: br ? br.value : '', message: g('message'), lang, consent: true, page: location.href }) });
        if (!r.ok) throw new Error(String(r.status));
        msg.textContent = t.ok; msg.classList.add('ok'); form.reset();
      } catch (e) { msg.textContent = t.fail; msg.classList.add('bad'); }
      btn.disabled = false; btn.textContent = t.send;
    };
    form.addEventListener('submit', submit);
    cleanups.push(() => form.removeEventListener('submit', submit));
  };
  const frms = Array.from(root.querySelectorAll('.page .frm')) as HTMLElement[];
  frms.forEach((box) => buildForm(box, (box.closest('.page') as HTMLElement).id.slice(3)));

  // ---------- Entry popup ----------
  // Inactive by default. Live mode requires BOTH an explicit opt-in (VITE_ENTRY_POPUP=1) and a
  // connected endpoint (VITE_FORM_ENDPOINT): setting the endpoint alone never activates the popup,
  // and the flag alone never shows visitors a form that cannot send. ?popup=1 (or
  // VITE_ENTRY_POPUP=preview) forces an isolated preview that renders the UI but never sends
  // anything, even on a build where live mode is configured.
  // Shown once per browser; any dismissal or a successful send is remembered in localStorage.
  const popFlag = ((import.meta as any).env && (import.meta as any).env.VITE_ENTRY_POPUP) || '';
  const popPreview = popFlag === 'preview' || /[?&]popup=1/.test(location.search);
  const popLive = popFlag === '1' && !!endpoint && !popPreview;
  const popupOn = popLive || popPreview;
  const POPKEY = 'ccwEntryPopupDone';
  const onHome = location.hash.indexOf('#/') !== 0 || location.hash === '#/' || location.hash.slice(2) === 'home';
  let popSeen = false;
  try { popSeen = !!localStorage.getItem(POPKEY); } catch (e) { /* ignore */ }
  if (popupOn && !popSeen && onHome) {
    const pov = document.createElement('div');
    pov.className = 'pop-ov';
    pov.hidden = true;
    pov.innerHTML =
      '<div class="pop-box" role="dialog" aria-modal="true" aria-labelledby="pop-t">' +
      '<button type="button" class="pop-x" aria-label="' + esc(t.popClose) + '">\u2715</button>' +
      '<h2 id="pop-t">' + esc(t.popTitle) + '</h2><p class="pop-sub">' + esc(t.popSub) + '</p>' +
      '<div class="frm pop-frm"><div class="g">' +
      '<div class="f"><label>' + esc(t.name) + '</label><div class="inp"></div></div>' +
      '<div class="f"><label>' + esc(t.phone) + '</label><div class="inp"></div></div>' +
      '<div class="f"><label>' + esc(t.branch) + '</label><div class="inp"></div></div>' +
      '</div><div class="chk"><i></i><span>' + t.popConsent + '</span></div><span class="sbm">' + esc(t.send) + '</span></div>' +
      '<button type="button" class="pop-later">' + esc(t.popLater) + '</button></div>';
    root.appendChild(pov);
    buildForm(pov.querySelector('.pop-frm') as HTMLElement, 'popup', { hasMsg: false, hasBranch: true, fields: ['name', 'phone'], dryRun: !popLive });
    const closeP = () => {
      pov.hidden = true;
      try { localStorage.setItem(POPKEY, '1'); } catch (e) { /* ignore */ }
    };
    window.setTimeout(() => {
      if (!pov.hidden) return;
      pov.hidden = false;
      const first = pov.querySelector('input') as HTMLInputElement | null;
      if (first) first.focus();
    }, 1200);
    (pov.querySelector('.pop-x') as HTMLButtonElement).addEventListener('click', closeP);
    (pov.querySelector('.pop-later') as HTMLButtonElement).addEventListener('click', closeP);
    pov.addEventListener('click', (e) => {
      if (e.target === pov) { closeP(); return; }
      const a = (e.target as HTMLElement).closest('a[data-go]');
      if (a) closeP();
    });
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !pov.hidden) closeP(); };
    document.addEventListener('keydown', onKey);
    const moP = new MutationObserver(() => {
      const m = pov.querySelector('.frm-msg');
      if (m && m.classList.contains('ok')) window.setTimeout(closeP, 1600);
    });
    moP.observe(pov, { attributes: true, subtree: true, attributeFilter: ['class'] });
    cleanups.push(() => { document.removeEventListener('keydown', onKey); moP.disconnect(); pov.remove(); });
  }

  // ---------- Structure for assistive tech (skip link, heading levels, decorative icons, menu state) ----------
  root.querySelectorAll('svg').forEach((sv) => { if (!sv.hasAttribute('role') && !sv.hasAttribute('aria-label') && !sv.hasAttribute('aria-labelledby')) { sv.setAttribute('aria-hidden', 'true'); sv.setAttribute('focusable', 'false'); } });
  root.querySelectorAll('.page').forEach((pg) => {
    const stack: Array<[number, number]> = [];
    pg.querySelectorAll('h1,h2,h3,h4,h5,h6').forEach((h) => {
      const lvl = Number(h.tagName.charAt(1));
      while (stack.length && stack[stack.length - 1][0] >= lvl) stack.pop();
      const eff = stack.length ? stack[stack.length - 1][1] + 1 : 1;
      if (eff !== lvl) h.setAttribute('aria-level', String(eff));
      stack.push([lvl, eff]);
    });
  });
  const skip = document.createElement('a');
  skip.className = 'skip'; skip.href = '#'; skip.textContent = lang === 'en' ? 'Skip to content' : 'דלג לתוכן';
  const onSkip = (e: Event) => { e.preventDefault(); const m = root.querySelector('.page.on') as HTMLElement | null; if (m) { m.focus({ preventScroll: false }); } };
  skip.addEventListener('click', onSkip);
  root.insertBefore(skip, root.firstChild);
  const burgerBtn = root.querySelector('.burger') as HTMLElement | null;
  const hdrNav = root.querySelector('header nav') as HTMLElement | null;
  if (hdrNav && !hdrNav.id) hdrNav.id = 'mainnav';
  const syncMenu = () => { if (burgerBtn) { burgerBtn.setAttribute('aria-expanded', String(root.classList.contains('menu'))); if (hdrNav) burgerBtn.setAttribute('aria-controls', hdrNav.id); } };
  syncMenu();
  const mo = new MutationObserver(syncMenu);
  mo.observe(root, { attributes: true, attributeFilter: ['class'] });
  cleanups.push(() => { mo.disconnect(); skip.removeEventListener('click', onSkip); skip.remove(); });

  // ---------- Accessibility toolbar (in-house, no third party; persists in localStorage) ----------
  const AKEY = 'ccwA11y';
  const ASTEPS = [1, 1.15, 1.3];
  const readA = () => { try { const o = JSON.parse(localStorage.getItem(AKEY) || '{}'); return { fs: ASTEPS.indexOf(o.fs) >= 0 ? o.fs : 1, hc: !!o.hc, gray: !!o.gray, links: !!o.links, font: !!o.font }; } catch (e) { return { fs: 1, hc: false, gray: false, links: false, font: false }; } };
  let st = readA();
  const bar = document.createElement('div');
  bar.className = 'a11y';
  bar.innerHTML =
    '<button type="button" class="a11y-t" aria-expanded="false" aria-label="' + esc(t.a11yBtn) + '"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="5" r="2.2"/><path d="M4 9.5c2.7.8 5.3 1.2 8 1.2s5.3-.4 8-1.2"/><path d="M12 10.7V15l-2.6 6"/><path d="M12 15l2.6 6"/></svg></button>' +
    '<div class="a11y-p" role="group" aria-label="' + esc(t.a11yBtn) + '" hidden>' +
    '<b>' + esc(t.a11yBtn) + '</b>' +
    '<button type="button" data-a="big">' + esc(t.a11yBig) + '</button>' +
    '<button type="button" data-a="small">' + esc(t.a11ySmall) + '</button>' +
    '<button type="button" data-a="gray">' + esc(t.a11yGray) + '</button>' +
    '<button type="button" data-a="hc">' + esc(t.a11yHc) + '</button>' +
    '<button type="button" data-a="links">' + esc(t.a11yLinks) + '</button>' +
    '<button type="button" data-a="font">' + esc(t.a11yFont) + '</button>' +
    '<button type="button" data-a="reset" class="a11y-reset">' + esc(t.a11yReset) + '</button>' +
    '<button type="button" class="a11y-x" aria-label="' + esc(t.a11yClose) + '">✕</button></div>';
  root.appendChild(bar);
  const panel = bar.querySelector('.a11y-p') as HTMLElement;
  const tgl = bar.querySelector('.a11y-t') as HTMLButtonElement;
  const applyA = () => {
    (document.body.style as any).zoom = st.fs === 1 ? '' : String(st.fs);
    root.classList.toggle('a11y-zoom', st.fs > 1);
    root.classList.toggle('a11y-hc', st.hc);
    root.classList.toggle('a11y-gray', st.gray);
    root.classList.toggle('a11y-links', st.links);
    root.classList.toggle('a11y-font', st.font);
    panel.querySelectorAll('[data-a]').forEach((b) => { const k = b.getAttribute('data-a')!; b.classList.toggle('on', k === 'big' || k === 'small' ? st.fs > 1 : (st as any)[k] === true); });
    try { localStorage.setItem(AKEY, JSON.stringify(st)); } catch (e) { /* ignore */ }
  };
  const setPanel = (open: boolean) => { panel.hidden = !open; tgl.setAttribute('aria-expanded', String(open)); };
  const onTglA = () => setPanel(panel.hidden);
  tgl.addEventListener('click', onTglA);
  const closeBtn = panel.querySelector('.a11y-x') as HTMLButtonElement;
  const onCloseA = () => { setPanel(false); tgl.focus(); };
  closeBtn.addEventListener('click', onCloseA);
  const onPanelKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); onCloseA(); } };
  panel.addEventListener('keydown', onPanelKey);
  const moRoute = new MutationObserver(() => setPanel(false));
  root.querySelectorAll('.page').forEach((pg) => moRoute.observe(pg, { attributes: true, attributeFilter: ['class'] }));
  const onA = (e: Event) => {
    const k = (e.currentTarget as HTMLElement).getAttribute('data-a')!;
    const i = ASTEPS.indexOf(st.fs);
    if (k === 'reset') st = { fs: 1, hc: false, gray: false, links: false, font: false };
    else if (k === 'big') st.fs = ASTEPS[Math.min(i + 1, ASTEPS.length - 1)];
    else if (k === 'small') st.fs = ASTEPS[Math.max(i - 1, 0)];
    else (st as any)[k] = !(st as any)[k];
    applyA();
  };
  panel.querySelectorAll('[data-a]').forEach((b) => b.addEventListener('click', onA));
  applyA();
  cleanups.push(() => { tgl.removeEventListener('click', onTglA); closeBtn.removeEventListener('click', onCloseA); panel.removeEventListener('keydown', onPanelKey); moRoute.disconnect(); panel.querySelectorAll('[data-a]').forEach((b) => b.removeEventListener('click', onA)); (document.body.style as any).zoom = ''; bar.remove(); });

  return () => cleanups.forEach((f) => f());
}
