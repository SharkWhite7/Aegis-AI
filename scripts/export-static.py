#!/usr/bin/env python3
"""
Export the site as a plain directory that can be served from anywhere —
including from a sub-path, which is where most of this script's work goes.

Run:  python3 scripts/export-static.py

`next build` with output: "export" gets you most of the way, but its
output assumes it will be served from the root of a domain. Four things
break when it is not, and each one cost a round trip to find:

  1. Everything lives under /_next/. Some hosts (the Claude artifact
     service among them) reserve paths beginning with an underscore, so
     the directory has to be renamed and every reference rewritten.

  2. Asset URLs are absolute (`/assets/...`). Served from a sub-path they
     resolve against the domain root and 404. Serving locally from the
     root hides this completely, which is how it shipped the first time —
     verify from a sub-path or the test proves nothing.

  3. Fixing the href/src attributes is NOT enough. React embeds a Flight
     payload in the HTML holding the same URLs in escaped form
     (\\"/assets/...\\"), and those drive the dynamic chunk loads. Miss
     them and the CSS loads while three chunks 404, so the page is styled
     but dead: no boot, no game selector, no index.

  4. The Turbopack runtime carries its own chunk base path constant.

Plus: the minified vendor chunk contains literal U+FFFD characters inside
string literals (a URL-decoding polyfill emits them for invalid byte
sequences). Some publishers reject files containing it, and escaping to
\\uFFFD is equivalent.

Everything here is verified at the end; the script exits non-zero if any
check fails.
"""

import os
import re
import shutil
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "out")
DST = os.path.join(ROOT, "out-pub")

# Single-page site: these are RSC prefetch payloads and a route we do not
# have. Dropping them avoids publishing files nothing requests.
DROP_PREFIXES = ("_not-found", "__next.", "index.txt")

TEXT_EXT = (".js", ".css", ".html", ".txt", ".json")


def run(cmd, **kw):
    print(f"  $ {' '.join(cmd)}")
    subprocess.run(cmd, check=True, cwd=ROOT, **kw)


def rewrite(path, pairs):
    with open(path, encoding="utf-8") as fh:
        before = fh.read()
    after = before
    for a, b in pairs:
        after = after.replace(a, b)
    if after != before:
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(after)
    return before != after


def main():
    print("1. building")
    env = dict(os.environ, STATIC_EXPORT="1")
    run(["npm", "run", "build"], env=env)
    if not os.path.isdir(SRC):
        sys.exit("out/ was not produced — did output: 'export' apply?")

    print("2. staging out-pub/")
    shutil.rmtree(DST, ignore_errors=True)
    shutil.copytree(SRC, DST)

    for name in os.listdir(DST):
        if name.startswith(DROP_PREFIXES):
            p = os.path.join(DST, name)
            shutil.rmtree(p) if os.path.isdir(p) else os.remove(p)

    print("3. _next -> assets")
    os.rename(os.path.join(DST, "_next"), os.path.join(DST, "assets"))

    print("4. absolute -> relative, in all four places")
    pairs = [
        # FIRST: the directory was renamed on disk, so every reference to
        # it has to follow. Forgetting this leaves the whole site asking
        # for /_next/ while the files sit under assets/.
        ("/_next/", "/assets/"),
        ('="/assets/', '="assets/'),      # href/src attributes
        ('="/favicon', '="favicon'),
        ('\\"/assets/', '\\"assets/'),     # React Flight payload
        ('\\"/favicon', '\\"favicon'),
        ('"/assets/', '"assets/'),         # Turbopack chunk base path
        ('"\ufffd"', '"\\uFFFD"'),         # publisher-safe escape
    ]
    touched = 0
    for dirpath, _, names in os.walk(DST):
        for n in names:
            if n.lower().endswith(TEXT_EXT):
                touched += rewrite(os.path.join(dirpath, n), pairs)
    print(f"   {touched} file(s) rewritten")

    print("5. verifying")
    problems = []
    for dirpath, _, names in os.walk(DST):
        for n in names:
            p = os.path.join(dirpath, n)
            rel = os.path.relpath(p, DST).replace("\\", "/")
            if rel.startswith("_"):
                problems.append(f"reserved path: {rel}")
            if not n.lower().endswith(TEXT_EXT):
                continue
            with open(p, encoding="utf-8") as fh:
                s = fh.read()
            # Check the CLASS, not the one symptom already known: any
            # surviving reference to the old directory, and any absolute
            # reference to the new one, in attribute or escaped form.
            if "_next" in s and "/_next/" in s:
                problems.append(f"stale /_next/ ref: {rel}")
            if re.search(r'\\?["\'](/assets/|/favicon)', s):
                problems.append(f"absolute asset ref: {rel}")
            if "\ufffd" in s:
                problems.append(f"U+FFFD: {rel}")
            if n.endswith(".js"):
                r = subprocess.run(["node", "--check", p], capture_output=True)
                if r.returncode:
                    problems.append(f"syntax: {rel} {r.stderr.decode()[:80]}")

    if problems:
        print("\nFAILED:")
        for p in problems:
            print("  -", p)
        sys.exit(1)

    n = sum(len(f) for _, _, f in os.walk(DST))
    print(f"\nok — {n} files in out-pub/, serveable from any path")
    print("Test it from a SUB-PATH, never from the root:")
    print("  mkdir -p /tmp/sim/a/b && cp -r out-pub/* /tmp/sim/a/b/")
    print("  (cd /tmp/sim && python3 -m http.server 3100)")
    print("  open http://localhost:3100/a/b/")


if __name__ == "__main__":
    main()
