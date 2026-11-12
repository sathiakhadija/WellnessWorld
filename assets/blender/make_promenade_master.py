# Wellness World — S15 Riverside Promenade: HIGH-FIDELITY BLENDER MASTER (Directive Target A).
# Run: python3 assets/blender/make_promenade_master.py   -> assets/blender/src/promenade_master.blend + docs/bible/evidence/blender_s15_master.png
# Camera matched in spirit to Bible p.66 (eye height looking along the promenade at dusk). Procedural, palette-calibrated shaders (no external textures).
# Axes: +x = along the promenade (away from camera), y = lateral (river on -y, buildings on +y), z = up.
import bpy, bmesh, math, os, random
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
R = random.Random(15)

def hexc(h, a=1.0):
    h = h.lstrip('#'); r, g, b = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (f(r), f(g), f(b), a)

# ---------------------------------------------------------------- materials (procedural PBR)
def nm(name): m = bpy.data.materials.new(name); m.use_nodes = True; n = m.node_tree.nodes; l = m.node_tree.links; n.clear(); return m, n, l
def out(n): o = n.new('ShaderNodeOutputMaterial'); return o
def bsdf(n): return n.new('ShaderNodeBsdfPrincipled')
def tex_coord(n): return n.new('ShaderNodeTexCoord')
def mapping(n, l, scale):
    tc = tex_coord(n); mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = scale; l.new(tc.outputs['Object'], mp.inputs['Vector']); return mp
def mix_rgb(n, l, a, b, fac, blend='MIX'):
    m = n.new('ShaderNodeMixRGB'); m.blend_type = blend
    if hasattr(a, 'outputs'): l.new(a.outputs[0], m.inputs[1])
    else: m.inputs[1].default_value = a
    if hasattr(b, 'outputs'): l.new(b.outputs[0], m.inputs[2])
    else: m.inputs[2].default_value = b
    if hasattr(fac, 'outputs'): l.new(fac.outputs[0], m.inputs[0])
    else: m.inputs[0].default_value = fac
    return m
def noise(n, l, mp, scale, detail=6, rough=0.55):
    t = n.new('ShaderNodeTexNoise'); t.inputs['Scale'].default_value = scale; t.inputs['Detail'].default_value = detail; t.inputs['Roughness'].default_value = rough; l.new(mp.outputs[0], t.inputs['Vector']); return t

