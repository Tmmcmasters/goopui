"""Round 1: build the goopUI brand SVGs (brand/round-1/) and their preview page.

    sh brand/tools/fetch-fonts.sh
    uv run --with numpy --with scikit-image --with shapely --with fonttools python brand/tools/build.py

Every blob, drip and bridge is a signed distance field. Shapes are joined with a cubic
smooth-min (C2), so joins have continuous curvature; the zero contour is traced and fitted
with cubic Beziers. Letters that are not touched by goo are emitted as exact font outlines.
"""

from __future__ import annotations

import os
import re
import sys
from dataclasses import dataclass, field

import numpy as np
import shapely
from shapely import affinity

sys.path.insert(0, os.path.dirname(__file__))
import goo  # noqa: E402
from goo import Grid, Xform, glyph_path, glyph_polygon, load_font, shape_text, smin  # noqa: E402

BRAND = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
ROOT = os.path.join(BRAND, "round-1")  # round 1 lives under brand/round-1/; round 2 is build2.py

INK = "#09090b"  # shadcn zinc-950 (light foreground, dark background)
INK_DARK = "#fafafa"  # shadcn zinc-50 (dark foreground)

# Overlap between the ink part and the goo part of a two-color shape, so no hairline seam
# shows where they meet. The goo layer is painted last and covers the overlap.
SEAM = 0.35


@dataclass
class Layer:
    d: str
    role: str  # "ink" | "goo"
    rule: str = "evenodd"  # traced paths are evenodd; exact font outlines are nonzero


@dataclass
class Art:
    layers: list[Layer]  # color version (roles)
    mono: list[Layer]  # one-color version (merged, no internal seams)
    box: tuple[float, float, float, float]  # viewBox x, y, w, h


@dataclass
class Direction:
    slug: str
    name: str
    font_label: str
    font_file: str
    pitch: str
    goo: str
    goo_name: str
    mark: Art | None = None
    favicon: Art | None = None
    wordmark: Art | None = None
    lockup: Art | None = None
    avatar_bg: str = "goo"  # "goo": white mark on brand color, "ink": color mark on ink


# ---------------------------------------------------------------------------------------
# helpers


def to_svg_space(geom, xf: Xform):
    return affinity.affine_transform(geom, [xf.s, 0, 0, -xf.s, xf.ox, xf.oy])


def bbox_of_d(d: str):
    nums = [float(v) for v in re.findall(r"-?\d+(?:\.\d+)?", d)]
    xs, ys = nums[0::2], nums[1::2]
    return min(xs), min(ys), max(xs), max(ys)


def union_box(boxes):
    return (min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes))


def fit_box(layers, pad):
    b = union_box([bbox_of_d(l.d) for l in layers])
    return (b[0] - pad, b[1] - pad, b[2] - b[0] + 2 * pad, b[3] - b[1] + 2 * pad)


def transform_d(d: str, dx: float, dy: float, s: float = 1.0) -> str:
    """Scale then translate absolute path data (M/L/C/Q/Z only) without a transform attr."""
    out = []
    i = 0
    for t in re.findall(r"[MLCQZ]|-?\d+(?:\.\d+)?", d):
        if t in "MLCQZ":
            out.append(t)
            i = 0
            continue
        v = float(t) * s + (dx if i % 2 == 0 else dy)
        i += 1
        if out and out[-1] not in "MLCQZ":
            out.append(" ")
        out.append(goo._fmt(v))
    return "".join(out)


def tl(layers, dx, dy, s=1.0):
    return [Layer(transform_d(l.d, dx, dy, s), l.role, l.rule) for l in layers]


def word(font, text, size=100.0, tracking=0.0):
    gl = shape_text(font, text, tracking=tracking)
    return gl, Xform(size / font["head"].unitsPerEm, 0.0, 0.0)


def exact(gl, xf, skip=()):
    return [Layer(glyph_path(g, xf), "ink", "nonzero") for i, g in enumerate(gl) if i not in skip and g.commands]


def gsvg(g, xf):
    return to_svg_space(glyph_polygon(g), xf)


def split_layers(gr, f, y_split, ink_role="ink", goo_role="goo", corner=50):
    """Two-color split of one field at a horizontal line: ink above, goo below."""
    ink = goo.trace(gr, np.maximum(f, gr.Y - (y_split + SEAM)), corner_deg=corner)
    gooey = goo.trace(gr, np.maximum(f, -(gr.Y - (y_split - SEAM))), corner_deg=corner)
    return [Layer(ink, ink_role), Layer(gooey, goo_role)]


