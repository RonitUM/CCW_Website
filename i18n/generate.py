import re, json, html as H
from pathlib import Path

BASE = Path(__file__).resolve().parent
ROOT = BASE.parent

SRC = ROOT / 'src' / 'body.ts'
raw = open(SRC, encoding='utf-8').read()
m = re.search(r'export const html = "(.*)";?\s*$', raw, flags=re.S)
body = m.group(1)
s = body.replace('\\\\', '\x00').replace('\\"', '"').replace('\\n', '\n').replace('\x00', '\\')

grids = json.load(open(BASE / 'grids.json'))
match = json.load(open(BASE / 'match2.json'))
ui = json.load(open(BASE / 'ui.json'))
HE = re.compile(r'[א-ת]')

def norm(t):
    t = t.replace('&quot;','"').replace('&#x27;',"'").replace('״','"').replace('׳',"'").replace('&nbsp;',' ')
    return re.sub(r'\s+',' ',t.replace('\xa0',' ')).strip()
def key(t):
    t = norm(t)
    return re.sub(r'[\s־\-–—.,;:!?()"\'/\\&<>+״׳‘’“”\[\]{}|…*#%=]', '', t)
HIT = match['hit']
import os
if os.path.exists(BASE / 'overrides.json'):
    _ov = json.load(open(BASE / 'overrides.json'))
    HIT.update(_ov)
    print('overrides loaded:', len(_ov))

ROLE_EN = {'יו"ר':'Chair','מנכ"לית שותפה':'Co-CEO','מנכ"לית קלינית שותפה':'Clinical Co-CEO','מנהלת משרד סניף ירושלים':'Office Manager, Jerusalem Branch','מנהלת פיתוח משאבים':'Resource Development Manager'}

# ---- 1. grid card replacement ----
page_spans = [(mm.start(), mm.group(1)) for mm in re.finditer(r'<div class="page[^"]*" id="pg-([a-z0-9]+)"', s)]
def page_bounds(pid):
    for i,(st,p) in enumerate(page_spans):
        if p == pid:
            en = page_spans[i+1][0] if i+1 < len(page_spans) else s.find('<footer', st)
            return st, en
    return None

def esc_html_text(t):
    return t.replace('&','&amp;').replace('"','&quot;')

grid_report = {}
for pg, persons in grids.items():
    b = page_bounds(pg)
    if not b: continue
    st, en = b
    seg = s[st:en]
    cards = list(re.finditer(r'<div class="tc"><div class="ph bg (i-[^"]+)"></div><div class="bd"><h3>(.*?)</h3>(?:<span class="role">(.*?)</span>)?(<p>.*?</p>)*(.*?)(?=</div></div>)', seg, flags=re.S))
    assert len(cards) == len(persons), f'{pg}: {len(cards)} cards vs {len(persons)} persons'
    out = []
    last = 0
    for cm, p in zip(cards, persons):
        role_he = H.unescape(cm.group(3) or '')
        role_en = ROLE_EN.get(role_he, role_he)
        bio = esc_html_text(p['en_bio']).replace('\n','<br>')
        role_html = f'<span class="role">{esc_html_text(role_en)}</span>' if cm.group(3) else ''
        rep = f'<div class="tc"><div class="ph bg {cm.group(1)}"></div><div class="bd"><h3>{esc_html_text(p["en_name"])}</h3>{role_html}<p>{bio}</p>'
        out.append(seg[last:cm.start()] + rep)
        last = cm.end()
    out.append(seg[last:])
    seg_new = ''.join(out)
    s = s[:st] + seg_new + s[en:]
    page_spans = [(mm.start(), mm.group(1)) for mm in re.finditer(r'<div class="page[^"]*" id="pg-([a-z0-9]+)"', s)]
    grid_report[pg] = len(cards)