def mat_brick(name='WW_Brick_London', base='#9A6553'):
    m, n, l = nm(name); o = out(n); b = bsdf(n); mp = mapping(n, l, (1, 1, 1))
    br = n.new('ShaderNodeTexBrick'); br.inputs['Scale'].default_value = 1.0; br.inputs['Mortar Size'].default_value = 0.01; br.inputs['Brick Width'].default_value = 0.22; br.inputs['Row Height'].default_value = 0.075
    br.inputs['Color1'].default_value = hexc('#8f4f3c'); br.inputs['Color2'].default_value = hexc('#7a4333'); br.inputs['Mortar'].default_value = hexc('#bfae96'); br.inputs['Bias'].default_value = 0.0
    l.new(mp.outputs[0], br.inputs['Vector'])
    ns = noise(n, l, mp, 22, 5); mixc = mix_rgb(n, l, br, hexc('#b27c63'), ns, 'MULTIPLY'); mixc.inputs[0].default_value = 0.25
    l.new(br.outputs['Color'], mixc.inputs[1]); l.new(ns.outputs['Fac'], mixc.inputs[2]); mixc.inputs[0].default_value = 0.15
    l.new(mixc.outputs[0], b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.82
    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.6; bump.inputs['Distance'].default_value = 0.02; l.new(br.outputs['Fac'], bump.inputs['Height']); l.new(bump.outputs[0], b.inputs['Normal'])
    l.new(b.outputs[0], o.inputs[0]); return m

def mat_paving(name='WW_Paving_Limestone', base='#d8cbb9'):
    m, n, l = nm(name); o = out(n); b = bsdf(n); mp = mapping(n, l, (1, 1, 1))
    br = n.new('ShaderNodeTexBrick'); br.inputs['Scale'].default_value = 1.0; br.inputs['Mortar Size'].default_value = 0.006; br.inputs['Brick Width'].default_value = 0.9; br.inputs['Row Height'].default_value = 0.6; br.inputs['Bias'].default_value = 0.0
    br.inputs['Color1'].default_value = hexc(base); br.inputs['Color2'].default_value = hexc('#cdbfa9'); br.inputs['Mortar'].default_value = hexc('#8d8173')
    l.new(mp.outputs[0], br.inputs['Vector'])
    ns = noise(n, l, mp, 6, 7, 0.6); veins = mix_rgb(n, l, br, hexc('#bba98f'), ns, 'MULTIPLY'); l.new(br.outputs['Color'], veins.inputs[1]); veins.inputs[0].default_value = 0.22; l.new(ns.outputs['Fac'], veins.inputs[2])
    l.new(veins.outputs[0], b.inputs['Base Color'])
    rg = n.new('ShaderNodeMapRange'); rg.inputs['From Min'].default_value = 0.3; rg.inputs['From Max'].default_value = 0.7; rg.inputs['To Min'].default_value = 0.32; rg.inputs['To Max'].default_value = 0.6; l.new(ns.outputs['Fac'], rg.inputs[0]); l.new(rg.outputs[0], b.inputs['Roughness'])
    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.5; bump.inputs['Distance'].default_value = 0.01; l.new(br.outputs['Fac'], bump.inputs['Height']); l.new(bump.outputs[0], b.inputs['Normal'])
    l.new(b.outputs[0], o.inputs[0]); return m

def mat_simple(name, col, rough=0.5, metal=0.0, emit=None, es=0.0, alpha=None, spec=0.5):
    m, n, l = nm(name); o = out(n); b = bsdf(n); b.inputs['Base Color'].default_value = hexc(col); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal; b.inputs['Specular IOR Level'].default_value = spec
    if emit: b.inputs['Emission Color'].default_value = hexc(emit); b.inputs['Emission Strength'].default_value = es
    if alpha is not None: b.inputs['Alpha'].default_value = alpha
    l.new(b.outputs[0], o.inputs[0]); return m
def mat_glass(name='WW_Glass'):
    m, n, l = nm(name); o = out(n); g = n.new('ShaderNodeBsdfGlass'); g.inputs['Roughness'].default_value = 0.03; g.inputs['IOR'].default_value = 1.45; g.inputs['Color'].default_value = (0.9, 0.97, 0.95, 1); l.new(g.outputs[0], o.inputs[0]); return m
def mat_leaf(name, col):
    m, n, l = nm(name); o = out(n); b = bsdf(n); mp = mapping(n, l, (1, 1, 1)); ns = noise(n, l, mp, 9, 4)
    c = mix_rgb(n, l, hexc(col), hexc('#86a066'), ns, 'MIX'); l.new(c.outputs[0], b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.65
    b.inputs['Subsurface Weight'].default_value = 0.25; b.inputs['Subsurface Radius'].default_value = (0.3, 0.5, 0.15); l.new(b.outputs[0], o.inputs[0]); return m
def mat_bark(name='WW_Bark'):
    m, n, l = nm(name); o = out(n); b = bsdf(n); mp = mapping(n, l, (6, 6, 1.2)); ns = noise(n, l, mp, 5, 8, 0.6)
    c = mix_rgb(n, l, hexc('#4a3d32'), hexc('#7d6d5c'), ns, 'MIX'); l.new(c.outputs[0], b.inputs['Base Color']); b.inputs['Roughness'].default_value = 0.88
    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.8; l.new(ns.outputs['Fac'], bump.inputs['Height']); l.new(bump.outputs[0], b.inputs['Normal']); l.new(b.outputs[0], o.inputs[0]); return m

M = {
    'brick': mat_brick(), 'brick2': mat_brick('WW_Brick_Stock', '#b08462'), 'paving': mat_paving(),
    'limestone': mat_simple('WW_Limestone_Ivory', '#d9c7b4', 0.62), 'ashlar': mat_simple('WW_Ashlar', '#d8cbb9', 0.7),
    'bronze': mat_simple('WW_Bronze_Dark', '#2b2623', 0.38, 1.0), 'brass': mat_simple('WW_Brass_Antique', '#b58a4d', 0.28, 1.0),
    'burg': mat_simple('WW_Burgundy', '#5a2230', 0.55), 'burgfab': mat_simple('WW_Burgundy_Canvas', '#6b2a38', 0.9),
    'soil': mat_simple('WW_Soil', '#4a382c', 0.95), 'glass': mat_glass(),
    'glow': mat_simple('WW_Lantern_Glow', '#ffd29a', 0.4, 0, '#ffc477', 22.0), 'glowwin': mat_simple('WW_Window_Glow', '#ffd8a8', 0.4, 0, '#ffc98a', 1.1),
    'glowedge': mat_simple('WW_Planter_Edge_Glow', '#ffd29a', 0.4, 0, '#ffb867', 9.0),
    'bark': mat_bark(), 'leafA': mat_leaf('WW_Leaf_A', '#6a8750'), 'leafB': mat_leaf('WW_Leaf_B', '#4d6f3b'), 'leafC': mat_leaf('WW_Leaf_C', '#86a45f'),
    'ivy': mat_leaf('WW_Ivy', '#3f5a36'), 'hydr': mat_simple('WW_Hydrangea', '#eee9e0', 0.7), 'lav': mat_simple('WW_Lavender', '#8a77a8', 0.8),
    'sign': mat_simple('WW_Totem_Sign', '#efe3d0', 0.5, 0, '#ffe2b0', 1.5),
}

# ---------------------------------------------------------------- helpers
def link(o, mat=None, col=None):
    (col or sc.collection).objects.link(o)
    if mat is not None: o.data.materials.append(mat)
    return o
COLL = {}
def coll(name):
    if name not in COLL: c = bpy.data.collections.new(name); sc.collection.children.link(c); COLL[name] = c
    return COLL[name]
def box(name, x0, x1, y0, y1, z0, z1, mat, c='Architecture', bevel=0.01):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co.x = x0 if v.co.x < 0 else x1; v.co.y = y0 if v.co.y < 0 else y1; v.co.z = z0 if v.co.z < 0 else z1
    if bevel > 0: bmesh.ops.bevel(bm, geom=bm.edges[:], offset=bevel, segments=2, affect='EDGES')
    # UV box projection for texture orientation is procedural (object coords) so no UV needed
    bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); link(o, mat, coll(c)); return o
def cyl(name, x, y, z0, z1, r0, r1=None, mat=None, seg=24, c='Props'):
    me = bpy.data.meshes.new(name); bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r0, radius2=(r1 if r1 is not None else r0), depth=(z1 - z0))
    bmesh.ops.translate(bm, vec=(x, y, (z0 + z1) / 2), verts=bm.verts)
    bm.to_mesh(me); bm.free(); o = bpy.data.objects.new(name, me); link(o, mat, coll(c))
    for p in me.polygons: p.use_smooth = True
    return o
