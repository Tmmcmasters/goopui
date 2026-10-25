"""Round 2: the goopUI brand rebuilt around DynaPuff (brand/<direction>/ + brand/index.html).

    sh brand/tools/fetch-fonts.sh
    uv run --with numpy --with scikit-image --with shapely --with fonttools python brand/tools/build2.py

Same construction as round 1 (build.py): signed distance fields, C2 smooth-min joins,
traced to cubic Beziers. Letters untouched by goo are exact DynaPuff outlines.
"""

from __future__ import annotations

import os
import sys

import numpy as np
import shapely
from shapely import affinity

sys.path.insert(0, os.path.dirname(__file__))
import goo  # noqa: E402
from build import (  # noqa: E402
    BRAND, SEAM, Art, Direction, Layer, exact, fit_box, gsvg, lockup, svg, tl, word, write,
)
from goo import Grid, load_font, smin, smax  # noqa: E402

DYNA = "dynapuff_DynaPuff[wdth,wght].ttf"
WGHT, WDTH = 600, 100
TRACK = -22  # font units; DynaPuff's default spacing is airy for a logo


def font():
    return load_font(DYNA, wght=WGHT, wdth=WDTH)


def drip(gr, x, y_top, neck, bulb, length):
    """A hanging drip: tapered neck from (x, y_top) into a round bulb `length` below."""
    return smin(goo.sd_capsule(gr, x, y_top, x, y_top + length - bulb * 0.35, neck, bulb * 0.8),
                goo.sd_circle(gr, x, y_top + length, bulb), bulb * 0.6)


def two_tone(gr, f, f_ink_only, f_drip, reach=6.0):
    """Color split without a straight seam. The goo layer is the drip plus its fillet,
    extended a little under the letter/body, and painted first; the exact ink shape is
    painted on top, so the color change follows the letter's own outline."""
    gooey = goo.trace(gr, np.maximum.reduce([f, -(f_ink_only + 1.0), f_drip - reach]), corner_deg=50, min_area=0.5)
    ink = goo.trace(gr, f_ink_only, corner_deg=50)
    return [Layer(gooey, "goo"), Layer(ink, "ink")]


def bottom_y(geom, x):
    """Lowest point of a shape's outline along a vertical line (SVG y grows down)."""
    line = shapely.LineString([(x, -1e4), (x, 1e4)])
    inter = geom.intersection(line)
    return inter.bounds[3]


# ---------------------------------------------------------------------------------------
# Button: a puffy pillow button with a big drip


def mark_button():
    gr = Grid(0, 0, 64, 64, 0.04)
    body = goo.sd_box(gr, 32, 21, 29.5, 18, 15.5)
    d = drip(gr, 41.5, 37.5, 6.4, 10.2, 13.6)
    f = smin(body, d, 10.0)
    mono = [Layer(goo.trace(gr, f, corner_deg=60), "goo")]
    color = two_tone(gr, f, body, d)
    return Art(color, mono, (0, 0, 64, 64))


# ---------------------------------------------------------------------------------------
# Merge: DynaPuff's own o's, fused


def fused_oo(gr, o1, o2, k):
    outer = smin(goo.sd_geom(gr, shapely.Polygon(o1.exterior)), goo.sd_geom(gr, shapely.Polygon(o2.exterior)), k)
    holes = np.minimum(goo.sd_geom(gr, shapely.Polygon(o1.interiors[0])), goo.sd_geom(gr, shapely.Polygon(o2.interiors[0])))
    return np.maximum(outer, -holes)


