// The www site's dark tokens (apps/www/app/assets/css/main.css `.dark`, oklch -> hex) and the
// shadcn / goop.css markup styling the launch scenes need, as plain CSS. Like v7's theme: no
// CSS transitions or animations, everything that moves is driven by the replay clock.

import { DYNAPUFF, GEIST } from '../fonts'

/** Composition size (CSS px), rendered at 3x = 1920 x 1080. */
export const W = 640
export const H = 360
export const LAUNCH_SCALE = 3

export const DARK = {
  bg: '#100e0c',
  fg: '#f2f0ec',
  card: '#171412',
  // The site's popover (#1c1916) lifted a touch so panels read on a phone-sized video.
  popover: '#201d1a',
  accent: '#2c2925',
  muted: '#1f1b18',
  mutedFg: '#a8a49e',
  subtle: '#7e7a74',
  border: '#292623',
  borderStrong: '#3c3733',
  primary: '#f2f0ec',
  primaryFg: '#14110e',
  /** --input: white at 15% over the page. */
  input: 'rgb(255 255 255 / 0.15)',
  slime: '#1fa64a',
  gooFg: '#060e07',
  gooInk: '#50c76a',
}

const D = DARK

export const launchCss = (): string => `
.lc { font-family: ${GEIST}, system-ui, sans-serif; -webkit-font-smoothing: antialiased; color: var(--foreground);
  --background: ${D.bg}; --foreground: ${D.fg}; --card: ${D.card};
  --popover: ${D.popover}; --popover-foreground: ${D.fg};
  --accent: ${D.accent}; --accent-foreground: ${D.fg};
  --muted: ${D.muted}; --muted-foreground: ${D.mutedFg};
  --border: ${D.border}; --input: ${D.input}; --ring: ${D.fg};
  --primary: ${D.primary}; --primary-foreground: ${D.primaryFg};
}
.lc *, .lc *::before, .lc *::after { box-sizing: border-box; transition: none !important; animation: none !important; }
.lc .dyna { font-family: ${DYNAPUFF}; font-weight: 600; }

/* shadcn buttons (static triggers) */
.lc .btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; height: 40px; padding: 0 18px;
  border-radius: 9px; border: 0; margin: 0; font: 500 15px/1 ${GEIST}; cursor: none; outline: none; white-space: nowrap; pointer-events: auto; }
.lc .btn-outline { background: rgb(255 255 255 / 0.045); color: var(--foreground); box-shadow: inset 0 0 0 1px ${D.borderStrong}; }
.lc .btn-primary { background: var(--primary); color: var(--primary-foreground); }
.lc .btn svg { width: 16px; height: 16px; }

/* overlays (bg-black/50) */
.lc .overlay { position: fixed; inset: 0; background: rgb(0 0 0 / 0.55); opacity: 0; pointer-events: auto; }

/* drawer (GoopDrawerContent, bottom) */
.lc .drawer { position: fixed; left: 0; right: 0; bottom: 0; display: flex; flex-direction: column; align-items: center;
  border-radius: 12px 12px 0 0; pointer-events: auto; isolation: isolate;
  --goop-color: ${D.popover};
  --goop-surface-shadow: drop-shadow(0 0 0.7px rgb(255 255 255 / 0.32)) drop-shadow(0 -6px 18px rgb(0 0 0 / 0.5)); }
.lc .drawer .grip { margin-top: 12px; width: 80px; height: 6px; border-radius: 99px; flex-shrink: 0; background: ${D.borderStrong}; }
.lc .drawer .hd { text-align: center; padding: 12px 16px 2px; }
.lc .drawer .ttl { font: 600 17px/1.2 ${GEIST}; }
.lc .drawer .dsc { margin-top: 5px; font: 400 14px/1.3 ${GEIST}; color: var(--muted-foreground); }
.lc .drawer .goal { display: flex; align-items: center; gap: 24px; padding: 6px 0 2px; }
.lc .drawer .round { width: 30px; height: 30px; border-radius: 99px; box-shadow: inset 0 0 0 1px ${D.borderStrong}; display: grid; place-items: center; color: var(--foreground); }
.lc .drawer .round svg { width: 15px; height: 15px; }
.lc .drawer .num { font: 700 40px/1 ${GEIST}; letter-spacing: -0.04em; text-align: center; font-variant-numeric: tabular-nums; }
.lc .drawer .unit { margin-top: 3px; font: 500 10px/1 ${GEIST}; letter-spacing: 0.08em; color: var(--muted-foreground); text-transform: uppercase; text-align: center; }
.lc .drawer .ft { width: 260px; padding: 10px 0 16px; display: flex; flex-direction: column; gap: 8px; }
.lc .drawer .ft .btn { width: 100%; height: 36px; }

/* sheet (GoopSheetContent, right) */
.lc .sheet { position: fixed; top: 0; bottom: 0; right: 0; width: 268px; display: flex; flex-direction: column; gap: 14px;
  pointer-events: auto; isolation: isolate; color: var(--foreground); --goop-color: var(--popover); }
.lc .sheet[data-goop-emerge] { --goop-surface-shadow: drop-shadow(0 0 0.7px rgb(255 255 255 / 0.32)) drop-shadow(0 10px 18px rgb(0 0 0 / 0.5)); }
.lc [data-goop-emerge] > :not([data-goop='surface']) { opacity: var(--goop-emerge-content, 1); }
.lc [data-goop-emerge][data-goop-tint] {
  --popover: var(--goop-surface); --popover-foreground: var(--goop-surface-foreground);
  --goop-color: var(--goop-surface); color: var(--goop-surface-foreground);
}
.lc .sheet .hd { padding: 18px 18px 0; }
.lc .sheet .ttl { font: 600 17px/1.2 ${GEIST}; }
.lc .sheet .dsc { margin-top: 5px; font: 400 13px/1.35 ${GEIST}; color: var(--muted-foreground); }
.lc .sheet .fields { padding: 0 18px; display: flex; flex-direction: column; gap: 12px; }
.lc .sheet .lbl { font: 500 13px/1 ${GEIST}; margin-bottom: 7px; }
.lc .sheet .box { height: 36px; border-radius: 8px; box-shadow: inset 0 0 0 1px ${D.borderStrong}; background: rgb(255 255 255 / 0.04);
  display: flex; align-items: center; padding: 0 11px; font: 400 14px/1 ${GEIST}; }
.lc .sheet .ft { margin-top: auto; padding: 18px; display: flex; flex-direction: column; gap: 8px; }
.lc .sheet .ft .btn { width: 100%; height: 38px; }
.lc .sheet .x { position: absolute; top: 15px; right: 15px; width: 22px; height: 22px; display: grid; place-items: center; color: var(--foreground); pointer-events: auto; }
.lc .sheet .x svg { width: 16px; height: 16px; opacity: 0.75; }

/* accordion (GoopAccordion*) */
.lc .acc { position: absolute; display: flex; flex-direction: column; }
.lc .acc-item { position: relative; border-bottom: 1px solid ${D.borderStrong}; }
.lc .acc-item:last-child { border-bottom: 0; }
.lc .acc-trigger { position: relative; display: flex; width: 100%; align-items: center; justify-content: space-between; gap: 16px;
  padding: 16px 0; border: 0; margin: 0; background: transparent; border-radius: 8px; text-align: left; color: var(--foreground);
  font: 500 16px/1.2 ${GEIST}; cursor: none; outline: none; pointer-events: auto; }
.lc .acc-trigger svg { width: 17px; height: 17px; color: var(--muted-foreground); flex-shrink: 0; }
.lc .acc-trigger[data-goop-accordion-trigger][data-goop-flooded],
.lc .acc-trigger[data-goop-accordion-trigger][data-goop-flooded] svg { color: var(--primary-foreground); }
.lc .acc-content { overflow: hidden; height: 0; font: 400 14px/1.45 ${GEIST}; color: ${D.mutedFg}; }
.lc .acc-content > div { padding: 2px 0 16px; }

/* select (GoopSelect, popper) */
.lc .sel-trigger { position: absolute; display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 42px; padding: 0 13px;
  border-radius: 9px; background: rgb(255 255 255 / 0.05); box-shadow: inset 0 0 0 1px ${D.borderStrong}; font: 400 15px/1 ${GEIST};
  color: var(--muted-foreground); pointer-events: auto; }
.lc .sel-trigger[data-value] { color: var(--foreground); }
.lc .sel-trigger svg { width: 16px; height: 16px; opacity: 0.6; }
.lc .sel-panel { position: absolute; border-radius: 10px; z-index: 5; display: flex; flex-direction: column; pointer-events: auto; color: var(--popover-foreground); --goop-color: var(--popover); }
.lc .sel-panel[data-goop-emerge] { --goop-surface-shadow: drop-shadow(0 0 0.6px rgb(255 255 255 / 0.3)) drop-shadow(0 8px 14px rgb(0 0 0 / 0.45)); }
.lc .menu-list { position: relative; overflow: clip; padding: 5px; }
.lc .menu-label { padding: 8px 10px 6px; font: 500 12px/1 ${GEIST}; color: var(--muted-foreground); }
.lc .menu-item { position: relative; display: flex; align-items: center; justify-content: space-between; height: 34px; padding: 0 10px;
  border-radius: 7px; font: 400 15px/1 ${GEIST}; color: var(--popover-foreground); cursor: none; user-select: none; }
.lc [data-goop='highlight'] { --goop-color: ${D.accent}; }

/* input (GoopInput) */
.lc .field-lbl { position: absolute; font: 500 14px/1 ${GEIST}; }
.lc .input-host { position: absolute; }
.lc .input { display: block; width: 100%; height: 42px; padding: 0 13px; border-radius: 10px; border: 1px solid ${D.borderStrong};
  background: rgb(255 255 255 / 0.045); color: var(--foreground); font: 400 16px/1 ${GEIST}; outline: none; pointer-events: auto; caret-color: transparent; }
.lc .input::placeholder { color: ${D.subtle}; }

/* toggle group (GoopToggleGroup, outline, single) */
.lc .tg { position: absolute; display: flex; border-radius: 9px; --goop-toggle-fill: ${D.borderStrong}; }
.lc .tg-item { position: relative; display: inline-flex; align-items: center; justify-content: center; gap: 7px; height: 42px; padding: 0 14px;
  border: 1px solid ${D.borderStrong}; border-left-width: 0; background: transparent; color: var(--foreground); margin: 0;
  font: 500 14px/1 ${GEIST}; cursor: none; outline: none; pointer-events: auto; }
.lc .tg-item:first-child { border-left-width: 1px; border-radius: 9px 0 0 9px; }
.lc .tg-item:last-child { border-radius: 0 9px 9px 0; }
.lc .tg-item svg { width: 17px; height: 17px; position: relative; z-index: 1; }
.lc .tg-item span { position: relative; z-index: 1; }
`