def sphere(name, x, y, z, r, mat, scale=(1, 1, 1), c='Foliage', sub=2, seed=0, disp=0.0):
    me = bpy.data.meshes.new(name); bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=sub, radius=r)
    rr = random.Random(seed)
    if disp:
        for v in bm.verts: k = 1 + (rr.random() - 0.5) * disp; v.co *= k
    for v in bm.verts: v.co.x *= scale[0]; v.co.y *= scale[1]; v.co.z *= scale[2]
    bmesh.ops.translate(bm, vec=(x, y, z), verts=bm.verts); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); link(o, mat, coll(c))
    for p in me.polygons: p.use_smooth = True
    return o
def light_point(name, x, y, z, energy, col='#ffcf94', r=0.08):
    l = bpy.data.lights.new(name, 'POINT'); l.energy = energy; l.color = hexc(col)[:3]; l.shadow_soft_size = r
    o = bpy.data.objects.new(name, l); o.location = (x, y, z); coll('Lights').objects.link(o); return o

# ---------------------------------------------------------------- ground + water
L = 70.0
box('Promenade_Paving', -6, L, -6.2, 6.2, -0.2, 0.0, M['paving'], 'Ground', 0.004)
box('Quay_Edge', -6, L, -6.9, -6.2, -0.9, 0.12, M['ashlar'], 'Ground', 0.012)
bpy.ops.mesh.primitive_plane_add(size=400, location=(30, -60, -1.1)); w = bpy.context.object; w.name = 'Thames'; w.data.materials.append(mat_simple('WW_Water', '#3a4056', 0.04, 0.0)); coll('Ground').objects.link(w); sc.collection.objects.unlink(w)
# cobble strip (landward side)
box('Cobble_Strip', -6, L, 4.2, 6.2, 0.0, 0.015, mat_simple('WW_Cobble', '#6e6a74', 0.8), 'Ground', 0.0)

