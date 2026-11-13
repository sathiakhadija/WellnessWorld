// Browser smoke test for the character pipeline (needs `vite preview`/static server on :4176). node scripts/char_smoke.cjs outdir
const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'] })
  const res = {}
  for (const [name, q] of [['placeholder', '?model=tech_placeholder&dev=1'], ['momo_missing', '?model=momo'], ['default', '']]) {
    const p = await b.newPage({ viewport: { width: 640, height: 360 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message))
    await p.goto('http://localhost:4176/' + q, { waitUntil: 'load' })
    await p.waitForFunction(() => window.__ww && window.__ww.player && window.__ww.player(), null, { timeout: 300000 }); await p.waitForTimeout(6000)
    res[name] = await p.evaluate(() => ({ clips: window.__ww.charClips || null }))
    if (name === 'placeholder') { res[name].actionOk = await p.evaluate(() => window.__ww.charAction('wave')); await p.waitForTimeout(1500); await p.screenshot({ path: process.argv[2] + '/char_placeholder.png' }) }
    res[name].errors = errs.slice(0, 3); await p.close()
  }
  console.log(JSON.stringify(res)); await b.close()
})().catch((e) => { console.error(e); process.exit(2) })
