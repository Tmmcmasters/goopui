// shadcn tokens + the bits of shadcn / goop.css markup styling the v7 scenes need, as plain
// CSS (no Tailwind in the promo). No CSS transitions or animations anywhere: everything that
// moves is driven by the replay clock, so frames stay deterministic.

import { COLORS } from '../timeline'
import { DYNAPUFF, GEIST } from '../fonts'

export const themeCss = (): string => `
.v7 { font-family: ${GEIST}, system-ui, sans-serif; -webkit-font-smoothing: antialiased; }
.v7 *, .v7 *::before, .v7 *::after { box-sizing: border-box; transition: none !important; animation: none !important; }
.v7-night {
  --background: ${COLORS.night}; --foreground: ${COLORS.chalk};
  --primary: ${COLORS.slime}; --primary-foreground: ${COLORS.ink};
  --input: #2f3531; --muted: #1b201d; --muted-foreground: #9aa49d;
  --popover: #18181b; --popover-foreground: ${COLORS.chalk};
  --accent: #27272a; --accent-foreground: ${COLORS.chalk};
  --border: #2a302c; --ring: #4b544e;
  color: var(--foreground);
}
.v7-paper {
  --background: ${COLORS.paper}; --foreground: ${COLORS.ink};
  --primary: ${COLORS.slime}; --primary-foreground: ${COLORS.ink};
  --input: #d8d1c2; --muted: #e4ddcf; --muted-foreground: #6f695d;
  --popover: #ffffff; --popover-foreground: ${COLORS.ink};
  --accent: #efe9dc; --accent-foreground: ${COLORS.ink};
  --border: #ddd6c7; --ring: #a8a091;
  color: var(--foreground);
}
.v7 .dyna { font-family: ${DYNAPUFF}; font-weight: 600; }
.v7 .muted { color: var(--muted-foreground); }

/* buttons (shadcn button, scaled up a little for the frame) */
.v7 .btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  height: 40px; padding: 0 18px; border-radius: 9px; border: 0; margin: 0;
  font: 600 15px/1 ${GEIST}; cursor: none; outline: none; white-space: nowrap;
}
.v7 .btn-slime { background: ${COLORS.slime}; color: ${COLORS.ink}; }
.v7 .btn-ink { background: ${COLORS.ink}; color: ${COLORS.chalk}; }

/* goop.css: emerge (popover / menu panels) */
.v7 [data-goop-emerge] {
  --goop-surface-shadow: drop-shadow(0 0 0.5px color-mix(in oklab, var(--foreground) 30%, transparent)) drop-shadow(0 6px 10px rgb(0 0 0 / 0.12));
}
.v7 [data-goop-emerge] > :not([data-goop='surface']) { opacity: var(--goop-emerge-content, 1); }
.v7 [data-goop-emerge][data-goop-tint] {
  --popover: var(--goop-surface);
  --popover-foreground: var(--goop-surface-foreground);
  --muted-foreground: color-mix(in oklab, var(--goop-surface-foreground) 72%, transparent);
  --border: color-mix(in oklab, var(--goop-surface-foreground) 20%, transparent);
  --accent: color-mix(in oklab, var(--goop-surface-foreground) 16%, var(--goop-surface));
  --accent-foreground: var(--goop-surface-foreground);
  --goop-color: var(--goop-surface);
  color: var(--goop-surface-foreground);
}
.v7 [data-goop='highlight'] { --goop-color: var(--accent); }
.v7 [data-goop-pending] [data-goop-mark] { opacity: 0; }

/* popover panel */
.v7 .pop-panel { position: absolute; display: flex; flex-direction: column; gap: 6px; padding: 14px 16px; border-radius: 12px; width: 236px; z-index: 5; }
.v7 .pop-panel .title { font: 600 15px/1.2 ${GEIST}; }
.v7 .pop-panel .desc { font: 400 13px/1.35 ${GEIST}; color: var(--muted-foreground); }
.v7 .pop-panel .field { display: flex; align-items: center; justify-content: space-between; margin-top: 4px; font: 500 13px/1 ${GEIST}; }
.v7 .pop-panel .input { width: 96px; height: 28px; border-radius: 7px; border: 1px solid var(--border); display: flex; align-items: center; padding: 0 9px; font: 400 13px/1 ${GEIST}; }

/* dropdown menu */
.v7 .menu-panel { position: absolute; min-width: 176px; border-radius: 11px; z-index: 5; display: flex; flex-direction: column; }
.v7 .menu-list { position: relative; overflow: clip; padding: 5px; }
.v7 .menu-label { padding: 7px 9px 5px; font: 500 12px/1 ${GEIST}; color: var(--muted-foreground); }
.v7 .menu-item { position: relative; display: flex; align-items: center; justify-content: space-between; gap: 8px; height: 32px; padding: 0 9px; border-radius: 7px; font: 500 14px/1 ${GEIST}; color: var(--popover-foreground); cursor: none; user-select: none; }
.v7 .menu-item .kbd { font: 400 12px/1 ${GEIST}; letter-spacing: 0.06em; color: var(--muted-foreground); }
.v7 .menu-sep { height: 1px; margin: 4px -5px; background: var(--border); }

/* switch */
.v7 .switch { position: relative; display: inline-flex; align-items: center; flex-shrink: 0; border-radius: 999px; border: 1px solid transparent; background: var(--input); }
.v7 .switch .thumb { display: block; border-radius: 999px; background: transparent; pointer-events: none; }
.v7 .switch { --goop-switch-fill: var(--primary); --goop-switch-thumb: ${COLORS.chalk}; }

/* toasts (sonner markup) */
.v7 ol[data-sonner-toaster] { position: absolute; margin: 0; padding: 0; list-style: none; z-index: 10; }
.v7 [data-sonner-toast] {
  position: absolute; left: 0; right: 0; bottom: 0; display: flex; align-items: center; gap: 11px;
  padding: 0 16px; border-radius: 12px; background: ${COLORS.chalk}; color: ${COLORS.ink};
  border: 1px solid #e4e4e0; transform-origin: 50% 0%;
}
.v7 [data-sonner-toast] .ttl { font: 600 14px/1.25 ${GEIST}; }
.v7 [data-sonner-toast] .dsc { font: 400 13px/1.3 ${GEIST}; color: #6b6b66; }
.v7 [data-sonner-toast] .x { position: absolute; right: 10px; top: 10px; width: 20px; height: 20px; border-radius: 6px; display: grid; place-items: center; color: #6b6b66; }

/* slider / progress / checkbox / radio */
.v7 .slider { position: relative; display: flex; align-items: center; height: 28px; touch-action: none; }
.v7 .slider-track { position: relative; flex: 1; height: 8px; border-radius: 999px; background: var(--muted); overflow: hidden; }
.v7 .slider-range { position: absolute; top: 0; bottom: 0; left: 0; background: transparent; }
.v7 .slider-thumb { position: absolute; top: 50%; width: 24px; height: 24px; margin: -12px 0 0 -12px; border-radius: 999px; background: transparent; }
.v7 .slider { --goop-slider-color: var(--primary); }
.v7 .progress { position: relative; height: 12px; border-radius: 999px; background: var(--muted); }
.v7 .progress { --goop-progress-color: var(--primary); }
.v7 .check { position: relative; width: 26px; height: 26px; border-radius: 7px; border: 1.5px solid var(--input); display: grid; place-items: center; flex-shrink: 0; color: var(--primary-foreground); }
.v7 .check { --goop-checkbox-fill: var(--primary); }
.v7 .check[data-state='checked'] { border-color: var(--primary); }
.v7 .check svg { width: 18px; height: 18px; }
.v7 .radio-group { position: relative; display: flex; gap: 22px; }
.v7 .radio-group { --goop-radio-fill: var(--primary); }
.v7 .radio-opt { display: flex; align-items: center; gap: 9px; font: 500 15px/1 ${GEIST}; }
.v7 .radio { position: relative; width: 24px; height: 24px; border-radius: 999px; border: 1.5px solid var(--input); flex-shrink: 0; }
.v7 .radio[data-state='checked'] { border-color: var(--primary); }
.v7 .radio .dot { position: absolute; left: 50%; top: 50%; width: 9px; height: 9px; margin: -4.5px 0 0 -4.5px; border-radius: 999px; background: var(--primary-foreground); opacity: 0; }
.v7 .radio[data-state='checked'] .dot { opacity: 1; }
.v7 [data-goop-pending] .radio[data-state='checked'] .dot { opacity: 0; }
.v7 .lbl { font: 500 15px/1 ${GEIST}; }
`