# ---------------------------------------------------------------------------------------
# A. Button: a shadcn-radius button body with a drip hanging off its bottom edge.


def mark_button(small=False):
    gr = Grid(0, 0, 64, 64, 0.04)
    top, bottom = (7, 42) if not small else (4, 37)
    body = goo.sd_box(gr, 32, (top + bottom) / 2, 28 if not small else 29, (bottom - top) / 2, 11 if not small else 10)
    cx = 39.5
    if not small:
        drip = goo.sd_capsule(gr, cx, bottom + 1.5, cx, bottom + 11.5, 4.4, 7.6)
        f = smin(body, drip, 9.0)
    else:  # fatter neck and bulb so the drip survives at 16px
        drip = goo.sd_capsule(gr, cx, bottom + 1, cx, bottom + 12.5, 7.0, 10.4)
        f = smin(body, drip, 8.0)
    mono = [Layer(goo.trace(gr, f, corner_deg=60), "goo")]
    color = split_layers(gr, f, bottom + 0.2, corner=60)
    return Art(color, mono, (0, 0, 64, 64))


# ---------------------------------------------------------------------------------------
# B. Merge: the "oo" as two rings fused by a metaball bridge.


def mark_merge(small=False):
    gr = Grid(0, 0, 64, 64, 0.04)
    R = 14.6 if not small else 15.0  # outer radius
    hole = 6.0 if not small else 5.0
    c = 15.2 if not small else 15.4  # half distance between centers
    k = 13.0 if not small else 12.0
    outer = smin(goo.sd_circle(gr, 32 - c, 32, R), goo.sd_circle(gr, 32 + c, 32, R), k)
    holes = np.minimum(goo.sd_circle(gr, 32 - c, 32, hole), goo.sd_circle(gr, 32 + c, 32, hole))
    f = np.maximum(outer, -holes)
    d = goo.trace(gr, f)
    return Art([Layer(d, "goo")], [Layer(d, "goo")], (0, 0, 64, 64))


def wordmark_merge(font):
    gl, xf = word(font, "goopUI", tracking=-6)
    o1, o2 = gsvg(gl[1], xf), gsvg(gl[2], xf)
    gap = o2.bounds[0] - o1.bounds[2]
    shift = gap - 2.0  # leave a 2 unit gap for the bridge to span
    for g in gl[2:]:
        g.x -= shift / xf.s
    o2 = gsvg(gl[2], xf)
    b = o1.union(o2).bounds
    gr = Grid(b[0] - 4, b[1] - 4, b[2] + 4, b[3] + 4, 0.06)
    outer = smin(goo.sd_geom(gr, shapely.Polygon(o1.exterior)), goo.sd_geom(gr, shapely.Polygon(o2.exterior)), 16.0)
    holes = np.minimum(goo.sd_geom(gr, shapely.Polygon(o1.interiors[0])), goo.sd_geom(gr, shapely.Polygon(o2.interiors[0])))
    d = goo.trace(gr, np.maximum(outer, -holes), corner_deg=50)
    color = exact(gl, xf, skip=(1, 2))
    color.insert(1, Layer(d, "goo"))
    mono = exact(gl, xf, skip=(1, 2))
    mono.insert(1, Layer(d, "ink"))
    return color, mono, gl, xf


# ---------------------------------------------------------------------------------------
# C. Drip g: a binocular g whose lower loop has become a hanging drop.

BRICO = "bricolagegrotesque_BricolageGrotesque[opsz,wdth,wght].ttf"


