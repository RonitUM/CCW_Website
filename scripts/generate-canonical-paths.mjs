// Regenerates src/canonical-paths.js from the built pages in dist/.
// Run after `npm run build` whenever pages are added or removed.
import { readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const paths = new Set(['/']);
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === 'index.html') {
      const p = full.slice(4).replace(/\\/g, '/').replace(/\/index\.html$/, '').replace(/\/+$/, '') || '/';
      if (!p.startsWith('/wp-content')) paths.add(p);
    }
  }
}
walk('dist');
paths.add('/404');
const sorted = [...paths].sort();
const out = `// Canonical page paths of ccw.org.il (percent-decoded, no trailing slash).
// Shared by src/clicks.ts (client transmit filter) and
// workers/ccw-clicks/worker.js (server storage filter). Regenerate after
// adding/removing pages: node scripts/generate-canonical-paths.mjs
export const CANONICAL_PATHS = ${JSON.stringify(sorted, null, 2)};
`;
writeFileSync('src/canonical-paths.js', out);
console.log('canonical-paths: wrote', sorted.length, 'paths');
