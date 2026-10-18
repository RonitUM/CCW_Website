# CCW website mockup

Interactive redesign mockup for the Counseling Center for Women (ccw.org.il).
Hebrew (default, right-to-left) and English. Built with React 18, Vite 5 and TypeScript.

## Run

    npm install
    npm run dev      # local dev server
    npm run build    # production build into dist/

## Structure

    index.html          App shell (rtl, Hebrew default)
    src/main.tsx        Entry point
    src/App.tsx         Page routing, Hebrew/English switch, scanned-document viewer, hero video
    src/body.ts         Hebrew content for all pages and posts
    src/body-en.ts      English content (generated, see i18n/)
    src/style.css       Styles, including the left-to-right overrides at the end
    src/photos/         Images and hero video
    src/fonts/          Web fonts
    src/docs/           Scanned documents used by the in-app viewer
    public/docs/        The same PDFs, served statically
    i18n/               Translation tooling: "python3 i18n/generate.py" rebuilds src/body-en.ts

## Known limitations

- Design mockup only. No backend: the contact and donate forms are display-only.
- The header search icon is decorative.
- The language choice is kept in localStorage when the browser allows it; otherwise every visit opens in Hebrew.
- The logo, some posters and all scanned documents contain Hebrew text inside the image.
- Three newsletters are translated from the Hebrew and marked in the page as an unofficial translation.
- The community page English text is translated from Hebrew, because the official English page is under construction.
- Checked on desktop Chrome and 390px mobile emulation. Not checked on iPhone Safari.
- The production build is one large script file (about 2.8 MB), which triggers a size warning.

## Content

Text and photos come from the public ccw.org.il site and its English pages.
