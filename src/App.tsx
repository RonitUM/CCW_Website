import React, { useEffect, useRef, useState } from 'react';
import './style.css';
import './a11y.css';
import heroLoop from './photos/hero-loop.mp4';
import { PDF_PAGES } from './docs/pdf-pages';
import { html } from './body';
import { htmlEn } from './body-en';
import { enhance } from './enhance';

export function App() {
    const ref = useRef<HTMLDivElement>(null);
    const [lang, setLang] = useState<'he' | 'en'>(() => { try { return localStorage.getItem('ccwLang') === 'en' ? 'en' : 'he'; } catch (e) { return 'he'; } });
    useEffect(() => {
        const isEn = lang === 'en'; try { document.documentElement.lang = lang; document.documentElement.dir = isEn ? 'ltr' : 'rtl'; } catch (e) { /* ignore */ }
        const root = ref.current!;
        const fit = () => { const w = window.innerWidth; (root.style as any).zoom = String(w > 1100 ? Math.min(1, w / 1440) : 1); };
        fit(); window.addEventListener('resize', fit);
                const show = (id: string, push: boolean) => {
            let el = root.querySelector('#pg-' + id);
            if (!el) { id = 'home'; el = root.querySelector('#pg-home'); }
            root.querySelectorAll('.page').forEach((p) => p.classList.remove('on'));
            el!.classList.add('on'); root.classList.remove('menu'); root.querySelectorAll('.page').forEach((p) => p.removeAttribute('role')); el!.setAttribute('role', 'main'); el!.setAttribute('tabindex', '-1');
            if (id === 'home') root.classList.remove('sp'); else root.classList.add('sp');
            root.querySelectorAll('.ni.open').forEach((n) => n.classList.remove('open'));
            // Per-route document title and meta description (browser UX + assistive tech; crawlers still need prerendering).
            const h1t = ((el!.querySelector('h1') && el!.querySelector('h1')!.textContent) || '').replace(/\s+/g, ' ').trim();
            const orgT = isEn ? 'The Counseling Center for Women' : 'מרכז יעוץ לאשה';
            document.title = (id === 'home' || !h1t) ? 'מרכז יעוץ לאשה | The Counseling Center for Women' : h1t + ' | ' + orgT;
            let md = document.querySelector('meta[name="description"]') as HTMLMetaElement | null;
            if (!md) { md = document.createElement('meta'); md.name = 'description'; document.head.appendChild(md); }
            const p1 = el!.querySelector('.pg-b p, .sec p, .page p');
            const d1 = (((p1 && p1.textContent) || '').replace(/\s+/g, ' ').trim()).slice(0, 160);
            md.content = id === 'home' || !d1 ? (isEn ? 'The Counseling Center for Women - therapy center, training center and community' : 'מרכז יעוץ לאשה - מרכז טיפולי, מרכז הכשרה וקהילה') : d1;
            if (push) { try { history.pushState({ p: id }, '', '#/' + id); } catch (e) { /* ignore */ } }
            try { root.scrollIntoView({ block: 'start' }); window.scrollTo(0, 0); } catch (e) { /* ignore */ } try { setTimeout(() => { (root.querySelectorAll('video[data-hero]') as NodeListOf<HTMLVideoElement>).forEach((vd) => { if (vd.offsetParent !== null && (vd.currentSrc || vd.src) && vd.paused && !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)) { vd.muted = true; const pl = vd.play(); if (pl && pl.catch) pl.catch(() => { /* poster stays */ }); } }); }, 60); } catch (e) { /* ignore */ }
        };
        const onClick = (e: MouseEvent) => {
            if ((e.target as HTMLElement).closest('.burger')) { root.classList.toggle('menu'); return; }
            const a = (e.target as HTMLElement).closest('a');
            if (!a || !root.contains(a)) return;
            if (a.hasAttribute('data-ext')) { e.preventDefault(); return; }
            const langTo = a.getAttribute('data-lang');
            if (langTo === 'en' || langTo === 'he') { e.preventDefault(); try { localStorage.setItem('ccwLang', langTo); } catch (err) { /* ignore */ } setLang(langTo); return; }
            const id = a.getAttribute('data-go');
            if (!id) { if (a.getAttribute('href') === '#') e.preventDefault(); return; }
            e.preventDefault();
            const ni = a.closest('.ni');
            if (ni && a.classList.contains('dd') && window.matchMedia('(hover: none), (max-width: 1100px)').matches) {
                const was = ni.classList.contains('open');
                root.querySelectorAll('.ni.open').forEach((n) => n.classList.remove('open'));
                if (!was) { ni.classList.add('open'); return; }
            }
            show(id, true);
        };
        let cur = 'home';
        const heroVids = Array.from(root.querySelectorAll('video[data-hero]')) as HTMLVideoElement[];
        const reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        const playVis = () => { if (reduceMotion) return; heroVids.forEach((vd) => { if (vd.offsetParent === null || !(vd.currentSrc || vd.src)) return; vd.muted = true; const pl = vd.play(); if (pl && pl.catch) pl.catch(() => { /* poster stays */ }); }); };
        const setSrc = (u: string) => { heroVids.forEach((vd) => { vd.muted = true; vd.defaultMuted = true; vd.playsInline = true; vd.setAttribute('playsinline', ''); vd.setAttribute('webkit-playsinline', ''); vd.src = u; vd.load(); }); playVis(); };
        heroVids.forEach((vd) => { vd.muted = true; vd.defaultMuted = true; vd.playsInline = true; vd.setAttribute('playsinline', ''); vd.setAttribute('webkit-playsinline', ''); if (reduceMotion) vd.removeAttribute('autoplay'); vd.addEventListener('canplay', playVis); });
        // Safari: decorative loops (data-loop) must retry play() when autoplay is refused, and on the first user gesture.
        const loopVids = Array.from(root.querySelectorAll('video[data-loop]')) as HTMLVideoElement[];
        const loopKick = () => { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return; loopVids.forEach((vd) => { if (vd.paused && vd.offsetParent !== null) { vd.muted = true; const pl = vd.play(); if (pl && pl.catch) pl.catch(() => { /* poster stays */ }); } }); };
        loopVids.forEach((vd) => { vd.muted = true; vd.defaultMuted = true; vd.playsInline = true; vd.setAttribute('playsinline', ''); vd.setAttribute('webkit-playsinline', ''); vd.controls = false; vd.addEventListener('canplay', loopKick); });
        setTimeout(loopKick, 100); setTimeout(loopKick, 1000);
        ['touchstart', 'pointerdown', 'click', 'scroll', 'keydown'].forEach((ev) => window.addEventListener(ev, loopKick, { once: true, passive: true }));
        document.addEventListener('visibilitychange', () => { if (!document.hidden) loopKick(); });
        setSrc(heroLoop);
        const closeDoc = () => { const ov = root.querySelector('.docov'); if (ov) ov.remove(); };
        const openDocViewer = (key: string, title: string) => {
          closeDoc();
          const pages = PDF_PAGES[key];
          if (!pages || !pages.length) return;
          const ov = document.createElement('div');
          ov.className = 'docov';
          const imgs = pages.map((p) => '<img class="docov-pg" src="data:image/jpeg;base64,' + p + '" alt="' + title + '" />').join('');
          ov.innerHTML = '<div class="docov-box"><div class="docov-bar"><div class="docov-title">' + title + '</div><button type="button" class="docov-x" aria-label="' + (isEn ? 'Close' : 'סגירה') + '">✕</button></div><div class="docov-pages">' + imgs + '</div></div>';
          ov.addEventListener('click', (e) => { if (e.target === ov) closeDoc(); });
          const x = ov.querySelector('.docov-x'); if (x) x.addEventListener('click', closeDoc);
          root.appendChild(ov);
        };
        root.querySelectorAll('a[data-doc]').forEach((el) => { el.addEventListener('click', (e) => { e.preventDefault(); e.stopPropagation(); const a = el as HTMLAnchorElement; const t = (a.querySelector('.t') || {}).textContent || (isEn ? 'Document' : 'מסמך'); openDocViewer(a.getAttribute('data-doc') || '', t); }); });
        // Safari: the bundled video can arrive as an untyped blob, which it will not play. Re-wrap it as video/mp4.
        // Pages serves the mp4 with a proper video/mp4 type and Range support; the blob re-wrap is only
        // a fallback for a real load failure. (Blob sources break Safari's native loop.)
        let heroSrcFailed = false;
        heroVids.forEach((vd) => { const sc = vd.querySelector('source'); (sc || vd).addEventListener('error', () => { heroSrcFailed = true; }); vd.addEventListener('error', () => { heroSrcFailed = true; }); });
        if (heroVids.length > 0) { try { fetch(heroLoop).then((r) => r.arrayBuffer()).then((buf) => { if (!heroSrcFailed) { return; } heroVids.forEach((vd) => { if (vd.readyState >= 3 || !vd.paused) { return; } }); if (heroVids.some((vd) => vd.readyState >= 3 || !vd.paused)) { return; } setSrc(URL.createObjectURL(new Blob([buf], { type: 'video/mp4' }))); }).catch(() => { /* keep original src */ }); } catch (e) { /* ignore */ } }
        // Safari / low-power mode: retry on first touch or tap, and when the tab becomes visible again.
        const kick = () => playVis();
        window.addEventListener('touchstart', kick, { passive: true });
        window.addEventListener('click', kick);
        document.addEventListener('visibilitychange', kick);
        const onTgl = (e: MouseEvent) => {
            const t = e.target as HTMLElement;
            const sc = t.closest('[data-scrollto]'); if (sc) { e.preventDefault(); const te = root.querySelector('#' + sc.getAttribute('data-scrollto')); if (te) te.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; } const q = t.closest('[data-tq]'); if (q) { const ts = root.querySelectorAll('.tq'); let k = 0; ts.forEach((x, i) => { if (x.classList.contains('on')) k = i; }); ts[k].classList.remove('on'); k = (k + Number(q.getAttribute('data-tq')) + ts.length) % ts.length; ts[k].classList.add('on'); root.querySelector('.cnt')!.textContent = (k + 1) + ' / ' + ts.length; }
        };
        root.addEventListener('click', onTgl);
        const onPop = (e: PopStateEvent) => {
            const id = (e.state && e.state.p) || (location.hash.indexOf('#/') === 0 ? location.hash.slice(2) : 'home');
            show(id, false);
        };
        root.addEventListener('click', onClick);
        const undoEnhance = enhance(root, lang);
        window.addEventListener('popstate', onPop);
        if (location.hash.indexOf('#/') === 0) show(location.hash.slice(2), false); else show('home', false);
        return () => { undoEnhance(); window.removeEventListener('touchstart', kick); window.removeEventListener('click', kick); document.removeEventListener('visibilitychange', kick); window.removeEventListener('resize', fit); root.removeEventListener('click', onClick); window.removeEventListener('popstate', onPop); };
    }, [lang]);
    return <div className="ccw" id="ccw" dir={lang === 'en' ? 'ltr' : 'rtl'} lang={lang} ref={ref} dangerouslySetInnerHTML={{ __html: lang === 'en' ? htmlEn : html }} />;
}
