// Treatment-intent journey tests (node --test, bundled by esbuild: see test/README.md).
// The hero treatment CTA links to the contact page with an explicit ?treat=1 URL marker.
// Verifies which form key the contact page submits under each journey:
//   treatment CTA / shared or reloaded ?treat=1 URL -> form:"treat" (routes per treat:<branch>)
//   any navigation without the marker               -> form:"contact" (unchanged)
//   arbitrary query input never changes routing; intent lives only in the URL (no storage)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { enhance } from '../src/enhance';
import { html } from '../src/body';
import { htmlEn } from '../src/body-en';

type Payload = { form: string; branch: string; name: string };

const setup = (markup: string, lang: 'he' | 'en', url = 'https://ccw.org.il/') => {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { url });
  const w = dom.window as any;
  (globalThis as any).window = w;
  (globalThis as any).document = w.document;
  (globalThis as any).sessionStorage = w.sessionStorage;
  (globalThis as any).HTMLElement = w.HTMLElement;
  (globalThis as any).MutationObserver = w.MutationObserver;
  (globalThis as any).KeyboardEvent = w.KeyboardEvent;
  (globalThis as any).MouseEvent = w.MouseEvent;
  (globalThis as any).Event = w.Event;
  (globalThis as any).location = w.location;
  (globalThis as any).history = w.history;
  (globalThis as any).URLSearchParams = URLSearchParams;
  w.matchMedia = w.matchMedia || (() => ({ matches: false, addEventListener() {}, removeEventListener() {} }));
  (globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 0);
  (globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
  w.requestAnimationFrame = (globalThis as any).requestAnimationFrame;
  w.scrollTo = w.scrollTo || (() => {});
  const sent: Payload[] = [];
  const stub = (u: string, init: any) => {
    sent.push(JSON.parse(init.body));
    return Promise.resolve({ ok: true, status: 202 });
  };
  (globalThis as any).fetch = stub;
  const root = w.document.createElement('div');
  root.innerHTML = markup;
  w.document.body.appendChild(root);
  // Mimic the App router: data-go clicks are preventDefault'd and push the link's path+query
  // (the ?treat=1 marker travels into the URL, exactly like the production router change).
  root.addEventListener('click', (e: Event) => {
    const a = (e.target as HTMLElement).closest ? (e.target as HTMLElement).closest('a') : null;
    if (a && a.hasAttribute('data-go')) {
      e.preventDefault();
      const href = a.getAttribute('href') || '';
      const m = href.match(/^#\/([^?]*)(\?.*)?$/);
      if (m) w.history.pushState({}, '', '/' + m[1] + (m[2] || ''));
    }
  });
  const undo = enhance(root, lang);
  return { w, root, sent, undo, stub };
};

const click = (w: any, el: Element) =>
  el.dispatchEvent(new w.MouseEvent('click', { bubbles: true, cancelable: true }));

const fillContact = async (w: any, root: HTMLElement, pageId: string, branch: string) => {
  const set = (n: string, v: string) => { const el = root.querySelector('#' + pageId + '-' + n) as any; el.value = v; };
  set('name', 'Test'); set('phone', '0501234567'); set('email', 't@t.co'); set('branch', branch);
  (root.querySelector('#' + pageId + '-consent') as any).checked = true;
  const form = root.querySelector('#pg-' + pageId + ' form') as any;
  form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 10));
};

const cta = (root: HTMLElement) => root.querySelector('a[href="#/contact?treat=1"]')!;
const footerContact = (root: HTMLElement) => root.querySelector('footer a[data-go="contact"]')!;

test('treatment CTA + Jerusalem submits form:"treat", branch:"jlm"', async () => {
  const { w, root, sent, undo } = setup(html, 'he');
  click(w, cta(root));
  await fillContact(w, root, 'contact', 'jlm');
  assert.equal(sent.length, 1);
  assert.equal(sent[0].form, 'treat');
  assert.equal(sent[0].branch, 'jlm');
  undo();
});

test('treatment CTA + other branch submits form:"treat" with that branch (existing treat routes)', async () => {
  const { w, root, sent, undo } = setup(html, 'he');
  click(w, cta(root));
  await fillContact(w, root, 'contact', 'rg');
  assert.equal(sent[0].form, 'treat');
  assert.equal(sent[0].branch, 'rg');
  undo();
});

test('ordinary Contact Us navigation submits form:"contact" (unchanged routing)', async () => {
  const { w, root, sent, undo } = setup(html, 'he');
  click(w, footerContact(root));
  await fillContact(w, root, 'contact', 'jlm');
  assert.equal(sent[0].form, 'contact');
  assert.equal(sent[0].branch, 'jlm');
  undo();
});

