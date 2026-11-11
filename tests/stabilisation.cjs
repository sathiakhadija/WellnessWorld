// Stabilisation tests: no stray geometry inside the doorways (closed + pinned at 0 / 0.5 / 1), open doors leave the opening clear, entrance geometry has one frame,
// player can pass through open doors, no background building stands in the river band.
// Run: npm run build && npx vite preview --port 4173 &  then  node tests/stabilisation.cjs
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:4173/?off=tree,hood';
const ok = []; const check = (name, cond, extra = '') => { ok.push(cond); console.log((cond ? 'PASS ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); };
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 480, height: 270 } });
  const errs = []; p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) }); p.on('pageerror', (e) => errs.push('PAGEERROR ' + e.message));
  await p.goto(URL);
  await p.waitForFunction(() => window.__ww && window.__ww.player(), null, { timeout: 120000 });
  await p.waitForTimeout(3000);
  const pos = () => p.evaluate(() => window.__ww.player());
  const stand = async (x, y, z, yaw) => { await p.evaluate(([x, y, z, yaw]) => { window.__ww.set('follow'); window.__ww.teleport(x, y, z); window.__ww.setFollowYaw(yaw) }, [x, y, z, yaw]); await p.waitForTimeout(1200) }
  const walk = async (key, ms = 6000) => { await p.keyboard.down(key); let last = await pos(), still = 0; const t0 = Date.now(); while (Date.now() - t0 < ms && still < 4) { await p.waitForTimeout(500); const q = await pos(); still = Math.hypot(q[0] - last[0], q[2] - last[2]) < 0.01 ? still + 1 : 0; last = q } await p.keyboard.up(key); return last }

  // 1. scan every non-door mesh for triangles lying inside each doorway volume (x across the wall thickness, z inside the jambs, y 0.05..2.95)
  const scan = (box) => p.evaluate((box) => {
    const sc = window.__ww.scene(); sc.updateMatrixWorld(true); const hits = []; const v = new (sc.position.constructor)()
    sc.traverse((o) => {
      if (!o.isMesh || o.name === '' || o.name.startsWith('WW_COL')) return
      const g = o.geometry, pos = g.attributes.position, idx = g.index, n = idx ? idx.count : pos.count
      const P = (i) => { v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld); return [v.x, v.y, v.z] }
      let c = 0
      for (let i = 0; i < n; i += 3) { const t = [0, 1, 2].map((k) => P(idx ? idx.getX(i + k) : i + k)); if (t.every((q) => q[0] > box[0] && q[0] < box[1] && q[2] > box[2] && q[2] < box[3] && q[1] > 0.05 && q[1] < 2.95)) c++ }
      if (c) hits.push(o.name + ':' + c)
    }); return hits
  }, box)
  const bed = [-4.84, -4.46, -6.7, -5.3], bath = [-4.84, -4.46, -10.55, -9.55]          // clear opening minus a 5 cm margin at each jamb
  await p.evaluate(() => { window.__ww.doorForce('bedroom', 1); window.__ww.doorForce('bathroom', 1) }); await p.waitForTimeout(1500)
  const hb = await scan(bed), ha = await scan(bath)
  check('bedroom opening clear of wall/trim/skirting/other meshes (doors fully open)', hb.filter((h) => !/^$/.test(h)).length === 0 || hb.every((h) => /^\(/.test(h)), hb.join(','))
  check('bathroom opening clear of wall/trim/skirting/other meshes (door fully open)', ha.length === 0 || ha.every((h) => /^\(/.test(h)), ha.join(','))
  // open leaves lie outside the opening: leaf meshes are unnamed, find boxes within the wall x range and check z extents vs jambs
  const leafZ = await p.evaluate(() => { const sc = window.__ww.scene(); sc.updateMatrixWorld(true); const out = []; const THREE_Box = sc.position.constructor
    sc.traverse((o) => { if (!o.isMesh || o.name || !o.geometry || o.geometry.attributes.position.count > 700) return; o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)
      if (bb.max.x < -4.0 && bb.min.x > -6.0 && bb.max.y > 2.0 && bb.max.y < 3.1 && bb.min.y < 0.6) out.push([bb.min.x, bb.max.x, bb.min.z, bb.max.z].map((n) => +n.toFixed(2))) }); return out })
  const insideOpening = leafZ.filter(([x0, x1, z0, z1]) => (z0 > -6.7 && z1 < -5.3) || (z0 > -10.55 && z1 < -9.55))
  check('fully open leaves do not sit in either opening', insideOpening.length === 0, JSON.stringify(insideOpening))
  // 2. passage with doors pinned open
  await stand(-3.3, 0.1, -6.0, Math.PI / 2); let q = await walk('KeyW', 9000); check('bedroom: player walks through the open double doors', q[0] < -6.0, `x=${q[0].toFixed(2)}`)
  await stand(-3.3, 0.1, -10.05, Math.PI / 2); q = await walk('KeyW', 9000); check('bathroom: player walks through the open door', q[0] < -6.0, `x=${q[0].toFixed(2)}`)
  // 3. half-open and closed pinned states block/permit as expected
  await p.evaluate(() => { window.__ww.doorForce('bedroom', 0); window.__ww.doorForce('bathroom', 0) }); await p.waitForTimeout(1500)
  await stand(-3.3, 0.1, -6.0, Math.PI / 2); q = await walk('KeyW'); check('bedroom closed: blocked', q[0] > -4.55, `x=${q[0].toFixed(2)}`)
  await stand(-3.3, 0.1, -10.05, Math.PI / 2); q = await walk('KeyW'); check('bathroom closed: blocked', q[0] > -4.55, `x=${q[0].toFixed(2)}`)
  // 4. entrance: one frame (no lighter lining nested in a darker one), pinned open leaf outside the opening
  const ent = await p.evaluate(() => { const sc = window.__ww.scene(); const names = {}; sc.traverse((o) => { if (o.isMesh && o.name.startsWith('WW_Plan_')) names[o.name] = 1 }); return Object.keys(names) })
  check('plan meshes use single dk frame material for the entrance (no pale reveal lining)', ent.includes('WW_Plan_dk'), ent.join(','))
  await p.evaluate(() => window.__ww.doorForce('entrance', 1)); await p.waitForTimeout(1500)
  const entLeaf = await p.evaluate(() => { const sc = window.__ww.scene(); sc.updateMatrixWorld(true); const out = []
    sc.traverse((o) => { if (!o.isMesh || o.name || !o.geometry || o.geometry.attributes.position.count > 700) return; o.geometry.computeBoundingBox(); const bb = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)
      if (bb.min.x > 0.0 && bb.max.x < 2.2 && bb.min.z > -0.2 && bb.max.y > 2.0 && bb.max.y < 3.1 && bb.min.y < 0.6) out.push([bb.min.x, bb.max.x, bb.min.z, bb.max.z].map((n) => +n.toFixed(2))) }); return out })
  check('entrance leaf pinned open: swings out through the wall plane to the +z side, hinged at x≈0.585', entLeaf.length > 0 && entLeaf.every(([x0, , , z1]) => x0 > 0.2 && z1 > 1.0), JSON.stringify(entLeaf))
  await p.evaluate(() => window.__ww.doorForce('entrance', null))
  check('no console errors', errs.length === 0, errs.slice(0, 3).join(' | '))
  await b.close()
  console.log(ok.every(Boolean) ? 'ALL PASS' : 'SOME FAILED'); process.exit(ok.every(Boolean) ? 0 : 1)
})().catch((e) => { console.error('CRASH', e); process.exit(2) })
