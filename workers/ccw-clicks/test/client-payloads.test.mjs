// End-to-end payload test for src/clicks.ts.
// Build the test bundle first (jsdom cannot create isTrusted events, so the
// browser-only synthetic-click guard is bypassed IN THE TEST ARTIFACT ONLY):
//   sed -e "s|const CLICK_ENDPOINT = '';|const CLICK_ENDPOINT = 'https://clicks.test/collect';|" \
//       -e "s|'./canonical-paths.js'|'$PWD/src/canonical-paths.js'|" src/clicks.ts > /tmp/clicks-test-src.ts
//   npx esbuild /tmp/clicks-test-src.ts --bundle --format=iife --global-name=ClicksTest --outfile=/tmp/clicks-test.js
//   sed 's/if (!ev.isTrusted) return;//g' /tmp/clicks-test.js > /tmp/clicks-test-notrust.js
//   CLICKS_BUNDLE=/tmp/clicks-test-notrust.js node workers/ccw-clicks/test/client-payloads.test.mjs
import { JSDOM } from 'jsdom'; // run: CLICKS_BUNDLE=/path/to/bundled-clicks.js node client-payloads.test.mjs
import fs from 'fs';
const html = `<!DOCTYPE html><html><body>
<div class="page" id="pg-contact">
  <a id="t1" href="tel:+972522222222">call</a>
  <a id="t2" href="mailto:ccw@example.org">mail</a>
  <a id="t3" data-go="donate" href="/donate">donate page</a>
  <a id="t4" data-go="contact" class="btn" href="/contact">request therapy</a>
  <a id="t5" href="https://www.jgive.co.il/donate?campaign=secret123">jgive</a>
  <a id="t6" href="https://www.facebook.com/ccw">fb</a>
  <a id="t7" href="https://unlisted-example.com/page?token=abc&x=1">other</a>
  <form id="f1"><input name="phone" value="0501234567"><button type="submit">send</button></form>
</div>
<div class="pop-ov"><button class="sbm" id="p1">popup submit</button></div>
</body></html>`;
const dom = new JSDOM(html, { url: 'https://ccw.org.il/en/contact/?utm=secret#frag', runScripts: 'outside-only' });
const { window } = dom;
const sent = [];
Object.defineProperty(window.navigator, 'sendBeacon', { value: (url, blob) => { const i = sent.push({ url, body: null }) - 1; blob.text().then(t => { sent[i].body = t; }); return true; } });
window.localStorage.setItem('ccwLang', 'en');
window.eval(fs.readFileSync(process.env.CLICKS_BUNDLE, 'utf8') + '\n;ClicksTest.initClicks();');
const trusted = (ev) => ev; // jsdom cannot create trusted events; build the test bundle with the isTrusted guard stripped (see header)
for (const id of ['t1','t2','t3','t4','t5','t6','t7','p1']) {
  window.document.getElementById(id).dispatchEvent(trusted(new window.MouseEvent('click', { bubbles: true })));
}
window.document.getElementById('f1').dispatchEvent(trusted(new window.Event('submit', { bubbles: true })));
await new Promise(r => setTimeout(r, 300));
for (const s of sent) console.log(s.url, '->', s.body);
console.log('total beacons:', sent.length);
// arbitrary typed URL (404 page carrying a name): path must transmit as ''
const dom2 = new JSDOM('<!DOCTYPE html><html><body><a id="t" href="tel:123">x</a></body></html>', { url: 'https://ccw.org.il/some-patient-name-typed-url', runScripts: 'outside-only' });
const sent2 = [];
Object.defineProperty(dom2.window.navigator, 'sendBeacon', { value: (url, blob) => { const i = sent2.push({ url, body: null }) - 1; blob.text().then(t => { sent2[i].body = t; }); return true; } });
dom2.window.eval(fs.readFileSync(process.env.CLICKS_BUNDLE, 'utf8') + '\n;ClicksTest.initClicks();');
dom2.window.document.getElementById('t').dispatchEvent(new dom2.window.MouseEvent('click', { bubbles: true }));
await new Promise(r => setTimeout(r, 200));
for (const s2 of sent2) console.log(s2.url, '->', s2.body);
