const { chromium } = require('playwright');
const d = (a, b) => Math.hypot(a[0]-b[0], a[1]-b[1], a[2]-b[2]);
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 900, height: 500 } });
  await p.goto('http://localhost:4173/');
  await p.waitForFunction(() => window.__ww && window.__ww.player(), null, { timeout: 60000 });
  await p.waitForTimeout(3000);
  const st = () => p.evaluate(() => ({ cam: window.__ww.cam(), pl: window.__ww.player() }));
  const dist = (s) => d(s.cam.pos, [s.pl[0], s.pl[1]+1.35, s.pl[2]]);
  await p.mouse.move(700, 300);
  console.log('start dist', dist(await st()).toFixed(2));
  await p.mouse.wheel(0, 100); await p.waitForTimeout(2500); console.log('mouse notch +100 (zoom out):', dist(await st()).toFixed(2));
  await p.mouse.wheel(0, -100); await p.waitForTimeout(400); await p.mouse.wheel(0, -100); await p.waitForTimeout(2500); console.log('two notches -100 (zoom in):', dist(await st()).toFixed(2));
  // trackpad-like stream: small deltas at ~60Hz -> must ORBIT, not zoom
  const s0 = await st();
  await p.evaluate(async () => { const el = document.querySelector('canvas'); for (let i=0;i<30;i++){ el.dispatchEvent(new WheelEvent('wheel',{deltaX:-6,deltaY:2,bubbles:true,cancelable:true})); await new Promise(r=>setTimeout(r,16)) } });
  await p.waitForTimeout(2000);
  const s1 = await st(); console.log('trackpad-like stream: dist change', (dist(s1)-dist(s0)).toFixed(3), '(≈0 = no zoom); cam moved', d(s0.cam.pos,s1.cam.pos).toFixed(2), '(orbit)');
  await p.keyboard.press('KeyT'); await p.waitForTimeout(500);
  const s2 = await st();
  await p.evaluate(async () => { const el = document.querySelector('canvas'); for (let i=0;i<30;i++){ el.dispatchEvent(new WheelEvent('wheel',{deltaX:0,deltaY:-6,bubbles:true,cancelable:true})); await new Promise(r=>setTimeout(r,16)) } });
  await p.waitForTimeout(2000);
  console.log('after pressing T (scroll=zoom): small-delta stream dist', dist(s2).toFixed(2), '->', dist(await st()).toFixed(2));
  await b.close();
})().catch(e => { console.error('CRASH', e); process.exit(1) });
