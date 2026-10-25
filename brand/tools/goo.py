"""Geometry toolkit for the goopUI brand marks.

Everything is built as signed distance fields (negative = inside) and blended with a
C2-continuous cubic smooth-min, so every join between blobs, drips and letterforms has
continuous curvature. The zero level set is then traced and fitted with cubic Beziers
(Schneider's algorithm), so the shipped SVGs are plain path data with no filters.

Glyph outlines come from freely licensed variable fonts via fontTools and are emitted
exactly (not traced) unless a letter is merged with goo.
"""

from __future__ import annotations

import math
import os
from dataclasses import dataclass, field

import numpy as np
import shapely
from fontTools.pens.recordingPen import DecomposingRecordingPen
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from skimage import measure

FONT_DIR = os.environ.get("GOOP_FONT_DIR", os.path.join(os.path.dirname(__file__), ".fonts"))

# ---------------------------------------------------------------------------------------
# Fonts


_font_cache: dict = {}


def load_font(filename: str, **axes) -> TTFont:
    key = (filename, tuple(sorted(axes.items())))
    if key not in _font_cache:
        f = TTFont(os.path.join(FONT_DIR, filename))
        if "fvar" in f:
            f = instantiateVariableFont(f, axes, inplace=False)
        _font_cache[key] = f
    return _font_cache[key]


@dataclass
class Glyph:
    char: str
    x: float  # pen position (font units, before scale)
    advance: float
    commands: list  # recording pen value, font units, y up


def shape_text(font: TTFont, text: str, tracking: float = 0.0, kerning: dict | None = None) -> list[Glyph]:
    cmap = font.getBestCmap()
    gs = font.getGlyphSet()
    out: list[Glyph] = []
    x = 0.0
    for i, ch in enumerate(text):
        name = cmap[ord(ch)]
        pen = DecomposingRecordingPen(gs)
        gs[name].draw(pen)
        adv = gs[name].width
        out.append(Glyph(ch, x, adv, pen.value))
        x += adv + tracking
        if kerning and i + 1 < len(text):
            x += kerning.get(text[i : i + 2], 0.0)
    return out


def _fmt(v: float) -> str:
    s = f"{v:.2f}".rstrip("0").rstrip(".")
    return "0" if s in ("-0", "") else s


class Xform:
    """Font units (y up) -> SVG units (y down): X = ox + s*x, Y = oy - s*y."""

    def __init__(self, s: float, ox: float, oy: float):
        self.s, self.ox, self.oy = s, ox, oy

    def __call__(self, p):
        return (self.ox + self.s * p[0], self.oy - self.s * p[1])


def glyph_path(g: Glyph, xf: Xform) -> str:
    """Exact outline of a glyph as SVG path data (quadratics kept as Q)."""
    parts = []
    off = lambda p: xf((p[0] + g.x, p[1]))  # noqa: E731
    for op, args in g.commands:
        if op == "moveTo":
            parts.append("M" + " ".join(_fmt(c) for c in off(args[0])))
        elif op == "lineTo":
            parts.append("L" + " ".join(_fmt(c) for c in off(args[0])))
        elif op == "qCurveTo":
            pts = list(args)
            if pts[-1] is None:  # all-off-curve contour, rare
                raise ValueError("unsupported implied-on-curve contour")
            # expand TrueType implied on-curve points
            for i in range(len(pts) - 1):
                c = pts[i]
                if i < len(pts) - 2:
                    n = pts[i + 1]
                    end = ((c[0] + n[0]) / 2, (c[1] + n[1]) / 2)
                else:
                    end = pts[-1]
                parts.append("Q" + " ".join(_fmt(v) for v in off(c) + off(end)))
        elif op == "curveTo":
            parts.append("C" + " ".join(_fmt(v) for p in args for v in off(p)))
        elif op == "closePath" or op == "endPath":
            parts.append("Z")
    return "".join(parts)


