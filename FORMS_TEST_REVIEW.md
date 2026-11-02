# Dummy-only forms review

Review candidate only. Do not merge or deploy until Rona's exact-head review gate passes.
No DNS change and no production collection.

Build normal inactive site: `npm run build`.
Build fixed-dummy test: `node scripts/build-forms-test.mjs`.
The test build displays a Hebrew/English test-only notice, locks personal-data fields,
and sends fixed synthetic values. An endpoint without VITE_FORM_TEST_ONLY=1 remains inactive.
The popup stays inactive under existing settings; this change does not enable it.

Only the public Turnstile site key is included. Its secret and the mail API key stay in
Worker secrets. The receiver independently enforces exact dummy values, validates origin,
Turnstile hostname and action, applies approximate per-IP rate limiting, and locks the
recipient to the separately approved test inbox. No real contact addresses are changed.

Local evidence: production builds succeed; five page-form submissions pass with mocked
Turnstile and mail; payloads stay fixed; no horizontal overflow at 390/1280 widths.
Layout screenshots use a clearly labeled mock widget, not a completed real challenge.
Actual Turnstile verification and actual inbox receipt are still required after approved
site deployment. An accepted HTTP response is not proof of inbox receipt.

Test values: name CCW DUMMY TEST, email dummy@example.test, phone empty,
message Dummy data only. No real inquiry. Branch and language are chosen by tester.
Consent remains unchecked until tester acts. The normal consent/privacy text is unchanged.

Known warning: existing large JavaScript chunk warning remains.
