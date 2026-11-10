import worker from '../worker.js';
const written = [];
const env = { CCW_CLICKS: { writeDataPoint: (dp) => written.push(dp) } };
async function post(body, origin = 'https://ccw.org.il') {
  const r = await worker.fetch(new Request('https://x/', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body) }), env);
  return r.status;
}
// valid cases
console.log('valid donate host detail:', await post({ e: 'cta_donate_external', p: '/donate', l: 'he', d: 'jgive.co.il' }));
console.log('valid form page detail:', await post({ e: 'form_submit_attempt', p: '/contact', l: 'en', d: 'contact' }));
console.log('valid empty detail:', await post({ e: 'cta_call', p: '/', l: 'he', d: '' }));
// injection cases: detail must be dropped to '' but click still counted
await post({ e: 'cta_outbound', p: '/', l: 'he', d: 'evil.com?user=secret' });
await post({ e: 'cta_outbound', p: '/', l: 'he', d: 'exfil.attacker-controlled.example' });
// full drops
console.log('evil event:', await post({ e: 'page_view', p: '/', l: 'he' }));
console.log('query in path:', await post({ e: 'cta_call', p: '/?q=secret', l: 'he' }));
console.log('GET:', (await worker.fetch(new Request('https://x/'), env)).status);
console.log('---written data points---');
written.forEach((w) => console.log(JSON.stringify(w.blobs)));
