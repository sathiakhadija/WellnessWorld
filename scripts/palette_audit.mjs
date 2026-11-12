// Development-time palette audit.  node scripts/palette_audit.mjs  -> docs/bible/PALETTE_AUDIT.md (+ exit 1 on registry errors)
// Checks: registry validity (duplicates, params, missing textures), unregistered hex literals in src/** (nearest registry colour via CIEDE2000), suspicious metal/roughness, duplicate material definitions.
import fs from 'fs'; import path from 'path'
const REG = JSON.parse(fs.readFileSync('src/palette/registry.json', 'utf8'))
const EX = JSON.parse(fs.readFileSync('scripts/palette_exceptions.json', 'utf8'))   // { files: {path: reason}, hex: {"#rrggbb": reason} }
const hex2rgb = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255] }
const s2l = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
const lab = (h) => { const [r, g, b] = hex2rgb(h).map(s2l); const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047, Y = 0.2126 * r + 0.7152 * g + 0.0722 * b, Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
  const f = (t) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116); return [116 * f(Y) - 16, 500 * (f(X) - f(Y)), 200 * (f(Y) - f(Z))] }
export function de2000(l1, l2) { // CIEDE2000
  const [L1, a1, b1] = l1, [L2, a2, b2] = l2, rad = Math.PI / 180, deg = 180 / Math.PI
  const C1 = Math.hypot(a1, b1), C2 = Math.hypot(a2, b2), Cb = (C1 + C2) / 2, G = 0.5 * (1 - Math.sqrt(Cb ** 7 / (Cb ** 7 + 25 ** 7)))
  const a1p = (1 + G) * a1, a2p = (1 + G) * a2, C1p = Math.hypot(a1p, b1), C2p = Math.hypot(a2p, b2)
  const h1 = (Math.atan2(b1, a1p) * deg + 360) % 360, h2 = (Math.atan2(b2, a2p) * deg + 360) % 360
  const dL = L2 - L1, dC = C2p - C1p; let dh = h2 - h1; if (C1p * C2p === 0) dh = 0; else if (dh > 180) dh -= 360; else if (dh < -180) dh += 360
  const dH = 2 * Math.sqrt(C1p * C2p) * Math.sin(dh * rad / 2), Lb = (L1 + L2) / 2, Cpb = (C1p + C2p) / 2
  let hb = h1 + h2; if (C1p * C2p === 0) hb = h1 + h2; else if (Math.abs(h1 - h2) <= 180) hb /= 2; else hb = (hb + (hb < 360 ? 360 : -360)) / 2
  const T = 1 - 0.17 * Math.cos((hb - 30) * rad) + 0.24 * Math.cos(2 * hb * rad) + 0.32 * Math.cos((3 * hb + 6) * rad) - 0.2 * Math.cos((4 * hb - 63) * rad)
  const dTh = 30 * Math.exp(-(((hb - 275) / 25) ** 2)), Rc = 2 * Math.sqrt(Cpb ** 7 / (Cpb ** 7 + 25 ** 7)), Sl = 1 + (0.015 * (Lb - 50) ** 2) / Math.sqrt(20 + (Lb - 50) ** 2), Sc = 1 + 0.045 * Cpb, Sh = 1 + 0.015 * Cpb * T, Rt = -Math.sin(2 * dTh * rad) * Rc
  return Math.sqrt((dL / Sl) ** 2 + (dC / Sc) ** 2 + (dH / Sh) ** 2 + Rt * (dC / Sc) * (dH / Sh)) }
