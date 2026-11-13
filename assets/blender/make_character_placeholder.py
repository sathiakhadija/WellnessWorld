"""TECHNICAL PLACEHOLDER — NOT Momo, NOT a final character, NOT shown to players.
A deliberately crude, clearly-labelled grey biped with a real armature and the standard clip set (Idle, Walk, Run, Jump, Sit, Sleep, Wave, Cheer, emote_happy),
used only to validate the GLB character pipeline (src/characters: loader, mixer, state machine, fallback). Dev-only (?dev=1 character picker).
Run: python3 assets/blender/make_character_placeholder.py   ->  public/models/_TECHNICAL_PLACEHOLDER_biped.glb"""
import bpy, math, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene; sc.render.fps = 30

mat = bpy.data.materials.new('TECHNICAL_PLACEHOLDER'); mat.use_nodes = True
b = mat.node_tree.nodes['Principled BSDF']; b.inputs['Base Color'].default_value = (0.55, 0.60, 0.68, 1); b.inputs['Roughness'].default_value = 0.8

def part(name, kind, loc, scale, parent_bone=None):
    if kind == 'sphere': bpy.ops.mesh.primitive_uv_sphere_add(radius=1, segments=16, ring_count=10, location=loc)
    else: bpy.ops.mesh.primitive_cylinder_add(radius=1, depth=2, vertices=14, location=loc)
    o = bpy.context.active_object; o.name = name; o.scale = scale; bpy.ops.object.transform_apply(scale=True)
    o.data.materials.append(mat); return o

# armature (rest pose: standing, facing +Y in Blender = +Z after glTF export conversion handled by exporter -> faces -Z in glTF; faceFix in registry handles it)
bpy.ops.object.armature_add(location=(0, 0, 0)); arm = bpy.context.active_object; arm.name = 'PlaceholderArmature'
bpy.ops.object.mode_set(mode='EDIT'); eb = arm.data.edit_bones
for e in list(eb): eb.remove(e)
def bone(n, head, tail, parent=None):
    e = eb.new(n); e.head = head; e.tail = tail
    if parent: e.parent = eb[parent]
    return e
bone('hips', (0, 0, 0.55), (0, 0, 0.7)); bone('spine', (0, 0, 0.7), (0, 0, 0.95), 'hips'); bone('head', (0, 0, 0.95), (0, 0, 1.1), 'spine')
for s, n in ((1, 'L'), (-1, 'R')):
    bone(f'arm_{n}', (0.12 * s, 0, 0.92), (0.3 * s, 0, 0.7), 'spine'); bone(f'leg_{n}', (0.07 * s, 0, 0.55), (0.07 * s, 0, 0.05), 'hips')
bpy.ops.object.mode_set(mode='OBJECT')

objs = [part('body', 'cyl', (0, 0, 0.78), (0.14, 0.1, 0.23)), part('head', 'sphere', (0, 0, 1.02), (0.12, 0.11, 0.12)),
        part('armL', 'cyl', (0.2, 0, 0.8), (0.04, 0.04, 0.14)), part('armR', 'cyl', (-0.2, 0, 0.8), (0.04, 0.04, 0.14)),
        part('legL', 'cyl', (0.07, 0, 0.3), (0.055, 0.055, 0.26)), part('legR', 'cyl', (-0.07, 0, 0.3), (0.055, 0.055, 0.26))]
for o in objs: o.select_set(True)
arm.select_set(True); bpy.context.view_layer.objects.active = arm
bpy.ops.object.parent_set(type='ARMATURE_AUTO')

# clips: keyframes on pose-bone euler rotations, each stored as its own NLA strip so the glTF exporter writes one animation per clip
bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='POSE')
pb = arm.pose.bones
for p in pb: p.rotation_mode = 'XYZ'
ad = arm.animation_data_create()
def clip(name, frames, pose_fn, loop=True):
    for p in pb: p.rotation_euler = (0, 0, 0); p.location = (0, 0, 0)
    act = bpy.data.actions.new(name); ad.action = act
    n = frames
    for f in range(0, n + 1, max(1, n // 8)):
        t = f / n * math.tau
        for p in pb: p.rotation_euler = (0, 0, 0); p.location = (0, 0, 0)
        pose_fn(t, f / n)
        for p in pb:
            p.keyframe_insert('rotation_euler', frame=f + 1); p.keyframe_insert('location', frame=f + 1)
    tr = ad.nla_tracks.new(); tr.name = name; st = tr.strips.new(name, 1, act); st.name = name
    ad.action = None
def R(n, x=0, y=0, z=0): pb[n].rotation_euler = (x, y, z)
S = math.sin
clip('Idle', 48, lambda t, u: (R('spine', S(t) * 0.02), R('head', S(t + 1) * 0.03)))
clip('Walk', 24, lambda t, u: (R('leg_L', S(t) * 0.6), R('leg_R', -S(t) * 0.6), R('arm_L', -S(t) * 0.5), R('arm_R', S(t) * 0.5)))
clip('Run', 16, lambda t, u: (R('leg_L', S(t) * 1.0), R('leg_R', -S(t) * 1.0), R('arm_L', -S(t) * 0.9), R('arm_R', S(t) * 0.9), R('spine', 0.2)))
clip('Jump', 24, lambda t, u: (R('leg_L', -0.5 * S(u * math.pi)), R('leg_R', -0.5 * S(u * math.pi)), R('arm_L', 0, 0, -1.3 * S(u * math.pi)), R('arm_R', 0, 0, 1.3 * S(u * math.pi))))
clip('Sit', 24, lambda t, u: (R('leg_L', -1.4), R('leg_R', -1.4), R('spine', -0.05)))
clip('Sleep', 48, lambda t, u: (R('spine', 0.5 + S(t) * 0.02), R('head', 0.5), R('leg_L', -1.2), R('leg_R', -1.2)))
clip('Wave', 32, lambda t, u: (R('arm_R', 0, 0, 2.4 + S(t * 3) * 0.3)))
clip('Cheer', 32, lambda t, u: (R('arm_L', 0, 0, -2.6 + S(t * 2) * 0.2), R('arm_R', 0, 0, 2.6 - S(t * 2) * 0.2), R('spine', S(t * 2) * 0.05)))
clip('emote_happy', 32, lambda t, u: (R('head', S(t * 3) * 0.12), R('arm_L', 0, 0, -1.0), R('arm_R', 0, 0, 1.0)))
bpy.ops.object.mode_set(mode='OBJECT')

dst = f'{ROOT}/public/models/_TECHNICAL_PLACEHOLDER_biped.glb'
bpy.ops.export_scene.gltf(filepath=dst, export_format='GLB', export_animations=True, export_animation_mode='NLA_TRACKS', export_apply=True)
print('placeholder', os.path.getsize(dst), 'bytes')
