"""Blender-authored, baked texture sets for the street (headless):  blender -b -P assets/blender/bake_textures.py
 - slab_albedo.png / slab_normal.png : 1.8 m x 1.2 m limestone paving tile (2x2 slabs), procedural shader baked in Cycles
 - ao_contact.png : RGBA black, alpha = 1 - Cycles-baked ambient occlusion on the ground beside a tall wall (static, neutral contact shadow)
In-house procedural content: no third-party licence."""
import bpy, os, math
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', 'public', 'textures')
os.makedirs(OUT, exist_ok=True)
def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene; sc.render.engine = 'CYCLES'; sc.cycles.device = 'CPU'; sc.cycles.samples = 24
    return sc
def img(name, w, h, alpha=False):
    i = bpy.data.images.new(name, w, h, alpha=alpha); return i
def target(mat, image):
    n = mat.node_tree.nodes; t = n.new('ShaderNodeTexImage'); t.image = image; n.active = t; t.select = True
def save(image, fn, cs='sRGB'):
    import numpy as np
    from PIL import Image
    w, h = image.size; a = np.array(image.pixels[:], dtype=np.float32).reshape(h, w, 4)[::-1]
    Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA').convert('RGBA' if fn.startswith('ao') else 'RGB').save(os.path.join(OUT, fn))

def slab(bake_type, fn, cs):
    sc = reset()
    bpy.ops.mesh.primitive_plane_add(size=1); o = bpy.context.active_object; o.scale = (1.8, 1.2, 1)
    bpy.ops.object.transform_apply(scale=True)
    m = bpy.data.materials.new('slab'); m.use_nodes = True; o.data.materials.append(m)
    n = m.node_tree.nodes; l = m.node_tree.links; n.clear()
    out = n.new('ShaderNodeOutputMaterial'); bs = n.new('ShaderNodeBsdfPrincipled')
    tc = n.new('ShaderNodeTexCoord')
    br = n.new('ShaderNodeTexBrick'); br.offset = 0.0; br.squash = 1.0
    br.inputs['Scale'].default_value = 1.0; br.inputs['Mortar Size'].default_value = 0.008; br.inputs['Mortar Smooth'].default_value = 0.08
    br.inputs['Bias'].default_value = 0.0; br.inputs['Brick Width'].default_value = 0.5; br.inputs['Row Height'].default_value = 0.5
    br.inputs['Color1'].default_value = (0.97, 0.94, 0.88, 1); br.inputs['Color2'].default_value = (0.82, 0.79, 0.72, 1); br.inputs['Mortar'].default_value = (0.40, 0.38, 0.35, 1)
    mp = n.new('ShaderNodeMapping'); mp.inputs['Scale'].default_value = (1.0, 1.0, 1.0)
    l.new(tc.outputs['UV'], mp.inputs['Vector']); l.new(mp.outputs['Vector'], br.inputs['Vector'])
    # veining + pores
    nz = n.new('ShaderNodeTexNoise'); nz.inputs['Scale'].default_value = 7; nz.inputs['Detail'].default_value = 8; nz.inputs['Distortion'].default_value = 0.8
    wv = n.new('ShaderNodeTexWave'); wv.inputs['Scale'].default_value = 1.4; wv.inputs['Distortion'].default_value = 14; wv.inputs['Detail'].default_value = 3
    l.new(tc.outputs['UV'], nz.inputs['Vector']); l.new(tc.outputs['UV'], wv.inputs['Vector'])
    mixv = n.new('ShaderNodeMix'); mixv.data_type = 'RGBA'; mixv.blend_type = 'MULTIPLY'; mixv.inputs['Factor'].default_value = 1.0
    ramp = n.new('ShaderNodeValToRGB'); ramp.color_ramp.elements[0].position = 0.3; ramp.color_ramp.elements[0].color = (0.88, 0.86, 0.82, 1); ramp.color_ramp.elements[1].position = 0.75; ramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    l.new(nz.outputs['Fac'], ramp.inputs['Fac'])
    l.new(br.outputs['Color'], mixv.inputs[6]); l.new(ramp.outputs['Color'], mixv.inputs[7])
    vramp = n.new('ShaderNodeValToRGB'); vramp.color_ramp.elements[0].position = 0.46; vramp.color_ramp.elements[0].color = (0.9, 0.88, 0.84, 1); vramp.color_ramp.elements[1].position = 0.52; vramp.color_ramp.elements[1].color = (1, 1, 1, 1)
    l.new(wv.outputs['Fac'], vramp.inputs['Fac'])
    mix2 = n.new('ShaderNodeMix'); mix2.data_type = 'RGBA'; mix2.blend_type = 'MULTIPLY'; mix2.inputs['Factor'].default_value = 0.18
    l.new(mixv.outputs[2], mix2.inputs[6]); l.new(vramp.outputs['Color'], mix2.inputs[7])
    l.new(mix2.outputs[2], bs.inputs['Base Color'])
    # height: joints sunken, surface pitted
    hmix = n.new('ShaderNodeMath'); hmix.operation = 'MULTIPLY_ADD'; hmix.inputs[1].default_value = 0.25; hmix.inputs[2].default_value = 0.75
    l.new(nz.outputs['Fac'], hmix.inputs[0])
    hh = n.new('ShaderNodeMath'); hh.operation = 'MULTIPLY'
    l.new(hmix.outputs['Value'], hh.inputs[0]); l.new(br.outputs['Fac'], hh.inputs[1])
    # Brick Fac is 1 on brick, 0 on mortar
    bump = n.new('ShaderNodeBump'); bump.inputs['Strength'].default_value = 0.9; bump.inputs['Distance'].default_value = 0.01
    l.new(hh.outputs['Value'], bump.inputs['Height']); l.new(bump.outputs['Normal'], bs.inputs['Normal'])
    bs.inputs['Roughness'].default_value = 0.82
    l.new(bs.outputs['BSDF'], out.inputs['Surface'])
    image = img(fn, 1536, 1024); image.colorspace_settings.name = cs; target(m, image)
    bpy.context.view_layer.objects.active = o; o.select_set(True)
    if bake_type == 'DIFFUSE':
        sc.render.bake.use_pass_direct = False; sc.render.bake.use_pass_indirect = False; sc.render.bake.use_pass_color = True
    sc.cycles.samples = 16
    bpy.ops.object.bake(type=bake_type, margin=4); import statistics; print('MEAN', bake_type, sum(image.pixels[:40000])/40000, image.size[:], image.is_float)
    save(image, fn, cs)

