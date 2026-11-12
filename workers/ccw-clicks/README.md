# ccw-clicks worker

Anonymous aggregate click counters for ccw.org.il (Shai's request, 2026-11-10).

- Dataset `ccw_clicks` (Workers Analytics Engine) was created 2026-11-10 in the
  CCW Cloudflare account (Nitkarm@gmail.com's Account) with binding `CCW_CLICKS`.
- Deploy (after approval): `npx wrangler deploy` from this directory with a
  Workers-edit token, then set the public worker URL as CLICK_ENDPOINT in
  src/clicks.ts and rebuild the site. Until then both sides are inert.
- Query (SQL API, account Workers Free includes 10k read queries/day):
  SELECT blob1 AS event, blob2 AS path, SUM(double1) AS taps
  FROM ccw_clicks GROUP BY event, path ORDER BY taps DESC
- Payload and privacy notes are in worker.js comments. No IPs, identities,
  form values or search terms are accepted or stored.