test('stale intent: CTA then other nav then footer Contact Us -> form:"contact"', async () => {
  const { w, root, sent, undo } = setup(html, 'he');
  click(w, cta(root));
  click(w, root.querySelector('a[data-go="about"]')!);
  click(w, footerContact(root));
  await fillContact(w, root, 'contact', 'jlm');
  assert.equal(sent[0].form, 'contact');
  undo();
});

test('back/forward: URL without marker after history nav -> form:"contact"', async () => {
  const { w, root, sent, undo } = setup(html, 'he');
  click(w, cta(root)); // URL now carries ?treat=1
  w.history.pushState({}, '', '/contact'); // simulate navigating back (markerless entry)
  w.dispatchEvent(new w.Event('popstate'));
  await fillContact(w, root, 'contact', 'jlm');
  assert.equal(sent[0].form, 'contact');
  undo();
});

test('refresh survives: reload of the ?treat=1 URL still submits form:"treat"', async () => {
  const first = setup(html, 'he');
  click(first.w, cta(first.root)); // URL now carries ?treat=1
  first.undo();
  const second = setup(html, 'he', 'https://ccw.org.il/%D7%A6%D7%95%D7%A8-%D7%A7%D7%A9%D7%A8/?treat=1'); // reload of that URL
  await fillContact(second.w, second.root, 'contact', 'jlm');
  assert.equal(second.sent.length, 1);
  assert.equal(second.sent[0].form, 'treat');
  second.undo();
});

test('directly opened/shared ?treat=1 link submits form:"treat"', async () => {
  const { w, root, sent, undo } = setup(html, 'he', 'https://ccw.org.il/%D7%A6%D7%95%D7%A8-%D7%A7%D7%A9%D7%A8/?treat=1');
  await fillContact(w, root, 'contact', 'jlm');
  assert.equal(sent[0].form, 'treat');
  assert.equal(sent[0].branch, 'jlm');
  undo();
});

test('old-style hash URL with marker (#/contact?treat=1) also carries intent', async () => {
  const { w, root, sent, undo } = setup(html, 'he', 'https://ccw.org.il/#/contact?treat=1');
  await fillContact(w, root, 'contact', 'jlm');
  assert.equal(sent[0].form, 'treat');
  undo();
});

test('arbitrary query input never changes routing', async () => {
  for (const q of ['?treat=2', '?treat=yes', '?intent=treat', '?treat=1&amp;x=1'.replace('&amp;', '&')]) {
    const url = 'https://ccw.org.il/' + (q.startsWith('?treat=1&') ? q : q);
    const s = setup(html, 'he', url === 'https://ccw.org.il/?treat=1&x=1' ? url : 'https://ccw.org.il/' + q);
    await fillContact(s.w, s.root, 'contact', 'jlm');
    const last = s.sent[s.sent.length - 1];
    if (q === '?treat=1&x=1') assert.equal(last.form, 'treat'); // exact marker with extra param still counts
    else assert.equal(last.form, 'contact');
    s.undo();
  }
});

test('failed validation keeps intent: retry after fixing still submits form:"treat"', async () => {
  const { w, root, sent, undo } = setup(html, 'he', 'https://ccw.org.il/?treat=1');
  const set = (n: string, v: string) => { const el = root.querySelector('#contact-' + n) as any; el.value = v; };
  set('name', 'Test'); set('phone', '0501234567'); set('email', 't@t.co'); set('branch', ''); // missing branch: blocked
  (root.querySelector('#contact-consent') as any).checked = true;
  const form = root.querySelector('#pg-contact form') as any;
  form.dispatchEvent(new w.Event('submit', { bubbles: true, cancelable: true }));
  await new Promise((r) => setTimeout(r, 10));
  assert.equal(sent.length, 0);
  await fillContact(w, root, 'contact', 'jlm');
  assert.equal(sent[0].form, 'treat');
  undo();
});

test('treat-page form always submits form:"treat" without any marker', async () => {
  const { w, root, sent, undo } = setup(html, 'he');
  await fillContact(w, root, 'treat', 'jlm');
  assert.equal(sent[0].form, 'treat');
  assert.equal(sent[0].branch, 'jlm');
  undo();
});

test('English "Request therapy" CTA carries the same intent marker', async () => {
  const { w, root, sent, undo } = setup(htmlEn, 'en');
  click(w, cta(root));
  await fillContact(w, root, 'contact', 'jlm');
  assert.equal(sent[0].form, 'treat');
  assert.equal(sent[0].branch, 'jlm');
  undo();
});
