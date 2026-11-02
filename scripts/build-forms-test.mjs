// Public test configuration only. No API key or Turnstile secret belongs here.
import { spawnSync } from 'node:child_process';
const result = spawnSync(process.execPath, ['node_modules/vite/bin/vite.js', 'build'], {
 stdio: 'inherit', env: { ...process.env,
 VITE_FORM_TEST_ONLY: '1',
 VITE_FORM_ENDPOINT: 'https://ccw-forms-test.nitkarm.workers.dev/',
 VITE_TURNSTILE_SITE_KEY: '0x4AAAAAAFwxACd5xXPAwvi7'
 }
});
process.exit(result.status ?? 1);