def g_bowl(g, xf):
    """Bowl + ear of Bricolage's binocular g, with the link and lower loop removed.

    The outer contour is cut on either side of where the link leaves the bowl (font units
    (65.17, 260.58) and (226.83, 190.83), both on-curve points) and closed with a cubic that
    continues the bowl's own tangents.
    """
    rings = goo.glyph_rings(g)
    areas = [abs(shapely.Polygon(r).area) for r in rings]
    outer = rings[int(np.argmax(areas))]
    p1 = np.array([65.17 + g.x, 260.58])
    p2 = np.array([226.83 + g.x, 190.83])
    i1 = int(np.argmin(np.linalg.norm(outer - p1, axis=1)))
    i2 = int(np.argmin(np.linalg.norm(outer - p2, axis=1)))
    n = len(outer)
    sect = outer[i1 : i2 + 1] if i1 < i2 else np.vstack([outer[i1:], outer[: i2 + 1]])
    # does this section contain the bowl top? if not, take the other way round
    if sect[:, 1].max() < 400:
        sect = outer[i2 : i1 + 1] if i2 < i1 else np.vstack([outer[i2:], outer[: i1 + 1]])
        sect = sect[::-1]
    a, b = sect[-1], sect[0]
    ta = _unit(sect[-1] - sect[-3])
    tb = _unit(sect[0] - sect[2])
    L = np.linalg.norm(b - a) * 0.36
    c = np.array([a, a + ta * L, b + tb * L, b])
    t = np.linspace(0, 1, 16)[1:-1, None]
    closing = (1 - t) ** 3 * c[0] + 3 * (1 - t) ** 2 * t * c[1] + 3 * (1 - t) * t * t * c[2] + t**3 * c[3]
    poly = shapely.Polygon(np.vstack([sect, closing])).buffer(0)
    # trim the ear flush with the bowl's widest point so the right side reads as one edge
    poly = poly.intersection(shapely.box(-1e4, -1e4, 488 + g.x, 1e4))
    for r in rings:
        if shapely.LinearRing(r).is_ccw and poly.contains(shapely.Polygon(r).representative_point()):
            poly = poly.difference(shapely.Polygon(r))
    # fill the hairline wedge between the ear and the bowl shoulder: reads as a crack small
    closed = poly.buffer(60, join_style="round").buffer(-60, join_style="round")
    gaps = closed.difference(poly)
    for part in getattr(gaps, "geoms", [gaps]):
        c = part.centroid
        if 300 + g.x < c.x < 450 + g.x and 360 < c.y < 450:
            poly = poly.union(part)
    return to_svg_space(poly, xf)


def _unit(v):
    return v / np.linalg.norm(v)


def drip_g_field(gr, bowl, s=1.0, small=False):
    """g bowl+ear joined to a neck and a round drop (the lower loop, now goo)."""
    bx0, by0, bx1, by1 = bowl.bounds
    cx = bx0 + (bx1 - bx0) * 0.47
    cut = by1  # bowl bottom
    f_g = goo.sd_geom(gr, bowl)
    nr = (4.4, 7.6, 12.8) if not small else (5.6, 8.6, 13.8)
    if small == "word":  # in running text the drop has to carry the whole lower half of the g
        nr = (5.0, 8.4, 14.2)
    neck = goo.sd_capsule(gr, cx, cut - 3 * s, cx, cut + 11 * s, nr[0] * s, nr[1] * s)
    bulb = goo.sd_circle(gr, cx, cut + 19.5 * s, nr[2] * s)
    return smin(f_g, smin(neck, bulb, 6 * s), 7 * s), cut, cut + 19.5 * s + nr[2] * s


def mark_drip_g(font, small=False):
    gl, xf = word(font, "g")
    bowl = g_bowl(gl[0], xf)
    gr0 = Grid(-10, -70, 70, 50, 0.5)
    _, cut, bottom = drip_g_field(gr0, bowl, small=small)
    bx0, by0, bx1, _ = bowl.bounds
    s = 58.0 / (bottom - by0)
    w = (bx1 - bx0) * s
    ox = (64 - w) / 2 - bx0 * s
    oy = 3.0 - by0 * s
    bowl2 = affinity.affine_transform(bowl, [s, 0, 0, s, ox, oy])
    gr = Grid(0, 0, 64, 64, 0.04)
    f, _, _ = drip_g_field(gr, bowl2, s=s, small=small)
    d = goo.trace(gr, f, corner_deg=50)
    return Art([Layer(d, "goo")], [Layer(d, "goo")], (0, 0, 64, 64))


def wordmark_drip_g(font):
    gl, xf = word(font, "goopUI", tracking=-8)
    bowl = g_bowl(gl[0], xf)
    gr = Grid(-2, -56, 58, 40, 0.06)
    f, cut, _ = drip_g_field(gr, bowl, small="word")
    color = split_layers(gr, f, cut + 0.4)
    mono = [Layer(goo.trace(gr, f, corner_deg=50), "ink")]
    rest = exact(gl, xf, skip=(0,))
    return color + rest, mono + rest, gl, xf


# ---------------------------------------------------------------------------------------
# D. Droplet: one viscous drop necking off a ledge.


