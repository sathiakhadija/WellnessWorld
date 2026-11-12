"""Wellness World Blender material library — generated from assets/palette/registry.json (same source as the game).
Principled BSDF takes LINEAR values: we feed `linear`/`altLinear` from the registry (hex -> linear done once, by scripts/build_palette.mjs). Do not gamma-convert again.
Texture detail is procedural (no external assets): brick/mortar, wood grain, stone mottling, paving joints, leather/fabric bump. Procedural variation is tied to scale in metres.
Usage: exec(open('assets/blender/mat_lib.py').read()); mats = build_all()"""
import bpy, json, os
REG = json.load(open(os.path.join(os.environ.get('WW_ROOT', '.'), 'assets/palette/registry.json')))

def _n(nt, t, loc=(0, 0), **kw):
    n = nt.nodes.new(t); n.location = loc
    for k, v in kw.items():
        try: setattr(n, k, v)
        except Exception: pass
    return n

def _rgba(lin): return (lin[0], lin[1], lin[2], 1.0)

def make_material(e):
    m = bpy.data.materials.get(e['id']) or bpy.data.materials.new(e['id'])
    m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = _n(nt, 'ShaderNodeOutputMaterial', (900, 0)); bsdf = _n(nt, 'ShaderNodeBsdfPrincipled', (600, 0))
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    base = e['linear']; alt = e.get('altLinear') or base; cat = e['cat']
    m['ww_status'] = e['status']; m['ww_page'] = e.get('page') or 0
    bsdf.inputs['Roughness'].default_value = e.get('rough') if e.get('rough') is not None else 0.5
    bsdf.inputs['Metallic'].default_value = e.get('metal') or 0.0
    if cat == 'glass':
        bsdf.inputs['Base Color'].default_value = (1, 1, 1, 1); bsdf.inputs['Transmission Weight'].default_value = 1.0; bsdf.inputs['IOR'].default_value = e['glass']['ior']; bsdf.inputs['Roughness'].default_value = e['rough']; return m
    if cat == 'light':
        bsdf.inputs['Base Color'].default_value = _rgba(base); bsdf.inputs['Emission Color'].default_value = _rgba(base); bsdf.inputs['Emission Strength'].default_value = 1.0 if e['id'] == 'WW_LAMP_WARM' else 0.0; return m
    coord = _n(nt, 'ShaderNodeTexCoord', (-900, 0)); mp = _n(nt, 'ShaderNodeMapping', (-700, 0)); nt.links.new(coord.outputs['Object'], mp.inputs['Vector'])
    A = _n(nt, 'ShaderNodeRGB', (-400, 200)); A.outputs[0].default_value = _rgba(base)
    B = _n(nt, 'ShaderNodeRGB', (-400, 100)); B.outputs[0].default_value = _rgba(alt)
    mix = _n(nt, 'ShaderNodeMix', (200, 100), data_type='RGBA'); nt.links.new(A.outputs[0], mix.inputs['A']); nt.links.new(B.outputs[0], mix.inputs['B'])
    bump = _n(nt, 'ShaderNodeBump', (350, -250)); bump.inputs['Strength'].default_value = e.get('normal') or 0.0; bump.inputs['Distance'].default_value = 0.01
    rough_var = _n(nt, 'ShaderNodeMath', (350, -100), operation='MULTIPLY_ADD'); rough_var.inputs[1].default_value = 0.12; rough_var.inputs[2].default_value = e.get('rough') or 0.5
    if cat == 'brick':
        t = _n(nt, 'ShaderNodeTexBrick', (-200, 150)); t.inputs['Scale'].default_value = 1 / 0.215; mp.inputs['Scale'].default_value = (1, 1, 1)
        t.inputs['Mortar Size'].default_value = 0.02; t.inputs['Brick Width'].default_value = 0.5; t.inputs['Row Height'].default_value = 0.25
        t.inputs['Color1'].default_value = _rgba(base); t.inputs['Color2'].default_value = _rgba(alt); t.inputs['Mortar'].default_value = (0.55, 0.50, 0.44, 1)
        nt.links.new(mp.outputs[0], t.inputs['Vector']); nt.links.new(t.outputs['Color'], bsdf.inputs['Base Color']); nt.links.new(t.outputs['Fac'], bump.inputs['Height'])
    elif cat == 'wood':
        w = _n(nt, 'ShaderNodeTexWave', (-200, 150), wave_type='BANDS', bands_direction='Y'); w.inputs['Scale'].default_value = 14; w.inputs['Distortion'].default_value = 3.0; w.inputs['Detail'].default_value = 3
        nz = _n(nt, 'ShaderNodeTexNoise', (-200, -50)); nz.inputs['Scale'].default_value = 5
        mp.inputs['Scale'].default_value = (1, 0.12, 1)
        nt.links.new(mp.outputs[0], w.inputs['Vector']); nt.links.new(mp.outputs[0], nz.inputs['Vector'])
        ramp = _n(nt, 'ShaderNodeMath', (0, 100), operation='MULTIPLY'); ramp.inputs[1].default_value = 0.6
        nt.links.new(w.outputs['Fac'], ramp.inputs[0]); nt.links.new(ramp.outputs[0], mix.inputs['Factor'])
        nt.links.new(mix.outputs['Result'], bsdf.inputs['Base Color']); nt.links.new(w.outputs['Fac'], bump.inputs['Height'])
        nt.links.new(nz.outputs['Fac'], rough_var.inputs[0])
    elif cat in ('stone', 'paving'):
        nz = _n(nt, 'ShaderNodeTexNoise', (-200, 150)); nz.inputs['Scale'].default_value = 2.5; nz.inputs['Detail'].default_value = 8; nz.inputs['Roughness'].default_value = 0.6
        nt.links.new(mp.outputs[0], nz.inputs['Vector']); nt.links.new(nz.outputs['Fac'], mix.inputs['Factor']); nt.links.new(mix.outputs['Result'], bsdf.inputs['Base Color']); nt.links.new(nz.outputs['Fac'], bump.inputs['Height'])
        if cat == 'paving':  # joints
            br = _n(nt, 'ShaderNodeTexBrick', (-200, -150)); br.inputs['Scale'].default_value = 1 / 0.6; br.inputs['Mortar Size'].default_value = 0.012; br.inputs['Brick Width'].default_value = 1.0; br.inputs['Row Height'].default_value = 0.5
            nt.links.new(mp.outputs[0], br.inputs['Vector']); jm = _n(nt, 'ShaderNodeMix', (400, 200), data_type='RGBA'); jm.inputs['B'].default_value = (0.35, 0.33, 0.3, 1)
            nt.links.new(mix.outputs['Result'], jm.inputs['A']); nt.links.new(br.outputs['Fac'], jm.inputs['Factor']); nt.links.new(jm.outputs['Result'], bsdf.inputs['Base Color'])
    elif cat in ('textile',):
        wv = _n(nt, 'ShaderNodeTexWave', (-200, 150), wave_type='BANDS'); wv.inputs['Scale'].default_value = 300; nt.links.new(mp.outputs[0], wv.inputs['Vector'])
        nt.links.new(wv.outputs['Fac'], bump.inputs['Height']); nt.links.new(wv.outputs['Fac'], mix.inputs['Factor']); mix.inputs['Factor'].default_value = 0.15
        nt.links.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
    elif cat == 'foliage':
        nz = _n(nt, 'ShaderNodeTexNoise', (-200, 150)); nz.inputs['Scale'].default_value = 12; nt.links.new(mp.outputs[0], nz.inputs['Vector']); nt.links.new(nz.outputs['Fac'], mix.inputs['Factor']); nt.links.new(mix.outputs['Result'], bsdf.inputs['Base Color'])
        bsdf.inputs['Subsurface Weight'].default_value = 0.15; bsdf.inputs['Subsurface Radius'].default_value = (0.1, 0.2, 0.05)
    else:
        bsdf.inputs['Base Color'].default_value = _rgba(base)
    if bump.inputs['Strength'].default_value > 0: nt.links.new(bump.outputs['Normal'], bsdf.inputs['Normal'])
    if cat in ('wood',): nt.links.new(rough_var.outputs[0], bsdf.inputs['Roughness'])
    if not bsdf.inputs['Base Color'].is_linked: bsdf.inputs['Base Color'].default_value = _rgba(base)
    return m

def build_all():
    return {e['id']: make_material(e) for e in REG['materials']}
