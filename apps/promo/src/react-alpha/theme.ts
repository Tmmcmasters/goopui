// The React alpha clip's styles: the launch clip's dark theme and scene CSS (launch/theme.ts)
// plus shadcn's React Dialog (radix-nova) as plain CSS. No transitions: the replay clock
// drives everything that moves.

import { GEIST } from '../fonts'
import { DARK, launchCss } from '../launch/theme'

const D = DARK

export const reactAlphaCss = (): string =>
  launchCss() +
  `
/* shadcn DialogOverlay: bg-black/10 + backdrop-blur-xs (darker here so it reads on a phone). */
.lc .dlg-overlay { position: absolute; inset: 0; z-index: 4; background: rgb(0 0 0 / 0.32);
  -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); opacity: 0; pointer-events: auto; }

/* GoopDialogContent (goo on): the goo paints bg-popover + the ring (as a drop-shadow). */
.lc .dlg { position: absolute; z-index: 5; display: flex; flex-direction: column; gap: 16px; padding: 16px;
  border-radius: 12px; font: 400 14px/1.4 ${GEIST}; color: var(--popover-foreground); pointer-events: auto; isolation: isolate;
  --goop-color: var(--popover); }
.lc .dlg[data-goop-emerge] { --goop-surface-shadow: drop-shadow(0 0 0.7px rgb(255 255 255 / 0.3)) drop-shadow(0 10px 22px rgb(0 0 0 / 0.5)); }
.lc .dlg-hd { display: flex; flex-direction: column; gap: 8px; padding-right: 24px; }
.lc .dlg-ttl { font: 500 16px/1 ${GEIST}; }
.lc .dlg-dsc { font: 400 14px/1.4 ${GEIST}; color: var(--muted-foreground); }
.lc .dlg-fields { display: flex; flex-direction: column; gap: 12px; }
.lc .dlg-lbl { font: 500 14px/1 ${GEIST}; margin-bottom: 8px; }
.lc .dlg-input { height: 32px; border-radius: 8px; box-shadow: inset 0 0 0 1px ${D.input}; background: rgb(255 255 255 / 0.045);
  display: flex; align-items: center; padding: 0 10px; font: 400 14px/1 ${GEIST}; }
/* DialogFooter: -mx-4 -mb-4 border-t bg-muted/50 p-4 rounded-b-xl, buttons on the right. */
.lc .dlg-ft { margin: auto -16px -16px; padding: 16px; display: flex; justify-content: flex-end; gap: 8px;
  border-top: 1px solid ${D.border}; border-radius: 0 0 12px 12px; background: color-mix(in oklab, ${D.muted} 50%, transparent); }
.lc .btn-sm { height: 32px; padding: 0 12px; border-radius: 8px; font: 500 14px/1 ${GEIST}; }
/* The corner close: a ghost icon-sm button (top-2 right-2). */
.lc .dlg-x { position: absolute; top: 8px; right: 8px; width: 28px; height: 28px; border-radius: 8px; display: grid; place-items: center;
  color: var(--foreground); pointer-events: auto; }
.lc .dlg-x svg { width: 16px; height: 16px; }
`