def glyph_polygon(g: Glyph, steps: int = 24) -> shapely.Geometry:
    """Flattened glyph outline as a shapely geometry in font units (y up), even-odd."""
    rings = []
    cur: list = []
    last = None
    for op, args in g.commands:
        if op == "moveTo":
            cur = [args[0]]
            last = args[0]
        elif op == "lineTo":
            cur.append(args[0])
            last = args[0]
        elif op == "qCurveTo":
            pts = list(args)
            for i in range(len(pts) - 1):
                c = pts[i]
                end = ((c[0] + pts[i + 1][0]) / 2, (c[1] + pts[i + 1][1]) / 2) if i < len(pts) - 2 else pts[-1]
                for t in np.linspace(0, 1, steps + 1)[1:]:
                    cur.append(((1 - t) ** 2 * last[0] + 2 * (1 - t) * t * c[0] + t * t * end[0],
                                (1 - t) ** 2 * last[1] + 2 * (1 - t) * t * c[1] + t * t * end[1]))
                last = end
        elif op == "curveTo":
            c1, c2, end = args
            for t in np.linspace(0, 1, steps + 1)[1:]:
                mt = 1 - t
                cur.append((mt**3 * last[0] + 3 * mt * mt * t * c1[0] + 3 * mt * t * t * c2[0] + t**3 * end[0],
                            mt**3 * last[1] + 3 * mt * mt * t * c1[1] + 3 * mt * t * t * c2[1] + t**3 * end[1]))
            last = end
        elif op in ("closePath", "endPath"):
            if len(cur) > 2:
                rings.append([(p[0] + g.x, p[1]) for p in cur])
            cur = []
    # TrueType: filled contours are clockwise (y up), counters counter-clockwise. Variable
    # fonts keep overlapping contours, so union the fills and subtract the counters
    # (equivalent to the nonzero rule for these glyphs).
    fills, holes = [], []
    for r in rings:
        ring = shapely.LinearRing(r)
        (holes if ring.is_ccw else fills).append(shapely.Polygon(r).buffer(0))
    geom = shapely.union_all(fills)
    if holes:
        geom = geom.difference(shapely.union_all(holes))
    return geom


def glyph_rings(g: Glyph, steps: int = 24):
    """Flattened contours (font units, y up) in drawing order, for surgery on a glyph."""
    rings = []
    cur: list = []
    last = None
    for op, args in g.commands:
        if op == "moveTo":
            cur = [args[0]]
            last = args[0]
        elif op == "lineTo":
            cur.append(args[0])
            last = args[0]
        elif op == "qCurveTo":
            pts = list(args)
            for i in range(len(pts) - 1):
                c = pts[i]
                end = ((c[0] + pts[i + 1][0]) / 2, (c[1] + pts[i + 1][1]) / 2) if i < len(pts) - 2 else pts[-1]
                for t in np.linspace(0, 1, steps + 1)[1:]:
                    cur.append(((1 - t) ** 2 * last[0] + 2 * (1 - t) * t * c[0] + t * t * end[0],
                                (1 - t) ** 2 * last[1] + 2 * (1 - t) * t * c[1] + t * t * end[1]))
                last = end
        elif op == "curveTo":
            c1, c2, end = args
            for t in np.linspace(0, 1, steps + 1)[1:]:
                mt = 1 - t
                cur.append((mt**3 * last[0] + 3 * mt * mt * t * c1[0] + 3 * mt * t * t * c2[0] + t**3 * end[0],
                            mt**3 * last[1] + 3 * mt * mt * t * c1[1] + 3 * mt * t * t * c2[1] + t**3 * end[1]))
            last = end
        elif op in ("closePath", "endPath"):
            if len(cur) > 2:
                rings.append(np.array([(p[0] + g.x, p[1]) for p in cur]))
            cur = []
    return rings


# ---------------------------------------------------------------------------------------
# Signed distance fields on a grid (SVG coordinates, y down)


@dataclass
class Grid:
    x0: float
    y0: float
    x1: float
    y1: float
    step: float
    X: np.ndarray = field(init=False)
    Y: np.ndarray = field(init=False)

    def __post_init__(self):
        xs = np.arange(self.x0, self.x1 + self.step * 0.5, self.step)
        ys = np.arange(self.y0, self.y1 + self.step * 0.5, self.step)
        self.X, self.Y = np.meshgrid(xs, ys)


