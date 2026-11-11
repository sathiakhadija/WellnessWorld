// V10 behaviour tests: main entrance "Go Outside" (prompt, transition, return), balcony edge collision (all open edges), flush deck, clean view, entrance blocks when closed.
// Run: npm run build && npx vite preview --port 4173 &  then  node tests/v10.cjs
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:4173/?off=tree,hood';
const ok = []; const check = (name, cond, extra = '') => { ok.push(cond); console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 480, height: 270 } });
  const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) }); p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await p.goto(URL);
  await p.waitForFunction(() => window.__ww && window.__ww.player(), null, { timeout: 120000 });
  await p.waitForTimeout(3000); await p.keyboard.press('KeyH')
  const pos = () => p.evaluate(() => window.__ww.player());
  const prompt = () => p.evaluate(() => { const e = document.querySelector('.ww-prompt'); return { t: e?.textContent || '', o: e ? parseFloat(e.style.opacity) : 0 } });
  const stand = async (x, y, z, yaw) => { await p.evaluate(([x, y, z, yaw]) => { window.__ww.set('follow'); window.__ww.teleport(x, y, z); window.__ww.setFollowYaw(yaw) }, [x, y, z, yaw]); await p.waitForTimeout(1500) }
  const walk = async (key, ms = 6000) => { await p.keyboard.down(key); let last = await pos(), still = 0; const t0 = Date.now(); while (Date.now() - t0 < ms && still < 4) { await p.waitForTimeout(500); const q = await pos(); still = Math.hypot(q[0] - last[0], q[2] - last[2]) < 0.01 ? still + 1 : 0; last = q } await p.keyboard.up(key); return last }
  await p.evaluate(() => window.__ww.fastAnim(true))

  // ---- entrance
  await stand(1.2, 0.1, -1.8, Math.PI)                                       // facing +z (the front wall), 1.8 m from the door
  await p.waitForTimeout(2500); let pr = await prompt(); check('Go Outside prompt visible near the entrance', /Go Outside/.test(pr.t) && pr.o === 1, JSON.stringify(pr))
  let q = await walk('KeyW'); check('closed entrance door blocks (stops in the recess, z < 0.3)', q[2] < 0.3, `z=${q[2].toFixed(2)}`)
  await stand(0.0, 0.1, -4.5, 0); await p.waitForTimeout(1500); pr = await prompt(); check('prompt disappears when away from the entrance', pr.o === 0, JSON.stringify(pr))
  await stand(1.2, 0.1, -1.0, Math.PI); await p.keyboard.press('Enter'); await p.waitForTimeout(9000)
  await p.waitForFunction(() => window.__ww.game().level === 'street', null, { timeout: 60000 }).catch(() => {})
  await p.waitForTimeout(3500)
  check('entrance sequence takes the lift down to the street level', (await p.evaluate(() => window.__ww.game().level)) === 'street')
  await stand(1.2, -86.8 + 0.1, 7.4, Math.PI); await p.waitForTimeout(1500)
  await p.keyboard.press('Enter'); await p.waitForFunction(() => window.__ww.game().level === 'penthouse', null, { timeout: 60000 }).catch(() => {}); await p.waitForTimeout(3500)
  check('lift returns to the penthouse', (await p.evaluate(() => window.__ww.game().level)) === 'penthouse')

  // ---- balcony: open slider, walk out, walk along every open edge
  await stand(0.4, 0.1, -10.0, 0); await p.keyboard.press('Enter'); await p.waitForTimeout(12000)
  q = await walk('KeyW', 9000); check('walk out onto the balcony', q[2] < -12.4, `z=${q[2].toFixed(2)} y=${q[1].toFixed(2)}`)
  q = await walk('KeyW', 9000); check('south edge holds (z > -13.95)', q[2] > -13.95 && q[1] > -0.2, `z=${q[2].toFixed(2)} y=${q[1].toFixed(2)}`)
  await stand(5.0, 0.1, -9.0, -Math.PI / 2); q = await walk('KeyW', 9000); check('east edge holds (x < 5.8)', q[0] < 5.8 && q[1] > -0.2, `x=${q[0].toFixed(2)} y=${q[1].toFixed(2)}`)
  await stand(5.0, 0.1, -6.0, Math.PI); q = await walk('KeyW', 9000); check('north end holds (z < -2.9)', q[2] < -2.85 && q[1] > -0.2, `z=${q[2].toFixed(2)}`)
  await stand(-3.5, 0.1, -13.0, Math.PI / 2); q = await walk('KeyW', 9000); check('west end holds (x > -4.5)', q[0] > -4.5 && q[1] > -0.2, `x=${q[0].toFixed(2)}`)

  // ---- clean view
  await p.keyboard.press('KeyV'); await p.waitForTimeout(800)
  const clean = await p.evaluate(() => ({ hud: !!document.querySelector('.ww-hud'), mode: window.__ww.mode() }))
  check('clean view hides the HUD and leaves follow mode', !clean.hud && clean.mode === 'sims', JSON.stringify(clean))
  await p.keyboard.press('KeyV'); await p.waitForTimeout(800)
  check('V returns to the previous camera mode', (await p.evaluate(() => window.__ww.mode())) === 'follow')
  check('no console errors', errs.length === 0, errs.slice(0, 3).join(' | '))
  await b.close()
  console.log(ok.every(Boolean) ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok.every(Boolean) ? 0 : 1)
})().catch((e) => { console.error('CRASH', e); process.exit(2) })