# ---------------------------------------------------------------- brick building row (right / +y): arched lit windows, ivy, pilasters, cornice
BY = 9.0
box('Brick_Wall', -6, L, BY, BY + 0.9, 0.0, 9.5, M['brick'], 'Architecture', 0.02)
for k in range(-1, 16):
    x = k * 4.6
    box(f'Pilaster_{k}', x - 0.25, x + 0.25, BY - 0.12, BY, 0.0, 9.0, M['limestone'], 'Architecture', 0.015)
    # arched ground window (lit) + upper sash windows
    box(f'Arch_Frame_{k}', x + 0.55, x + 3.85, BY - 0.07, BY, 0.35, 3.3, M['bronze'], 'Architecture', 0.01)
    box(f'Arch_Glow_{k}', x + 0.7, x + 3.7, BY - 0.079, BY - 0.077, 0.5, 3.15, M['glowwin'], 'Architecture', 0.0)
    for m_ in range(4): box(f'Mull_{k}_{m_}', x + 0.7 + m_ * 0.75 - 0.02, x + 0.7 + m_ * 0.75 + 0.02, BY - 0.1, BY - 0.079, 0.5, 3.15, M['bronze'], 'Architecture', 0.004)
    for z0 in (4.6, 7.0):
        box(f'Sash_{k}_{z0}', x + 1.0, x + 3.4, BY - 0.07, BY, z0, z0 + 1.6, M['bronze'], 'Architecture', 0.01)
        box(f'SashGlow_{k}_{z0}', x + 1.08, x + 3.32, BY - 0.079, BY - 0.077, z0 + 0.08, z0 + 1.52, M['glowwin'] if R.random() < 0.7 else mat_simple('WW_Window_Dark', '#2d3444', 0.1), 'Architecture', 0.0)
        box(f'Sill_{k}_{z0}', x + 0.9, x + 3.5, BY - 0.2, BY, z0 - 0.08, z0, M['limestone'], 'Architecture', 0.01)
box('Cornice', -6, L, BY - 0.3, BY + 0.9, 9.0, 9.5, M['limestone'], 'Architecture', 0.02)
box('Plinth', -6, L, BY - 0.15, BY, 0.0, 0.5, M['limestone'], 'Architecture', 0.01)
# ivy blankets (clustered leaf cards as flattened icospheres on the wall)
ivy = M['ivy']
for _ in range(260):
    x = R.uniform(-4, 62); z = R.uniform(0.3, 6.8) if R.random() < 0.6 else R.uniform(0.3, 2.4)
    if int((x + 6) / 4.6) % 3 != 0 and R.random() < 0.75: continue
    sphere('ivy', x, BY - 0.12, z, R.uniform(0.1, 0.26), ivy, (1, 0.35, 1), 'Foliage', 2, R.randint(0, 9999), 0.3)