def sd_circle(gr: Grid, cx, cy, r):
    return np.hypot(gr.X - cx, gr.Y - cy) - r


def sd_box(gr: Grid, cx, cy, hw, hh, r=0.0):
    """Rounded box centered at (cx, cy), half extents hw/hh, corner radius r."""
    qx = np.abs(gr.X - cx) - (hw - r)
    qy = np.abs(gr.Y - cy) - (hh - r)
    return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r


def sd_squircle(gr: Grid, cx, cy, hw, hh, r, n=4.0):
    """Superellipse-cornered box (continuous-curvature corners, like iOS icons)."""
    qx = np.maximum(np.abs(gr.X - cx) - (hw - r), 0) / r
    qy = np.maximum(np.abs(gr.Y - cy) - (hh - r), 0) / r
    inner = np.minimum(np.maximum(np.abs(gr.X - cx) - hw, np.abs(gr.Y - cy) - hh), 0)
    rr = (qx**n + qy**n) ** (1 / n)
    return (rr - 1) * r + inner


def sd_capsule(gr: Grid, ax, ay, bx, by, ra, rb=None):
    """Uneven capsule (cone with round caps) from a (radius ra) to b (radius rb). Exact."""
    if rb is None:
        rb = ra
    px, py = gr.X - ax, gr.Y - ay
    bax, bay = bx - ax, by - ay
    l2 = bax * bax + bay * bay
    rr = ra - rb
    a2 = l2 - rr * rr
    if a2 <= 0:  # one end swallows the other: just the bigger circle
        return np.hypot(gr.X - (ax if ra >= rb else bx), gr.Y - (ay if ra >= rb else by)) - max(ra, rb)
    il2 = 1.0 / l2
    # rotate into capsule frame
    y = px * bax + py * bay
    z = y - l2
    xx = (px * l2 - bax * y) ** 2 + (py * l2 - bay * y) ** 2
    y2 = y * y * l2
    z2 = z * z * l2
    k = np.sign(rr) * rr * rr * xx
    d = np.where(
        np.sign(z) * a2 * z2 > k,
        np.sqrt(xx + z2) * il2 - rb,
        np.where(np.sign(y) * a2 * y2 < k, np.sqrt(xx + y2) * il2 - ra, (np.sqrt(np.maximum(xx * a2 * il2, 0)) + y * rr) * il2 - ra),
    )
    return d


def sd_geom(gr: Grid, geom: shapely.Geometry):
    """Exact signed distance to a shapely geometry (already in grid coordinates)."""
    pts = shapely.points(gr.X.ravel(), gr.Y.ravel())
    d = shapely.distance(shapely.boundary(geom), pts) if not isinstance(geom, shapely.MultiPolygon) else shapely.distance(geom.boundary, pts)
    inside = shapely.contains_xy(geom, gr.X.ravel(), gr.Y.ravel())
    d = np.where(inside, -d, d)
    return d.reshape(gr.X.shape)


def smin(a, b, k):
    """Cubic polynomial smooth min: C2 continuous, so the iso-contour is G2 (curvature continuous)."""
    if k <= 0:
        return np.minimum(a, b)
    h = np.maximum(k - np.abs(a - b), 0.0) / k
    return np.minimum(a, b) - h**3 * k / 6.0


def smax(a, b, k):
    return -smin(-a, -b, k)


# ---------------------------------------------------------------------------------------
# Tracing + Bezier fitting


def _bez(ctrl, t):
    t = np.asarray(t)[:, None]
    mt = 1 - t
    return mt**3 * ctrl[0] + 3 * mt * mt * t * ctrl[1] + 3 * mt * t * t * ctrl[2] + t**3 * ctrl[3]


def _bez_d1(ctrl, t):
    t = np.asarray(t)[:, None]
    mt = 1 - t
    return 3 * mt * mt * (ctrl[1] - ctrl[0]) + 6 * mt * t * (ctrl[2] - ctrl[1]) + 3 * t * t * (ctrl[3] - ctrl[2])


def _bez_d2(ctrl, t):
    t = np.asarray(t)[:, None]
    return 6 * (1 - t) * (ctrl[2] - 2 * ctrl[1] + ctrl[0]) + 6 * t * (ctrl[3] - 2 * ctrl[2] + ctrl[1])