def mark_merge():
    f = font()
    gl, xf = word(f, "oo")
    o1, o2 = gsvg(gl[0], xf), gsvg(gl[1], xf)
    # pull the second o in until the gap is 0.6 units, and bounce it up a touch
    o2 = affinity.translate(o2, -(o2.bounds[0] - o1.bounds[2]) + 0.6, -2.4)
    both = o1.union(o2)
    b = both.bounds
    s = 60.0 / (b[2] - b[0])
    h = (b[3] - b[1]) * s
    m = lambda g: affinity.affine_transform(g, [s, 0, 0, s, 2 - b[0] * s, (64 - h) / 2 - b[1] * s])  # noqa: E731
    gr = Grid(0, 0, 64, 64, 0.04)
    d = goo.trace(gr, fused_oo(gr, m(o1), m(o2), 9.0))
    return Art([Layer(d, "goo")], [Layer(d, "goo")], (0, 0, 64, 64))


def wordmark_merge(f):
    gl, xf = word(f, "goopUI", tracking=TRACK)
    o1, o2 = gsvg(gl[1], xf), gsvg(gl[2], xf)
    pull = (o2.bounds[0] - o1.bounds[2]) - 0.6
    for g in gl[2:]:
        g.x -= pull / xf.s
    o2 = affinity.translate(gsvg(gl[2], xf), 0, -2.4)
    b = o1.union(o2).bounds
    gr = Grid(b[0] - 4, b[1] - 4, b[2] + 4, b[3] + 4, 0.06)
    d = goo.trace(gr, fused_oo(gr, o1, o2, 9.0), corner_deg=50)
    color = exact(gl, xf, skip=(1, 2))
    color.insert(1, Layer(d, "goo"))
    mono = exact(gl, xf, skip=(1, 2))
    mono.insert(1, Layer(d, "ink"))
    return color, mono, gl, xf


# ---------------------------------------------------------------------------------------
# Drip g: DynaPuff's g with its hook swapped for a hanging drop


def drip_g_field(gr, g_geom, s=1.0):
    """DynaPuff g, hook intact, with a drop hanging from the low point of the hook. (Cutting
    the hook off turned the g into a q, so the drop hangs off it instead.)"""
    gb = g_geom.bounds
    x = gb[0] + (gb[2] - gb[0]) * 0.47
    y = bottom_y(g_geom, x)
    f_g = goo.sd_geom(gr, g_geom)
    dr = drip(gr, x, y - 2.5 * s, 5.0 * s, 8.6 * s, 14.0 * s)
    return smin(f_g, dr, 6.5 * s), f_g, dr


def mark_drip_g(f):
    gl, xf = word(f, "g")
    g = gsvg(gl[0], xf)
    probe = Grid(-10, -80, 80, 80, 0.4)
    full, _, _ = drip_g_field(probe, g)
    ys = np.where((full < 0).any(axis=1))[0]
    xs = np.where((full < 0).any(axis=0))[0]
    x0, x1 = probe.x0 + xs[0] * probe.step, probe.x0 + xs[-1] * probe.step
    y0, y1 = probe.y0 + ys[0] * probe.step, probe.y0 + ys[-1] * probe.step
    s = 59.0 / max(y1 - y0, x1 - x0)
    ox = 32 - (x0 + x1) / 2 * s
    oy = 32 - (y0 + y1) / 2 * s
    g2 = affinity.affine_transform(g, [s, 0, 0, s, ox, oy])
    gr = Grid(0, 0, 64, 64, 0.04)
    fm, f_ink, dr = drip_g_field(gr, g2, s=s)
    d = goo.trace(gr, fm, corner_deg=50)
    return Art([Layer(d, "goo")], [Layer(d, "goo")], (0, 0, 64, 64))


def wordmark_drip_g(f):
    gl, xf = word(f, "goopUI", tracking=TRACK)
    g = gsvg(gl[0], xf)
    b = g.bounds
    gr = Grid(b[0] - 3, b[1] - 3, b[2] + 3, b[3] + 24, 0.05)
    fg, f_ink, dr = drip_g_field(gr, g)
    color = two_tone(gr, fg, f_ink, dr)
    mono = [Layer(goo.trace(gr, fg, corner_deg=50), "ink")]
    rest = exact(gl, xf, skip=(0,))
    return color + rest, mono + rest, gl, xf


