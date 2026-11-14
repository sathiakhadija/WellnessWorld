// Task 001 door evidence + functional test. usage: node door_shots.cjs outdir 'posesJSON'  (poses: {name:{pose,preset,weather,wait,force}})
const { chromium } = require('playwright')
;(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader','--enable-webgl','--ignore-gpu-blocklist','--use-angle=swiftshader'] })
  const p = await b.newPage({ viewport: { width: 960, height: 540 } }); const errs=[]; p.on('pageerror',e=>errs.push(e.message))
  await p.goto('http://localhost:4176/?weather=sunny',{waitUntil:'load'})
  await p.waitForFunction(()=>window.__ww&&window.__street,null,{timeout:300000}); await p.waitForTimeout(3000)
  await p.keyboard.press('KeyH')
  const shots=JSON.parse(process.argv[3])
  for (const [n,s] of Object.entries(shots)){
    await p.evaluate(a=>{window.__atmo.set({preset:a.preset}); window.__weather.set(a.weather,true); window.__ww.doorForce('entrance', a.force==null?undefined:a.force); window.__ww.setFree(...a.pose)},s)
    await p.waitForTimeout(s.wait||9000); await p.screenshot({path:process.argv[2]+'/'+n+'.png',timeout:180000}); console.log('shot',n)}
  if (process.argv[4]==='func') {
    const rot=()=>p.evaluate(()=>window.__ww.scene().getObjectByName('WW_Entrance_Door').parent.rotation.y)
    const until=async(f,ms=150000)=>{const t0=Date.now(); while(Date.now()-t0<ms){ if(f(await rot())) return true; await p.waitForTimeout(2000)} return false}
    await p.evaluate(()=>{window.__ww.doorForce('entrance',0); window.__ww.teleport(1.2,0.05,-1.6)}); await p.waitForTimeout(6000)
    await p.evaluate(()=>window.__ww.doorForce('entrance',undefined)); await p.waitForTimeout(3000)
    console.log('closed rot', await rot())
    await p.keyboard.press('Enter'); console.log('opened ok', await until(r=>r>1.55), await rot())
    await p.keyboard.press('Enter'); console.log('closed again ok', await until(r=>r<0.02), await rot())
    for (let i=0;i<3;i++){ await p.keyboard.press('Enter'); await p.waitForTimeout(2500) }       // rapid toggles: open, close, open
    console.log('after 3 rapid toggles reaches open', await until(r=>r>1.55), await rot())
    await p.evaluate(()=>window.__ww.teleport(1.2,0.05,-0.3)); await p.waitForTimeout(3000)        // stand in the swing zone: closing must be refused
    await p.keyboard.press('Enter'); await p.waitForTimeout(8000); console.log('in swing zone, still open (refused)', await rot())
  }
  console.log('errors',JSON.stringify(errs.slice(0,3))); await b.close()
})().catch(e=>{console.error(e);process.exit(2)})
