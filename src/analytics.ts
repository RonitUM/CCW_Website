// Analytics for ccw.org.il via Cloudflare Web Analytics.
//
// Enabled 2026-11-10 at Shai's request ("Let's add analytics to the ccw
// website", "You can set it up with Cloudflare?"). The site was added to the
// CCW Cloudflare account (Nitkarm@gmail.com's Account) as a JS-snippet site:
// no DNS proxying, free tier, cookieless, and Cloudflare does not collect or
// use visitors' personal data or track individual visitors.
//
// The token is not a secret: it appears in the page source of every site
// that uses Cloudflare Web Analytics. Keeping it in source (not a local env
// var or repo secret) means routine rebuilds cannot silently drop analytics.
// Empty string disables analytics completely: no third-party script is built
// into any page.
export const CF_BEACON_TOKEN = '0eeb021872a64fedb091f6bbc0b163a4';