# ---------------------------------------------------------------- planters with glowing edge + hydrangea / lavender / box
for i in range(10):
    x = 2 + i * 6.8
    box(f'Planter_{i}', x - 1.7, x + 1.7, 4.0, 5.2, 0.0, 0.62, M['ashlar'], 'Props', 0.015)
    box(f'PlanterCap_{i}', x - 1.76, x + 1.76, 3.94, 5.26, 0.62, 0.68, M['limestone'], 'Props', 0.01)
    box(f'PlanterGlow_{i}', x - 1.62, x + 1.62, 3.93, 3.97, 0.06, 0.1, M['glowedge'], 'Props', 0.0)
    box(f'Soil_{i}', x - 1.6, x + 1.6, 4.1, 5.1, 0.62, 0.7, M['soil'], 'Props', 0.0)
    for k in range(13):
        px = x - 1.4 + k * 0.24 + R.uniform(-0.05, 0.05); py = 4.6 + R.uniform(-0.3, 0.3)
        kind = k % 3
        if kind == 0: sphere('hydr', px, py, 0.95, 0.15, M['hydr'], (1, 1, 0.8), 'Foliage', 2, k + i * 9, 0.3)
        elif kind == 1: sphere('box', px, py, 0.9, 0.2, M['leafB'], (1, 1, 0.9), 'Foliage', 2, k + i * 9 + 3, 0.2)
        else: sphere('lav', px, py, 0.9, 0.12, M['lav'], (1, 1, 1.6), 'Foliage', 2, k + i * 9 + 7, 0.25)

# ---------------------------------------------------------------- lamps (black/brass lanterns with glow + real light) along both sides
def lamp(x, y):
    cyl('LampBase', x, y, 0, 0.5, 0.14, 0.09, M['bronze'], 12); cyl('LampPost', x, y, 0.5, 3.6, 0.045, 0.035, M['bronze'], 10)
    cyl('LampCollar', x, y, 2.0, 2.1, 0.07, 0.07, M['brass'], 10)
    cyl('LanternBody', x, y, 3.6, 4.15, 0.17, 0.12, M['glow'], 8); cyl('LanternCap', x, y, 4.15, 4.3, 0.2, 0.04, M['bronze'], 8); cyl('LanternBase', x, y, 3.55, 3.6, 0.13, 0.13, M['bronze'], 8)
    for a in range(4):
        ax = x + 0.17 * math.cos(a * math.pi / 2 + math.pi / 4); ay = y + 0.17 * math.sin(a * math.pi / 2 + math.pi / 4)
        cyl('LanternRib', ax, ay, 3.6, 4.15, 0.012, 0.012, M['bronze'], 6)
    light_point('LampLight', x, y, 3.85, 160, '#ffc98a', 0.1)
for i in range(8):
    lamp(3 + i * 9.0, -4.9); lamp(7.5 + i * 9.0, 3.6)

# ---------------------------------------------------------------- benches (timber slats + cast iron)
def bench(x, y, rot=0):
    parent = bpy.data.objects.new('Bench', None); coll('Props').objects.link(parent); parent.location = (x, y, 0); parent.rotation_euler = (0, 0, rot)
    def b(x0, x1, y0, y1, z0, z1, mat):
        o = box('b', x0, x1, y0, y1, z0, z1, mat, 'Props', 0.006); o.parent = parent; return o
    for k in range(6): b(-0.85, 0.85, -0.24 + k * 0.08, -0.17 + k * 0.08, 0.44 + (0.0 if k < 5 else 0), 0.48, mat_simple('WW_Timber_Bench', '#8a6a48', 0.55))
    for k in range(4): b(-0.85, 0.85, 0.2, 0.25, 0.55 + k * 0.1, 0.62 + k * 0.1, mat_simple('WW_Timber_Bench', '#8a6a48', 0.55))
    for sx in (-0.75, 0.75): b(sx - 0.03, sx + 0.03, -0.26, 0.26, 0.0, 0.5, M['bronze']); b(sx - 0.03, sx + 0.03, 0.2, 0.26, 0.48, 0.95, M['bronze'])
