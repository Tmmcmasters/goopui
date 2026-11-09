#!/usr/bin/env node
// Runtime smoke test for a consumer app built by scripts/check-package-managers.sh: loads a
// served page in headless Chromium, waits for TEXT, clicks the button named CLICK (if given)
// and waits for a [role=dialog]. Fails on any console error or uncaught page error (React's
// hydration-mismatch reports included). Retries the first load while the server starts.
//
// Usage: node scripts/smoke-page.mjs <url> <text> [click-button-name]
// Env: CHROMIUM_PATH (a Chromium/headless-shell binary; default: playwright-core's own download).
// NAV="<link name>|<text>": then close the dialog, click that link and wait for the text on
// the new page (a client navigation through GoopPageTransition: its overlay must have run).
// EXPECT="<css selector>": it must match after load (e.g. `[data-goop-active]`: the goo attached).
import { chromium } from 'playwright-core'

const [url, text, click] = process.argv.slice(2)
if (!url || !text) {
  console.error('usage: smoke-page.mjs <url> <text> [click-button-name]')
  process.exit(2)
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const errors = []
try {
  const page = await browser.newPage()
  page.on('console', (m) => m.type() === 'error' && errors.push(`console: ${m.text()}`))
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))

  let loaded = false
  for (let i = 0; i < 60 && !loaded; i++) {
    try {
      const res = await page.goto(url, { waitUntil: 'load', timeout: 10_000 })
      loaded = !!res && res.ok()
    } catch {}
    if (!loaded) await new Promise((r) => setTimeout(r, 500))
  }
  if (!loaded) throw new Error(`could not load ${url}`)

  await page.getByText(text, { exact: false }).first().waitFor({ timeout: 10_000 })
  if (process.env.EXPECT) await page.locator(process.env.EXPECT).first().waitFor({ state: 'attached', timeout: 10_000 })
  if (click) {
    await page.getByRole('button', { name: click }).click()
    await page.getByRole('dialog').waitFor({ state: 'visible', timeout: 10_000 })
  }
  await page.waitForTimeout(500) // let late effects (goo attach) log anything they would
  if (process.env.NAV) {
    const [link, landed] = process.env.NAV.split('|')
    if (click) {
      await page.keyboard.press('Escape')
      await page.getByRole('dialog').waitFor({ state: 'hidden', timeout: 10_000 })
    }
    await page.getByRole('link', { name: link }).click()
    await page.getByText(landed, { exact: false }).first().waitFor({ timeout: 10_000 })
    if (!(await page.locator('svg[data-goop-page-transition]').count())) throw new Error('the page transition never ran')
    await page.locator('svg[data-goop-page-transition="idle"]').waitFor({ state: 'attached', timeout: 10_000 })
    await page.waitForTimeout(300)
  }
} catch (e) {
  errors.push(String(e?.message ?? e))
} finally {
  await browser.close()
}

if (errors.length) {
  for (const e of errors) console.error(e)
  process.exit(1)
}
console.log(`smoke ok: ${url}`)