def mark_droplet(small=False):
    gr = Grid(0, 0, 64, 64, 0.04)
    if not small:
        ledge = goo.sd_box(gr, 32, 8.0, 26, 4.0, 4.0)
        neck = goo.sd_capsule(gr, 32, 17, 32, 32, 3.6, 8.5)
        bulb = goo.sd_circle(gr, 32, 43.0, 16.5)
        f = smin(smin(bulb, neck, 8.0), ledge, 13.0)
    else:
        ledge = goo.sd_box(gr, 32, 7.5, 28, 5.5, 5.5)
        neck = goo.sd_capsule(gr, 32, 17, 32, 32, 5.2, 9.0)
        bulb = goo.sd_circle(gr, 32, 43.0, 17.5)
        f = smin(smin(bulb, neck, 7.0), ledge, 11.0)
    d = goo.trace(gr, f)
    return Art([Layer(d, "goo")], [Layer(d, "goo")], (0, 0, 64, 64))


def wordmark_drip_i(font):
    """goopUI where the I's stem drips a drop below the baseline."""
    gl, xf = word(font, "goopUI", tracking=-6)
    gI = gsvg(gl[5], xf)
    b = gI.bounds
    cx, w, base = (b[0] + b[2]) / 2, b[2] - b[0], b[3]
    gr = Grid(b[0] - 14, b[1] - 3, b[2] + 14, base + 34, 0.05)
    neck = goo.sd_capsule(gr, cx, base - 1, cx, base + 8, w * 0.32, w * 0.55)
    bulb = goo.sd_circle(gr, cx, base + 14.5, w * 0.8)
    f = smin(goo.sd_geom(gr, gI), smin(neck, bulb, 5.0), 8.0)
    rest = exact(gl, xf, skip=(5,))
    color = rest + split_layers(gr, f, base)
    mono = rest + [Layer(goo.trace(gr, f, corner_deg=50), "ink")]
    return color, mono, gl, xf


# ---------------------------------------------------------------------------------------
# SVG output


def _path(l: Layer, fill: str) -> str:
    rule = ' fill-rule="evenodd"' if l.rule == "evenodd" else ""
    return f'<path fill="{fill}"{rule} d="{l.d}"/>' if fill else f'<path class="i"{rule} d="{l.d}"/>'


def svg(art: Art, mode: str, title: str = "goopUI", goo_color: str = "", ink: str = INK, ink_dark: str = INK_DARK, width=None, height=None) -> str:
    """mode: color (ink follows prefers-color-scheme), mono (currentColor), fixed (explicit)."""
    x, y, w, h = art.box
    attrs = f'xmlns="http://www.w3.org/2000/svg" viewBox="{goo._fmt(x)} {goo._fmt(y)} {goo._fmt(w)} {goo._fmt(h)}"'
    if width:
        attrs += f' width="{width}" height="{height}"'
    attrs += f' role="img" aria-label="{title}"' if title else ' aria-hidden="true"'
    style, body = "", []
    if mode == "mono":
        body = [_path(l, "currentColor") for l in art.mono]
    elif mode == "color":
        if any(l.role == "ink" for l in art.layers):
            style = f"<style>.i{{fill:{ink}}}@media (prefers-color-scheme:dark){{.i{{fill:{ink_dark}}}}}</style>"
        body = [_path(l, "" if l.role == "ink" else goo_color) for l in art.layers]
    elif mode == "fixed":
        body = [_path(l, ink if l.role == "ink" else goo_color) for l in art.layers]
    elif mode == "fixed-mono":
        body = [_path(l, ink) for l in art.mono]
    t = f"<title>{title}</title>" if title else ""
    return f"<svg {attrs}>{t}{style}{''.join(body)}</svg>"


def lockup(mark: Art, wcolor, wmono, font, xf, mark_scale=1.3, gap=0.34, nudge=0.0):
    cap = font["OS/2"].sCapHeight * xf.s
    mh = cap * mark_scale
    s = mh / 64.0
    my = -cap / 2 - mh / 2 + nudge * cap
    wb = union_box([bbox_of_d(l.d) for l in wmono])
    dx = mh + gap * cap - wb[0]
    color = tl(mark.layers, 0, my, s) + tl(wcolor, dx, 0)
    mono = tl(mark.mono, 0, my, s) + tl(wmono, dx, 0)
    return Art(color, mono, fit_box(mono, cap * 0.06))


def write(path, text):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(text + "\n")


