"""Writes brand/index.html: a self-contained preview of every direction (all SVG inlined)."""

from __future__ import annotations

import html
import os

import goo

INK = "#09090b"
INK_DARK = "#fafafa"
DARK_BG = "#09090b"
WHITE = "#ffffff"


def write_preview(dirs, svg, root):
    def mark(d, ink, size, small=False, mono=None):
        art = d.favicon if small else d.mark
        if mono:
            return svg(art, "fixed-mono", "", ink=mono, width=size, height=size)
        return svg(art, "fixed", "", goo_color=d.goo, ink=ink, width=size, height=size)

    def art_h(d, art, ink, h, mono=None):
        w = h * art.box[2] / art.box[3]
        if mono:
            return svg(art, "fixed-mono", "", ink=mono, width=f"{w:.1f}", height=h)
        return svg(art, "fixed", "", goo_color=d.goo, ink=ink, width=f"{w:.1f}", height=h)

    def avatar(d, size, radius):
        art = d.mark if size >= 64 else d.favicon
        inner_size = round(size * 0.74, 1)
        if d.avatar_bg == "ink":
            bg, inner = INK, svg(art, "fixed", "", goo_color=d.goo, ink=INK_DARK, width=inner_size, height=inner_size)
        else:
            bg, inner = d.goo, svg(art, "fixed-mono", "", ink=WHITE, width=inner_size, height=inner_size)
        return f'<span class="avatar" style="width:{size}px;height:{size}px;border-radius:{radius};background:{bg}">{inner}</span>'

    cols = []
    for d in dirs:
        c_light = goo.contrast(d.goo, WHITE)
        c_dark = goo.contrast(d.goo, DARK_BG)
        sw = f"""
          <div class="swatches">
            <div class="sw"><span class="chip" style="background:{d.goo}"></span><div><b>{d.goo_name}</b> <code>{d.goo}</code><br><small>{c_light:.2f}:1 on white · {c_dark:.2f}:1 on zinc-950</small></div></div>
            <div class="sw"><span class="chip" style="background:{INK};box-shadow:inset 0 0 0 1px #3f3f46"></span><div><b>Ink</b> <code>{INK}</code> / <code>{INK_DARK}</code><br><small>shadcn zinc-950 / zinc-50</small></div></div>
          </div>"""
        cols.append(f"""
      <section class="dir">
        <header class="dir-h"><h2>{html.escape(d.name)}</h2><span class="tag">{html.escape(d.font_label)}</span></header>
        <p class="pitch">{html.escape(d.pitch)}</p>
        <div class="panel light">{art_h(d, d.lockup, INK, 52)}</div>
        <div class="panel dark">{art_h(d, d.lockup, INK_DARK, 52)}</div>
        <div class="sizes light">
          <figure>{mark(d, INK, 180)}<figcaption>180</figcaption></figure>
          <div class="smalls">
            <figure>{mark(d, INK, 64)}<figcaption>64</figcaption></figure>
            <figure>{mark(d, INK, 32, small=True)}<figcaption>32</figcaption></figure>
            <figure>{mark(d, INK, 16, small=True)}<figcaption>16</figcaption></figure>
          </div>
        </div>
        <div class="sizes dark">
          <figure>{mark(d, INK_DARK, 180)}<figcaption>180</figcaption></figure>
          <div class="smalls">
            <figure>{mark(d, INK_DARK, 64)}<figcaption>64</figcaption></figure>
            <figure>{mark(d, INK_DARK, 32, small=True)}<figcaption>32</figcaption></figure>
            <figure>{mark(d, INK_DARK, 16, small=True)}<figcaption>16</figcaption></figure>
          </div>
        </div>
        <div class="panel light mono">{art_h(d, d.wordmark, INK, 40)}<span class="lbl">wordmark</span></div>
        <div class="panel light mono row">{mark(d, INK, 40, mono=INK)} {art_h(d, d.lockup, INK, 32, mono=INK)}<span class="lbl">mono · currentColor</span></div>
        <div class="panel dark mono row">{mark(d, INK, 40, mono=INK_DARK)} {art_h(d, d.lockup, INK_DARK, 32, mono=INK_DARK)}<span class="lbl">mono · currentColor</span></div>
        {sw}
      </section>""")

    tabs_light = "".join(
        f'<div class="tab{" active" if i == 0 else ""}">{mark(d, INK, 16, small=True)}<span>goopUI · {html.escape(d.name)}</span><i>×</i></div>' for i, d in enumerate(dirs)
    )
    tabs_dark = "".join(
        f'<div class="tab{" active" if i == 0 else ""}">{mark(d, INK_DARK, 16, small=True)}<span>goopUI · {html.escape(d.name)}</span><i>×</i></div>' for i, d in enumerate(dirs)
    )

    def site_header(d, theme):
        ink = INK if theme == "light" else INK_DARK
        return f"""
        <div class="site {theme}">
          <a class="brand" href="#">{art_h(d, d.lockup, ink, 26)}</a>
          <nav><a>Docs</a><a>Components</a><a>Blocks</a><a>Themes</a></nav>
          <div class="right"><span class="search">Search… <kbd>⌘K</kbd></span><span class="gh">GitHub</span></div>
        </div>"""

    headers = "".join(site_header(d, "light") + site_header(d, "dark") for d in dirs)

    avatars = "".join(
        f"""<div class="av-card">
            <div class="av-row">{avatar(d, 120, "12px")}{avatar(d, 48, "8px")}{avatar(d, 24, "6px")}{avatar(d, 20, "50%")}</div>
            <div class="npm"><span class="npm-av">{avatar(d, 40, "6px")}</span><div><b>@goopui/vue</b><br><small>Gooey, dripping components for Vue · 0.1.0</small></div></div>
            <small class="cap">{html.escape(d.name)}: GitHub org (120/48/24), comment avatar (20, round), npm</small>
          </div>"""
        for d in dirs
    )

    page = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>goopUI brand directions</title>