def _unit(v):
    n = np.linalg.norm(v)
    return v / n if n > 1e-12 else v


def _chord_params(pts):
    d = np.r_[0, np.cumsum(np.linalg.norm(np.diff(pts, axis=0), axis=1))]
    return d / d[-1] if d[-1] > 0 else d


def _fit_one(pts, u, t1, t2):
    p0, p3 = pts[0], pts[-1]
    A1 = t1[None, :] * (3 * (1 - u) ** 2 * u)[:, None]
    A2 = t2[None, :] * (3 * (1 - u) * u**2)[:, None]
    C = np.array([[np.sum(A1 * A1), np.sum(A1 * A2)], [np.sum(A1 * A2), np.sum(A2 * A2)]])
    base = _bez(np.array([p0, p0, p3, p3]), u)
    tmp = pts - base
    X = np.array([np.sum(A1 * tmp), np.sum(A2 * tmp)])
    det = C[0, 0] * C[1, 1] - C[0, 1] * C[1, 0]
    seg = np.linalg.norm(p3 - p0)
    if abs(det) > 1e-12:
        a1 = (X[0] * C[1, 1] - X[1] * C[0, 1]) / det
        a2 = (C[0, 0] * X[1] - C[1, 0] * X[0]) / det
    else:
        a1 = a2 = seg / 3
    if a1 < seg * 1e-6 or a2 < seg * 1e-6:
        a1 = a2 = seg / 3
    return np.array([p0, p0 + t1 * a1, p3 + t2 * a2, p3])


def _reparam(ctrl, pts, u):
    q = _bez(ctrl, u) - pts
    d1 = _bez_d1(ctrl, u)
    d2 = _bez_d2(ctrl, u)
    num = np.sum(q * d1, axis=1)
    den = np.sum(d1 * d1, axis=1) + np.sum(q * d2, axis=1)
    nu = u - np.where(np.abs(den) > 1e-12, num / den, 0)
    nu = np.clip(nu, 0, 1)
    if np.any(np.diff(nu) <= 0):
        return u
    return nu


def fit_cubic(pts, t1, t2, err):
    """Schneider: returns list of 4x2 control arrays approximating pts within err."""
    if len(pts) == 2:
        dist = np.linalg.norm(pts[1] - pts[0]) / 3
        return [np.array([pts[0], pts[0] + t1 * dist, pts[1] + t2 * dist, pts[1]])]
    u = _chord_params(pts)
    ctrl = _fit_one(pts, u, t1, t2)
    for _ in range(12):
        d = np.linalg.norm(_bez(ctrl, u) - pts, axis=1)
        if d.max() < err:
            return [ctrl]
        u = _reparam(ctrl, pts, u)
        ctrl = _fit_one(pts, u, t1, t2)
    d = np.linalg.norm(_bez(ctrl, u) - pts, axis=1)
    if d.max() < err:
        return [ctrl]
    split = int(np.argmax(d[1:-1])) + 1
    split = min(max(split, 2), len(pts) - 3) if len(pts) > 5 else max(1, min(split, len(pts) - 2))
    tc = _unit(pts[split - 1] - pts[split + 1])
    return fit_cubic(pts[: split + 1], t1, tc, err) + fit_cubic(pts[split:], -tc, t2, err)


def _resample(pts, spacing):
    seg = np.linalg.norm(np.diff(pts, axis=0), axis=1)
    d = np.r_[0, np.cumsum(seg)]
    n = max(int(round(d[-1] / spacing)), 8)
    s = np.linspace(0, d[-1], n + 1)
    return np.c_[np.interp(s, d, pts[:, 0]), np.interp(s, d, pts[:, 1])]