# ---- 1b. posts wholesale replacement ----
import sys
sys.path.insert(0, str(BASE))
from posts_patch import build_post_content, he_date_to_en
en_posts = json.load(open(BASE / 'en-posts.json'))
EN_TITLES = {p: d['title'] for p, d in en_posts.items()}
HE_ONLY_POSTS = ['post0', 'post1', 'post2']  # need agent translation, handled via overrides below
post_report = {}
for n in range(22):
    pid = f'post{n}'
    if pid in HE_ONLY_POSTS: continue
    d = en_posts.get(pid)
    if not d: continue
    b = page_bounds(pid)
    if not b: continue
    st, en = b
    seg = s[st:en]
    h1m = re.search(r'<h1>[^<]*</h1>', seg)
    title = H.unescape(d['title']).replace('&#8217;',"'").strip()
    title_esc = title.replace('&','&amp;').replace('"','&quot;')
    seg = seg[:h1m.start()] + f'<h1>{title_esc}</h1>' + seg[h1m.end():]
    # crumbs last span
    seg = re.sub(r'(<span>)[^<]*(</span>)(?=<h1>)', lambda m: m.group(1) + title_esc + m.group(2), seg, count=1)
    # content col
    cm = re.search(r'(<div class="pg-b"><div class="col">)(.*?)(</div></div></div><div class="page"|</div></div></div>)$', seg, flags=re.S)
    if not cm:
        cm = re.search(r'(<div class="pg-b"><div class="col">)(.*?)(</div></div></div>)$', seg, flags=re.S)
    inner = cm.group(2)
    fig = re.search(r'class="bg (i-[0-9a-z]+[a-z]?) fig[^"]*"[^>]*style="aspect-ratio:([^;"]+)', inner)
    keep_fig = (fig.group(1), fig.group(2).strip()) if fig else None
    swap = 'i-wday26en' if pid == 'post6' else None
    meta_m = re.search(r'class="meta">([^<]+)<', inner)
    meta_en = ''
    if d.get('date') and re.match(r'\d{4}-\d{2}-\d{2}', d['date']):
        y, mo, da = d['date'].split('-')
        import datetime
        try: meta_en = datetime.date(int(y), int(mo), int(da)).strftime('%B %-d, %Y')
        except Exception: meta_en = ''
        if pid == 'post15': meta_en = ''  # placeholder date on source
    if not meta_en and meta_m: meta_en = he_date_to_en(H.unescape(meta_m.group(1))) or ''
    body = d['body']
    # drop stray Hebrew lines and nav remnants from EN body
    lines = [l for l in body.split('\n') if not re.search(r'[א-ת]', l) and l.strip() not in ('« Previous', 'Next »')]
    body = '\n'.join(lines)
    content = (f'<span class="meta">{meta_en}</span>' if meta_en else '') + build_post_content(body, keep_fig, swap)
    seg = seg[:cm.start()] + cm.group(1) + content + cm.group(3) + seg[cm.end():]
    s = s[:st] + seg + s[en:]
    page_spans = [(mm.start(), mm.group(1)) for mm in re.finditer(r'<div class="page[^"]*" id="pg-([a-z0-9]+)"', s)]
    post_report[pid] = len(body)
print('posts:', post_report)

# ---- 1c. newsletter index rebuild ----
UNOFFICIAL = {
 'post0': {'title': 'Registration Open for the 2022-2023 Growth Group', 'date': '', 'excerpt': 'We are pleased to announce that registration has opened for the 2023-2024 Growth Group for women in their fifties and sixties.'},
 'post1': {'title': 'Newsletter December 2023', 'date': 'March 17, 2024', 'excerpt': 'The Counseling Center for Women continues to operate as a treatment center, offering psychotherapy for women in a feminist approach, also during the war.'},
 'post2': {'title': 'Newsletter August 2024', 'date': 'August 15, 2024', 'excerpt': 'Newsletter August 2024'},
}
import datetime as _dt
def _en_date(d):
    raw = (d or {}).get('date') or ''
    if re.match(r'\d{4}-\d{2}-\d{2}', raw):
        y, mo, da = raw.split('-')
        try: return _dt.date(int(y), int(mo), int(da)).strftime('%B %-d, %Y')
        except Exception: return ''
    return ''
def _excerpt(body):
    for line in body.split('\n'):
        t = line.strip()
        if not t or t.startswith('class=') or re.search(r'[\u05d0-\u05ea]', t): continue
        if len(t) < 70 and not t.endswith('.'): continue
        t = re.sub(r'\s+', ' ', t)
        return (t[:177] + '\u2026') if len(t) > 180 else t
    return ''