def ao():
    sc = reset(); sc.cycles.samples = 256
    W, D = 8, 128
    bpy.ops.mesh.primitive_plane_add(size=1); g = bpy.context.active_object; g.scale = (0.4, 2.5, 1); g.location = (0, 1.25, 0)   # 0.4 m wide, 2.5 m deep strip, wall at y = 0
    bpy.ops.object.transform_apply(scale=True)
    bpy.ops.mesh.primitive_cube_add(size=1); wl = bpy.context.active_object; wl.scale = (30, 0.5, 3); wl.location = (0, -0.25, 1.5)
    bpy.ops.object.transform_apply(scale=True)
    # lighting-independent: world white; AO bake
    w = bpy.data.worlds.new('w'); sc.world = w; w.use_nodes = True
    m = bpy.data.materials.new('g'); m.use_nodes = True; g.data.materials.append(m)
    image = img('ao', W, D, alpha=True); target(m, image)
    # strip UV: v runs along +y (0 at wall edge) by default plane UV orientation
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active = g; g.select_set(True)
    bpy.ops.object.bake(type='AO', margin=0)
    px = list(image.pixels); out = []
    for y in range(D):          # y = 0 at plane's -y edge (wall side)
        r = px[(y * W + W // 2) * 4]; a = max(0.0, min(1.0, 1.0 - r))
        out.append(a)
    lo = out[-1]; out = [max(0.0, min(1.0, (a - lo) * 2.6)) * (1 - (i / (D - 1)) ** 3) for i, a in enumerate(out)]   # remove the far-field floor, gain, fade to zero
    res = img('aoc', W, D, alpha=True)
    # game aoTex convention: opaque at v=1 (wall edge) -> transparent far; canvas row 0 = top = v 1
    buf = []
    for y in range(D):          # image row y (bottom-up) ; v=0 bottom must be far
        a = out[D - 1 - y]      # bottom row = far (y index D-1 of bake => large distance)
        for x in range(W): buf += [0, 0, 0, a]
    res.pixels = buf; save(res, 'ao_contact.png', 'sRGB')
    print('AO profile', [round(out[i], 2) for i in (0, 8, 16, 32, 64, 100, 127)])

slab('DIFFUSE', 'slab_albedo.png', 'sRGB')
slab('NORMAL', 'slab_normal.png', 'Non-Color')
ao()
print('done')
