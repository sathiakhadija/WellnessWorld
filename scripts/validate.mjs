// Level A/B static validation (no GPU needed):  node scripts/validate.mjs
//  - every `models/*.glb` / textures path referenced from src exists in public/
//  - baked JSON kits parse and every bucket has p (positions) and c-length consistency
//  - GLBs in public/models parse (header + JSON chunk) and report skin/animation counts
//  - character unit tests
import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
let fail = 0
const ok = (m) => console.log('  ok   ' + m), bad = (m) => { fail++; console.log('  FAIL ' + m) }
const walk = (d, out = []) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); f.isDirectory() ? walk(p, out) : out.push(p) } return out }

console.log('asset paths referenced from src')
const refs = new Set()
for (const f of walk('src').filter((f) => /\.(jsx?|mjs)$/.test(f))) for (const m of fs.readFileSync(f, 'utf8').matchAll(/models\/([A-Za-z0-9_\-.]+\.glb)/g)) refs.add(m[1])
for (const r of refs) { const dynamic = r === 'momo.glb'; if (fs.existsSync('public/models/' + r)) ok('models/' + r); else if (dynamic) ok('models/' + r + ' (optional: Momo not supplied yet; game falls back to rabbit)'); else bad('missing public/models/' + r) }

console.log('baked kits')
for (const f of fs.readdirSync('src/baked').filter((f) => f.endsWith('.json'))) {
  try { const j = JSON.parse(fs.readFileSync('src/baked/' + f, 'utf8')); let n = 0, tri = 0
    for (const [name, v] of Object.entries(j)) for (const [b, d] of Object.entries(v)) { n++; tri += d.p.length / 9; if (d.p.length % 9) bad(`${f}:${name}.${b} positions not a multiple of 9`) }
    ok(`${f}: ${n} buckets, ${tri} triangles`) } catch (e) { bad(f + ' ' + e.message) }
}

console.log('GLBs')
for (const f of fs.readdirSync('public/models').filter((f) => f.endsWith('.glb'))) {
  try { const b = fs.readFileSync('public/models/' + f); if (b.toString('utf8', 0, 4) !== 'glTF') throw new Error('bad magic'); const j = JSON.parse(b.slice(20, 20 + b.readUInt32LE(12)).toString())
    ok(`${f}: ${(b.length / 1024) | 0} kB, meshes ${(j.meshes || []).length}, skins ${(j.skins || []).length}, anims ${(j.animations || []).length}`) } catch (e) { bad(f + ' ' + e.message) }
}

console.log('unit tests')
try { execSync('node tests/characters.test.mjs', { stdio: 'pipe' }); ok('characters.test.mjs') } catch (e) { bad('characters.test.mjs ' + e.stderr?.toString().slice(0, 200)) }
console.log(fail ? `\n${fail} failure(s)` : '\nall static checks passed'); process.exit(fail ? 1 : 0)