def fit_closed(poly, err=0.5, spacing=1.0, corner_deg=40.0):
    """Fit a closed polyline with cubics. Detect corners (sharp turns) and keep them sharp;
    elsewhere tangents are shared, so the result is G1 and visually G2 (fit from a G2 field)."""
    pts = np.asarray(poly, float)
    if np.allclose(pts[0], pts[-1]):
        pts = pts[:-1]
    pts = _resample(np.vstack([pts, pts[:1]]), spacing)[:-1]
    n = len(pts)
    # turning angle using a small window
    w = 2
    prev = pts - np.roll(pts, w, axis=0)
    nxt = np.roll(pts, -w, axis=0) - pts
    ang = np.degrees(np.arccos(np.clip(np.sum(prev * nxt, 1) / (np.linalg.norm(prev, axis=1) * np.linalg.norm(nxt, axis=1) + 1e-12), -1, 1)))
    corners = []
    i = 0
    cand = np.where(ang > corner_deg)[0]
    # non-max suppression in windows
    for c in cand:
        if corners and (c - corners[-1]) <= 2 * w:
            if ang[c] > ang[corners[-1]]:
                corners[-1] = c
            continue
        corners.append(int(c))
    if corners and len(corners) > 1 and (corners[0] + n - corners[-1]) <= 2 * w:
        if ang[corners[-1]] > ang[corners[0]]:
            corners = corners[1:]
        else:
            corners = corners[:-1]
    segs = []
    if not corners:
        # split at two far points, shared smooth tangents
        a, b = 0, n // 2
        ta = _unit(pts[1] - pts[-1])
        tb = _unit(pts[b + 1] - pts[b - 1])
        run1 = pts[a : b + 1]
        run2 = np.vstack([pts[b:], pts[:1]])
        segs += fit_cubic(run1, ta, -tb, err)
        segs += fit_cubic(run2, tb, -ta, err)
    else:
        rolled = np.roll(pts, -corners[0], axis=0)
        cs = [c - corners[0] for c in corners] + [n]
        for s, e in zip(cs[:-1], cs[1:]):
            run = rolled[s : e + 1] if e < n else np.vstack([rolled[s:], rolled[:1]])
            if len(run) < 2:
                continue
            t1 = _unit(run[min(1, len(run) - 1)] - run[0])
            t2 = _unit(run[-2] - run[-1]) if len(run) > 1 else -t1
            # snap near-axis-aligned straight runs
            segs += fit_cubic(run, t1, t2, err)
    return segs


def segs_to_d(segs) -> str:
    out = ["M" + _fmt(segs[0][0][0]) + " " + _fmt(segs[0][0][1])]
    for c in segs:
        # collapse straight segments to L
        p0, p1, p2, p3 = c
        chord = p3 - p0
        L = np.linalg.norm(chord)
        straight = False
        if L > 1e-6:
            nrm = np.array([-chord[1], chord[0]]) / L
            straight = abs(np.dot(p1 - p0, nrm)) < 0.05 and abs(np.dot(p2 - p0, nrm)) < 0.05
        if straight:
            out.append("L" + _fmt(p3[0]) + " " + _fmt(p3[1]))
        else:
            out.append("C" + " ".join(_fmt(v) for p in (p1, p2, p3) for v in p))
    out.append("Z")
    return "".join(out)


def trace(gr: Grid, field_, err=None, corner_deg=40.0, min_area=None) -> str:
    """Trace the zero level set of a field into SVG path data (use fill-rule evenodd)."""
    err = err if err is not None else gr.step * 0.35
    contours = measure.find_contours(field_, 0.0)
    ds = []
    for c in contours:
        # (row, col) -> (x, y)
        pts = np.c_[gr.x0 + c[:, 1] * gr.step, gr.y0 + c[:, 0] * gr.step]
        if len(pts) < 6:
            continue
        area = 0.5 * abs(np.dot(pts[:, 0], np.roll(pts[:, 1], 1)) - np.dot(pts[:, 1], np.roll(pts[:, 0], 1)))
        if min_area is not None and area < min_area:
            continue
        segs = fit_closed(pts, err=err, spacing=gr.step * 0.75, corner_deg=corner_deg)
        ds.append(segs_to_d(segs))
    return "".join(ds)


# ---------------------------------------------------------------------------------------
# Color


def _lin(c):
    c = c / 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def luminance(hexcolor: str) -> float:
    h = hexcolor.lstrip("#")
    r, g, b = (int(h[i : i + 2], 16) for i in (0, 2, 4))
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)


def contrast(a: str, b: str) -> float:
    la, lb = luminance(a), luminance(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)
