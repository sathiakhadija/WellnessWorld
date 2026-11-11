// Behaviour test: closed doors block, Enter opens them, the player can walk through; balcony sliding door + step ramp (out and back in).
// Run: npm run build && npx vite preview --port 4173 &  then  node tests/doors_slider.cjs   (uses ?off=tree,hood and a small window so headless SwiftShader is fast enough)
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:4173/?off=tree,hood';
const ok = []; const check = (name, cond, extra = '') => { ok.push(cond); console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 480, height: 270 } });
  const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) }); p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await p.goto(URL);
  await p.waitForFunction(() => window.__ww && window.__ww.player(), null, { timeout: 120000 });
  await p.waitForTimeout(3000); await p.keyboard.press('KeyH');
  const pos = () => p.evaluate(() => window.__ww.player());
  const prompt = () => p.evaluate(() => document.querySelector('.ww-prompt')?.textContent || '');
  const stand = async (x, y, z, yaw) => { await p.evaluate(([x, y, z, yaw]) => { window.__ww.set('follow'); window.__ww.teleport(x, y, z); window.__ww.setFollowYaw(yaw) }, [x, y, z, yaw]); await p.waitForTimeout(1500) }
  const walk = async (key, ms = 6000) => {          // hold a key until the player stops moving (or timeout)
    await p.keyboard.down(key); let last = await pos(), still = 0; const t0 = Date.now()
    while (Date.now() - t0 < ms && still < 4) { await p.waitForTimeout(500); const q = await pos(); still = Math.hypot(q[0] - last[0], q[2] - last[2]) < 0.01 ? still + 1 : 0; last = q }
    await p.keyboard.up(key); return last
  }
  const settle = (ms = 10000) => p.waitForTimeout(ms)
  const L = Math.PI / 2

  // ---- bedroom door (centre z -6.0): closed blocks
  await stand(-3.3, 0.1, -6.0, L)
  check('prompt near bedroom door', (await prompt()).includes('bedroom door'), await prompt())
  let q = await walk('KeyW'); check('closed bedroom door blocks (stops at x > -4.5)', q[0] > -4.55, `x=${q[0].toFixed(2)}`)
  await p.keyboard.press('Enter'); await settle()
  q = await walk('KeyW', 9000); check('open bedroom door: player walks into the bedroom (x < -6)', q[0] < -6.0, `x=${q[0].toFixed(2)} z=${q[2].toFixed(2)}`)
  check('bedroom floor level', Math.abs(q[1] - 0.0) < 0.25, `y=${q[1].toFixed(2)}`)
  // ---- bathroom door (centre z -10.05)
  await stand(-3.3, 0.1, -10.05, L)
  q = await walk('KeyW'); check('closed bathroom door blocks', q[0] > -4.55, `x=${q[0].toFixed(2)}`)
  await p.keyboard.press('Enter'); await settle()
  q = await walk('KeyW', 9000); check('open bathroom door: player enters bathroom (x < -6)', q[0] < -6.0, `x=${q[0].toFixed(2)} z=${q[2].toFixed(2)}`)
  // ---- walls of the rooms still hold
  check('bathroom back wall holds (x > -8.5)', q[0] > -8.5, `x=${q[0].toFixed(2)}`)

  // ---- sliding balcony door (centre x 0.4 on z -11.79)
  await stand(0.4, 0.1, -10.0, 0)
  check('prompt near balcony door', (await prompt()).includes('balcony'), await prompt())
  q = await walk('KeyW'); check('closed balcony door blocks (z > -11.7)', q[2] > -11.72, `z=${q[2].toFixed(2)}`)
  await p.keyboard.press('Enter'); await settle(16000)
  q = await walk('KeyW', 9000); check('open balcony door: player reaches the balcony (z < -12.6)', q[2] < -12.6, `z=${q[2].toFixed(2)} y=${q[1].toFixed(2)}`)
  check('balcony deck height (player stands lower than inside)', q[1] < -0.2, `y=${q[1].toFixed(2)}`)
  // come back in over the ramp: face +z
  await p.evaluate(() => window.__ww.setFollowYaw(Math.PI)); await p.waitForTimeout(800)
  q = await walk('KeyW', 9000); check('walk back inside over the threshold ramp (z > -11.5)', q[2] > -11.5, `z=${q[2].toFixed(2)} y=${q[1].toFixed(2)}`)
  // close the door from inside and verify it blocks again
  await stand(0.4, 0.1, -10.0, 0); await p.keyboard.press('Enter'); await settle(16000)
  q = await walk('KeyW'); check('closed again: balcony door blocks', q[2] > -11.72, `z=${q[2].toFixed(2)}`)
  // cannot close on someone standing in the doorway
  await stand(0.4, 0.1, -10.0, 0); await p.keyboard.press('Enter'); await settle(16000)
  await stand(0.4, 0.1, -11.7, 0)
  await p.keyboard.press('Enter'); await p.waitForTimeout(1200)
  const toast = await p.evaluate(() => document.querySelector('.ww-toast')?.textContent || '')
  check('refuses to close with the player in the doorway', /doorway/i.test(toast), toast)
  check('no console errors', errs.length === 0, errs.slice(0, 3).join(' | '))
  await b.close()
  console.log(ok.every(Boolean) ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok.every(Boolean) ? 0 : 1)
})().catch((e) => { console.error('CRASH', e); process.exit(2) })
