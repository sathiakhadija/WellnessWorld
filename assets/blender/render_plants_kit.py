# Blender evidence render of the planting kit + fountain (src/baked/plants.json, cafe.json). Run: python3 assets/blender/render_plants_kit.py
import bpy, json, math, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
LIB = json.load(open(f'{ROOT}/src/baked/cafe.json')); LIB.update(json.load(open(f'{ROOT}/src/baked/plants.json')))
COL = {'leaf': (0.10, 0.20, 0.06), 'stem': (0.18, 0.25, 0.1), 'bloom': (0.85, 0.83, 0.75), 'bloom2': (0.42, 0.33, 0.52), 'wood': (0.30, 0.17, 0.10), 'seat': (0.72, 0.55, 0.38), 'metal': (0.06, 0.06, 0.07), 'brass': (0.70, 0.52, 0.27), 'marble': (0.88, 0.86, 0.82), 'fabric': (0.54, 0.35, 0.55), 'leather': (0.35, 0.07, 0.10), 'glow': (1.0, 0.85, 0.6)}
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
def mat(name, c, rough, metal=0, emit=0):
    m = bpy.data.materials.new(name); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = (*c, 1); b.inputs['Roughness'].default_value = rough; b.inputs['Metallic'].default_value = metal
    if emit: b.inputs['Emission Color'].default_value = (*c, 1); b.inputs['Emission Strength'].default_value = emit
    return m
ROUGH = {'brass': (0.3, 1), 'metal': (0.4, 0.6), 'marble': (0.15, 0), 'glow': (0.5, 0)}
def add(name, x, y, rot=0):
    for bucket, d in LIB[name].items():
        p = d['p']; verts = []; faces = []
        for i in range(0, len(p), 3):
            vx, vy, vz = p[i], p[i + 1], p[i + 2]; verts.append((vx, -vz, vy))   # three (x,y-up,z-front) -> blender (x,-z,y)... front +z maps to -y
        for i in range(0, len(verts), 3): faces.append((i, i + 1, i + 2))
        me = bpy.data.meshes.new(name + bucket); me.from_pydata(verts, [], faces); me.update()
        ob = bpy.data.objects.new(name + bucket, me); sc.collection.objects.link(ob); ob.location = (x, y, 0); ob.rotation_euler = (0, 0, rot)
        r, m_ = ROUGH.get(bucket, (0.8, 0)); ob.data.materials.append(mat(bucket, COL.get(bucket, (0.5, 0.5, 0.5)), r, m_, 6 if bucket == 'glow' else 0))
        for pl in ob.data.polygons: pl.use_smooth = True
items = ['hydrangea0', 'hydrangea1', 'hydrangea_lilac', 'lavender0', 'lavender1', 'shrub0', 'shrub1']
for i, n in enumerate(items): add(n, (i - 3) * 0.95, 0, i * 0.7)
# floor + backdrop
bpy.ops.mesh.primitive_plane_add(size=20, location=(0, 0, 0)); bpy.context.object.data.materials.append(mat('floor', (0.55, 0.52, 0.46), 0.6))
bpy.ops.object.light_add(type='AREA', location=(0, -3, 4)); L = bpy.context.object; L.data.energy = 600; L.data.size = 5
bpy.ops.object.light_add(type='AREA', location=(-4, 1, 2.5)); L2 = bpy.context.object; L2.data.energy = 200; L2.data.size = 3
sc.world = bpy.data.worlds.new('w'); sc.world.use_nodes = True; sc.world.node_tree.nodes['Background'].inputs[0].default_value = (0.9, 0.82, 0.74, 1); sc.world.node_tree.nodes['Background'].inputs[1].default_value = 0.6
bpy.ops.object.camera_add(location=(0, -4.2, 1.0), rotation=(math.radians(84), 0, 0)); sc.camera = bpy.context.object; sc.camera.data.lens = 40
sc.render.engine = 'CYCLES'; sc.cycles.samples = 24; sc.cycles.device = 'CPU'; sc.render.resolution_x = 1280; sc.render.resolution_y = 540
sc.view_settings.view_transform = 'AgX'
out = f'{ROOT}/docs/bible/evidence/blender_planting_kit.png'; sc.render.filepath = out; bpy.ops.render.render(write_still=True); print('wrote', out)
