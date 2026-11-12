// Screenshots the localhost calibration studio for each preset: node scripts/calib_shots.cjs [preset...]  (needs the build served on :4176)
const { chromium } = require('playwright'); const fs = require('fs')
;(async () => {
  const presets = process.argv.slice(2).length ? process.argv.slice(2) : ['neutral', 'golden', 'blue', 'interior_evening', 'overcast', 'rainy_evening']
  fs.mkdirSync('docs/bible/calibration', { recursive: true })
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--use-angle=swiftshader'] })
  const info = {}
  for (const pr of presets) {
    const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text().slice(0, 300)) })
    await p.goto(`http://localhost:4176/?studio=calib&preset=${pr}`, { waitUntil: 'load' })
    await p.waitForFunction(() => window.__calib && window.__calib.ready, null, { timeout: 120000 }); await p.waitForTimeout(3000)
    await p.screenshot({ path: `docs/bible/calibration/localhost_${pr}.png`, timeout: 120000 }); info[pr] = await p.evaluate(() => window.__calib.info); console.log('shot', pr, errs.slice(0, 2)); await p.close()
  }
  fs.writeFileSync('docs/bible/calibration/localhost_info.json', JSON.stringify(info, null, 1)); await b.close()
})().catch((e) => { console.error(e); process.exit(2) })
