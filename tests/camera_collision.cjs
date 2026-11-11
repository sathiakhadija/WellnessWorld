const { chromium } = require('playwright');
const SP = '/tmp/claude-0/-home-claude/8b86de97-dd61-5d0f-9edf-6691617264d2/scratchpad';
const d = (a, b) => Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);
const f2 = a => a.map(n => n.toFixed(2)).join(', ');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 480, height: 270 } });
  const errs = []; p.on('console', m => { if (m.type()==='error') errs.push(m.text()) }); p.on('pageerror', e => errs.push('PAGEERROR '+e.message));
  await p.goto((process.env.URL || 'http://localhost:4173/?off=tree,hood'));
  await p.waitForFunction(() => window.__ww && window.__ww.player(), null, { timeout: 60000 });
  await p.waitForTimeout(3000);
  const st = () => p.evaluate(() => ({ mode: window.__ww.mode(), cam: window.__ww.cam(), pl: window.__ww.player() }));
  const fps = await p.evaluate(() => new Promise(r => { let n=0; const t0=performance.now(); const f=()=>{ n++; if(performance.now()-t0>2000) r(n/2); else requestAnimationFrame(f) }; f() }));
  console.log('fps at 480x270 ~', fps.toFixed(1));
  const settle = async (max = 60000) => { let last = (await st()).cam.pos, still = 0, t = 0; while (still < 3 && t < max) { await p.waitForTimeout(700); t += 700; const c = (await st()).cam.pos; still = d(c, last) < 0.01 ? still + 1 : 0; last = c } return (await st()).cam.pos };
  const hold = async (keys, ms = 0) => { for (const k of keys) await p.keyboard.down(k); await settle(); for (const k of keys.reverse()) await p.keyboard.up(k) };

  // wheel zoom now (follow)
  const dist = (s) => d(s.cam.pos, [s.pl[0], s.pl[1]+1.35, s.pl[2]]);
  await p.mouse.move(300, 150);
  let a = dist(await st()); await p.mouse.wheel(0, 300); await p.waitForTimeout(2500); let a2 = dist(await st());
  await p.mouse.wheel(0, -300); await p.waitForTimeout(2500); let a3 = dist(await st());
  console.log('follow wheel: dist', a.toFixed(2), '-> out', a2.toFixed(2), '-> in', a3.toFixed(2));

  await p.keyboard.press('Digit2'); await p.waitForTimeout(3000);
  // free cam collision, each direction until stationary (hold key until camera stops)
  for (const [name, key, axis] of [['BACKWARD (S) toward back wall','KeyS',2],['LEFT (A) toward left wall','KeyA',0],['RIGHT (D)','KeyD',0],['FORWARD (W) toward glazing/balcony','KeyW',2],['UP (E)','KeyE',1],['DOWN (Q)','KeyQ',1]]) {
    await p.keyboard.press('KeyR'); await p.waitForTimeout(1500);
    await p.keyboard.down(key); await p.keyboard.down('ShiftLeft');
    const pos = await settle(); 
    await p.keyboard.up(key); await p.keyboard.up('ShiftLeft');
    console.log('free', name, '-> stops at', f2(pos), '| player', f2((await st()).pl));
  }
  // noclip
  await p.keyboard.press('KeyR'); await p.keyboard.press('KeyN'); await p.waitForTimeout(800);
  await p.keyboard.down('KeyS'); await p.keyboard.down('ShiftLeft'); await p.waitForTimeout(4000);
  let nc = (await st()).cam.pos; await p.keyboard.up('KeyS'); await p.keyboard.up('ShiftLeft');
  console.log('noclip backward after 4s: z', nc[2].toFixed(2), '(collision on stopped at ~0.3 -> should be past that)');
  await p.keyboard.press('KeyN');

  // follow-cam wall collision: walk back to the back wall, camera orbit behind the player into the wall
  await p.keyboard.press('Digit1'); await p.waitForTimeout(2500);
  await p.keyboard.press('KeyR'); await p.waitForTimeout(1500);
  await p.keyboard.down('KeyS'); 
  let last = (await st()).pl, still = 0; for (let i=0;i<60 && still<3;i++){ await p.waitForTimeout(700); const q=(await st()).pl; still = d(q,last)<0.01?still+1:0; last=q }
  await p.keyboard.up('KeyS');
  let s = await st(); console.log('player walked back (S) until blocked at', f2(s.pl));
  // swing camera to look toward back wall = camera should be pushed toward the wall behind the player? orbit 180deg
  await p.keyboard.down('KeyQ'); await p.waitForTimeout(3000); await p.keyboard.up('KeyQ');
  await p.waitForTimeout(2500);
  s = await st(); console.log('follow after Q rotate: cam', f2(s.cam.pos), 'dist to head', dist(s).toFixed(2), '(requested ~3.4)');
  const minDist = []; 
  for (let i=0;i<6;i++){ await p.keyboard.down('KeyQ'); await p.waitForTimeout(1500); await p.keyboard.up('KeyQ'); await p.waitForTimeout(1200); const t=await st(); minDist.push(dist(t).toFixed(2)); }
  console.log('follow dist while orbiting near wall:', minDist.join(' '), ' (below 3.4 => collision pulled camera in)');
  // glass: player cannot walk through the glazing
  await p.keyboard.press('KeyR'); await p.waitForTimeout(500);
  await p.keyboard.down('ArrowUp'); last=(await st()).pl; still=0; for (let i=0;i<80 && still<3;i++){ await p.waitForTimeout(700); const q=(await st()).pl; still = d(q,last)<0.01?still+1:0; last=q } await p.keyboard.up('ArrowUp');
  console.log('player walked FORWARD at windows, stopped at', f2((await st()).pl), '(glass collider; player must not reach the balcony)');
  console.log('errors:', errs.length ? errs.join(' | ') : 'none');
  await b.close();
})().catch(e => { console.error('CRASH', e); process.exit(1) });
