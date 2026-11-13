const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message))
  await p.goto('http://localhost:4176/?weather=sunny',{waitUntil:'load'})
  await p.waitForFunction(()=>window.__ww&&window.__street,null,{timeout:300000}); await p.waitForTimeout(3000)
  await p.keyboard.press('KeyH'); await p.evaluate(()=>{window.__ww.enterStreet&&window.__ww.enterStreet(); window.__atmo.set({preset:'blue'})}); await p.waitForTimeout(6000)
  console.log(await p.evaluate(()=>{const s=window.__street; return JSON.stringify({keys:Object.keys(s), lobby:s.pois&&s.pois.lobby, lift:s.pois&&s.pois.lift})}))
  const poses=JSON.parse(process.argv[3])
  for (const [n,pose] of Object.entries(poses)){ await p.evaluate(a=>window.__ww.setFree(...a),pose); await p.waitForTimeout(6000); await p.screenshot({path:process.argv[2]+'/'+n+'.png',timeout:180000}); console.log('shot',n)}
  console.log('errors',JSON.stringify(errs.slice(0,3))); await b.close()
})().catch(e=>{console.error(e);process.exit(2)})
