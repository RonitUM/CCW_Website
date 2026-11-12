import worker from '/home/sandbox/work/ccw/workers/ccw-clicks/worker.js';
const written = [];
const env = { CCW_CLICKS: { writeDataPoint: (dp) => written.push(dp) } };
async function post(body, origin = 'https://ccw.org.il') {
  const r = await worker.fetch(new Request('https://x/', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), env);
  return r.status;
}
// valid cases
console.log('valid donate host detail:', await post({ e: 'cta_donate_external', p: '/%D7%9C%D7%AA%D7%A8%D7%95%D7%9E%D7%95%D7%AA/', l: 'he', d: 'jgive.co.il' }));
console.log('valid form page detail:', await post({ e: 'form_submit_attempt', p: '/en/contact', l: 'en', d: 'contact' }));
console.log('valid empty detail:', await post({ e: 'cta_call', p: '/', l: 'he', d: '' }));
// injection cases: detail must be dropped to '' but click still counted
await post({ e: 'cta_outbound', p: '/', l: 'he', d: 'evil.com?user=secret' });
await post({ e: 'cta_outbound', p: '/', l: 'he', d: 'exfil.attacker-controlled.example' });
// path allowlist: canonical path stored, unknown/identifier-carrying paths stored as ''
await post({ e: 'cta_call', p: '/%D7%A6%D7%95%D7%A8-%D7%A7%D7%A9%D7%A8/', l: 'he', d: '' });
await post({ e: 'cta_call', p: '/some-patient-name-typed-url', l: 'he', d: '' });
await post({ e: 'cta_call', p: '/?q=secret', l: 'he' });
// full drops
console.log('evil event:', await post({ e: 'page_view', p: '/', l: 'he' }));
console.log('bad lang:', await post({ e: 'cta_call', p: '/', l: 'fr' }));
console.log('GET:', (await worker.fetch(new Request('https://x/'), env)).status);
console.log('---written data points---');
written.forEach((w) => console.log(JSON.stringify(w.blobs)));