for i in range(6): bench(10 + i * 11.0, -3.5 + (0.3 if i % 2 else 0), math.pi / 2 * 0 + math.pi * (i % 2) * 0 + 0.0 + math.pi)

# ---------------------------------------------------------------- burgundy Riverside Promenade wayfinding totem (left foreground)
box('Totem', 5.2, 5.9, -5.0, -4.6, 0.0, 2.6, M['burg'], 'Props', 0.02); box('TotemCap', 5.15, 5.95, -5.05, -4.55, 2.6, 2.7, M['brass'], 'Props', 0.01)
box('TotemSign', 5.19, 5.21, -4.95, -4.65, 1.0, 2.4, M['sign'], 'Props', 0.0)

# ---------------------------------------------------------------- trees: bark trunk with forked branches + layered leaf clusters (not spheres)
def tree(x, y, h=8.5, seed=1):
    rr = random.Random(seed); c = coll('Trees')
    cyl('Trunk', x, y, 0, h * 0.5, 0.2, 0.13, M['bark'], 14, 'Trees')
    # branches: slanted cylinders
    tips = []
    for b in range(6):
        a = b * (math.pi / 3) + rr.uniform(-0.3, 0.3); L_ = rr.uniform(2.2, 3.6); z0 = h * (0.42 + rr.random() * 0.12)
        ex, ey, ez = x + math.cos(a) * L_ * 0.7, y + math.sin(a) * L_ * 0.7, z0 + L_ * 0.8
        o = cyl('Branch', 0, 0, 0, 1, 0.11, 0.04, M['bark'], 8, 'Trees')
        o.location = ((x + ex) / 2, (y + ey) / 2, (z0 + ez) / 2)
        d = (ex - x, ey - y, ez - z0); ln = math.sqrt(sum(t * t for t in d)); o.scale = (1, 1, ln)
        o.rotation_euler = (0, math.acos(d[2] / ln), math.atan2(d[1], d[0])); tips.append((ex, ey, ez))
    mats = [M['leafA'], M['leafB'], M['leafC']]
    for (ex, ey, ez) in tips:
        for k in range(44):
            sphere('Leaves', ex + rr.uniform(-1.9, 1.9), ey + rr.uniform(-1.9, 1.9), ez + rr.uniform(-1.2, 1.8), rr.uniform(0.22, 0.46), mats[rr.randint(0, 2)], (1.0, 1.0, 0.62), 'Trees', 2, rr.randint(0, 99999), 0.3)
for i, x in enumerate([-1, 7, 16, 25, 34, 43, 52, 61]):
    tree(x, -5.0 + R.uniform(-0.3, 0.3), 8 + R.uniform(0, 2), i + 1)
    tree(x + 3.4, 3.3 + R.uniform(-0.3, 0.3), 8.5 + R.uniform(0, 2), i + 31)

# ---------------------------------------------------------------- café pavilion (distance, right): glass + burgundy umbrellas + warm glow
box('Pavilion_Base', 38, 52, 3.0, 7.0, 0.0, 0.3, M['limestone'], 'Architecture', 0.01)
box('Pavilion_Glass', 38.2, 51.8, 6.2, 6.3, 0.3, 3.4, M['glass'], 'Architecture', 0.0)
box('Pavilion_Glow', 38.4, 51.6, 6.8, 6.85, 0.3, 3.3, M['glowwin'], 'Architecture', 0.0)
for k in range(15): box('PavMull', 38 + k, 38.06 + k, 6.15, 6.3, 0.3, 3.4, M['bronze'], 'Architecture', 0.004)
box('Pavilion_Roof', 37.6, 52.4, 2.6, 7.2, 3.4, 3.7, M['limestone'], 'Architecture', 0.02)
for i in range(4):
    ux = 41 + i * 3.2; cyl('UmbPole', ux, 4.0, 0, 2.5, 0.025, 0.025, M['bronze'], 8)
    cyl('Umbrella', ux, 4.0, 2.3, 2.75, 1.5, 0.04, M['burgfab'], 16)
    cyl('Table', ux, 4.0, 0.0, 0.72, 0.4, 0.4, mat_simple('WW_Table', '#2b2623', 0.4, 0.8), 16)

