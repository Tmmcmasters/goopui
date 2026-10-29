"""Puddle brand (brand/puddle/): trace the goop engine's resting pose into the static marks.

    node brand/tools/puddle.mjs capture        # renders brand/puddle/rest-capture.png
    uv run --with numpy --with scikit-image --with shapely --with fonttools --with pillow --with scipy \\
        python brand/tools/puddle.py
    node brand/tools/puddle.mjs raster         # og.png + apple-touch-icon.png for apps/soon

The capture is the engine's SVG goo filter at 10x; its coverage is smoothed a touch, the 50%
level is traced (same tracer as the other directions: cubic Beziers, goo.trace) and the path
is kept in host px, so GoopLogo.vue's static fallback lines up with the live goo exactly.
The wordmark is the DynaPuff outline from brand/button/lockup.svg (ink = currentColor).
"""

from __future__ import annotations

import html
import json
import os
import re
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

sys.path.insert(0, os.path.dirname(__file__))
import goo  # noqa: E402
from build import bbox_of_d, transform_d  # noqa: E402

BRAND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
OUT = os.path.join(BRAND, "puddle")
SLIME = "#1fa64a"
LIGHT, DARK = "#faf8f3", "#141210"
INK, INK_DARK = "#2a2622", "#f3efe7"
f = goo._fmt


def trace_blob() -> str:
    meta = json.load(open(os.path.join(OUT, "rest-capture.json")))
    im = np.asarray(Image.open(os.path.join(OUT, "rest-capture.png")).convert("RGB")).astype(float)
    cov = gaussian_filter(np.clip((255 - im[..., 0]) / 255, 0, 1), meta["scale"] * 0.2)
    s, p = 1 / meta["scale"], -meta["pad"]
    gr = goo.Grid(p, p, p + (cov.shape[1] - 1) * s, p + (cov.shape[0] - 1) * s, s)
    return goo.trace(gr, 0.5 - cov, err=0.03, corner_deg=80, min_area=50)


def wordmark() -> list[str]:
    src = open(os.path.join(BRAND, "button", "lockup.svg")).read()
    paths = re.findall(r'<path class="i"[^>]* d="([^"]+)"', src)
    return [d for d in paths if not d.startswith("M65.59")]  # drop the pillow body


def box(x, y, w, h):
    return f"{f(x)} {f(y)} {f(w)} {f(h)}"


def write(name, text):
    with open(os.path.join(OUT, name), "w") as fh:
        fh.write(text + "\n")


def main():
    d = trace_blob()
    x0, y0, x1, y1 = bbox_of_d(d)
    pad = 1.5
    mark_box = (x0 - pad, y0 - pad, x1 - x0 + 2 * pad, y1 - y0 + 2 * pad)
    head = 'xmlns="http://www.w3.org/2000/svg"'
    write("mark.svg", f'<svg {head} viewBox="{box(*mark_box)}" role="img" aria-label="goopUI"><title>goopUI</title><path fill="{SLIME}" d="{d}"/></svg>')
    write("mark-mono.svg", f'<svg {head} viewBox="{box(*mark_box)}" role="img" aria-label="goopUI"><title>goopUI</title><path fill="currentColor" d="{d}"/></svg>')

    # Favicon: same silhouette, filling a square with a hair of margin so it reads at 16px.
    side = max(x1 - x0, y1 - y0) + 2.0
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    write("favicon.svg", f'<svg {head} viewBox="{box(cx - side / 2, cy - side / 2, side, side)}"><path fill="{SLIME}" d="{d}"/></svg>')

    # Lockup: blob sized a little over the cap height, sitting on the baseline, then the wordmark.
    words = wordmark()
    wb = (min(bbox_of_d(w)[0] for w in words), min(bbox_of_d(w)[1] for w in words),
          max(bbox_of_d(w)[2] for w in words), max(bbox_of_d(w)[3] for w in words))
    k = 80 / (y1 - y0)
    gap = 18
    dx = wb[0] - gap - x1 * k
    dy = 3 - y1 * k
    blob = transform_d(d, dx, dy, k)
    bx0, by0, _, _ = bbox_of_d(blob)
    lx0, ly0 = bx0 - 2, min(by0, wb[1]) - 2
    lbox = (lx0, ly0, wb[2] + 2 - lx0, wb[3] + 2 - ly0)
    ink = "".join(f'<path d="{w}"/>' for w in words)
    write("lockup.svg", f'<svg {head} viewBox="{box(*lbox)}" role="img" aria-label="goopUI"><title>goopUI</title><path fill="{SLIME}" d="{blob}"/><g fill="currentColor">{ink}</g></svg>')
    write("lockup-mono.svg", f'<svg {head} viewBox="{box(*lbox)}" role="img" aria-label="goopUI"><title>goopUI</title><g fill="currentColor"><path d="{blob}"/>{ink}</g></svg>')
    # For GoopLogo.vue: where the live goo host sits inside the lockup, and the static path in host px.
    meta = json.load(open(os.path.join(OUT, "rest-capture.json")))
    geo = {
        "lockupViewBox": [round(v, 2) for v in lbox],
        "host": [round(v, 2) for v in (dx, dy, meta["width"] * k, meta["height"] * k)],
        "hostSize": [meta["width"], meta["height"]],
        "blob": d,
    }
    write("geometry.json", json.dumps(geo, indent=2))
    gallery(d, mark_box, cx, cy, side, blob, ink, lbox)
    print("mark bbox (host px):", [round(v, 2) for v in (x0, y0, x1, y1)])
    print("lockup viewBox:", box(*lbox), "blob in lockup:", [round(v, 1) for v in bbox_of_d(blob)])


