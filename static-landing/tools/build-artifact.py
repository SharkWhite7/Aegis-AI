"""Gera a versão publicável da landing (sem o invólucro html/head/body).

Uso:  python3 tools/build-artifact.py   (a partir de static-landing/)
"""
import pathlib, re

ROOT = pathlib.Path(__file__).resolve().parent.parent
src = (ROOT / "index.html").read_text()

head_keep = []
for pat in [r'<title>.*?</title>', r'<meta name="claude:viewport-fit-sides"[^>]*>',
            r'<meta name="description"[^>]*>',
            r'<link rel="preconnect"[^>]*>', r'<link rel="stylesheet"[^>]*>']:
    head_keep += re.findall(pat, src, re.S)

body = re.search(r'<body>(.*)</body>', src, re.S).group(1)
out = "\n".join(head_keep) + "\n" + body.strip() + "\n"

dest = ROOT / ".artifact" / "page.html"
dest.parent.mkdir(exist_ok=True)
dest.write_text(out)
print("gerado:", dest.relative_to(ROOT), len(out), "bytes")