# ---------------------------------------------------------------------------------------
# Melt: the wordmark melting, drips off several letter bottoms. Mark: the U dripping.

# (glyph index, x position across the glyph 0..1, neck, bulb, length) in SVG units at size 100
MELT_DRIPS = [
    (2, 0.60, 3.4, 5.0, 9.5),   # second o: short
    (4, 0.38, 4.2, 6.6, 15.5),  # U: the long one
    (5, 0.50, 3.6, 5.4, 11.0),  # I: medium
]


def melt_letter(gr, geom, spec, s=1.0):
    _, fx, neck, bulb, length = spec
    b = geom.bounds
    x = b[0] + (b[2] - b[0]) * fx
    y = bottom_y(geom, x)
    f_l = goo.sd_geom(gr, geom)
    dr = drip(gr, x, y - 2.5 * s, neck * s, bulb * s, length * s)
    return smin(f_l, dr, 6.5 * s), f_l, dr


def wordmark_melt(f):
    gl, xf = word(f, "goopUI", tracking=TRACK)
    skip = {spec[0] for spec in MELT_DRIPS}
    color = exact(gl, xf, skip=skip)
    mono = list(color)
    for spec in MELT_DRIPS:
        geom = gsvg(gl[spec[0]], xf)
        b = geom.bounds
        gr = Grid(b[0] - 8, b[1] - 3, b[2] + 8, b[3] + spec[4] + spec[3] + 4, 0.05)
        fl, f_ink, dr = melt_letter(gr, geom, spec)
        color += two_tone(gr, fl, f_ink, dr)
        mono.append(Layer(goo.trace(gr, fl, corner_deg=50), "ink"))
    return color, mono, gl, xf


def mark_melt(f):
    gl, xf = word(f, "U")
    u = gsvg(gl[0], xf)
    spec = (0, 0.6, 6.2, 9.4, 17.0)
    b = u.bounds
    total_h = (b[3] - b[1]) + spec[4] + spec[3] - 1
    s = 59.0 / total_h
    w = (b[2] - b[0]) * s
    u2 = affinity.affine_transform(u, [s, 0, 0, s, (64 - w) / 2 - b[0] * s, 2.5 - b[1] * s])
    gr = Grid(0, 0, 64, 64, 0.04)
    fl, f_ink, dr = melt_letter(gr, u2, spec, s=s)
    mono = [Layer(goo.trace(gr, fl, corner_deg=50), "goo")]
    return Art(two_tone(gr, fl, f_ink, dr), mono, (0, 0, 64, 64))


# ---------------------------------------------------------------------------------------

PITCHES = {
    "button": "GoopButton as a pillow. A puffy, fully rounded button with a fat drip swelling off its bottom edge, the drip now big enough to read at header size. The body stays ink so it sits in a neutral shadcn UI; the slime drip is the only color. The wordmark is plain DynaPuff, so all the goo lives in the mark.",
    "merge": "DynaPuff's own o's, pulled together. The second o bounces up a touch, the way DynaPuff's letters bob on the baseline, and a fat metaball bridge joins them. As a mark it's two chubby rings that read as oo, eyes, or a pair of bubbles; in the wordmark the fused oo is the only color.",
    "dripg": "DynaPuff's g, with a fat drop hanging off the bottom of its hook, as if the descender is still running. (Swapping the hook for the drop turned the g into a q, so the hook stays.) Chunky enough to hold up as a one-letter favicon, and in the wordmark the drop is the only accent.",
    "melt": "New for DynaPuff: the whole word is melting. Drips of different lengths hang off the o, the U and the I, so the wordmark looks warm and soft without changing a letter. The mark is the dripping U, a little cup of goo that also says UI.",
}


