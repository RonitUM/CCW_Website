// Document page images live as static files under public/docs/pages/<key>/<n>.jpg
// so they load on demand (only when the in-page viewer opens) instead of being
// inlined as base64 into the main JS bundle (~2.2 MB saved on first load).
const PAGE_COUNTS: Record<string, number> = {
    'nihul-takin': 1,
    'nihui-mas': 1,
    'pinkasim': 1,
    'dohot-2025': 11,
    'malcar': 1,
    'taknon': 9,
};
const base = ((import.meta as any).env?.BASE_URL || './').replace(/\/?$/, '/');
export const PDF_PAGES: Record<string, string[]> = Object.fromEntries(
    Object.entries(PAGE_COUNTS).map(([k, n]) => [k, Array.from({ length: n }, (_, i) => `${base}docs/pages/${k}/${i + 1}.jpg`)])
);
