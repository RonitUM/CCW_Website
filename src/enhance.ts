// Working search and working contact forms, added on top of the static page markup.
// Forms post to the address in VITE_FORM_ENDPOINT. When it is not set, the form says it is not connected
// and sends nothing. The receiving inbox is chosen on the server, never in the browser.

type Lang = 'he' | 'en';

const T = {
  he: {
    searchPh: 'חיפוש באתר', searchBtn: 'חיפוש', close: 'סגירה', none: 'לא נמצאו תוצאות', hint: 'יש להקליד לפחות 2 תווים',
    name: 'שם', phone: 'טלפון', email: 'אימייל', branch: 'הפניה לסניף', pick: 'יש לבחור את הסניף הרצוי מהרשימה',
    rg: 'סניף רמת גן והמרכז', jlm: 'סניף ירושלים והסביבה', ph: 'פרדס חנה', kt: 'קריית טבעון', md: 'מודיעין', send: 'שליחה', sending: 'שולח...',
    req: 'יש למלא את השדה', needOne: 'יש למלא טלפון או אימייל', badEmail: 'כתובת אימייל לא תקינה', badPhone: 'מספר טלפון לא תקין', consent: 'יש לאשר את מדיניות הפרטיות',
    ok: 'תודה, ההודעה נשלחה. נחזור אליך בהקדם.', fail: 'השליחה נכשלה. אפשר לנסות שוב או ליצור קשר בטלפון.',
    off: 'הטופס עדיין לא מחובר לשליחה, ולכן לא נשלח דבר. אפשר ליצור קשר בטלפון או במייל המופיעים בעמוד.',
    a11yBtn: 'כלי נגישות', a11yBig: 'הגדל טקסט', a11ySmall: 'הקטן טקסט', a11yGray: 'גווני אפור', a11yHc: 'ניגודיות גבוהה', a11yLinks: 'הדגשת קישורים', a11yFont: 'פונט קריא', a11yReset: 'איפוס',
  },
  en: {
    searchPh: 'Search the site', searchBtn: 'Search', close: 'Close', none: 'No results found', hint: 'Type at least 2 characters',
    name: 'Name', phone: 'Phone', email: 'Email', branch: 'Referral to branch', pick: 'Please select the desired branch from the list',
    rg: 'Ramat Gan and the Area', jlm: 'Jerusalem and the Area', ph: 'Pardes Hanna, Hadera and the Area', kt: 'Kiryat Tivon', md: 'Modiin and the Area', send: 'Send', sending: 'Sending...',
    req: 'Please fill in this field', needOne: 'Please enter a phone number or an email', badEmail: 'Invalid email address', badPhone: 'Invalid phone number', consent: 'Please accept the privacy policy',
    ok: 'Thank you, your message was sent. We will get back to you shortly.', fail: 'Sending failed. Please try again or contact us by phone.',
    off: 'This form is not connected to sending yet, so nothing was sent. Please use the phone or email shown on the page.',
    a11yBtn: 'Accessibility Tools', a11yBig: 'Increase Text', a11ySmall: 'Decrease Text', a11yGray: 'Grayscale', a11yHc: 'High Contrast', a11yLinks: 'Highlight Links', a11yFont: 'Readable Font', a11yReset: 'Reset',
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

  // ---------- Forms ----------
  const endpoint = ((import.meta as any).env && (import.meta as any).env.VITE_FORM_ENDPOINT) || '';
  const frms = Array.from(root.querySelectorAll('.page .frm')) as HTMLElement[];
  frms.forEach((box) => {
    const pageId = (box.closest('.page') as HTMLElement).id.slice(3);
    const hasMsg = !!box.querySelector('.f.full');
    const hasBranch = !hasMsg && box.querySelectorAll('.f').length >= 4;
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
      (hasMsg ? field(uid + 'name', olab[0] || t.name, 'text') + field(uid + 'email', olab[1] || t.email, 'email') + field(uid + 'phone', olab[2] || t.phone, 'tel') + '<div class="f full"><label for="' + uid + 'message">' + esc(olab[3] || '') + '</label><textarea id="' + uid + 'message" name="message" rows="4" maxlength="2000"></textarea><small class="err" aria-live="polite"></small></div>' : field(uid + 'name', t.name, 'text') + field(uid + 'phone', t.phone, 'tel') + field(uid + 'email', t.email, 'email')) +
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
      const nm = form.elements.namedItem(uid + 'name') as HTMLInputElement, ph = form.elements.namedItem(uid + 'phone') as HTMLInputElement, em = form.elements.namedItem(uid + 'email') as HTMLInputElement;
      const br = form.elements.namedItem('branch') as HTMLSelectElement | null, cs = form.elements.namedItem('consent') as HTMLInputElement;
      let ok = true;
      form.querySelectorAll('.err').forEach((s) => (s.textContent = ''));
      if (!nm.value.trim()) { setErr(nm, t.req); ok = false; }
      const digits = ph.value.replace(/\D/g, '');
      if (!ph.value.trim() && !em.value.trim()) { setErr(ph, t.needOne); ok = false; }
      if (ph.value.trim() && (digits.length < 7 || digits.length > 15)) { setErr(ph, t.badPhone); ok = false; }
      if (em.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em.value.trim())) { setErr(em, t.badEmail); ok = false; }
      if (br && !br.value) { setErr(br, t.req); ok = false; }
      if (!cs.checked) { (form.querySelector('.cerr') as HTMLElement).textContent = t.consent; ok = false; }
      msg.textContent = ''; msg.className = 'frm-msg';
      if (!ok) return;
      if (g('website')) { msg.textContent = t.ok; msg.classList.add('ok'); form.reset(); return; } // spam trap: pretend success, send nothing
      if (!endpoint) { msg.textContent = t.off; msg.classList.add('warn'); return; }
      const btn = form.querySelector('.sbm') as HTMLButtonElement; btn.disabled = true; btn.textContent = t.sending;
      try {
        const r = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ form: pageId, name: nm.value.trim(), phone: ph.value.trim(), email: em.value.trim(), branch: br ? br.value : '', message: g('message'), lang, consent: true, page: location.href }) });
        if (!r.ok) throw new Error(String(r.status));
        msg.textContent = t.ok; msg.classList.add('ok'); form.reset();
      } catch (e) { msg.textContent = t.fail; msg.classList.add('bad'); }
      btn.disabled = false; btn.textContent = t.send;
    };
    form.addEventListener('submit', submit);
    cleanups.push(() => form.removeEventListener('submit', submit));
  });

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
    '<button type="button" data-a="reset" class="a11y-reset">' + esc(t.a11yReset) + '</button></div>';
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
  const onTglA = () => { const open = panel.hidden; panel.hidden = !open; tgl.setAttribute('aria-expanded', String(open)); };
  tgl.addEventListener('click', onTglA);
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
  cleanups.push(() => { tgl.removeEventListener('click', onTglA); panel.querySelectorAll('[data-a]').forEach((b) => b.removeEventListener('click', onA)); (document.body.style as any).zoom = ''; bar.remove(); });

  return () => cleanups.forEach((f) => f());
}