# ---------------------------------------------------------------- railing (river side): slim bronze rail + posts + stone piers
for i in range(0, int(L) // 3):
    x = i * 3.0
    cyl('RailPost', x, -6.55, 0.12, 1.05, 0.02, 0.02, M['bronze'], 8)
    if i % 3 == 0: box('Pier', x - 0.2, x + 0.2, -6.85, -6.45, 0.12, 1.25, M['ashlar'], 'Props', 0.015)
box('RailTop', -6, L, -6.6, -6.5, 1.02, 1.07, M['bronze'], 'Props', 0.006); box('RailMid', -6, L, -6.58, -6.52, 0.55, 0.58, M['bronze'], 'Props', 0.004)

# ---------------------------------------------------------------- world + lighting (blue-hour/sunset)
world = bpy.data.worlds.new('Dusk'); sc.world = world; world.use_nodes = True; wn = world.node_tree.nodes; wl = world.node_tree.links
wn.clear(); sky = wn.new('ShaderNodeTexSky'); sky.sky_type = 'MULTIPLE_SCATTERING'; sky.sun_elevation = math.radians(1.2); sky.sun_rotation = math.radians(70); sky.air_density = 1.6; sky.aerosol_density = 2.5; sky.sun_intensity = 0.8
bg = wn.new('ShaderNodeBackground'); bg.inputs['Strength'].default_value = 0.9; wo = wn.new('ShaderNodeOutputWorld'); hs = wn.new('ShaderNodeHueSaturation'); hs.inputs['Saturation'].default_value = 1.7; wl.new(sky.outputs[0], hs.inputs['Color']); wl.new(hs.outputs[0], bg.inputs[0]); wl.new(bg.outputs[0], wo.inputs[0])
# warm low sun + cool fill
sun = bpy.data.lights.new('Sun', 'SUN'); sun.energy = 2.0; sun.color = hexc('#ffb36b')[:3]; sun.angle = math.radians(2.0); so = bpy.data.objects.new('Sun', sun); so.rotation_euler = (math.radians(86), 0, math.radians(-100)); coll('Lights').objects.link(so)

# ---------------------------------------------------------------- camera (eye height, looking down the promenade; ~Bible p.66 framing)
cam = bpy.data.cameras.new('Cam'); cam.lens = 24; co = bpy.data.objects.new('Cam', cam); sc.collection.objects.link(co); co.location = (-4.5, 0.2, 1.65); co.rotation_euler = (math.radians(89.5), 0, math.radians(-90 + 4)); sc.camera = co
# ---------------------------------------------------------------- render
sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = int(os.environ.get('SAMPLES', 40)); sc.cycles.use_denoising = True; sc.cycles.max_bounces = 6; sc.cycles.diffuse_bounces = 3; sc.cycles.glossy_bounces = 3; sc.cycles.transmission_bounces = 4
sc.render.resolution_x = 1280; sc.render.resolution_y = 780; sc.view_settings.view_transform = 'AgX'; sc.view_settings.look = 'AgX - Medium High Contrast'; sc.view_settings.exposure = 0.3
os.makedirs(f'{ROOT}/assets/blender/src', exist_ok=True)
bpy.ops.wm.save_as_mainfile(filepath=f'{ROOT}/assets/blender/src/promenade_master.blend')
sc.render.filepath = f'{ROOT}/docs/bible/evidence/blender_s15_master.png'
if os.environ.get('NO_RENDER') != '1': bpy.ops.render.render(write_still=True)
print('done', sc.render.filepath)
