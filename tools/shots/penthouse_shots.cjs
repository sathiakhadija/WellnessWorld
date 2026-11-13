const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message))
  await p.goto('http://localhost:4176/?weather=sunny',{waitUntil:'load'})
  await p.waitForFunction(()=>window.__ww&&window.__street,null,{timeout:300000}); await p.waitForTimeout(3000)
  await p.keyboard.press('KeyH')
  const shots=JSON.parse(process.argv[3])
  for (const [n,s] of Object.entries(shots)){
    await p.evaluate(a=>{window.__atmo.set({preset:a.preset}); window.__weather.set(a.weather,true); window.__ww.setFree(...a.pose)},s)
    await p.waitForTimeout(s.wait||14000); await p.screenshot({path:process.argv[2]+'/'+n+'.png',timeout:180000}); console.log('shot',n)}
  console.log('errors',JSON.stringify(errs.slice(0,3))); await b.close()
})().catch(e=>{console.error(e);process.exit(2)})
