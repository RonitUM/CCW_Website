import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { CF_BEACON_TOKEN } from './src/analytics';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    {
      name: 'ccw-analytics',
      // Adds the Cloudflare Web Analytics beacon before </body> on every built
      // page (the prerender script copies dist/index.html into all route
      // pages) while a token is configured in src/analytics.ts.
      transformIndexHtml(html: string) {
        if (!CF_BEACON_TOKEN) return html;
        const beacon = `<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "${CF_BEACON_TOKEN}"}'></script><!-- End Cloudflare Web Analytics -->`;
        return html.replace('</body>', `    ${beacon}\n  </body>`);
      },
    },
  ],
});