<link rel="icon" href="data:image/svg+xml,{html.escape(svg(dirs[0].favicon, 'color', '', goo_color=dirs[0].goo).replace('#', '%23'))}">
<style>
  :root {{
    --bg: #ffffff; --fg: #09090b; --muted: #71717a; --border: #e4e4e7; --card: #fafafa;
    --dark: #09090b; --dark-2: #18181b; --dark-border: #27272a;
    color-scheme: light;
  }}
  * {{ box-sizing: border-box; }}
  body {{ margin: 0; background: var(--bg); color: var(--fg); font: 14px/1.5 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; -webkit-font-smoothing: antialiased; }}
  main {{ max-width: 1440px; margin: 0 auto; padding: 40px 24px 80px; }}
  h1 {{ font-size: 22px; letter-spacing: -0.01em; margin: 0 0 6px; }}
  .lead {{ color: var(--muted); margin: 0 0 32px; max-width: 72ch; }}
  h3 {{ font-size: 13px; text-transform: uppercase; letter-spacing: .06em; color: var(--muted); margin: 48px 0 12px; font-weight: 600; }}
  .grid {{ display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; }}
  @media (max-width: 1100px) {{ .grid {{ grid-template-columns: repeat(2, minmax(0, 1fr)); }} }}
  @media (max-width: 640px) {{ main {{ padding: 24px 16px 64px; }} .grid {{ grid-template-columns: minmax(0, 1fr); }} }}
  .dir {{ display: flex; flex-direction: column; gap: 10px; min-width: 0; }}
  .dir-h {{ display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }}
  .dir-h h2 {{ font-size: 16px; margin: 0; }}
  .tag {{ font-size: 12px; color: var(--muted); }}
  .pitch {{ color: var(--muted); margin: 0 0 4px; font-size: 13px; min-height: 5.5em; }}
  .panel {{ position: relative; border: 1px solid var(--border); border-radius: 10px; padding: 22px 16px; display: flex; align-items: center; justify-content: center; gap: 14px; min-height: 104px; overflow: hidden; }}
  .panel svg {{ max-width: 100%; height: auto; }}
  .panel.row svg:first-child {{ flex: none; }}
  .light {{ background: #fff; }}
  .dark {{ background: var(--dark); border-color: var(--dark-border); color: #a1a1aa; }}
  .lbl {{ position: absolute; left: 10px; bottom: 6px; font-size: 11px; color: var(--muted); }}
  .sizes {{ border: 1px solid var(--border); border-radius: 10px; padding: 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; }}
  .sizes.dark {{ border-color: var(--dark-border); }}
  .sizes > figure svg {{ width: min(180px, 100%); height: auto; }}
  .smalls {{ display: flex; flex-direction: column; align-items: center; gap: 12px; }}
  figure {{ margin: 0; display: flex; flex-direction: column; align-items: center; gap: 4px; }}
  figcaption {{ font-size: 11px; color: var(--muted); font-variant-numeric: tabular-nums; }}
  .swatches {{ display: grid; gap: 8px; padding: 4px 2px; }}
  .sw {{ display: flex; gap: 10px; align-items: center; font-size: 12px; }}
  .sw small {{ color: var(--muted); }}
  .chip {{ width: 28px; height: 28px; border-radius: 8px; flex: none; }}
  code {{ font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; }}

  /* fake browser */
  .browser {{ border-radius: 12px; overflow: hidden; border: 1px solid var(--border); }}
  .browser.dark {{ border-color: var(--dark-border); }}
  .tabs {{ display: flex; gap: 2px; padding: 8px 8px 0; background: #e9e9ec; overflow-x: auto; }}
  .browser.dark .tabs {{ background: #1c1c1f; }}
  .tab {{ display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 12px; min-width: 0; flex: 0 1 220px; border-radius: 8px 8px 0 0; font-size: 12px; color: #3f3f46; }}
  .tab span {{ white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }}
  .tab i {{ font-style: normal; color: #a1a1aa; }}
  .tab svg {{ flex: none; }}
  .tab.active {{ background: #fff; }}
  .browser.dark .tab {{ color: #d4d4d8; }}
  .browser.dark .tab.active {{ background: #2a2a2e; }}
  .urlbar {{ height: 38px; display: flex; align-items: center; padding: 0 12px; background: #fff; border-bottom: 1px solid var(--border); font-size: 12px; color: var(--muted); }}
  .browser.dark .urlbar {{ background: #2a2a2e; border-color: #3f3f46; color: #a1a1aa; }}
  .stack {{ display: grid; gap: 16px; }}

  /* fake site header */
  .site {{ display: flex; align-items: center; gap: 28px; height: 56px; padding: 0 20px; border: 1px solid var(--border); border-radius: 10px; font-size: 14px; min-width: 0; overflow: hidden; }}
  .site.light {{ background: #fff; color: #09090b; }}
  .site.dark {{ background: var(--dark); border-color: var(--dark-border); color: #fafafa; }}
  .site .brand {{ display: flex; flex: none; }}
  .site nav {{ display: flex; gap: 20px; color: #71717a; }}
  .site.dark nav {{ color: #a1a1aa; }}
  .site nav a:first-child {{ color: inherit; }}
  .site.light nav a:first-child {{ color: #09090b; }}
  .site.dark nav a:first-child {{ color: #fafafa; }}
  .site .right {{ margin-left: auto; display: flex; align-items: center; gap: 12px; }}
  .search {{ border: 1px solid var(--border); border-radius: 8px; padding: 5px 10px; color: var(--muted); font-size: 13px; white-space: nowrap; }}
  .site.dark .search {{ border-color: var(--dark-border); background: #18181b; }}
  kbd {{ font: 11px ui-monospace, monospace; border: 1px solid var(--border); border-radius: 4px; padding: 0 4px; margin-left: 12px; }}
  .site.dark kbd {{ border-color: #3f3f46; }}
  .gh {{ font-size: 13px; }}
  .headers {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }}
  @media (max-width: 1100px) {{ .headers {{ grid-template-columns: minmax(0, 1fr); }} .site .search {{ display: none; }} }}
  @media (max-width: 640px) {{ .site nav {{ display: none; }} }}

  /* avatars */
  .avatar {{ display: inline-flex; align-items: center; justify-content: center; flex: none; }}
  .av-card {{ border: 1px solid var(--border); border-radius: 10px; padding: 16px; display: grid; gap: 14px; }}
  .av-row {{ display: flex; align-items: flex-end; gap: 14px; flex-wrap: wrap; }}
  .npm {{ display: flex; gap: 10px; align-items: center; font-size: 13px; }}
  .npm small, .cap {{ color: var(--muted); font-size: 12px; }}
</style>
</head>
<body>
<main>
  <h1>goopUI brand directions</h1>
  <p class="lead">Four directions, all real path data (no filters): blobs and drips are built as signed distance fields joined with a C2 smooth-min, so every join has continuous curvature, then traced into cubic Béziers. Text is outlined from OFL fonts. Favicon sizes use a slightly heavier small-size cut of each mark.</p>

  <div class="grid">{''.join(cols)}</div>

  <h3>Browser tab · 16px favicon</h3>
  <div class="stack">
    <div class="browser light"><div class="tabs">{tabs_light}</div><div class="urlbar">goopui.dev/docs/components/button</div></div>
    <div class="browser dark"><div class="tabs">{tabs_dark}</div><div class="urlbar">goopui.dev/docs/components/button</div></div>
  </div>

  <h3>Site header</h3>
  <div class="headers">{headers}</div>

  <h3>GitHub / npm avatar</h3>
  <div class="grid">{avatars}</div>
</main>
</body>
</html>"""
    with open(os.path.join(root, "index.html"), "w") as f:
        f.write(page)
