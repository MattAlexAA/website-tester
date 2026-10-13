"""Convert between the standalone site file and the claude.ai editor page.

  python3 editor/sitesync.py to-editor index.html editor/asap-site-editor.html [skeleton.txt]
  python3 editor/sitesync.py to-site  <editor or saved artifact html> index.html

The editor page is the site's <title>/<link>/<style>/<script> blocks (marked
data-src) and its preview bar, nav, main and footer (marked data-edit), plus
the toolbar from editor/editor-ui.html. to-site reverses that exactly.
"""
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent
SITE_TITLE = "<title>ASAP Assets — website preview</title>"
EDITOR_TITLE = "<title>ASAP Assets Website</title>"
SITE_HEAD = (
    '<!DOCTYPE html>\n<html lang="en-AU">\n<head>\n<meta charset="utf-8">\n'
    '<meta content="width=device-width, initial-scale=1.0" name="viewport">\n'
    '<meta content="noindex" name="robots">\n'
)
EDIT_OPEN = re.compile(r'<(div class="preview-bar"|nav|main id="top"|footer)>')
KEEP_OPEN = re.compile(r'<(title|script|link|style)\b')


def mark(chunk, pattern, attr):
    return pattern.sub(lambda m: f"<{m.group(1)} {attr}", chunk)


def to_editor(site, skeleton):
    head = site.split("<head>", 1)[1].split("</head>", 1)[0]
    body = site.split("<body>", 1)[1].split("</body>", 1)[0]
    head = head[head.index("<title>"):].replace(SITE_TITLE, EDITOR_TITLE)
    # site scripts at the end of body
    i = body.index("</footer>") + len("</footer>")
    content, scripts = body[:i], body[i:]
    content = re.sub(r'^<(div class="preview-bar"|nav|main id="top"|footer)>',
                     lambda m: f"<{m.group(1)} data-edit>", content, flags=re.M)
    out = (mark(head.strip(), KEEP_OPEN, 'data-src')
           + "\n" + content.strip()
           + "\n" + mark(scripts.strip(), KEEP_OPEN, 'data-src')
           + "\n" + (HERE / "editor-ui.html").read_text().replace("'__SKELETON__'", json.dumps(skeleton)))
    return out


def to_site(doc):
    body = doc.split("<body>", 1)[1].rsplit("</body>", 1)[0] if "<body>" in doc else doc
    body = re.sub(r'<(style|script) data-src="editor">.*?</\1>\s*', "", body, flags=re.S)
    body = re.sub(r' data-src(="")?(?=[ >])', "", body)
    body = re.sub(r' data-edit(="")?(?=[ >])', "", body)
    body = body.replace(' hidden="">', " hidden>")
    i = body.index('<div class="preview-bar"')
    head, rest = body[:i], body[i:]
    head = head.replace(EDITOR_TITLE, SITE_TITLE).strip()
    return SITE_HEAD + head + "\n</head>\n<body>\n" + rest.strip() + "\n</body>\n</html>\n"


if __name__ == "__main__":
    cmd, src, dst = sys.argv[1:4]
    text = Path(src).read_text()
    if cmd == "to-editor":
        skel = Path(sys.argv[4]).read_text().strip() if len(sys.argv) > 4 else ""
        Path(dst).write_text(to_editor(text, skel))
    else:
        Path(dst).write_text(to_site(text))