def build_round2():
    f = font()
    dirs = []

    A = Direction("button", "Pillow button", "DynaPuff SemiBold", "DynaPuff", PITCHES["button"], "#1fa64a", "Slime", avatar_bg="ink")
    A.mark = A.favicon = mark_button()
    gl, xf = word(f, "goopUI", tracking=TRACK)
    wl = exact(gl, xf)
    A.wordmark = Art(wl, wl, fit_box(wl, 3))
    A.lockup = lockup(A.mark, wl, wl, f, xf, mark_scale=1.25, gap=0.26, nudge=0.06)
    dirs.append(A)

    B = Direction("merge", "Merge", "DynaPuff SemiBold", "DynaPuff", PITCHES["merge"], "#f0428f", "Bubblegum")
    B.mark = B.favicon = mark_merge()
    c, m, gl, xf = wordmark_merge(f)
    B.wordmark = Art(c, m, fit_box(m, 3))
    B.lockup = lockup(B.mark, c, m, f, xf, mark_scale=1.35, gap=0.22, nudge=-0.02)
    dirs.append(B)

    C = Direction("dripg", "Drip g", "DynaPuff SemiBold", "DynaPuff", PITCHES["dripg"], "#9a5cf7", "Jelly")
    C.mark = C.favicon = mark_drip_g(f)
    c, m, gl, xf = wordmark_drip_g(f)
    C.wordmark = Art(c, m, fit_box(m, 3))
    C.lockup = lockup(C.mark, c, m, f, xf, mark_scale=1.4, gap=0.22, nudge=0.14)
    dirs.append(C)

    D = Direction("melt", "Melt", "DynaPuff SemiBold", "DynaPuff", PITCHES["melt"], "#f06414", "Tangerine")
    D.mark = D.favicon = mark_melt(f)
    c, m, gl, xf = wordmark_melt(f)
    D.wordmark = Art(c, m, fit_box(m, 3))
    D.lockup = lockup(D.mark, c, m, f, xf, mark_scale=1.4, gap=0.22, nudge=0.12)
    dirs.append(D)
    return dirs


def emit(dirs):
    for d in dirs:
        base = os.path.join(BRAND, d.slug)
        for name, art in (("mark", d.mark), ("wordmark", d.wordmark), ("lockup", d.lockup)):
            write(os.path.join(base, f"{name}.svg"), svg(art, "color", goo_color=d.goo))
            write(os.path.join(base, f"{name}-mono.svg"), svg(art, "mono"))


def round1_section(r1_dirs):
    rows = []
    for d in r1_dirs:
        w = 40 * d.lockup.box[2] / d.lockup.box[3]
        rows.append(
            f'<div class="panel light">{svg(d.lockup, "fixed", "", goo_color=d.goo, width=f"{w:.1f}", height=40)}'
            f'<span class="lbl">{d.name} · {d.font_label}</span></div>'
        )
    return (
        '<h3 id="round-1">Round 1, for comparison</h3>'
        '<p class="lead" style="margin-bottom:12px">The first set, before DynaPuff. Full sheet: '
        '<a href="round-1/index.html">round-1/index.html</a>.</p>'
        f'<div class="grid">{"".join(rows)}</div>'
    )


if __name__ == "__main__":
    import build
    import preview

    dirs = build_round2()
    emit(dirs)
    r1 = build.build()
    lead = (
        "Round 2, set in DynaPuff SemiBold (OFL). Same construction as round 1: real path data, no filters; "
        "blobs and drips are signed distance fields joined with a C2 smooth-min and traced to cubic Béziers, "
        "and untouched letters are exact DynaPuff outlines. Marks are chunky enough that one cut serves 16px to 180px."
    )
    preview.write_preview(
        dirs, svg, BRAND, title="goopUI brand · round 2", lead=lead,
        nav='<nav class="pagenav"><a aria-current="page">Round 2 (DynaPuff)</a><a href="round-1/index.html">Round 1</a></nav>',
        extra=round1_section(r1),
    )
