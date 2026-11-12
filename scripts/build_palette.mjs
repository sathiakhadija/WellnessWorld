// Builds src/palette/registry.json (adds linear RGB) and assets/palette/registry.json (read by Blender). Run: node scripts/build_palette.mjs
import fs from 'fs'
const src = JSON.parse(fs.readFileSync('src/palette/registry.src.json', 'utf8'))
const s2l = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))
const lin = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => +s2l(v / 255).toFixed(5)) }
for (const m of src.materials) { m.linear = lin(m.hex); if (m.alt) m.altLinear = lin(m.alt); m.verified = m.verified ?? false }
const ids = new Set(); for (const m of src.materials) { if (ids.has(m.id)) throw new Error('duplicate id ' + m.id); ids.add(m.id) }
fs.mkdirSync('assets/palette', { recursive: true })
const out = JSON.stringify(src, null, 1)
fs.writeFileSync('src/palette/registry.json', out); fs.writeFileSync('assets/palette/registry.json', out)
console.log('registry:', src.materials.length, 'materials;', src.materials.filter((m) => m.status === 'specified').length, 'specified,', src.materials.filter((m) => m.status === 'provisional').length, 'provisional')