def gallery(d, mark_box, cx, cy, side, blob, ink, lbox):
    fav = box(cx - side / 2, cy - side / 2, side, side)

    def icon(size, fill=SLIME):
        return f'<svg viewBox="{fav}" width="{size}" height="{size}" aria-hidden="true"><path fill="{fill}" d="{d}"/></svg>'

    def lock(h, mono=False):
        w = h * lbox[2] / lbox[3]
        b = f'<path fill="{"currentColor" if mono else SLIME}" d="{blob}"/>'
        return f'<svg viewBox="{box(*lbox)}" width="{w:.1f}" height="{h}" aria-hidden="true">{b}<g fill="currentColor">{ink}</g></svg>'

    def panel(bg, fg, label):
        sizes = "".join(f'<figure>{icon(s)}<figcaption>{s}px</figcaption></figure>' for s in (16, 32, 64, 256))
        return (f'<section style="background:{bg};color:{fg}"><h2>{label}</h2><div class="row">{sizes}</div>'
                f'<div class="row">{lock(40)}{lock(26)}</div><div class="row">{lock(32, True)}{icon(64, "currentColor")}</div></section>')

    note = html.escape(
        "The mark is one goopy Slime-green puddle: a soft, slightly lumpy, round-ish blob, like a drop that just "
        "landed. It is not drawn by hand. It is the goop engine's own resting pose (core's SVG goo filter on a "
        "52x38 round host with two lumps tucked into its underside), traced to Beziers. On the web the logo is "
        "live: apps/soon's GoopLogo.vue attaches the same engine with the same numbers, so the static SVG and the "
        "live goo are the same shape, and the blob wobbles toward the cursor, splashes droplets on fast passes "
        "and squishes on click. Reduced motion keeps this static mark. Wordmark: DynaPuff, ink = currentColor."
    )
    page = f"""<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>goopUI puddle mark</title>
<style>
:root{{color-scheme:light}}body{{margin:0;font:15px/1.5 ui-sans-serif,system-ui,sans-serif;background:#fff;color:{INK}}}
main{{max-width:960px;margin:0 auto;padding:32px 16px}}h1{{font-size:22px;margin:0 0 8px}}p{{max-width:70ch;color:#5d564e}}
section{{border-radius:16px;padding:24px;margin:20px 0}}h2{{font-size:13px;font-weight:600;margin:0 0 16px;opacity:.7}}
.row{{display:flex;flex-wrap:wrap;align-items:flex-end;gap:32px;margin-bottom:24px}}figure{{margin:0;display:flex;flex-direction:column;align-items:center;gap:8px}}
figcaption{{font-size:12px;opacity:.6}}svg{{max-width:100%;height:auto}}
</style>
<main><h1>goopUI: the puddle</h1><p>{note}</p>
{panel(LIGHT, INK, "Light")}
{panel(DARK, INK_DARK, "Dark")}
<p>Files: mark.svg, mark-mono.svg, favicon.svg, lockup.svg, lockup-mono.svg. Rebuild: brand/tools/puddle.mjs + puddle.py.</p>
</main></html>"""
    write("index.html", page)


if __name__ == "__main__":
    main()