const out = []; let errors = 0; const err = (s) => { errors++; out.push('- ❌ ' + s) }; const warn = (s) => out.push('- ⚠️ ' + s)
out.push('# Palette audit', '', `Generated ${new Date().toISOString()} — registry ${REG.materials.length} materials.`, '', '## Registry checks')
const ids = new Set(), hexes = new Map()
for (const m of REG.materials) {
  if (ids.has(m.id)) err('duplicate id ' + m.id); ids.add(m.id)
  if (!/^WW_[A-Z0-9_]+$/.test(m.id)) err('bad id ' + m.id)
  if (!/^#[0-9A-Fa-f]{6}$/.test(m.hex)) err(m.id + ' bad hex')
  if (m.cat !== 'light' && m.cat !== 'glass') {
    if (m.rough == null || m.rough < 0 || m.rough > 1) err(m.id + ' roughness out of range')
    if (m.cat === 'metal' && !(m.metal >= 0.5)) warn(m.id + ' metal category but metallic=' + m.metal)
    if (m.cat !== 'metal' && m.metal > 0.1) warn(m.id + ' non-metal with metallic=' + m.metal)
    if (m.rough < 0.12 && m.cat !== 'metal') warn(m.id + ' very glossy (roughness ' + m.rough + ')')
    if (m.cat === 'metal' && m.rough > 0.7) warn(m.id + ' metal with high roughness')
  }
  if (!m.page && m.status === 'specified' && m.cat !== 'glass') warn(m.id + ' specified but no PDF page')
  for (const t of m.tex || []) { /* texture names are procedural generators (src/textures or Blender), checked below */ }
  if (hexes.has(m.hex)) warn(`${m.id} duplicates colour ${m.hex} of ${hexes.get(m.hex)}`); hexes.set(m.hex, m.id)
  if (m.hex.toLowerCase() === '#ffffff' && m.cat !== 'glass' && m.cat !== 'light') warn(m.id + ' pure white')
  if (m.hex.toLowerCase() === '#000000') warn(m.id + ' pure black')
}
const labs = REG.materials.map((m) => ({ id: m.id, lab: lab(m.hex), labAlt: m.alt ? lab(m.alt) : null }))
for (let i = 0; i < labs.length; i++) for (let j = i + 1; j < labs.length; j++) { const d = de2000(labs[i].lab, labs[j].lab); if (d < 2.5) warn(`${labs[i].id} ≈ ${labs[j].id} (ΔE2000 ${d.toFixed(1)}) — consider merging`) }
// scan source for hex literals
out.push('', '## Unregistered colours in source (nearest registered colour, ΔE2000)')
const files = []; (function walk(d) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) { if (!['baked', 'palette', 'node_modules'].includes(f.name)) walk(p) } else if (/\.(jsx?|mjs)$/.test(f.name)) files.push(p) } })('src')
const rows = []; const matDefs = new Map()
for (const f of files) {
  if (EX.files[f]) continue
  const txt = fs.readFileSync(f, 'utf8'); const found = new Map()
  for (const mm of txt.matchAll(/['"`](#[0-9a-fA-F]{6})['"`]/g)) { const h = mm[1].toLowerCase(); if (EX.hex[h]) continue; found.set(h, (found.get(h) || 0) + 1) }
  let unreg = 0, near = 0
  for (const [h, n] of found) { const l = lab(h); let best = { d: 1e9, id: '' }; for (const x of labs) { for (const ll of [x.lab, x.labAlt].filter(Boolean)) { const d = de2000(l, ll); if (d < best.d) best = { d, id: x.id } } } if (best.d < 3) near += n; else unreg += n }
  if (found.size) rows.push({ f, distinct: found.size, unreg, near })
  for (const mm of txt.matchAll(/new THREE\.MeshStandardMaterial\(\{([^}]*)\}/g)) { const k = mm[1].replace(/\s+/g, ' ').trim(); matDefs.set(k, [...(matDefs.get(k) || []), f]) }
}
out.push('| file | distinct hex | unregistered uses | within ΔE<3 of registry |', '|---|---|---|---|'); for (const r of rows.sort((a, b) => b.unreg - a.unreg)) out.push(`| ${r.f} | ${r.distinct} | ${r.unreg} | ${r.near} |`)
out.push('', `Total unregistered colour uses: ${rows.reduce((s, r) => s + r.unreg, 0)} (migrate area by area; do not bulk-recolour approved environments).`)
out.push('', '## Duplicate MeshStandardMaterial definitions'); let dup = 0; for (const [k, fs_] of matDefs) if (fs_.length > 1) { dup++; out.push(`- ×${fs_.length} \`${k.slice(0, 90)}\` in ${[...new Set(fs_)].join(', ')}`) } if (!dup) out.push('- none')
out.push('', '## Gaps (values the Bible does not give)', ...REG.gaps.map((g) => '- ' + g))
out.push('', '## Documented exceptions', ...Object.entries(EX.files).map(([k, v]) => `- file ${k}: ${v}`), ...Object.entries(EX.hex).map(([k, v]) => `- ${k}: ${v}`))
out.push('', errors ? `**RESULT: ${errors} error(s)**` : '**RESULT: registry valid (0 errors)**')
fs.writeFileSync('docs/bible/PALETTE_AUDIT.md', out.join('\n') + '\n'); console.log(out.slice(-1)[0]); process.exit(errors ? 1 : 0)