PITCHES = {
    "button": "The product, literally. A shadcn-radius button with one drip hanging off its bottom edge, exactly the shape GoopButton makes on hover. The body is plain ink, so it sits quietly in a neutral UI, and the drip is the only color. Geist keeps the wordmark in the same family as the shadcn and Vercel world it lives next to.",
    "merge": "The double o in goop, caught mid-merge. Two rings pulled together by a metaball bridge, the same goo the engine's filter makes when two shapes get close. It reads as oo, as a pair of eyes, as two things becoming one. Outfit's geometric bowls make the bridge in the wordmark feel native instead of stuck on.",
    "dripg": "A monogram with a personality. A binocular g whose lower loop has stopped being a loop and is now a heavy drop hanging from the bowl. Bricolage Grotesque brings some ink-trap character to the wordmark, so this is the most editorial, illustrative option and the most ownable as a single letter.",
    "droplet": "One viscous drop necking off a ledge, the instant before it lets go. It is the simplest silhouette of the four and the easiest to spot in a row of tabs. In the wordmark the I drips the same drop below the baseline. DM Sans is friendly and neutral and lets the honey do the talking.",
}


def build():
    dirs: list[Direction] = []

    fa = load_font("geist_Geist[wght].ttf", wght=600)
    A = Direction("button", "Button", "Geist SemiBold", "Geist", PITCHES["button"], "#12a150", "Slime", avatar_bg="ink")
    A.mark, A.favicon = mark_button(), mark_button(small=True)
    gl, xf = word(fa, "goopUI", tracking=-14)
    wl = exact(gl, xf)
    A.wordmark = Art(wl, wl, fit_box(wl, 3))
    A.lockup = lockup(A.mark, wl, wl, fa, xf, mark_scale=1.3, nudge=0.04)
    dirs.append(A)

    fb = load_font("outfit_Outfit[wght].ttf", wght=600)
    B = Direction("merge", "Merge", "Outfit SemiBold", "Outfit", PITCHES["merge"], "#e0307a", "Bubblegum")
    B.mark, B.favicon = mark_merge(), mark_merge(small=True)
    c, m, gl, xf = wordmark_merge(fb)
    B.wordmark = Art(c, m, fit_box(m, 3))
    B.lockup = lockup(B.mark, c, m, fb, xf, mark_scale=1.25, gap=0.3)
    dirs.append(B)

    fc = load_font(BRICO, opsz=96, wdth=100, wght=700)
    C = Direction("dripg", "Drip g", "Bricolage Grotesque Bold", "Bricolage Grotesque", PITCHES["dripg"], "#8b5cf6", "Grape")
    C.mark, C.favicon = mark_drip_g(fc), mark_drip_g(fc, small=True)
    c, m, gl, xf = wordmark_drip_g(fc)
    C.wordmark = Art(c, m, fit_box(m, 3))
    C.lockup = lockup(C.mark, c, m, fc, xf, mark_scale=1.5, gap=0.3, nudge=0.18)
    dirs.append(C)

    fd = load_font("dmsans_DMSans[opsz,wght].ttf", opsz=40, wght=600)
    D = Direction("droplet", "Droplet", "DM Sans SemiBold", "DM Sans", PITCHES["droplet"], "#d97706", "Honey")
    D.mark, D.favicon = mark_droplet(), mark_droplet(small=True)
    c, m, gl, xf = wordmark_drip_i(fd)
    D.wordmark = Art(c, m, fit_box(m, 3))
    D.lockup = lockup(D.mark, c, m, fd, xf, mark_scale=1.4, gap=0.32, nudge=0.04)
    dirs.append(D)
    return dirs


def emit(dirs):
    for d in dirs:
        base = os.path.join(ROOT, d.slug)
        for name, art in (("mark", d.mark), ("favicon", d.favicon), ("wordmark", d.wordmark), ("lockup", d.lockup)):
            write(os.path.join(base, f"{name}.svg"), svg(art, "color", goo_color=d.goo))
            write(os.path.join(base, f"{name}-mono.svg"), svg(art, "mono"))


if __name__ == "__main__":
    dirs = build()
    emit(dirs)
    import preview

    preview.write_preview(
        dirs, svg, ROOT, title="goopUI brand · round 1",
        nav='<nav class="pagenav"><a href="../index.html">Round 2 (DynaPuff)</a><a aria-current="page">Round 1</a></nav>',
    )
