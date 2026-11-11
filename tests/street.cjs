// Street-level behaviour test (headless SwiftShader) for the compact masterplan: lift, lobby, courtyard, gate, lane, garden square, Romantic Lane + hidden courtyard,
// secret garden alley, the two river paths, ramp + stair to the Thames promenade, and the lift back up.
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
  const poi = (k) => p.evaluate((k) => window.__street.built.pois[k], k)
  const stand = async (x, y, z, yaw) => { await p.evaluate(([x, y, z, yaw]) => { window.__ww.set('follow'); window.__ww.teleport(x, y, z); window.__ww.setFollowYaw(yaw) }, [x, y, z, yaw]); await p.waitForTimeout(1200) }
  const walk = async (ms = 8000, keys = ['ShiftLeft', 'KeyW']) => {
    for (const k of keys) await p.keyboard.down(k)
    let last = await pos(), still = 0; const t0 = Date.now()
    while (Date.now() - t0 < ms * 6 && still < 5) { await p.waitForTimeout(500); const q = await pos(); still = Math.hypot(q[0] - last[0], q[2] - last[2]) < 0.01 ? still + 1 : 0; last = q }
    for (const k of keys.slice().reverse()) await p.keyboard.up(k)
    return last
  }
  const f = (q) => q.map((v) => v.toFixed(2)).join(',')
  await p.evaluate(() => window.__ww.fastAnim(true))

  // ---- A. lift down into the lobby
  await stand(1.2, 0.1, -0.9, 0)
  check('starts in the penthouse', (await level()) === 'penthouse')
  await p.keyboard.press('Enter')
  await p.waitForFunction(() => window.__ww.game().level === 'street', null, { timeout: 90000 }).catch(() => {})
  await p.waitForTimeout(4000)
  let q = await pos()
  check('lift down: street level, arrives in the lobby facing the courtyard', (await level()) === 'street' && q[2] > 5.5 && q[2] < 9 && Math.abs(q[0] - 1.2) < 0.6 && Math.abs(q[1] - GY) < 0.3, f(q))
  check('penthouse door closed again after the ride', await p.evaluate(() => { const d = window.__ww.game().doors.entrance; return !!d && d.t < 0.05 }))

  // ---- B. lobby -> courtyard: through the doorway; the signature tree + bench ring stop a straight walk on the axis
  await stand(1.2, GY + 0.1, 8, Math.PI); q = await walk(5000)
  check('walks out through the lobby doorway into the courtyard', q[2] > 17 && Math.abs(q[1] - GY) < 0.25, f(q))
  q = await walk(12000)
  check('the courtyard tree + bench hold the axis (stops short of the tree)', q[2] > 27 && q[2] < 31, f(q))
  await stand(-9, GY + 0.1, 30, Math.PI / 2); q = await walk(8000)
  check('courtyard west garden railing holds (x > -14.2)', q[0] > -14.2 && q[0] < -12, f(q))
  await stand(1.2, GY + 0.1, 40, Math.PI); q = await walk(8000)
  check('through the bronze gate onto the lane (z 51..58)', q[2] > 50.5, f(q))

  // ---- C. lane + garden square
  await stand(1.2, GY + 0.1, 55.5, -Math.PI / 2); q = await walk(25000)
  check('Courtyard Lane east end holds (x < 76)', q[0] < 76 && q[0] > 70, f(q))
  await stand(1.2, GY + 0.1, 55.5, Math.PI / 2); q = await walk(25000)
  check('Courtyard Lane west end holds (x > -98)', q[0] > -98 && q[0] < -92, f(q))
  await stand(1.2, GY + 0.1, 57, Math.PI); q = await walk(20000)
  check('garden gate: walks in on the axis and stops at the fountain basin', q[2] > 60 && q[2] < 83, f(q))
  await stand(-26.8, GY + 0.1, 70, Math.PI); q = await walk(15000)
  check('West Street is walkable south to its end wall', q[2] > 100 && q[2] < 109, f(q))

  // ---- D. Romantic Lane, hidden courtyard, pocket garden
  await stand(-30, GY + 0.1, 90.5, Math.PI / 2); q = await walk(30000)
  check('Romantic Lane walks west into the pocket garden and stops at its wall', q[0] < -118 && q[0] > -127, f(q))
  const pa = await poi('passage')
  await stand(pa.x, GY + 0.1, 91, Math.PI); q = await walk(12000)
  check('tucked-away passage leads to the hidden courtyard', q[2] > 112 && q[2] < 119.8, f(q))

  // ---- E. secret garden alley (east)
  await stand(41.9, GY + 0.1, 74.2, -Math.PI / 2); q = await walk(12000)
  check('narrow alley off East Street opens into the secret garden', q[0] > 58, f(q))

  // ---- F. river paths and the promenade
  await stand(67, GY + 0.1, 48, 0); q = await walk(20000)
  check('East Walk is clear for its first 60 m from the lane', q[2] < -5, f(q))
  await stand(67, GY + 0.1, -40, 0); q = await walk(30000)
  check('East Walk reaches the riverside gardens', q[2] < -88, f(q))
  await stand(-86, GY + 0.1, 48, 0); q = await walk(20000)
  check('Thames Row is clear for its first 60 m from the lane', q[2] < -5, f(q))
  await stand(-86, GY + 0.1, -40, 0); q = await walk(30000)
  check('Thames Row reaches the riverside gardens', q[2] < -88, f(q))
  await stand(52, GY + 0.1, -110, 0); q = await walk(30000)
  check('east ramp climbs to the promenade', Math.abs(q[1] - TERR) < 0.5 && q[2] < -131, f(q))
  q = await walk(15000)
  check('balustrade stops the player at the river edge', q[2] > -146.8 && q[2] < -143, f(q))
  await stand(1.2, GY + 0.1, -112, 0); q = await walk(40000)
  check('grand stair climbs to the promenade', Math.abs(q[1] - TERR) < 0.6 && q[2] < -131, f(q))

  // ---- G. lift back up
  await stand(1.2, GY + 0.1, 7.4, Math.PI)
  const pr = await p.evaluate(() => document.querySelector('.ww-prompt')?.textContent || '')
  check('lobby prompt offers the lift', /lift/i.test(pr), pr)
  await p.keyboard.press('Enter')
  await p.waitForFunction(() => window.__ww.game().level === 'penthouse', null, { timeout: 90000 }).catch(() => {})
  await p.waitForTimeout(4000); q = await pos()
  check('lift up: back in the penthouse near the entrance', (await level()) === 'penthouse' && Math.abs(q[1]) < 0.4 && q[2] < 0 && q[2] > -3, f(q))
  check('no console errors', errs.length === 0, errs.slice(0, 3).join(' | '))
  await b.close()
  console.log(ok.every(Boolean) ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok.every(Boolean) ? 0 : 1)
})().catch((e) => { console.error('CRASH', e); process.exit(2) })
