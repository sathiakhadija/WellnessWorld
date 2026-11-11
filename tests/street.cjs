// Street-level behaviour test (headless SwiftShader): the lift, walking, collision against walls/railings, ramps and stairs to the Thames terrace, lift back up.
// Run: npm run build && npx vite preview --port 4173 &  then  node tests/street.cjs
const { chromium } = require('playwright')
const URL = process.env.URL || 'http://localhost:4173/?off=tree,hood'
const GY = -86.8, TERR = -82.4
const ok = []; const check = (name, cond, extra = '') => { ok.push(cond); console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')) }
;(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
  const p = await b.newPage({ viewport: { width: 480, height: 270 } })
  const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) }); p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message))
  await p.goto(URL)
  await p.waitForFunction(() => window.__ww && window.__ww.player() && window.__street, null, { timeout: 180000 })
  await p.waitForTimeout(3000); await p.keyboard.press('KeyH')
  const pos = () => p.evaluate(() => window.__ww.player())
  const level = () => p.evaluate(() => window.__ww.game().level)
  const stand = async (x, y, z, yaw) => { await p.evaluate(([x, y, z, yaw]) => { window.__ww.set('follow'); window.__ww.teleport(x, y, z); window.__ww.setFollowYaw(yaw) }, [x, y, z, yaw]); await p.waitForTimeout(1200) }
  const walk = async (ms = 8000, keys = ['ShiftLeft', 'KeyW']) => {
    for (const k of keys) await p.keyboard.down(k)
    let last = await pos(), still = 0; const t0 = Date.now()
    while (Date.now() - t0 < ms && still < 4) { await p.waitForTimeout(500); const q = await pos(); still = Math.hypot(q[0] - last[0], q[2] - last[2]) < 0.01 ? still + 1 : 0; last = q }
    for (const k of keys.slice().reverse()) await p.keyboard.up(k)
    return last
  }
  await p.evaluate(() => window.__ww.fastAnim(true))

  // ---- A. the lift down: penthouse entrance -> street lobby
  await stand(1.2, 0.1, -0.9, 0)
  check('starts in the penthouse', (await level()) === 'penthouse')
  await p.keyboard.press('Enter')
  await p.waitForFunction(() => window.__ww.game().level === 'street', null, { timeout: 90000 }).catch(() => {})
  await p.waitForTimeout(4000)
  let q = await pos()
  check('lift down: level is street', (await level()) === 'street')
  check('arrives in the lobby in front of the lift (z 6..9, on the street floor)', q[2] > 5.5 && q[2] < 9 && Math.abs(q[0] - 1.2) < 0.6 && Math.abs(q[1] - GY) < 0.3, q.map((v) => v.toFixed(2)).join(','))
  check('penthouse door reset (closed) after the ride', await p.evaluate(() => { const d = window.__ww.game().doors.entrance; return !!d && d.t < 0.05 }))

  // ---- B. walk out through the open front of the lobby; the reflecting pool blocks the axis
  await stand(1.2, GY + 0.1, 8, Math.PI)
  q = await walk(12000)
  check('walks out of the lobby and across the forecourt until the pool edge', q[2] > 15 && q[2] < 21.2, `z=${q[2].toFixed(2)} y=${q[1].toFixed(2)}`)
  check('stays on the street floor (no sinking, no hopping)', Math.abs(q[1] - GY) < 0.25)

  // ---- C. walls / hedges / railings hold
  await stand(-60, GY + 0.1, 30, Math.PI); q = await walk(14000)
  check('plaza south wall holds (z < 46.4)', q[2] < 46.4 && q[2] > 44, `z=${q[2].toFixed(2)}`)
  await stand(-100, GY + 0.1, 10, Math.PI / 2); q = await walk(14000)
  check('west plaza edge holds (x > -126)', q[0] > -126.2 && q[0] < -120, `x=${q[0].toFixed(2)}`)
  await stand(70, GY + 0.1, 10, -Math.PI / 2); q = await walk(14000)
  check('east plaza edge holds (x < 81)', q[0] < 80.2 && q[0] > 74, `x=${q[0].toFixed(2)}`)
  await stand(0, GY + 0.1, 100, Math.PI); q = await walk(5000)
  check('boulevard is walkable (moves >5 m along z, on the road)', q[2] > 105 && Math.abs(q[1] - GY) < 0.25, `z=${q[2].toFixed(2)}`)

  // ---- D. ramp up to the Thames terrace, balustrade stops at the river
  await stand(52, GY + 0.1, -92, 0); q = await walk(30000)
  check('side ramp climbs to the terrace level', Math.abs(q[1] - TERR) < 0.5 && q[2] < -131, `y=${q[1].toFixed(2)} z=${q[2].toFixed(2)}`)
  q = await walk(20000)
  check('balustrade stops the player at the river edge (z > -146.8)', q[2] > -146.8 && q[2] < -143, `z=${q[2].toFixed(2)} y=${q[1].toFixed(2)}`)
  await stand(1.2, GY + 0.1, -112, 0); q = await walk(40000)
  check('grand stair climbs to the terrace', Math.abs(q[1] - TERR) < 0.6 && q[2] < -131, `y=${q[1].toFixed(2)} z=${q[2].toFixed(2)}`)

  // ---- E. lift back up
  await stand(1.2, GY + 0.1, 7.4, Math.PI)
  const pr = await p.evaluate(() => document.querySelector('.ww-prompt')?.textContent || '')
  check('lobby prompt offers the lift', /lift/i.test(pr), pr)
  await p.keyboard.press('Enter')
  await p.waitForFunction(() => window.__ww.game().level === 'penthouse', null, { timeout: 90000 }).catch(() => {})
  await p.waitForTimeout(4000); q = await pos()
  check('lift up: back in the penthouse near the entrance', (await level()) === 'penthouse' && Math.abs(q[1]) < 0.4 && q[2] < 0 && q[2] > -3, q.map((v) => v.toFixed(2)).join(','))
  check('no console errors', errs.length === 0, errs.slice(0, 3).join(' | '))
  await b.close()
  console.log(ok.every(Boolean) ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok.every(Boolean) ? 0 : 1)
})().catch((e) => { console.error('CRASH', e); process.exit(2) })