b = page_bounds('newsletter')
if b:
    st, en = b
    seg = s[st:en]
    def _nc(mm):
        inner = mm.group(0)
        pm = re.search(r'data-go="(post\d+)"', inner)
        if not pm: return inner
        pid2 = pm.group(1)
        if pid2 in UNOFFICIAL:
            u = UNOFFICIAL[pid2]; title, date, exc = u['title'], u['date'], u['excerpt']
        else:
            d = en_posts.get(pid2)
            if not d: return inner
            title = H.unescape(d['title']).strip()
            date = _en_date(d)
            if pid2 == 'post15': date = ''
            exc = _excerpt(d['body'])
        def escp(x): return x.replace('&','&amp;').replace('"','&quot;')
        inner = re.sub(r'<span class=meta>[^<]*</span>', f'<span class=meta>{escp(date)}</span>', inner, count=1)
        inner = re.sub(r'<h3>[^<]*</h3>', f'<h3>{escp(title)}</h3>', inner, count=1)
        inner = re.sub(r'<p>.*?</p>', f'<p>{escp(exc)}</p>', inner, count=1, flags=re.S)
        return inner
    seg = re.sub(r'<div class="nc">.*?(?=<div class="nc">|</div></div></div>)', _nc, seg, flags=re.S)
    s = s[:st] + seg + s[en:]
    page_spans = [(mm.start(), mm.group(1)) for mm in re.finditer(r'<div class="page[^"]*" id="pg-([a-z0-9]+)"', s)]
    print('newsletter index rebuilt')

# ---- 2. text node translation ----
misses = {}
def sub_node(mm):
    t = mm.group(1)
    n = norm(t)
    if not HE.search(n): return mm.group(0)
    k = key(t)
    en_txt = HIT.get(k)
    if en_txt is None and k in [key(x) for x in ui]:
        pass
    if en_txt is None:
        for uk, uv in ui.items():
            if key(uk) == k: en_txt = uv; break
    if en_txt is None:
        misses[k] = n
        return mm.group(0)
    lead = t[:len(t)-len(t.lstrip())]; trail = t[len(t.rstrip()):]
    return '>' + lead + esc_html_text(en_txt).replace('\n','<br>') + trail + '<'

s2 = re.sub(r'>([^<>]+)<', sub_node, s)
# mark agent-translated posts (no official EN exists)
_banner = '<p class="unoff">Unofficial translation of the Hebrew original.</p>'
for _pid in ('post0', 'post1', 'post2'):
    _i = s2.find('id="pg-%s"' % _pid)
    if _i >= 0:
        _j = s2.find('<div class="pg-b">', _i)
        if _j >= 0:
            _j += len('<div class="pg-b">')
            s2 = s2[:_j] + _banner + s2[_j:]
# EN-mode chrome: aria labels + scanned-doc card titles (docs themselves stay Hebrew originals)
for _he, _en in [
    ('aria-label="תפריט"', 'aria-label="Menu"'),
    ('aria-label="הבא"', 'aria-label="Next"'),
    ('aria-label="הקודם"', 'aria-label="Previous"'),
    ('aria-label="שותפים לדרך"', 'aria-label="Partners"'),
    ('aria-label="בחירת עיצוב"', 'aria-label="Choose a design"'),
    ('<div class="t">אישור ניהול תקין</div>', '<div class="t">Proper Administration Certificate (Hebrew)</div>'),
    ('<div class="t">תעודה לרישום מלכ”ר</div>', '<div class="t">Nonprofit Registration Certificate (Hebrew)</div>'),
    ('<div class="t">אישור ניכוי מס</div>', '<div class="t">Tax Withholding Certificate (Hebrew)</div>'),
    ('<div class="t">תקנון העמותה</div>', '<div class="t">Association Bylaws (Hebrew)</div>'),
]:
    if _he in s2:
        s2 = s2.replace(_he, _en)
    else:
        print('note: not present, skipped (ok if intentionally removed):', _he[:50])
s2 = s2.replace('<a href="#" data-lang="en">EN</a>', '<a href="#" data-lang="he">עברית</a>').replace('<a href="#">EN</a>', '<a href="#" data-lang="he">עברית</a>')

# re-escape into TS string
esc = s2.replace('\\','\x00').replace('"','\\"').replace('\n','\\n').replace('\x00','\\\\')
open(ROOT / 'src' / 'body-en.ts', 'w', encoding='utf-8').write('export const htmlEn = "' + esc + '";\n')
json.dump(misses, open(BASE / 'misses.json', 'w'), ensure_ascii=False, indent=1)
print('grids:', grid_report)
print('remaining misses:', len(misses))

