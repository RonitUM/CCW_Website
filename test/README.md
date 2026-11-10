# treat-intent journey test

Verifies which form key the contact page submits under each journey (see test/treat-intent.test.ts header).

Run (no package.json changes; uses the already-installed jsdom/esbuild):

    node_modules/.bin/esbuild test/treat-intent.test.ts --bundle --platform=node --format=esm \
      --external:node:test --external:jsdom \
      '--define:import.meta.env={"VITE_FORM_ENDPOINT":"https://x.test/f","VITE_TURNSTILE_SITEKEY":"","VITE_ENTRY_POPUP":""}' \
      --outfile=node_modules/.tmp-treat-test.mjs
    node --test --test-force-exit node_modules/.tmp-treat-test.mjs

Expected: 9 pass, 0 fail.
