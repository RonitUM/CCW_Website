# appended logic for generate.py: replace post pages wholesale
import re, json, html as H

MONTHS_HE = {'ינואר':'January','פברואר':'February','מרץ':'March','אפריל':'April','מאי':'May','יוני':'June','יולי':'July','אוגוסט':'August','ספטמבר':'September','אוקטובר':'October','נובמבר':'November','דצמבר':'December'}
def he_date_to_en(d):
    m = re.match(r'(\d{1,2}) ב(ינואר|פברואר|מרץ|אפריל|מאי|יוני|יולי|אוגוסט|ספטמבר|אוקטובר|נובמבר|דצמבר) (\d{4})', d or '')
    if not m: return None
    return f"{MONTHS_HE[m.group(2)]} {int(m.group(1))}, {m.group(3)}"

def build_post_content(body, keep_fig=None, fig_class_swap=None):
    parts = []
    if keep_fig:
        fc, ar = keep_fig
        if fig_class_swap:
            fc = fig_class_swap
            if fc == 'i-wday26en': ar = '1127/945'
        parts.append(f'<div class="bg {fc} fig" role="img" aria-label="" style="aspect-ratio:{ar};"></div>')
    for line in body.split('\n'):
        t = line.strip()
        if not t or t == 'class="entry-content">': continue
        t = re.sub(r'^class="entry-content">', '', t).strip()
        if not t: continue
        t = re.sub(r'\s+', ' ', t)
        esc = t.replace('&','&amp;').replace('"','&quot;')
        if len(t) < 70 and not t.endswith(('.',',',';','!','?')) and not t.startswith('“'):
            parts.append(f'<h4>{esc}</h4>')
        else:
            parts.append(f'<p>{esc}</p>')
    return ''.join(parts)
