// Section 04 measurement: dumps the real street masterplan (colliders, surfaces, POIs) to docs/bible/world/world.json. node scripts/world_measure.mjs
import fs from 'fs'
import * as P from '../src/street/plan.js'
import * as G from '../src/street/geo.js'
const s = P.buildStreet()
fs.writeFileSync('docs/bible/world/world.json', JSON.stringify({ bounds: P.BOUNDS, GY: G.GY, TERR_H: P.TERR_H, BX: P.BX, pois: s.pois, colliders: s.colliders, surf: s.map.surf, rib: s.map.rib, waters: s.waters, stats: s.stats }))
console.log('ok', s.colliders.length, 'colliders')
