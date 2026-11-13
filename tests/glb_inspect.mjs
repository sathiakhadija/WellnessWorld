// Prints the animation + skin summary of a GLB (asset-path / integrity check):  node tests/glb_inspect.mjs public/models/x.glb
import fs from 'node:fs'
const b = fs.readFileSync(process.argv[2]); const len = b.readUInt32LE(12); const j = JSON.parse(b.slice(20, 20 + len).toString())
const out = { meshes: (j.meshes || []).length, skins: (j.skins || []).length, joints: (j.skins?.[0]?.joints || []).length, materials: (j.materials || []).map((m) => m.name), animations: (j.animations || []).map((a) => a.name) }
console.log(JSON.stringify(out))
if (!out.skins) { console.error('no skin'); process.exit(1) }
