"""Split the supplied cute_rabbit.glb into animatable parts (body, head+face, ears, arms, feet, tail), decimate each, set pivots at the joints,
parent ears/face to the head and export public/models/rabbit_rig.glb with named nodes (rabbit_body, rabbit_head, ear_L ...). JS animates the nodes
(run cycle). Run: python3.13 assets/blender/make_rabbit_rig.py <input.glb> <output.glb>"""
import bpy, sys, bmesh
from mathutils import Vector
src, dst = sys.argv[-2], sys.argv[-1]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=src)
S = bpy.context.scene
objs = [o for o in S.objects if o.type == 'MESH']
for o in objs:                                   # bake world transform, drop parents
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
for o in S.objects:
    if o.type != 'MESH': bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for o in objs: o.select_set(True)
bpy.context.view_layer.objects.active = objs[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
CX = -6.0
def bbox(o):
    pts = [o.matrix_world @ v.co for v in o.data.vertices]
    return Vector([min(p[i] for p in pts) for i in range(3)]), Vector([max(p[i] for p in pts) for i in range(3)])
def sel(lst):
    bpy.ops.object.select_all(action='DESELECT')
    for o in lst: o.select_set(True)
    bpy.context.view_layer.objects.active = lst[0]
def join(lst, name):
    sel(lst)
    if len(lst) > 1: bpy.ops.object.join()
    o = bpy.context.view_layer.objects.active; o.name = name; return o
def split_sides(o, base):
    sel([o]); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.separate(type='LOOSE'); bpy.ops.object.mode_set(mode='OBJECT')
    parts = [p for p in S.objects if p.type == 'MESH' and p.name.startswith(o.name.split('.')[0][:4])]
    return parts
def pivot(o, p):
    o.data.transform(__import__('mathutils').Matrix.Translation(-Vector(p))); o.location = Vector(p)
by = {o.name: o for o in objs}
def find(prefix): return [o for o in objs if o.name.startswith(prefix)]
# --- classify
head_main = find('ras_')[0]
face = [o for pre in ('3enin', '5cham', 'kerch', '5doud', 'fom') for o in find(pre)]
body = find('bdan')[0]; tail = find('ba3bous')[0]
ears = {'L': [], 'R': []}
for o in find('wedhnen'):
    mn, mx = bbox(o); ears['R' if (mn.x + mx.x) / 2 > CX else 'L'].append(o)
arms, feet = find('iden')[0], find('sa9in')[0]
def side_split(o):
    sel([o]); bpy.ops.object.mode_set(mode='EDIT'); bpy.ops.mesh.select_all(action='SELECT'); bpy.ops.mesh.separate(type='LOOSE'); bpy.ops.object.mode_set(mode='OBJECT')
    islands = [p for p in S.objects if p.type == 'MESH' and p.data in [q.data for q in S.objects if q.name.startswith(o.name.split('.')[0])]]
    return islands
before = set(S.objects)
a_isl = side_split(arms); f_isl = side_split(feet)
new = [o for o in S.objects if o not in before] + [arms, feet]
def group_by_side(isl):
    d = {'L': [], 'R': []}
    for o in isl:
        mn, mx = bbox(o); d['R' if (mn.x + mx.x) / 2 > CX else 'L'].append(o)
    return d
armS = group_by_side([o for o in new if o.name.startswith('iden')]); footS = group_by_side([o for o in new if o.name.startswith('sa9in')])
print('islands arms', {k: len(v) for k, v in armS.items()}, 'feet', {k: len(v) for k, v in footS.items()})
parts = {}
parts['body'] = join([body], 'rabbit_body'); parts['tail'] = join([tail], 'tail')
parts['head'] = join([head_main], 'rabbit_head')
parts['face'] = join(face, 'face')
for s in 'LR':
    parts['ear_' + s] = join(ears[s], 'ear_' + s); parts['arm_' + s] = join(armS[s], 'arm_' + s); parts['foot_' + s] = join(footS[s], 'foot_' + s)
# --- decimate (target ~14k tris total)
def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
total = sum(tris(o) for o in parts.values()); print('tris before', total)
for k, o in parts.items():
    sel([o]); t = tris(o); ratio = max(0.08, min(1.0, 14000 / total)) if t > 1500 else 0.5
    ratio = max(ratio, 600 / max(t, 1)) if t > 600 else 1.0
    m = o.modifiers.new('d', 'DECIMATE'); m.ratio = min(1.0, ratio); bpy.ops.object.modifier_apply(modifier='d')
print('tris after', sum(tris(o) for o in parts.values()))
# --- pivots
def P(o): return bbox(o)
mn, mx = P(parts['body']); neck = Vector((CX, 0.0, mx.z - 0.4))
pivot(parts['rabbit_head'] if 'rabbit_head' in parts else parts['head'], neck)
for s in 'LR':
    mn, mx = P(parts['arm_' + s]); inner = mn.x if s == 'R' else mx.x
    pivot(parts['arm_' + s], Vector((inner + (0.25 if s == 'R' else -0.25), (mn.y + mx.y) / 2, mx.z - 0.25)))
    mn, mx = P(parts['foot_' + s]); pivot(parts['foot_' + s], Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mx.z)))
    mn, mx = P(parts['ear_' + s]); pivot(parts['ear_' + s], Vector(((mn.x + mx.x) / 2, (mn.y + mx.y) / 2, mn.z)))
mn, mx = P(parts['tail']); pivot(parts['tail'], Vector(((mn.x + mx.x) / 2, mn.y, (mn.z + mx.z) / 2)))
bpy.context.view_layer.update()
# root empty + parenting
root = bpy.data.objects.new('rabbit_root', None); S.collection.objects.link(root)
def par(o, p):
    bpy.context.view_layer.update(); mw = o.matrix_world.copy(); o.parent = p; o.matrix_parent_inverse = p.matrix_world.inverted(); o.matrix_world = mw
for k in ('body', 'tail', 'arm_L', 'arm_R', 'foot_L', 'foot_R', 'head'): par(parts[k], root)
for k in ('face', 'ear_L', 'ear_R'): par(parts[k], parts['head'])
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_apply=True, export_image_format='JPEG')
print('EXPORTED', dst)
