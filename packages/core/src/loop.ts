// One shared requestAnimationFrame loop for every goop instance on the page.
// Tickers return `true` while they still have motion; returning `false` drops them.
// When no tickers remain the loop stops entirely (no idle rAF).

import { clampDt } from './spring'

/** Called once per frame with a clamped dt in seconds. Return true to keep ticking. */
export type Ticker = (dt: number) => boolean

const tickers = new Set<Ticker>()
let rafId = 0
let lastTime = 0
let running = false
let timeScale = 1

/** Dev aid: slow the whole sim down (0.25 = quarter speed) to eyeball motion. */
export function setGoopTimeScale(scale: number): void {
  timeScale = Number.isFinite(scale) && scale > 0 ? scale : 1
}

function frame(now: number): void {
  const dt = (lastTime ? clampDt((now - lastTime) / 1000) : 1 / 60) * timeScale
  lastTime = now
  for (const t of Array.from(tickers)) {
    let keep = false
    try {
      keep = t(dt)
    } catch (err) {
      // One broken instance must not kill the loop for everyone else.
      console.error('[goopui] ticker failed', err)
    }
    if (!keep) tickers.delete(t)
  }
  if (tickers.size > 0) {
    rafId = requestAnimationFrame(frame)
  } else {
    running = false
    rafId = 0
    lastTime = 0
  }
}

/** Ensure `t` runs on the next frames until it returns false. Safe to call repeatedly. */
export function wakeTicker(t: Ticker): void {
  tickers.add(t)
  if (running || typeof requestAnimationFrame !== 'function') return
  running = true
  lastTime = 0
  rafId = requestAnimationFrame(frame)
}

/** Remove `t` immediately. Stops the loop if it was the last one. */
export function removeTicker(t: Ticker): void {
  tickers.delete(t)
  if (tickers.size === 0 && running) {
    if (typeof cancelAnimationFrame === 'function') cancelAnimationFrame(rafId)
    running = false
    rafId = 0
    lastTime = 0
  }
}

/** For tests / devtools: is the shared loop currently scheduling frames? */
export function isLoopRunning(): boolean {
  return running
}

/** For tests / devtools: number of tickers currently registered. */
export function activeTickerCount(): number {
  return tickers.size
}
