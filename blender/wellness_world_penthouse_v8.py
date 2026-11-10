"""
Wellness World - Penthouse V8
Luxury London penthouse environment for Blender 5.x (Cycles). One self-contained script, no external files.

RUN:  Blender -> Scripting workspace -> New -> paste -> Run Script (play button). Then press F12 (CAM1_ReferenceMatch).

WHAT THIS SCRIPT REPLACES
  With CLEAR_SCENE = True it deletes every OBJECT in the current scene (and unused mesh/material/light/camera data) so
  earlier attempts (V1-V7) do not clash. It never touches Blender Text blocks, so your scripts are safe.

TWO OUTPUTS FROM ONE ARCHITECTURE
  WW_Export        game collection: simplified geometry + game materials + collision proxies + spawn markers
  WW_Presentation  Cycles-only content: procedural skyline, river, lights, cameras
  Each material has a presentation (procedural) version and a *_GAME (glTF-safe Principled) version. export_game_glb()
  swaps to the game versions, exports WW_Export to a GLB and swaps back. See the CONFIG flags below.

COORDINATES (metres, Z up)
  +Y runs along the room toward the panoramic windows, +X is to the right of that direction.
  Left wall  : x = ROOM_X0  (three doorways, panelling, brass sconces)
  Far wall   : y = ROOM_Y1  (floor-to-ceiling glass) -> balcony beyond
  Right wall : x = ROOM_X1  (glass wrapping the corner) -> balcony beyond
  Camera 1 stands near the right wall and looks diagonally toward the far-left corner (as the reference does).
"""
import bpy, bmesh, math, random, os, json, time
from mathutils import Vector, Matrix

# =====================================================================================================
# CONFIG
# =====================================================================================================
CLEAR_SCENE      = True
SEED             = 11
ADD_SIGNAGE      = True          # "citi" / "HSBC" / "BARCLAYS" lettering on the towers (set False to remove)
RENDER_W, RENDER_H = 1920, 1080
RENDER_SAMPLES   = 192
USE_GPU_IF_FOUND = True          # Metal on Apple Silicon

# ---- game pipeline (Blender -> GLB -> React Three Fiber) ----
BAKE_GAME_TEXTURES = True        # bake the procedural parquet into albedo/roughness/normal images for the game floor
GAME_FLOOR_TEX     = 2048        # size (px) of the baked floor textures
EXPORT_GLB         = False       # True: also write WW_Export to a .glb (see export_game_glb below)
EXPORT_DIR         = ""          # folder for the GLB / textures; "" = next to the saved .blend, else your home folder
RENDER_SKYLINE_DOME = False      # True: render a 360-degree skyline panorama PNG for the game backdrop (takes minutes)
DOME_W             = 4096        # skyline dome width (px); height is derived from the latitude range

H                = 3.8           # ceiling height (m)
DOOR_H           = 3.3           # doorway height (m)
SOFFIT_DROP      = 0.22
SOFFIT_W         = 1.1
WALL_T           = 0.40
ROOM_X0          = -4.45         # inner face of the left wall
ROOM_Y0          = 0.0           # inner face of the front wall (behind camera 1)

# Reference-match camera. Everything about the room's plan is solved from where features sit in the reference image
# (see "REFERENCE ANCHORS" below), so camera 1 reproduces the approved composition by construction.
CAM1 = dict(pos=(0.0, 0.4, 1.7), yaw_deg=15.4, lens=22.5, shift_y=-0.0395)
EYE_ABOVE_WATER = 88.0           # camera 1 height above the Thames (m): a high-floor penthouse

# ---------------- REFERENCE ANCHORS ----------------
# Pixel coordinates are in the reference image's 2000 px-wide frame (UI overlays removed). The script casts a ray from
# camera 1 through each pixel onto the wall plane it belongs to; that fixes door positions, room length, glazing
# bays and the sconces in metres.
_cam_pos = Vector(CAM1["pos"])
_yaw = math.radians(CAM1["yaw_deg"])
FWD = Vector((-math.sin(_yaw), math.cos(_yaw), 0.0))
RGT = Vector((math.cos(_yaw), math.sin(_yaw), 0.0))
f_px = 1000.0 / (18.0 / CAM1["lens"])                    # focal length in pixels (36 mm sensor, 2000 px wide)
horizon_px = 563.5 + CAM1["shift_y"] * 2000.0            # image row of the horizon

def ref_hit(px, py, axis, value):
    """Point where the camera ray through reference pixel (px, py) meets the plane  coordinate[axis] == value."""
    d = FWD + RGT * ((px - 1000.0) / f_px) + Vector((0.0, 0.0, (horizon_px - py) / f_px))
    return _cam_pos + d * ((value - _cam_pos[axis]) / d[axis])

DOORS = [(round(ref_hit(a, 500, 0, ROOM_X0).y, 2), round(ref_hit(b, 500, 0, ROOM_X0).y, 2))
         for a, b in ((367, 512), (615, 688), (757, 800))]       # opening edges of the 3 doorways (left wall)
ROOM_Y1 = round(ref_hit(870, 500, 0, ROOM_X0).y, 2)                # far-left corner  -> room length
FAR_MULLION_X = [round(ref_hit(px, 500, 1, ROOM_Y1).x, 2) for px in (1130, 1490)]
ROOM_X1 = round(ref_hit(1812, 500, 1, ROOM_Y1).x, 2)               # far-right corner -> room width
SCONCES = [(round(ref_hit(205, 358, 0, ROOM_X0).y, 2), round(ref_hit(205, 358, 0, ROOM_X0).z, 2)),
           (round(ref_hit(845, 452, 0, ROOM_X0).y, 2), round(ref_hit(845, 452, 0, ROOM_X0).z, 2))]
PLANT_XY = ref_hit(1760, 705, 2, -0.35)                            # planter base on the terrace
AVATAR_XY = ref_hit(955, 990, 2, 0.0)                              # where the avatar's feet are in the reference
CAT_XY = ref_hit(1125, 1000, 2, 0.0)

random.seed(SEED)

# =====================================================================================================
# SCENE CLEAN-UP + COLLECTIONS
# =====================================================================================================
scene = bpy.context.scene
if CLEAR_SCENE:
    for o in list(scene.objects):
        bpy.data.objects.remove(o, do_unlink=True)
    for coll_ in list(bpy.data.collections):
        if coll_.users == 0 or coll_.name.startswith("WW_"):
            bpy.data.collections.remove(coll_)
    for blocks in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.cameras,
                   bpy.data.curves, bpy.data.images):
        for b in list(blocks):
            if b.users == 0:
                blocks.remove(b)

ROOT = bpy.data.collections.new("WW_Penthouse_V8")
scene.collection.children.link(ROOT)
COL_EXPORT = bpy.data.collections.new("WW_Export")            # everything the game needs (geometry, colliders, spawn points)
COL_PRES   = bpy.data.collections.new("WW_Presentation")      # Cycles-only: skyline, river, lights, cameras
ROOT.children.link(COL_EXPORT)
ROOT.children.link(COL_PRES)
COL = {}
for nm, parent in [("Architecture", COL_EXPORT), ("Floor", COL_EXPORT), ("Ceiling", COL_EXPORT), ("Glazing", COL_EXPORT),
                   ("Balcony", COL_EXPORT), ("Decor", COL_EXPORT), ("Collision", COL_EXPORT), ("Markers", COL_EXPORT),
                   ("Floor_Pres", COL_PRES), ("Exterior_Skyline", COL_PRES), ("River", COL_PRES), ("Lighting", COL_PRES), ("Cameras", COL_PRES)]:
    c = bpy.data.collections.new("WW_" + nm)
    parent.children.link(c)
    COL[nm] = c

# =====================================================================================================
# NODE / MATERIAL HELPERS
# =====================================================================================================
def new_mat(name):
    m = bpy.data.materials.new(name)
    if m.node_tree is None:
        m.use_nodes = True
    return m

def kelvin_rgb(K):
    """Blackbody colour temperature -> linear RGB (Tanner Helland approximation, then sRGB -> linear).
    Used for every light so the whole lighting system shares one consistent colour-temperature scale."""
    t = K / 100.0
    r = 255.0 if t <= 66 else 329.698727446 * ((t - 60) ** -0.1332047592)
    g = 99.4708025861 * math.log(t) - 161.1195681661 if t <= 66 else 288.1221695283 * ((t - 60) ** -0.0755148492)
    b = 255.0 if t >= 66 else (0.0 if t <= 19 else 138.5177312231 * math.log(t - 10) - 305.0447927307)
    def lin(c):
        c = max(0.0, min(255.0, c)) / 255.0
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (lin(r), lin(g), lin(b))

GAME_MATS = {}
def game_variant(m, color, rough=0.6, metal=0.0, emit=None, emit_strength=0.0, alpha=1.0, double_sided=False):
    """glTF-safe twin of a (possibly procedural) material: a plain Principled BSDF with constant values only.
    Stored on the presentation material as m['ww_game'] and swapped in by export_game_glb()."""
    g = bpy.data.materials.new(m.name + "_GAME")
    if g.node_tree is None:
        g.use_nodes = True
    b = g.node_tree.nodes["Principled BSDF"]
    setp(b, color=tuple(color[:3]), rough=rough, metal=metal)
    if emit:
        setp(b, emit_color=tuple(emit[:3]), emit=emit_strength)
    if alpha < 1.0:
        setp(b, alpha=alpha)
        try:
            g.surface_render_method = 'BLENDED'
        except Exception:
            pass
    g.use_backface_culling = not double_sided
    m["ww_game"] = g.name
    GAME_MATS[m.name] = g
    return g

def sock(node, names, out=False):
    s = node.outputs if out else node.inputs
    for n in ([names] if isinstance(names, str) else names):
        if n in s:
            return s[n]
    return None

def setp(bsdf, **kw):
    alias = {"color": ["Base Color"], "rough": ["Roughness"], "metal": ["Metallic"],
             "emit_color": ["Emission Color", "Emission"], "emit": ["Emission Strength"],
             "coat": ["Coat Weight", "Clearcoat"], "coat_rough": ["Coat Roughness", "Clearcoat Roughness"],
             "spec": ["Specular IOR Level", "Specular"], "ior": ["IOR"], "alpha": ["Alpha"]}
    for k, v in kw.items():
        s = sock(bsdf, alias[k])
        if s is not None:
            s.default_value = (*v, 1.0) if isinstance(v, tuple) else v

def solid(name, color, rough=0.6, metal=0.0, emit=None, emit_strength=0.0, coat=0.0):
    m = new_mat(name)
    b = m.node_tree.nodes["Principled BSDF"]
    setp(b, color=color, rough=rough, metal=metal)
    if coat:
        setp(b, coat=coat, coat_rough=0.2)
    if emit:
        setp(b, emit_color=emit, emit=emit_strength)
    game_variant(m, color, rough, metal, emit, emit_strength)
    return m

def N(nt, kind, loc=(0, 0), **props):
    n = nt.nodes.new(kind)
    n.location = loc
    for k, v in props.items():
        setattr(n, k, v)
    return n

def link(nt, a, b):
    nt.links.new(a, b)

def math_node(nt, op, a=None, b=None, clamp=False):
    n = N(nt, "ShaderNodeMath", operation=op, use_clamp=clamp)
    for i, v in enumerate((a, b)):
        if v is None:
            continue
        if isinstance(v, (int, float)):
            n.inputs[i].default_value = v
        else:
            link(nt, v, n.inputs[i])
    return n.outputs[0]

def mix_color(nt, fac, a, b):
    n = N(nt, "ShaderNodeMix", data_type='RGBA', blend_type='MIX')
    link_or_set = lambda s, v: (link(nt, v, s) if hasattr(v, "node") else setattr(s, "default_value", v if len(v) == 4 else (*v, 1)))
    f = [s for s in n.inputs if s.name == "Factor" and s.enabled][0]
    A = [s for s in n.inputs if s.name == "A" and s.enabled][0]
    B = [s for s in n.inputs if s.name == "B" and s.enabled][0]
    if hasattr(fac, "node"):
        link(nt, fac, f)
    else:
        f.default_value = fac
    link_or_set(A, a)
    link_or_set(B, b)
    return [s for s in n.outputs if s.name == "Result" and s.enabled][0]

def ramp(nt, fac, stops):
    n = N(nt, "ShaderNodeValToRGB")
    cr = n.color_ramp
    while len(cr.elements) > 1:
        cr.elements.remove(cr.elements[-1])
    cr.elements[0].position = stops[0][0]
    cr.elements[0].color = (*stops[0][1], 1)
    for p, c in stops[1:]:
        e = cr.elements.new(p)
        e.color = (*c, 1)
    link(nt, fac, n.inputs["Fac"])
    return n.outputs["Color"]

def plaster_like(name, color, rough, bump=0.04, scale=60.0):
    m = new_mat(name)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    setp(b, color=color, rough=rough)
    tc = N(nt, "ShaderNodeTexCoord")
    ns = N(nt, "ShaderNodeTexNoise", noise_dimensions='3D')
    ns.inputs["Scale"].default_value = scale
    ns.inputs["Detail"].default_value = 5.0
    link(nt, tc.outputs["Object"], ns.inputs["Vector"])
    bm = N(nt, "ShaderNodeBump")
    bm.inputs["Strength"].default_value = bump
    bm.inputs["Distance"].default_value = 0.004
    link(nt, ns.outputs["Fac"], bm.inputs["Height"])
    link(nt, bm.outputs["Normal"], b.inputs["Normal"])
    game_variant(m, color, rough)
    return m

# ---------------------------------------------------------------- architecture materials
M_PLASTER = plaster_like("WW_Plaster_Ivory", (0.54, 0.48, 0.44), 0.78)
M_TRIM    = solid("WW_Trim_Satin", (0.72, 0.65, 0.58), 0.45)
M_CEIL    = plaster_like("WW_Ceiling_Ivory", (0.58, 0.55, 0.58), 0.85, 0.02, 40.0)
M_SKIRT   = solid("WW_Skirting", (0.76, 0.70, 0.62), 0.4)
M_FRAME   = solid("WW_Frame_Bronze", (0.025, 0.02, 0.016), 0.38, 0.85)
M_BRASS   = solid("WW_Brass", (0.82, 0.55, 0.20), 0.22, 1.0)
M_TUBE    = solid("WW_SconceGlow", (1, 0.85, 0.6), 0.5, 0.0, (1.0, 0.72, 0.38), 28.0)
M_LED     = solid("WW_CoveLED", (1, 0.8, 0.5), 0.5, 0.0, (1.0, 0.72, 0.42), 7.0)
M_DOWN    = solid("WW_DownlightTrim", (1, 0.85, 0.6), 0.5, 0.0, (1.0, 0.75, 0.45), 18.0)
M_WALNUT  = solid("WW_DarkWalnut", (0.075, 0.04, 0.022), 0.35, 0.0, coat=0.2)
M_DKSTONE = solid("WW_DarkStone", (0.05, 0.045, 0.045), 0.3)
M_DKWALL  = plaster_like("WW_DarkWall", (0.16, 0.12, 0.10), 0.7)
M_WINDOW  = solid("WW_ExteriorGlow", (1, 0.7, 0.55), 0.5, 0.0, (1.0, 0.62, 0.45), 4.0)
M_MIRROR  = solid("WW_Mirror", (0.8, 0.75, 0.7), 0.04, 1.0)
M_BASIN   = solid("WW_Porcelain", (0.9, 0.88, 0.84), 0.15)

def marble_mat(name, base, vein, vein_amt=0.5):
    m = new_mat(name)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    setp(b, rough=0.18, coat=0.3)
    tc = N(nt, "ShaderNodeTexCoord")
    wv = N(nt, "ShaderNodeTexWave", wave_type='BANDS', bands_direction='DIAGONAL')
    wv.inputs["Scale"].default_value = 1.6
    wv.inputs["Distortion"].default_value = 9.0
    wv.inputs["Detail"].default_value = 5.0
    wv.inputs["Detail Scale"].default_value = 1.4
    link(nt, tc.outputs["Object"], wv.inputs["Vector"])
    r = ramp(nt, wv.outputs["Fac"], [(0.0, base), (0.55, base), (0.78, vein), (1.0, vein)])
    link(nt, r, b.inputs["Base Color"])
    game_variant(m, tuple(0.8 * a_ + 0.2 * v_ for a_, v_ in zip(base, vein)), 0.25)
    return m
M_MARBLE  = marble_mat("WW_Marble_Warm", (0.66, 0.56, 0.46), (0.32, 0.26, 0.20))
M_MARBLE2 = marble_mat("WW_Marble_Cream", (0.78, 0.70, 0.60), (0.45, 0.38, 0.30))

def balcony_stone():
    m = new_mat("WW_Balcony_Porcelain")
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    setp(b, rough=0.35)
    tc = N(nt, "ShaderNodeTexCoord")
    br = N(nt, "ShaderNodeTexBrick", offset=0.0, squash=1.0)
    br.inputs["Color1"].default_value = (0.36, 0.33, 0.31, 1)
    br.inputs["Color2"].default_value = (0.31, 0.29, 0.28, 1)
    br.inputs["Mortar"].default_value = (0.05, 0.05, 0.05, 1)
    br.inputs["Scale"].default_value = 1.0
    br.inputs["Mortar Size"].default_value = 0.004
    br.inputs["Brick Width"].default_value = 1.2
    br.inputs["Row Height"].default_value = 0.6
    link(nt, tc.outputs["Object"], br.inputs["Vector"])
    link(nt, br.outputs["Color"], b.inputs["Base Color"])
    game_variant(m, (0.34, 0.31, 0.29), 0.45)
    return m
M_STONE = balcony_stone()
M_STEEL = solid("WW_Handrail", (0.03, 0.025, 0.02), 0.25, 1.0)
M_POT   = solid("WW_Planter", (0.36, 0.34, 0.32), 0.45)
M_BARK  = solid("WW_Bark", (0.10, 0.06, 0.04), 0.8)
M_LEAF  = solid("WW_Leaf", (0.12, 0.25, 0.08), 0.6)

def blossom_mat():
    m = new_mat("WW_Blossom")
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    setp(b, rough=0.55)
    at = N(nt, "ShaderNodeAttribute", attribute_type='GEOMETRY', attribute_name="rnd")
    r = ramp(nt, at.outputs["Fac"] if at.outputs.get("Fac") else at.outputs[2],
             [(0.0, (0.95, 0.62, 0.72)), (1.0, (0.78, 0.30, 0.46))])
    link(nt, r, b.inputs["Base Color"])
    ss = sock(b, ["Subsurface Weight", "Subsurface"])
    if ss is not None:
        ss.default_value = 0.2
    g = game_variant(m, (0.90, 0.52, 0.62), 0.6)
    vc = g.node_tree.nodes.new("ShaderNodeVertexColor")      # per-clump colour travels to the game as COLOR_0
    vc.layer_name = "Col"
    g.node_tree.links.new(vc.outputs["Color"], g.node_tree.nodes["Principled BSDF"].inputs["Base Color"])
    return m
M_BLOSSOM = blossom_mat()

# ---------------------------------------------------------------- glass (clear, almost no haze)
def glass_mat(name="WW_Glass"):
    """Cycles: near-transparent pane with a faint fresnel reflection. Sun/sky pass through (transparent shadows).
    Real-time (Three.js) equivalent: MeshPhysicalMaterial transmission 1.0, roughness 0, ior 1.0-1.05, thickness 0."""
    m = new_mat(name)
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = N(nt, "ShaderNodeOutputMaterial")
    tr = N(nt, "ShaderNodeBsdfTransparent")
    gl = N(nt, "ShaderNodeBsdfGlossy")
    gl.inputs["Roughness"].default_value = 0.0
    gl.inputs["Color"].default_value = (0.95, 0.97, 1.0, 1)
    fr = N(nt, "ShaderNodeFresnel")
    fr.inputs["IOR"].default_value = 1.5
    scale = math_node(nt, 'MULTIPLY', fr.outputs["Fac"], 0.55)
    mx = N(nt, "ShaderNodeMixShader")
    link(nt, scale, mx.inputs[0])
    link(nt, tr.outputs[0], mx.inputs[1])
    link(nt, gl.outputs[0], mx.inputs[2])
    link(nt, mx.outputs[0], out.inputs["Surface"])
    # game twin: alpha-blended, almost clear. In three.js swap for MeshPhysicalMaterial (transmission) only if the GPU budget allows
    game_variant(m, (0.86, 0.92, 1.0), 0.02, 0.0, alpha=0.10, double_sided=True)
    return m
M_GLASS = glass_mat()

# =====================================================================================================
# MESH BUILDER (merges many primitives into one object per group = few objects, fast viewport)
# =====================================================================================================
class Builder:
    def __init__(self, name, col):
        self.name, self.col = name, col
        self.bm = bmesh.new()
        self.mats = []
        self.uv = None
        self.rnd = None

    def mi(self, m):
        if m is None:
            return 0
        if m not in self.mats:
            self.mats.append(m)
        return self.mats.index(m)

    def box(self, c, s, m, rz=0.0):
        hx, hy, hz = s[0] / 2, s[1] / 2, s[2] / 2
        cs, sn = math.cos(rz), math.sin(rz)
        def P(x, y, z):
            return self.bm.verts.new((c[0] + x * cs - y * sn, c[1] + x * sn + y * cs, c[2] + z))
        v = [P(-hx, -hy, -hz), P(hx, -hy, -hz), P(hx, hy, -hz), P(-hx, hy, -hz),
             P(-hx, -hy, hz), P(hx, -hy, hz), P(hx, hy, hz), P(-hx, hy, hz)]
        mi = self.mi(m)
        for f in [(0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)]:
            self.bm.faces.new([v[i] for i in f]).material_index = mi

    def box_min(self, mn, mx, m):
        self.box(((mn[0] + mx[0]) / 2, (mn[1] + mx[1]) / 2, (mn[2] + mx[2]) / 2),
                 (mx[0] - mn[0], mx[1] - mn[1], mx[2] - mn[2]), m)

    def quad(self, p0, p1, p2, p3, m):
        vs = [self.bm.verts.new(p) for p in (p0, p1, p2, p3)]
        self.bm.faces.new(vs).material_index = self.mi(m)

    def tube(self, pts, radii, m, sides=8, cap=True):
        pts = [Vector(p) for p in pts]
        n = len(pts)
        mi = self.mi(m)
        rings, u = [], None
        for i, p in enumerate(pts):
            if i == 0:
                t = (pts[1] - pts[0]).normalized()
            elif i == n - 1:
                t = (pts[-1] - pts[-2]).normalized()
            else:
                t = ((pts[i + 1] - pts[i]).normalized() + (pts[i] - pts[i - 1]).normalized()).normalized()
            if u is None:
                ref = Vector((0, 0, 1)) if abs(t.z) < 0.9 else Vector((1, 0, 0))
                u = t.cross(ref).normalized()
            else:
                u = u - t * u.dot(t)
                if u.length < 1e-6:
                    u = t.cross(Vector((0, 0, 1)))
                u.normalize()
            v = t.cross(u)
            rings.append([self.bm.verts.new(p + (u * math.cos(2 * math.pi * k / sides) + v * math.sin(2 * math.pi * k / sides)) * radii[i])
                          for k in range(sides)])
        for i in range(n - 1):
            for k in range(sides):
                f = self.bm.faces.new([rings[i][k], rings[i][(k + 1) % sides], rings[i + 1][(k + 1) % sides], rings[i + 1][k]])
                f.material_index = mi
        if cap:
            self.bm.faces.new(rings[0][::-1]).material_index = mi
            self.bm.faces.new(rings[-1]).material_index = mi

    def pyramid(self, c, w, d, h, m):
        mi = self.mi(m)
        b = [self.bm.verts.new((c[0] + sx * w / 2, c[1] + sy * d / 2, c[2])) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        a = self.bm.verts.new((c[0], c[1], c[2] + h))
        for i in range(4):
            self.bm.faces.new([b[i], b[(i + 1) % 4], a]).material_index = mi

    def finish(self, origin=(0, 0, 0), bevel=0.0):
        if bevel > 0:      # tiny chamfer on every hard edge: catches light like real mouldings, kills the "paper strip" look
            edges = [e for e in self.bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0.0) > 0.7]
            try:
                bmesh.ops.bevel(self.bm, geom=edges, offset=bevel, offset_type='OFFSET', segments=1, profile=0.5, affect='EDGES')
            except Exception as ex:
                print("bevel skipped:", ex)
        me = bpy.data.meshes.new(self.name)
        self.bm.to_mesh(me)
        self.bm.free()
        for m in self.mats:
            me.materials.append(m)
        o = bpy.data.objects.new(self.name, me)
        o.location = origin
        self.col.objects.link(o)
        return o

def aim(obj, target, up='Y'):
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat('-Z', up).to_euler()

# =====================================================================================================
# 1. FLOOR - true 90-degree herringbone parquet (boards 600 x 100 mm, 2 mm joints), clipped exactly to the room
# =====================================================================================================
def clip_poly(poly, x0, x1, y0, y1):
    def clip(pts, inside, inter):
        out = []
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            ia, ib = inside(a), inside(b)
            if ia and ib:
                out.append(b)
            elif ia and not ib:
                out.append(inter(a, b))
            elif not ia and ib:
                out.append(inter(a, b)); out.append(b)
        return out
    def ix(xv):
        return lambda a, b: (xv, a[1] + (b[1] - a[1]) * (xv - a[0]) / (b[0] - a[0]))
    def iy(yv):
        return lambda a, b: (a[0] + (b[0] - a[0]) * (yv - a[1]) / (b[1] - a[1]), yv)
    for ins, inter in ((lambda p: p[0] >= x0, ix(x0)), (lambda p: p[0] <= x1, ix(x1)),
                       (lambda p: p[1] >= y0, iy(y0)), (lambda p: p[1] <= y1, iy(y1))):
        if not poly:
            return []
        poly = clip(poly, ins, inter)
    return poly

def poly_area(p):
    return abs(sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p)))) / 2

def build_parquet():
    L, W, gap = 0.60, 0.10, 0.002
    ang = math.radians(45.0)
    ca, sa = math.cos(ang), math.sin(ang)
    x0, x1, y0, y1 = ROOM_X0 - 0.05, ROOM_X1 + 0.05, ROOM_Y0 - 0.05, ROOM_Y1 + 0.05
    cx, cy = 0.0, (y0 + y1) / 2
    v1, v2 = (W, W), (-L, L)               # lattice vectors (verified numerically: exact tiling, no overlap)
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    rl = bm.loops.layers.float_color.new("rnd")
    mi_wood = 0
    R = math.hypot(x1 - x0, y1 - y0) / 2 + 2 * L
    N1 = int(R / (W * 1.0)) + 4
    N2 = int(R / (L * 1.0)) + 4
    count = 0
    for i in range(-N1 * 2, N1 * 2 + 1):
        for j in range(-N2 * 2, N2 * 2 + 1):
            ox, oy = i * v1[0] + j * v2[0], i * v1[1] + j * v2[1]
            for kind in (0, 1):
                if kind == 0:   # horizontal board  [ox, ox+L] x [oy, oy+W]
                    bx0, by0, bx1, by1 = ox, oy, ox + L, oy + W
                else:           # vertical board    [ox+L, ox+L+W] x [oy+W-L, oy+W]
                    bx0, by0, bx1, by1 = ox + L, oy + W - L, ox + L + W, oy + W
                bx0 += gap / 2; by0 += gap / 2; bx1 -= gap / 2; by1 -= gap / 2
                if (bx0 + bx1) ** 2 / 4 + (by0 + by1) ** 2 / 4 > (R + 0.5) ** 2:
                    continue
                corners = [(bx0, by0), (bx1, by0), (bx1, by1), (bx0, by1)]
                rc = [(cx + p * ca - q * sa, cy + p * sa + q * ca) for p, q in corners]
                poly = clip_poly(rc, x0, x1, y0, y1)
                if len(poly) < 3 or poly_area(poly) < 0.0006:
                    continue
                # board-local axes in room space
                ex = (ca, sa); ey = (-sa, ca)
                if kind == 0:
                    along, across, Lb, Wb = ex, ey, bx1 - bx0, by1 - by0
                    org = rc[0]
                else:
                    along, across, Lb, Wb = ey, ex, by1 - by0, bx1 - bx0
                    org = rc[0]
                r = (random.random(), random.random(), random.random())
                vs = [bm.verts.new((p[0], p[1], 0.0)) for p in poly]
                try:
                    f = bm.faces.new(vs)
                except ValueError:
                    continue
                f.material_index = mi_wood
                for loop in f.loops:
                    px, py = loop.vert.co.x - org[0], loop.vert.co.y - org[1]
                    loop[uvl].uv = (px * along[0] + py * along[1], px * across[0] + py * across[1])     # METRES along / across the plank
                    loop[rl] = (*r, 1.0)
                count += 1
    me = bpy.data.meshes.new("WW_Parquet_Herringbone")
    bm.to_mesh(me); bm.free()

    # ---- wood material. UVs are in METRES per plank (u along the grain, v across), so grain follows every individual plank
    #      and texture scale is identical on every board. Per-board random values (attribute "rnd") drive colour, grain
    #      offset, roughness and a tiny tilt that makes neighbouring boards catch the light differently.
    LB, WB = 0.60 - gap, 0.10 - gap
    m = new_mat("WW_Parquet_Oak")
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    uvn = N(nt, "ShaderNodeUVMap", uv_map="UVMap")
    sep = N(nt, "ShaderNodeSeparateXYZ")
    link(nt, uvn.outputs["UV"], sep.inputs["Vector"])
    U, V = sep.outputs["X"], sep.outputs["Y"]
    at = N(nt, "ShaderNodeAttribute", attribute_type='GEOMETRY', attribute_name="rnd")
    sp = N(nt, "ShaderNodeSeparateColor")
    link(nt, at.outputs["Color"], sp.inputs["Color"])
    r1, r2, r3 = sp.outputs[0], sp.outputs[1], sp.outputs[2]
    base = ramp(nt, r1, [(0.0, (0.105, 0.048, 0.026)), (0.5, (0.165, 0.080, 0.045)), (1.0, (0.230, 0.122, 0.070))])
    # (a) growth-ring streaks parallel to the plank: wave bands across the plank, squashed along it
    v_ring = N(nt, "ShaderNodeCombineXYZ")
    link(nt, math_node(nt, 'MULTIPLY', U, 0.10), v_ring.inputs["X"])
    link(nt, V, v_ring.inputs["Y"])
    link(nt, math_node(nt, 'MULTIPLY', r2, 31.0), v_ring.inputs["Z"])
    wv = N(nt, "ShaderNodeTexWave", wave_type='BANDS', bands_direction='Y')
    wv.inputs["Scale"].default_value = 15.0
    wv.inputs["Distortion"].default_value = 2.2
    wv.inputs["Detail"].default_value = 3.0
    wv.inputs["Detail Scale"].default_value = 1.3
    link(nt, v_ring.outputs["Vector"], wv.inputs["Vector"])
    # (b) fine fibres, stretched about 20:1 along the plank
    v_fib = N(nt, "ShaderNodeCombineXYZ")
    link(nt, math_node(nt, 'MULTIPLY', U, 3.0), v_fib.inputs["X"])
    link(nt, math_node(nt, 'MULTIPLY', V, 60.0), v_fib.inputs["Y"])
    link(nt, math_node(nt, 'MULTIPLY', r2, 50.0), v_fib.inputs["Z"])
    ns = N(nt, "ShaderNodeTexNoise", noise_dimensions='3D')
    ns.inputs["Scale"].default_value = 1.0
    ns.inputs["Detail"].default_value = 5.0
    ns.inputs["Roughness"].default_value = 0.6
    link(nt, v_fib.outputs["Vector"], ns.inputs["Vector"])
    gmix = math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', wv.outputs["Fac"], 0.5), math_node(nt, 'MULTIPLY', ns.outputs["Fac"], 0.5))
    grain = ramp(nt, gmix, [(0.25, (0.80, 0.80, 0.80)), (0.75, (1.15, 1.15, 1.15))])
    # (c) distance (m) from the plank edge -> dark seam + soft bevel highlight
    d_u = math_node(nt, 'MINIMUM', U, math_node(nt, 'SUBTRACT', LB, U))
    d_v = math_node(nt, 'MINIMUM', V, math_node(nt, 'SUBTRACT', WB, V))
    edge = math_node(nt, 'DIVIDE', math_node(nt, 'MINIMUM', d_u, d_v), 0.0035, clamp=True)    # 0 at the seam -> 1 inside the plank
    shade = math_node(nt, 'ADD', 0.30, math_node(nt, 'MULTIPLY', edge, 0.70))
    mul1 = N(nt, "ShaderNodeMix", data_type='RGBA', blend_type='MULTIPLY')
    [s_ for s_ in mul1.inputs if s_.name == "Factor"][0].default_value = 1.0
    link(nt, base, [s_ for s_ in mul1.inputs if s_.name == "A" and s_.enabled][0])
    link(nt, grain, [s_ for s_ in mul1.inputs if s_.name == "B" and s_.enabled][0])
    mul2 = N(nt, "ShaderNodeMix", data_type='RGBA', blend_type='MULTIPLY')
    [s_ for s_ in mul2.inputs if s_.name == "Factor"][0].default_value = 1.0
    link(nt, [s_ for s_ in mul1.outputs if s_.name == "Result" and s_.enabled][0], [s_ for s_ in mul2.inputs if s_.name == "A" and s_.enabled][0])
    link(nt, shade, [s_ for s_ in mul2.inputs if s_.name == "B" and s_.enabled][0])
    link(nt, [s_ for s_ in mul2.outputs if s_.name == "Result" and s_.enabled][0], b.inputs["Base Color"])
    link(nt, math_node(nt, 'ADD', 0.20, math_node(nt, 'MULTIPLY', r3, 0.09)), b.inputs["Roughness"])
    setp(b, coat=0.20, coat_rough=0.08, spec=0.5)
    # normal: per-board micro-tilt (chained) + edge bevel
    tilt = N(nt, "ShaderNodeBump")
    tilt.inputs["Strength"].default_value = 1.0
    tilt.inputs["Distance"].default_value = 1.0
    link(nt, math_node(nt, 'MULTIPLY', U, math_node(nt, 'MULTIPLY', math_node(nt, 'SUBTRACT', r3, 0.5), 0.05)), tilt.inputs["Height"])
    bump = N(nt, "ShaderNodeBump")
    bump.inputs["Strength"].default_value = 0.30
    bump.inputs["Distance"].default_value = 0.002
    link(nt, edge, bump.inputs["Height"])
    link(nt, tilt.outputs["Normal"], bump.inputs["Normal"])
    link(nt, bump.outputs["Normal"], b.inputs["Normal"])
    game_variant(m, (0.17, 0.075, 0.032), 0.34)
    me.materials.append(m)
    o = bpy.data.objects.new("WW_Parquet_Herringbone", me)
    COL["Floor_Pres"].objects.link(o)          # Cycles-only: the game uses one baked quad instead (section 10)
    # underlay (shows through the 2 mm joints) + structural slab
    bld = Builder("WW_FloorSlab", COL["Floor_Pres"])
    bld.box_min((ROOM_X0 - 0.5, ROOM_Y0 - 0.5, -0.4), (ROOM_X1 + 0.5, ROOM_Y1 + 0.5, -0.003), solid("WW_ParquetUnderlay", (0.02, 0.01, 0.006), 0.8))
    bld.finish()
    return count

n_boards = build_parquet()

# =====================================================================================================
# 2. ARCHITECTURE: left wall with three real doorways, adjoining rooms, casings, panelling, front/right walls
# =====================================================================================================
arch  = Builder("WW_Walls", COL["Architecture"])
trim  = Builder("WW_Trim_Mouldings", COL["Architecture"])
cells = Builder("WW_Adjoining_Rooms", COL["Architecture"])
WX = ROOM_X0
YA, YB = ROOM_Y0 - WALL_T, ROOM_Y1 + 0.35

def left_wall_solid(y0, y1):
    if y1 - y0 > 0.001:
        arch.box_min((WX - WALL_T, y0, -0.3), (WX, y1, H + 0.3), M_PLASTER)

def panel_frame(y0, y1, z0, z1, depth=0.014, w=0.03):
    cyy = (y0 + y1) / 2
    for zz in (z0, z1):
        trim.box((WX + depth / 2, cyy, zz), (depth, y1 - y0, w), M_TRIM)
    for yy in (y0, y1):
        trim.box((WX + depth / 2, yy, (z0 + z1) / 2), (depth, w, z1 - z0), M_TRIM)

def double_panel(y0, y1, z0=0.22, z1=H - 0.28):
    panel_frame(y0, y1, z0, z1)
    panel_frame(y0 + 0.055, y1 - 0.055, z0 + 0.055, z1 - 0.055, depth=0.008, w=0.018)

def panels_between(y0, y1, target=1.55):
    length = y1 - y0
    if length < 0.7:
        return
    n = max(1, round((length - 0.1) / (target + 0.12)))
    gap = 0.12
    w = (length - 0.2 - gap * (n - 1)) / n
    for i in range(n):
        a = y0 + 0.1 + i * (w + gap)
        double_panel(a, a + w)

def fluting(y0, y1, z0=0.2, z1=H - 0.25):
    n = int((y1 - y0) / 0.07)
    for i in range(n):
        yy = y0 + 0.035 + i * 0.07
        trim.box((WX + 0.01, yy, (z0 + z1) / 2), (0.02, 0.036, z1 - z0), M_TRIM)
    trim.box((WX + 0.014, (y0 + y1) / 2, z0), (0.028, y1 - y0, 0.04), M_TRIM)
    trim.box((WX + 0.014, (y0 + y1) / 2, z1), (0.028, y1 - y0, 0.04), M_TRIM)

# ---- segments of wall between the doorways + lintels
prev = YA
cell_bounds = []
for k, (a, b) in enumerate(DOORS):
    left_wall_solid(prev, a)
    arch.box_min((WX - WALL_T, a, DOOR_H), (WX, b, H + 0.3), M_PLASTER)      # lintel
    prev = b
left_wall_solid(prev, YB)

# ---- casings (surrounds)
for k, (a, b) in enumerate(DOORS):
    cw, cd = 0.17, 0.045
    for yy in (a - cw / 2 + 0.0, b + cw / 2 - 0.0):
        trim.box((WX + cd / 2, yy, DOOR_H / 2), (cd, cw, DOOR_H), M_TRIM)
    trim.box((WX + cd / 2, (a + b) / 2, DOOR_H + 0.065), (cd, b - a + 2 * cw, 0.13), M_TRIM)
    trim.box((WX + cd + 0.008, (a + b) / 2, DOOR_H + 0.16), (0.016, b - a + 2 * cw + 0.06, 0.05), M_TRIM)   # cap
    for yy in (a - cw - 0.02, b + cw + 0.02):                                     # thin outer reveal line
        trim.box((WX + 0.008, yy, DOOR_H / 2 + 0.07), (0.016, 0.022, DOOR_H + 0.14), M_TRIM)
    # inner jamb linings: the 40 cm wall thickness is lined in satin trim on both sides and the head (real reveal depth)
    arch.box_min((WX - WALL_T, a, DOOR_H - 0.04), (WX, b, DOOR_H), M_TRIM)
    arch.box_min((WX - WALL_T, a, 0.0), (WX, a + 0.035, DOOR_H), M_TRIM)
    arch.box_min((WX - WALL_T, b - 0.035, 0.0), (WX, b, DOOR_H), M_TRIM)
    # second (inner) architrave step
    for yy in (a - 0.02, b + 0.02):
        trim.box((WX + cd + 0.010, yy, DOOR_H / 2), (0.02, 0.05, DOOR_H - 0.06), M_TRIM)

# ---- panelling
d1, d2, d3 = DOORS
panels_between(YA + 0.35, d1[0] - 0.14 - 0.02, 1.6)
fluting(d1[1] + 0.2, d2[0] - 0.2)
panels_between(d2[1] + 0.2, d3[0] - 0.18, 0.9)
double_panel(d3[1] + 0.2, ROOM_Y1 - 0.12)

# ---- skirting + cornice along the left wall (skirting stops at the openings)
edges = [YA + 0.35] + [v for dd in DOORS for v in (dd[0] - 0.14, dd[1] + 0.14)] + [ROOM_Y1]
for i in range(0, len(edges), 2):
    ya, yb = edges[i], edges[i + 1]
    if yb > ya:
        trim.box((WX + 0.014, (ya + yb) / 2, 0.09), (0.028, yb - ya, 0.18), M_SKIRT)
        trim.box((WX + 0.02, (ya + yb) / 2, 0.19), (0.016, yb - ya, 0.025), M_SKIRT)
trim.box((WX + 0.045, (YA + 0.35 + ROOM_Y1) / 2, H - 0.07), (0.09, ROOM_Y1 - YA - 0.35, 0.14), M_TRIM)
trim.box((WX + 0.025, (YA + 0.35 + ROOM_Y1) / 2, H - 0.17), (0.05, ROOM_Y1 - YA - 0.35, 0.06), M_TRIM)

# ---- front wall (behind camera) + right wall plaster section (y < 3)
arch.box_min((WX - WALL_T, YA, -0.3), (ROOM_X1 + WALL_T, ROOM_Y0, H + 0.3), M_PLASTER)
arch.box_min((ROOM_X1, ROOM_Y0, -0.3), (ROOM_X1 + WALL_T, 3.0, H + 0.3), M_PLASTER)
trim.box((0.0, ROOM_Y0 + 0.045, H - 0.07), (ROOM_X1 - WX, 0.09, 0.14), M_TRIM)
trim.box((ROOM_X1 - 0.045, 1.5, H - 0.07), (0.09, 3.0, 0.14), M_TRIM)
trim.box((ROOM_X1 - 0.014, 1.5, 0.09), (0.028, 3.0, 0.18), M_SKIRT)
trim.box((0.0, ROOM_Y0 + 0.014, 0.09), (ROOM_X1 - WX, 0.028, 0.18), M_SKIRT)

# ---- adjoining rooms behind the doorways (real interior volumes, walkable)
_c = [(a + b) / 2 for a, b in DOORS]
CELL_BOUNDS = [(_c[0] - 1.5, (_c[0] + _c[1]) / 2), ((_c[0] + _c[1]) / 2, (_c[1] + _c[2]) / 2), ((_c[1] + _c[2]) / 2, ROOM_Y1 + 0.35)]
CELL_D = 3.4
cx_in = WX - WALL_T
cx_out = cx_in - CELL_D
CH = DOOR_H + 0.2
for k, ((ya, yb), (da, db)) in enumerate(zip(CELL_BOUNDS, DOORS)):
    wall_m = [M_DKWALL, M_MARBLE, M_PLASTER][k]
    floor_m = [M_DKSTONE, M_MARBLE2, M_MARBLE2][k]
    t = 0.12
    cells.box_min((cx_out, ya, -0.3), (cx_in, yb, -0.003), floor_m)                       # floor
    cells.box_min((cx_out, ya, CH), (cx_in, yb, CH + 0.3), M_CEIL if k else M_DKWALL)    # ceiling
    cells.box_min((cx_out - t, ya, 0), (cx_out, yb, CH), wall_m)                          # back wall
    cells.box_min((cx_in - CELL_D, ya - t, 0), (cx_in, ya, CH), wall_m)                   # side walls
    cells.box_min((cx_in - CELL_D, yb, 0), (cx_in, yb + t, CH), wall_m)
    # fill between the cell volume and the main room's wall (above the door height) so no light leaks
    cyc = (da + db) / 2
    if k == 0:   # dark, luxurious adjoining room: bench + soft lit niche
        cells.box_min((cx_out, cyc - 0.9, 0.0), (cx_out + 0.55, cyc + 0.9, 0.45), M_WALNUT)
        cells.box_min((cx_out + 0.01, ya + 0.1, 0.9), (cx_out + 0.06, yb - 0.1, 2.3), M_WINDOW)
    if k == 1:   # warm marble bathroom: vanity, basin, mirror
        cells.box_min((cx_out, yb - 0.75, 0.0), (cx_out + 0.55, yb - 0.05, 0.85), M_WALNUT)
        cells.box_min((cx_out, yb - 0.8, 0.85), (cx_out + 0.6, yb, 0.9), M_MARBLE)
        cells.box_min((cx_out + 0.1, yb - 0.55, 0.9), (cx_out + 0.45, yb - 0.25, 0.94), M_BASIN)
        cells.box_min((cx_out + 0.005, yb - 0.75, 1.1), (cx_out + 0.03, yb - 0.1, 2.2), M_MIRROR)
    if k == 2:   # bright dressing room with a window glow
        cells.box_min((cx_out + 0.005, ya + 0.3, 0.6), (cx_out + 0.04, yb - 0.3, 2.6), M_WINDOW)
    # open door leaf (dark walnut), swung 90 degrees into the adjoining room
    if k < 2:
        lw = (db - da) - 0.04
        hy = (db - 0.03) if k == 0 else (da + 0.03)
        cells.box((cx_in - lw / 2 - 0.06, hy, (DOOR_H - 0.1) / 2), (lw, 0.045, DOOR_H - 0.1), M_WALNUT)
        cells.box((cx_in - lw / 2 - 0.06, hy + (-0.026 if k == 0 else 0.026), (DOOR_H - 0.1) / 2), (lw - 0.25, 0.012, DOOR_H - 0.55), M_TRIM)

# ---- brass wall sconces (tube + brass backplate + caps) and their lights
for sy, sz in SCONCES:
    trim.box((WX + 0.045, sy, sz), (0.09, 0.07, 0.22), M_BRASS)                          # backplate block
    trim.box((WX + 0.012, sy, sz), (0.024, 0.16, 0.34), M_BRASS)                         # wall plate
    trim.box((WX + 0.11, sy, sz), (0.022, 0.034, 0.9), M_BRASS)                          # spine
    trim.tube([(WX + 0.14, sy, sz - 0.45), (WX + 0.14, sy, sz + 0.45)], [0.020, 0.020], M_TUBE, sides=12)
    trim.box((WX + 0.14, sy, sz - 0.46), (0.05, 0.05, 0.02), M_BRASS)
    trim.box((WX + 0.14, sy, sz + 0.46), (0.05, 0.05, 0.02), M_BRASS)

arch_obj = arch.finish(); trim_obj = trim.finish(bevel=0.0025); cells_obj = cells.finish()

# =====================================================================================================
# 3. CEILING: slab, soffits (drop bulkheads) on the glazing sides, LED coves, recessed downlights
# =====================================================================================================
ceil = Builder("WW_Ceiling", COL["Ceiling"])
ceil.box_min((WX - WALL_T, YA, H), (ROOM_X1 + WALL_T, YB, H + 0.35), M_CEIL)
ceil.box_min((WX, ROOM_Y1 - SOFFIT_W, H - SOFFIT_DROP), (ROOM_X1, ROOM_Y1 + 0.02, H), M_CEIL)             # far soffit
ceil.box_min((ROOM_X1 - SOFFIT_W, 3.0, H - SOFFIT_DROP), (ROOM_X1 + 0.02, ROOM_Y1 - SOFFIT_W, H), M_CEIL) # right soffit
# cove: a hidden LED line at the TOP of each soffit riser (only a thin warm line is visible; the glow washes the ceiling above it)
ceil.box(((WX + ROOM_X1) / 2, ROOM_Y1 - SOFFIT_W - 0.008, H - 0.045), (ROOM_X1 - WX, 0.012, 0.016), M_LED)
ceil.box((ROOM_X1 - SOFFIT_W - 0.008, (3.0 + ROOM_Y1 - SOFFIT_W) / 2, H - 0.045), (0.012, ROOM_Y1 - SOFFIT_W - 3.0, 0.016), M_LED)
# recessed downlights (small visible trims)
DOWN_X = [ROOM_X0 + (ROOM_X1 - ROOM_X0) * t for t in (0.2, 0.45, 0.7, 0.93)]
DOWN_Y = [1.5, 3.9, 6.3, 8.7]
for xx in DOWN_X:
    for yy in DOWN_Y:
        if (xx > ROOM_X1 - SOFFIT_W - 0.1 and yy > 2.9) or yy > ROOM_Y1 - SOFFIT_W - 0.3:
            continue
        ceil.tube([(xx, yy, H - 0.004), (xx, yy, H - 0.012)], [0.055, 0.055], M_DOWN, sides=20)
ceil_obj = ceil.finish(bevel=0.006)

# =====================================================================================================
# 4. GLAZING: slender bronze frames + near-clear glass, wrap-around corner
# =====================================================================================================
frm = Builder("WW_Window_Frames", COL["Glazing"])
gls = Builder("WW_Window_Glass", COL["Glazing"])
GZ0, GZ1 = 0.06, H - SOFFIT_DROP
FAR_X = [ROOM_X0] + FAR_MULLION_X + [ROOM_X1]
RIGHT_Y = [3.0 + i * (ROOM_Y1 - 3.0) / 5 for i in range(6)]
for i in range(len(FAR_X) - 1):
    gls.quad((FAR_X[i], ROOM_Y1, GZ0), (FAR_X[i + 1], ROOM_Y1, GZ0), (FAR_X[i + 1], ROOM_Y1, GZ1), (FAR_X[i], ROOM_Y1, GZ1), M_GLASS)
for i in range(len(RIGHT_Y) - 1):
    gls.quad((ROOM_X1, RIGHT_Y[i], GZ0), (ROOM_X1, RIGHT_Y[i + 1], GZ0), (ROOM_X1, RIGHT_Y[i + 1], GZ1), (ROOM_X1, RIGHT_Y[i], GZ1), M_GLASS)
for i, xx in enumerate(FAR_X):
    w = 0.16 if i in (0, len(FAR_X) - 1) else 0.22
    frm.box((xx + (0.05 if i == 0 else (-0.05 if i == len(FAR_X) - 1 else 0)), ROOM_Y1, (GZ0 + GZ1) / 2), (w, 0.20, GZ1 - GZ0), M_FRAME)
for i, yy in enumerate(RIGHT_Y):
    w = 0.34 if i in (0, len(RIGHT_Y) - 1) else (0.22 if i == 3 else 0.10)      # structural piers (reference shows thick dark corner frames)
    frm.box((ROOM_X1, yy + (0.05 if i == 0 else (-0.05 if i == len(RIGHT_Y) - 1 else 0)), (GZ0 + GZ1) / 2), (0.22, w, GZ1 - GZ0), M_FRAME)
frm.box_min((ROOM_X0, ROOM_Y1 - 0.075, 0.0), (ROOM_X1, ROOM_Y1 + 0.075, GZ0 + 0.02), M_FRAME)           # sills
frm.box_min((ROOM_X0, ROOM_Y1 - 0.075, GZ1 - 0.02), (ROOM_X1, ROOM_Y1 + 0.075, GZ1 + 0.02), M_FRAME)     # heads
frm.box_min((ROOM_X1 - 0.075, 3.0, 0.0), (ROOM_X1 + 0.075, ROOM_Y1, GZ0 + 0.02), M_FRAME)
frm.box_min((ROOM_X1 - 0.075, 3.0, GZ1 - 0.02), (ROOM_X1 + 0.075, ROOM_Y1, GZ1 + 0.02), M_FRAME)
frm.box((ROOM_X1 - 0.075, 3.0, (GZ0 + GZ1) / 2), (0.15, 0.04, GZ1 - GZ0), M_FRAME)
frm_obj = frm.finish(bevel=0.003); gls_obj = gls.finish()

# =====================================================================================================
# 5. BALCONY + glass balustrade + blossom tree
# =====================================================================================================
BX1 = ROOM_X1 + 2.2
BY1 = ROOM_Y1 + 2.2
BZ = -0.35          # balcony deck height
bal = Builder("WW_Balcony", COL["Balcony"])
bal.box_min((ROOM_X0, ROOM_Y1 + 0.075, BZ - 0.35), (BX1, BY1, BZ), M_STONE)
bal.box_min((ROOM_X1 + 0.075, 3.0, BZ - 0.35), (BX1, ROOM_Y1 + 0.075, BZ), M_STONE)
bal.box_min((ROOM_X0, BY1 - 0.04, BZ - 0.45), (BX1 + 0.04, BY1 + 0.04, BZ - 0.3), M_FRAME)          # edge fascia
# balustrade posts + handrail (bronze), glass panels
def post_line(p0, p1, spacing=1.9):
    d = (Vector(p1) - Vector(p0)); n = max(1, round(d.length / spacing))
    pts = [Vector(p0) + d * (i / n) for i in range(n + 1)]
    for p in pts:
        bal.box((p.x, p.y, BZ + 0.5), (0.03, 0.03, 1.0), M_STEEL)
    bal.tube([(pts[0].x, pts[0].y, BZ + 1.02), (pts[-1].x, pts[-1].y, BZ + 1.02)], [0.024, 0.024], M_STEEL, sides=10)
    bal.box(((pts[0].x + pts[-1].x) / 2, (pts[0].y + pts[-1].y) / 2, BZ + 0.06), (max(abs(d.x), 0.05), max(abs(d.y), 0.05), 0.06), M_STEEL)
    for i in range(n):
        a, b = pts[i], pts[i + 1]
        bal_glass.quad((a.x, a.y, BZ + 0.08), (b.x, b.y, BZ + 0.08), (b.x, b.y, BZ + 0.98), (a.x, a.y, BZ + 0.98), M_GLASS)
bal_glass = Builder("WW_Balustrade_Glass", COL["Balcony"])
post_line((ROOM_X0 + 0.05, BY1 - 0.05), (BX1 - 0.05, BY1 - 0.05))
post_line((BX1 - 0.05, BY1 - 0.05), (BX1 - 0.05, 3.1))
post_line((ROOM_X0 + 0.05, ROOM_Y1 + 0.3), (ROOM_X0 + 0.05, BY1 - 0.05), 2.5)
bal_obj = bal.finish(); balg_obj = bal_glass.finish()

# ---- flowering tree in a stone planter (tapered branches, leaves, hundreds of small blossoms)
plant = Builder("WW_Blossom_Tree_Wood", COL["Decor"])
plant_pot = Builder("WW_Blossom_Tree_Planter", COL["Decor"])
PX, PY = min(PLANT_XY.x, BX1 - 0.8), min(PLANT_XY.y, BY1 - 0.8)
plant_pot.tube([(PX, PY, 0.0), (PX, PY, 0.38), (PX, PY, 0.58)], [0.20, 0.27, 0.29], M_POT, sides=32)
plant_pot.tube([(PX, PY, 0.52), (PX, PY, 0.60)], [0.30, 0.30], M_BRASS, sides=32)
tips = []
def branch(start, direction, length, radius, depth):
    pts = [Vector(start)]
    d = Vector(direction).normalized()
    segs = 5
    for i in range(segs):
        d = (d + Vector((random.uniform(-0.18, 0.18), random.uniform(-0.18, 0.18), random.uniform(-0.05, 0.12)))).normalized()
        pts.append(pts[-1] + d * (length / segs))
    rad = [radius * (1 - 0.8 * i / segs) for i in range(segs + 1)]
    plant.tube(pts, rad, M_BARK, sides=7)
    if depth > 0:
        for i in (2, 3, 4):
            sd = Vector((random.uniform(-1, 1), random.uniform(-1, 1), random.uniform(0.3, 1.0)))
            branch(pts[i], sd, length * 0.6, rad[i] * 0.75, depth - 1)
    else:
        tips.append(pts[-1])
    tips.append(pts[-2])
branch((PX, PY, 0.56), (0.05, 0.0, 1.0), 1.0, 0.032, 0)
for ang_ in range(7):
    a = ang_ * 2 * math.pi / 7 + random.uniform(-0.3, 0.3)
    branch((PX, PY, 0.95 + random.uniform(0, 0.45)), (math.cos(a), math.sin(a), random.uniform(0.6, 1.3)), 0.75, 0.016, 1)
plant_obj = plant.finish(); pot_obj = plant_pot.finish()
for _o in (plant_obj, pot_obj):
    _o.location.z = BZ

bl = bmesh.new()
rl_ = bl.loops.layers.float_color.new("rnd")
cl_ = bl.loops.layers.float_color.new("Col")
def _pink(t):
    return tuple(a_ + (b_ - a_) * t for a_, b_ in zip((0.95, 0.62, 0.72), (0.78, 0.30, 0.46)))
leaf = Builder("WW_Blossom_Tree_Leaves", COL["Decor"])
# canopy = irregular low-poly blossom clumps (20 faces each, jittered, colour varies per clump AND per face), not confetti spheres
for tp in tips:
    for _ in range(3):
        p_ = tp + Vector((random.gauss(0, 0.11), random.gauss(0, 0.11), random.gauss(0, 0.09)))
        r_ = random.uniform(0.075, 0.13)
        res = bmesh.ops.create_icosphere(bl, subdivisions=1, radius=r_, matrix=Matrix.Translation(p_))
        for v_ in res["verts"]:
            v_.co += Vector((random.gauss(0, r_ * 0.22), random.gauss(0, r_ * 0.22), random.gauss(0, r_ * 0.18)))
        rv = random.random()
        for f in {f for v in res["verts"] for f in v.link_faces}:
            for lp in f.loops:
                c_ = min(1.0, max(0.0, rv + random.gauss(0, 0.12)))
                lp[rl_] = (c_, c_, c_, 1.0)
                lp[cl_] = (*_pink(c_), 1.0)
    p_ = tp + Vector((random.gauss(0, 0.10), random.gauss(0, 0.10), random.gauss(0, 0.08)))
    a_ = random.uniform(0, 6.28)
    d_ = Vector((math.cos(a_), math.sin(a_), random.uniform(-0.3, 0.3))) * 0.07
    e_ = Vector((-d_.y, d_.x, 0.0)) * 0.45
    leaf.quad(p_ - d_, p_ + e_, p_ + d_, p_ - e_, M_LEAF)
bme = bpy.data.meshes.new("WW_Blossoms")
bl.to_mesh(bme); bl.free()
bme.polygons.foreach_set("use_smooth", [True] * len(bme.polygons))          # soft clumps, not faceted gems
bme.materials.append(M_BLOSSOM)
blo = bpy.data.objects.new("WW_Blossom_Tree_Blossoms", bme)
COL["Decor"].objects.link(blo)
leaf_obj = leaf.finish()
blo.location.z = BZ
leaf_obj.location.z = BZ

# =====================================================================================================
# 6. EXTERIOR: Thames, Canary Wharf skyline (positions derived from the reference camera), sky
#    Honest scope: tower positions/silhouettes follow the reference image; facades, setbacks and crowns are procedural
#    approximations. This is a stylised, recognisable skyline - not a geographic reconstruction.
# =====================================================================================================
cam_pos = _cam_pos
WATER_Z = cam_pos.z - EYE_ABOVE_WATER
GROUND_Z = WATER_Z + 2.5

# Sun direction measured from the reference: the floor streaks converge to a vanishing point ~41 degrees right of the camera's
# forward axis, i.e. the sun sits low, beyond the far glazing and right of centre. Light travels toward the camera (-x, -y).
_E = math.radians(9.0)
SUN_TRAVEL = Vector((-0.43 * math.cos(_E), -0.90 * math.cos(_E), -math.sin(_E))).normalized()
SUN_DIR = -SUN_TRAVEL

def sky_point(px, depth):
    lat = (px - 1000.0) / f_px * depth
    return cam_pos + FWD * depth + RGT * lat

def px_z(top_px, depth):
    return cam_pos.z + (horizon_px - top_px) * depth / f_px

# ---- curtain-wall facade shader (Cycles). Mirror-like blue glass that reflects the sunset sky, thin mullion lines,
#      warm lit windows (more of them on the lower floors), sun glints on the sun-facing faces, and a pink atmospheric haze
#      that thickens toward the river. Cell sizes stay >= 3 pixels at 1080p so the denoiser never turns them into noise.
def facade_mat(name, lit=0.30, haze=0.10, bay=5.0, floor_h=3.9, strength=2.2, seedv=0.0, glint=0.55,
               glass=(0.075, 0.105, 0.21), warm=0.6, metal=0.55):
    m = new_mat(name)
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    out = [n for n in nt.nodes if n.type == 'OUTPUT_MATERIAL'][0]
    tc = N(nt, "ShaderNodeTexCoord")
    sep = N(nt, "ShaderNodeSeparateXYZ")
    link(nt, tc.outputs["Object"], sep.inputs["Vector"])
    Z = sep.outputs["Z"]
    su = math_node(nt, 'DIVIDE', math_node(nt, 'ADD', sep.outputs["X"], sep.outputs["Y"]), bay)
    sz = math_node(nt, 'DIVIDE', Z, floor_h)
    fu, fz = math_node(nt, 'FRACT', su), math_node(nt, 'FRACT', sz)
    wu = math_node(nt, 'MULTIPLY', math_node(nt, 'GREATER_THAN', fu, 0.10), math_node(nt, 'LESS_THAN', fu, 0.90))
    wz = math_node(nt, 'MULTIPLY', math_node(nt, 'GREATER_THAN', fz, 0.18), math_node(nt, 'LESS_THAN', fz, 0.82))
    win = math_node(nt, 'MULTIPLY', wu, wz)
    cell = N(nt, "ShaderNodeCombineXYZ")
    link(nt, math_node(nt, 'ADD', math_node(nt, 'FLOOR', su), seedv), cell.inputs["X"])
    link(nt, math_node(nt, 'FLOOR', sz), cell.inputs["Z"])
    wn = N(nt, "ShaderNodeTexWhiteNoise", noise_dimensions='3D')
    link(nt, cell.outputs["Vector"], wn.inputs["Vector"])
    cell2 = N(nt, "ShaderNodeCombineXYZ")           # independent random stream for tint / glass variation
    link(nt, math_node(nt, 'ADD', math_node(nt, 'FLOOR', su), seedv + 31.0), cell2.inputs["X"])
    cell2.inputs["Y"].default_value = 7.0
    link(nt, math_node(nt, 'ADD', math_node(nt, 'FLOOR', sz), 13.0), cell2.inputs["Z"])
    wn2 = N(nt, "ShaderNodeTexWhiteNoise", noise_dimensions='3D')
    link(nt, cell2.outputs["Vector"], wn2.inputs["Vector"])
    hn = math_node(nt, 'DIVIDE', math_node(nt, 'SUBTRACT', Z, GROUND_Z), 240.0, clamp=True)       # 0 at the quay -> 1 high up
    lit_p = math_node(nt, 'MULTIPLY', math_node(nt, 'ADD', math_node(nt, 'MULTIPLY', hn, -1.2), 1.45), lit)
    cell3 = N(nt, "ShaderNodeCombineXYZ")           # lit windows cluster by floor-block (like lit office floors), not salt-and-pepper
    link(nt, math_node(nt, 'ADD', math_node(nt, 'FLOOR', math_node(nt, 'DIVIDE', su, 3.0)), seedv + 53.0), cell3.inputs["X"])
    cell3.inputs["Y"].default_value = 3.0
    link(nt, math_node(nt, 'FLOOR', math_node(nt, 'DIVIDE', sz, 4.0)), cell3.inputs["Z"])
    wn3 = N(nt, "ShaderNodeTexWhiteNoise", noise_dimensions='3D')
    link(nt, cell3.outputs["Vector"], wn3.inputs["Vector"])
    lit_c = math_node(nt, 'MULTIPLY', lit_p, math_node(nt, 'ADD', 0.25, math_node(nt, 'MULTIPLY', wn3.outputs["Value"], 1.6)))
    on = math_node(nt, 'GREATER_THAN', wn.outputs["Value"], math_node(nt, 'SUBTRACT', 1.0, lit_c))
    tint = ramp(nt, math_node(nt, 'FRACT', math_node(nt, 'MULTIPLY', wn2.outputs["Value"], 7.0)),
                [(0.0, (1.0, 0.93, 0.80)), (warm, (1.0, 0.62, 0.30)), (1.0, (1.0, 0.78, 0.48))])
    glass_c = ramp(nt, wn2.outputs["Value"], [(0.0, tuple(0.65 * g_ for g_ in glass)), (1.0, tuple(1.6 * g_ for g_ in glass))])
    base = mix_color(nt, win, tuple(0.5 * g_ for g_ in glass), glass_c)
    link(nt, base, b.inputs["Base Color"])
    setp(b, rough=0.06, metal=metal)
    link(nt, tint, sock(b, ["Emission Color", "Emission"]))
    link(nt, math_node(nt, 'MULTIPLY', math_node(nt, 'MULTIPLY', win, on), strength), sock(b, "Emission Strength"))
    # sun-facing faces catch a warm glint (stronger higher up)
    geo = N(nt, "ShaderNodeNewGeometry")
    dt = N(nt, "ShaderNodeVectorMath", operation='DOT_PRODUCT')
    dt.inputs[1].default_value = tuple(SUN_DIR)
    link(nt, geo.outputs["Normal"], dt.inputs[0])
    sunlit = math_node(nt, 'POWER', math_node(nt, 'MAXIMUM', dt.outputs["Value"], 0.0), 1.5)
    g_em = N(nt, "ShaderNodeEmission")
    g_em.inputs["Color"].default_value = (1.0, 0.55, 0.24, 1)
    link(nt, math_node(nt, 'MULTIPLY', math_node(nt, 'MULTIPLY', sunlit, glint), math_node(nt, 'ADD', 0.35, math_node(nt, 'MULTIPLY', hn, 0.65))), g_em.inputs["Strength"])
    add = N(nt, "ShaderNodeAddShader")
    link(nt, b.outputs["BSDF"], add.inputs[0])
    link(nt, g_em.outputs["Emission"], add.inputs[1])
    hz = N(nt, "ShaderNodeEmission")
    hz.inputs["Color"].default_value = (0.90, 0.55, 0.64, 1)
    hz.inputs["Strength"].default_value = 0.8
    mx = N(nt, "ShaderNodeMixShader")
    link(nt, math_node(nt, 'ADD', haze, math_node(nt, 'MULTIPLY', math_node(nt, 'SUBTRACT', 1.0, hn), 0.22)), mx.inputs[0])
    link(nt, add.outputs["Shader"], mx.inputs[1])
    link(nt, hz.outputs["Emission"], mx.inputs[2])
    link(nt, mx.outputs["Shader"], out.inputs["Surface"])
    return m

M_T_HERO   = facade_mat("WW_Tower_Hero",   lit=0.18, haze=0.03, bay=5.0, floor_h=3.9, seedv=0.0, strength=0.9, metal=0.30, glass=(0.075, 0.10, 0.22))
M_T_HERO2  = facade_mat("WW_Tower_Hero_B", lit=0.15, haze=0.05, bay=5.6, floor_h=3.9, seedv=11.0, warm=0.5, glass=(0.09, 0.095, 0.22), strength=0.9, metal=0.30)
M_T_NEAR   = facade_mat("WW_Tower_Low",    lit=0.22, haze=0.14, bay=6.5, floor_h=4.0, seedv=5.0, strength=0.9, glint=0.30, metal=0.25, glass=(0.09, 0.09, 0.19))
M_T_FAR    = facade_mat("WW_Tower_Far",    lit=0.22, haze=0.55, bay=9.0, floor_h=4.0, seedv=2.0, strength=0.8, glint=0.15, metal=0.2, glass=(0.10, 0.10, 0.20))
M_SIGN     = solid("WW_Tower_Sign", (1, 1, 1), 0.5, 0.0, (0.80, 0.90, 1.0), 3.0)
M_ROOF     = solid("WW_Tower_Roof", (0.26, 0.27, 0.32), 0.25, 0.8)
M_PYR      = solid("WW_Tower_Pyramid", (0.60, 0.62, 0.70), 0.14, 0.9, (1.0, 0.62, 0.34), 0.9)
M_BEACON   = solid("WW_Tower_Beacon", (1, 0.2, 0.1), 0.4, 0.0, (1.0, 0.25, 0.1), 40.0)
M_QUAY     = solid("WW_Quay_Lamp", (1, 0.8, 0.5), 0.5, 0.0, (1.0, 0.68, 0.34), 9.0)
M_BANK     = solid("WW_FarBank_Stone", (0.30, 0.25, 0.25), 0.5)

# ---- river: dark lavender water, very low roughness, long horizontal ripples -> bright sky reflection and glittering streaks
water_b = Builder("WW_River_Thames", COL["River"])
M_WATER = new_mat("WW_Water")
nt = M_WATER.node_tree
bw = nt.nodes["Principled BSDF"]
setp(bw, color=(0.10, 0.11, 0.20), rough=0.06, ior=1.33)
tcw = N(nt, "ShaderNodeTexCoord")
mpw = N(nt, "ShaderNodeMapping")
mpw.inputs["Scale"].default_value = (0.003, 0.06, 1.0)
link(nt, tcw.outputs["Object"], mpw.inputs["Vector"])
nz1 = N(nt, "ShaderNodeTexNoise", noise_dimensions='3D')
nz1.inputs["Scale"].default_value = 1.0
nz1.inputs["Detail"].default_value = 2.0
link(nt, mpw.outputs["Vector"], nz1.inputs["Vector"])
bmw = N(nt, "ShaderNodeBump")
bmw.inputs["Strength"].default_value = 0.06
bmw.inputs["Distance"].default_value = 0.6
link(nt, nz1.outputs["Fac"], bmw.inputs["Height"])
link(nt, bmw.outputs["Normal"], bw.inputs["Normal"])
water_b.quad((-6000, -1500, WATER_Z), (6000, -1500, WATER_Z), (6000, 6000, WATER_Z), (-6000, 6000, WATER_Z), M_WATER)
water_obj = water_b.finish()

# ---- towers: podium + stepped shaft + crown, per type
def build_tower(name, p, w, d, ztop, kind, mt):
    b = Builder("WW_" + name, COL["Exterior_Skyline"])
    z0 = GROUND_Z - 5
    def tier(wf, df, za, zb, m=None, dx=0.0):
        b.box_min((p.x - w * wf / 2 + dx, p.y - d * df / 2, za), (p.x + w * wf / 2 + dx, p.y + d * df / 2, zb), m or mt)
    def mast(h, r=0.5, base=0.0):
        b.box((p.x, p.y, ztop + base + h / 2), (r, r, h), M_ROOF)
    tier(1.7, 1.5, z0, GROUND_Z + 16, M_T_NEAR)              # waterfront podium
    zs = ztop
    if kind == "pyramid":                                    # One Canada Square: square shaft, flat cap, steel-clad pyramid, beacon
        zs = ztop - w * 0.5
        tier(1.0, 1.0, GROUND_Z, zs - 5)
        tier(0.93, 0.93, zs - 5, zs)
        b.pyramid((p.x, p.y, zs), w * 0.93, d * 0.93, w * 0.5, M_PYR)
        b.box((p.x, p.y, ztop + 7), (1.0, 1.0, 14), M_ROOF)
        b.box((p.x, p.y, ztop + 14.5), (1.6, 1.6, 1.6), M_BEACON)
    elif kind == "citi":                                     # tall slab-sided shaft with a stepped crown
        tier(1.0, 1.0, GROUND_Z, ztop - 7)
        tier(0.88, 0.88, ztop - 7, ztop - 2)
        tier(0.52, 0.52, ztop - 2, ztop + 9, M_ROOF)
        mast(12, 0.6, 9)
    elif kind == "hsbc":                                     # shaft, notched upper step, two masts
        tier(1.0, 1.0, GROUND_Z, ztop - 18)
        tier(0.80, 1.0, ztop - 18, ztop - 5, dx=w * 0.08)
        tier(0.45, 0.55, ztop - 5, ztop + 6, M_ROOF, dx=w * 0.08)
        b.box((p.x - w * 0.18, p.y, ztop + 14), (0.5, 0.5, 16), M_ROOF)
        b.box((p.x + w * 0.22, p.y, ztop + 11), (0.5, 0.5, 10), M_ROOF)
    elif kind == "barclays":                                 # wide slab, narrower upper block, roof plant
        tier(1.0, 0.66, GROUND_Z, ztop - 20)
        tier(0.72, 0.58, ztop - 20, ztop)
        tier(0.5, 0.4, ztop, ztop + 5, M_ROOF)
    elif kind == "stepped":
        tier(1.0, 1.0, GROUND_Z, ztop - 22)
        tier(0.82, 0.82, ztop - 22, ztop - 9)
        tier(0.58, 0.58, ztop - 9, ztop)
        tier(0.35, 0.35, ztop, ztop + 5, M_ROOF)
        mast(10, 0.5, 5)
    else:                                                    # plain
        tier(1.0, 1.0, GROUND_Z, ztop)
        tier(0.7, 0.7, ztop, ztop + 5, M_ROOF)
        if w > 30:
            mast(14, 0.5, 5)
    b.finish()
    return zs

# hero towers laid out to match the reference frame (px = horizontal position in the 2000 px reference)
HERO = [
    # name, px, half-width px, top px (2000 px wide reference frame), distance along camera axis (m), kind, material
    ("TowerWest_A", 1118, 26, 440, 1200, "stepped", M_T_HERO2),
    ("TowerWest_B", 1203, 38, 400, 1150, "stepped", M_T_HERO2),
    ("TowerSmall_C", 1258, 14, 490, 1100, "plain", M_T_NEAR),
    ("Tower_Citi", 1326, 40, 360, 1086, "citi", M_T_HERO),
    ("Tower_OneCanadaSquare", 1415, 29, 338, 1156, "pyramid", M_T_HERO),
    ("Tower_HSBC", 1495, 31, 367, 1116, "hsbc", M_T_HERO2),
    ("TowerSmall_E", 1545, 12, 436, 1100, "plain", M_T_NEAR),
    ("Tower_Barclays", 1600, 45, 402, 1067, "barclays", M_T_HERO),
    ("TowerEast_F", 1738, 22, 450, 1100, "stepped", M_T_HERO2),
    ("TowerEast_G", 1850, 18, 490, 1100, "plain", M_T_NEAR),
    ("TowerWest_H", 1030, 22, 482, 1100, "plain", M_T_NEAR),
]
sign_specs = []
for name, px, hw, top, depth, kind, mt in HERO:
    p = sky_point(px, depth)
    w = 2 * hw * depth / f_px
    ztop = px_z(top, depth)
    d_ = w * (0.92 if kind != "barclays" else 0.7)
    zs = build_tower(name, p, w, d_, ztop, kind, mt)
    if kind in ("citi", "hsbc", "barclays") and ADD_SIGNAGE:
        txt = {"citi": "citi", "hsbc": "HSBC", "barclays": "BARCLAYS"}[kind]
        sign_specs.append((txt, Vector((p.x, p.y - d_ / 2 - 0.6, ztop - (14 if kind != "barclays" else 24))), w))
for txt, loc, w in sign_specs:
    cu = bpy.data.curves.new("WW_Sign_" + txt, 'FONT')
    cu.body = txt
    cu.align_x = 'CENTER'
    cu.size = 0.7 * w / (0.55 * len(txt))
    cu.materials.append(M_SIGN)
    so = bpy.data.objects.new("WW_Sign_" + txt, cu)
    so.location = loc
    so.rotation_euler = (math.radians(90), 0, 0)
    COL["Exterior_Skyline"].objects.link(so)

# ---- filler city: three merged layers (waterfront low-rise, mid, far) with stepped tops, so the horizon has believable depth
def city_layer(name, mat_, n, d_range, h_range, w_range, ang_range):
    b = Builder(name, COL["Exterior_Skyline"])
    for _ in range(n):
        depth = random.uniform(*d_range)
        ang_ = math.radians(random.uniform(*ang_range))
        pos = cam_pos + FWD * depth * math.cos(ang_) + RGT * depth * math.sin(ang_)
        w, dd = random.uniform(*w_range), random.uniform(*w_range)
        h = random.uniform(*h_range)
        b.box_min((pos.x - w / 2, pos.y - dd / 2, GROUND_Z - 5), (pos.x + w / 2, pos.y + dd / 2, GROUND_Z + h), mat_)
        if random.random() < 0.4:      # setback crown
            b.box_min((pos.x - w * 0.3, pos.y - dd * 0.3, GROUND_Z + h), (pos.x + w * 0.3, pos.y + dd * 0.3, GROUND_Z + h * 1.12), mat_)
    b.finish()
city_layer("WW_City_Waterfront", M_T_NEAR, 110, (930, 1320), (12, 48), (22, 60), (-60, 55))
city_layer("WW_City_Mid", M_T_FAR, 90, (1350, 2000), (22, 85), (26, 70), (-60, 55))
city_layer("WW_City_Far", M_T_FAR, 130, (2100, 3600), (45, 190), (30, 90), (-60, 55))

# ---- far bank: stone embankment + promenade and quay lamps (their reflections streak down the river)
pod = Builder("WW_FarBank_Podium", COL["Exterior_Skyline"])
c0 = cam_pos + FWD * 880
pod.box_min((cam_pos.x - 3200, c0.y - 28, WATER_Z - 5), (cam_pos.x + 3200, c0.y + 28, GROUND_Z + 9), M_T_NEAR)
pod.box_min((cam_pos.x - 3200, c0.y - 70, WATER_Z - 5), (cam_pos.x + 3200, c0.y - 28, GROUND_Z), M_BANK)
pod.finish()
lamps = Builder("WW_Quay_Lamps", COL["Exterior_Skyline"])
for i in range(420):
    xx = cam_pos.x - 2200 + i * 10.5 + random.uniform(-2, 2)
    lamps.box((xx, c0.y - 72, GROUND_Z + 3 + random.uniform(0, 1.5)), (0.9, 0.9, 0.9), M_QUAY)
lamps.finish()

# ---- world: sunset sky (procedural gradient + sun glow + streaky clouds)
AMBIENT = 0.60           # how much sky light reaches the interior (diffuse rays)
SKY_SEEN = 1.70          # extra brightness for camera / mirror rays so the sky looks luminous in windows and reflections
world = bpy.data.worlds.new("WW_Sunset_Sky")
if world.node_tree is None:
    world.use_nodes = True
scene.world = world
wt = world.node_tree
for n in list(wt.nodes):
    if n.type not in ('OUTPUT_WORLD',):
        wt.nodes.remove(n)
wout = [n for n in wt.nodes if n.type == 'OUTPUT_WORLD'][0]
bg = N(wt, "ShaderNodeBackground")
lpw = N(wt, "ShaderNodeLightPath")
seen = math_node(wt, 'MAXIMUM', lpw.outputs["Is Camera Ray"], lpw.outputs["Is Glossy Ray"])
link(wt, math_node(wt, 'ADD', AMBIENT, math_node(wt, 'MULTIPLY', seen, SKY_SEEN)), bg.inputs["Strength"])
tcs = N(wt, "ShaderNodeTexCoord")
sepz = N(wt, "ShaderNodeSeparateXYZ")
nrm = N(wt, "ShaderNodeVectorMath", operation='NORMALIZE')
link(wt, tcs.outputs["Generated"], nrm.inputs[0])
link(wt, nrm.outputs[0], sepz.inputs["Vector"])
elev = math_node(wt, 'MAXIMUM', sepz.outputs["Z"], 0.0)
sky_c = ramp(wt, elev, [(0.0, (1.0, 0.55, 0.30)), (0.06, (1.0, 0.47, 0.40)), (0.17, (0.86, 0.43, 0.62)),
                         (0.36, (0.54, 0.46, 0.88)), (1.0, (0.22, 0.32, 0.80))])
dot = N(wt, "ShaderNodeVectorMath", operation='DOT_PRODUCT')
dot.inputs[1].default_value = tuple(SUN_DIR)
link(wt, nrm.outputs[0], dot.inputs[0])
dpos = math_node(wt, 'MAXIMUM', dot.outputs["Value"], 0.0)
glow_a = math_node(wt, 'MULTIPLY', math_node(wt, 'POWER', dpos, 5.0), 1.0)
glow_b = math_node(wt, 'MULTIPLY', math_node(wt, 'POWER', dpos, 60.0), 4.0)
glow_c = N(wt, "ShaderNodeCombineXYZ")
link(wt, math_node(wt, 'ADD', glow_a, glow_b), glow_c.inputs["X"])
link(wt, math_node(wt, 'ADD', math_node(wt, 'MULTIPLY', glow_a, 0.46), math_node(wt, 'MULTIPLY', glow_b, 0.8)), glow_c.inputs["Y"])
link(wt, math_node(wt, 'ADD', math_node(wt, 'MULTIPLY', glow_a, 0.18), math_node(wt, 'MULTIPLY', glow_b, 0.5)), glow_c.inputs["Z"])
cmap = N(wt, "ShaderNodeMapping")
cmap.inputs["Scale"].default_value = (3.0, 3.0, 14.0)
link(wt, nrm.outputs[0], cmap.inputs["Vector"])
cn = N(wt, "ShaderNodeTexNoise", noise_dimensions='3D')
cn.inputs["Scale"].default_value = 1.4
cn.inputs["Detail"].default_value = 6.0
link(wt, cmap.outputs["Vector"], cn.inputs["Vector"])
cloud_mask = ramp(wt, cn.outputs["Fac"], [(0.45, (0.0, 0.0, 0.0)), (0.66, (1.0, 1.0, 1.0))])
band = ramp(wt, math_node(wt, 'MULTIPLY', elev, 3.0), [(0.0, (0.0, 0.0, 0.0)), (0.12, (1.0, 1.0, 1.0)), (0.55, (0.55, 0.55, 0.55)), (1.0, (0.0, 0.0, 0.0))])
cl_amt = N(wt, "ShaderNodeSeparateColor")
link(wt, cloud_mask, cl_amt.inputs["Color"])
cl_amt2 = N(wt, "ShaderNodeSeparateColor")
link(wt, band, cl_amt2.inputs["Color"])
cloud_f = math_node(wt, 'MULTIPLY', cl_amt.outputs[0], cl_amt2.outputs[0])
sky_cloud = mix_color(wt, math_node(wt, 'MULTIPLY', cloud_f, 0.6), sky_c, (1.0, 0.60, 0.50))
total = N(wt, "ShaderNodeVectorMath", operation='ADD')
link(wt, sky_cloud, total.inputs[0])
link(wt, glow_c.outputs["Vector"], total.inputs[1])
link(wt, total.outputs[0], bg.inputs["Color"])
link(wt, bg.outputs["Background"], wout.inputs["Surface"])

# =====================================================================================================
# 7. LIGHTING - one system, tuned together.
#    Key (sun, 2900 K) -> sky ambient (cool lavender, world AMBIENT) -> warm interior accents (2400-2700 K: cove, downlights,
#    sconces). The interior is meant to be LIT BY THE SUN AND ITS BOUNCES: fills are deliberately weak so the long sun
#    streaks on the floor, the shaded ivory walls and the darker taupe ceiling give the reference its depth.
#    Material response is part of the system: ivory plaster albedo ~0.55-0.7 (not white), oak ~0.1-0.22, so a bright sun
#    patch reads as golden and shade reads as warm cream.
# =====================================================================================================
LIGHT = dict(sun_K=3900, sun=11.0,
             cove_K=5000, cove_far=36, cove_right=28, fill=8,
             down_K=3400, down=10,
             sconce_K=2600, sconce=36, sconce_pt=6,
             rooms_K=3100, rooms=[6, 90, 60])

def make_light(name, kind, loc, energy, color, col="Lighting", rot=None, **kw):
    l = bpy.data.lights.new(name, kind)
    l.energy = energy
    l.color = color
    for k, v in kw.items():
        setattr(l, k, v)
    o = bpy.data.objects.new(name, l)
    o.location = loc
    if rot is not None:
        o.rotation_euler = rot
    COL[col].objects.link(o)
    return o

sun_o = make_light("WW_Sun_Golden", 'SUN', (0, 0, 60), LIGHT["sun"], kelvin_rgb(LIGHT["sun_K"]), angle=math.radians(0.8))
sun_o.rotation_euler = SUN_TRAVEL.to_track_quat('-Z', 'Y').to_euler()

UP = (math.pi, 0, 0)
# cove: strip lights just in front of each soffit riser, 10 cm below the slab, throwing light UP onto the ceiling
make_light("WW_Cove_Far", 'AREA', ((ROOM_X0 + ROOM_X1) / 2, ROOM_Y1 - SOFFIT_W - 0.20, H - 0.10), LIGHT["cove_far"], kelvin_rgb(LIGHT["cove_K"]), rot=UP,
           shape='RECTANGLE', size=ROOM_X1 - WX - 0.5, size_y=0.08, spread=math.radians(75))
make_light("WW_Cove_Right", 'AREA', (ROOM_X1 - SOFFIT_W - 0.20, (3.0 + ROOM_Y1 - SOFFIT_W) / 2, H - 0.10), LIGHT["cove_right"], kelvin_rgb(LIGHT["cove_K"]), rot=UP,
           shape='RECTANGLE', size=0.08, size_y=ROOM_Y1 - SOFFIT_W - 3.0, spread=math.radians(75))
make_light("WW_Fill_Ceiling", 'AREA', (-0.5, 4.5, H - 0.12), LIGHT["fill"], kelvin_rgb(6500), rot=UP, shape='RECTANGLE', size=9.0, size_y=9.0)

for xx in DOWN_X:
    for yy in DOWN_Y:
        if (xx > ROOM_X1 - SOFFIT_W - 0.1 and yy > 2.9) or yy > ROOM_Y1 - SOFFIT_W - 0.3:
            continue
        make_light(f"WW_Downlight_{xx:.1f}_{yy:.1f}", 'AREA', (xx, yy, H - 0.02), LIGHT["down"], kelvin_rgb(LIGHT["down_K"]),
                   shape='DISK', size=0.12, spread=math.radians(100))
for sy, sz in SCONCES:
    make_light(f"WW_Sconce_Wash_{sy:.1f}", 'AREA', (WX + 0.16, sy, sz), LIGHT["sconce"], kelvin_rgb(LIGHT["sconce_K"]), rot=(0, math.radians(-90), 0),
               shape='RECTANGLE', size=0.05, size_y=0.9)
    make_light(f"WW_Sconce_Point_{sy:.1f}", 'POINT', (WX + 0.3, sy, sz), LIGHT["sconce_pt"], kelvin_rgb(LIGHT["sconce_K"]), shadow_soft_size=0.15)
for k, (da, db) in enumerate(DOORS):
    make_light(f"WW_Room{k + 1}_Light", 'POINT', (cx_in - 1.5, (da + db) / 2, 2.7), LIGHT["rooms"][k], kelvin_rgb(LIGHT["rooms_K"]), shadow_soft_size=0.4)

# =====================================================================================================
# 8. CAMERAS + MARKERS
# =====================================================================================================
def make_cam(name, loc, target, lens, shift_y=0.0, clip_start=0.05):
    cd = bpy.data.cameras.new(name)
    cd.lens = lens
    cd.sensor_width = 36.0
    cd.shift_y = shift_y
    cd.clip_start = clip_start
    cd.clip_end = 20000.0
    o = bpy.data.objects.new(name, cd)
    o.location = loc
    COL["Cameras"].objects.link(o)
    aim(o, target)
    return o

cam1 = make_cam("CAM1_ReferenceMatch", cam_pos, cam_pos + FWD * 20.0, CAM1["lens"], CAM1["shift_y"])
cam2 = make_cam("CAM2_ArchitecturalOverview", (ROOM_X0 + 0.55, ROOM_Y0 + 0.45, H - 1.0), (ROOM_X1 - 1.2, ROOM_Y1, 1.2), 16.0)
PLAYER = Vector((AVATAR_XY.x, AVATAR_XY.y, 0.0))      # where the avatar stands in the reference image
CAT = Vector((CAT_XY.x, CAT_XY.y, 0.0))
HEAD = PLAYER + Vector((0, 0, 1.35))
cam3 = make_cam("CAM3_Gameplay_ThirdPerson", PLAYER - FWD * 2.6 + Vector((0, 0, 1.75)), HEAD, 28.0)
cam4 = make_cam("CAM4_InteriorDetail", (ROOM_X0 + 2.6, 3.4, 1.5), (WX, 6.6, 1.3), 32.0)

def marker(name, loc, kind='ARROWS', size=0.4, face=None, role=""):
    e = bpy.data.objects.new(name, None)
    e.empty_display_type = kind
    e.empty_display_size = size
    e.location = loc
    if face is not None:
        e.rotation_euler = (0, 0, math.atan2(face.y, face.x) - math.pi / 2)
    e["ww_role"] = role           # exported to glTF "extras" so the game can find it
    COL["Markers"].objects.link(e)
    return e
marker("SPAWN_Player", PLAYER, 'SINGLE_ARROW', 0.8, FWD, "player_spawn")
marker("SPAWN_Cat", CAT, 'CIRCLE', 0.3, FWD, "pet_spawn")
marker("TARGET_ThirdPersonCam", HEAD, 'SPHERE', 0.15, None, "camera_target")
marker("SPAWN_Player_Facing_Hint", PLAYER + FWD * 1.0 + Vector((0, 0, 0.05)), 'PLAIN_AXES', 0.2, None, "player_facing_hint")

# =====================================================================================================
# 9. RENDER SETTINGS
# =====================================================================================================
scene.camera = cam1
r = scene.render
r.engine = 'CYCLES'
r.resolution_x, r.resolution_y, r.resolution_percentage = RENDER_W, RENDER_H, 100
r.film_transparent = False
cy_ = scene.cycles
cy_.samples = RENDER_SAMPLES
cy_.use_adaptive_sampling = True
cy_.adaptive_threshold = 0.02
cy_.use_denoising = True
try:
    cy_.denoiser = 'OPENIMAGEDENOISE'
except Exception:
    pass
cy_.max_bounces = 12
cy_.diffuse_bounces = 5
cy_.glossy_bounces = 6
cy_.transmission_bounces = 6
cy_.transparent_max_bounces = 32
cy_.sample_clamp_indirect = 8.0
cy_.sample_clamp_direct = 0.0
GPU_STATUS = "CPU"
if USE_GPU_IF_FOUND:
    try:
        pref = bpy.context.preferences.addons['cycles'].preferences
        for dev_type in ('METAL', 'OPTIX', 'CUDA', 'HIP', 'ONEAPI'):
            try:
                pref.compute_device_type = dev_type
                pref.get_devices()
                devs = [d for d in pref.devices if d.type == dev_type]
                if devs:
                    for d in pref.devices:
                        d.use = (d.type == dev_type) or d.type == 'CPU'
                    cy_.device = 'GPU'
                    GPU_STATUS = dev_type
                    break
            except Exception:
                continue
    except Exception:
        pass
vs = scene.view_settings
try:
    vs.view_transform = 'AgX'
except Exception:
    pass
LOOK_STATUS = "none available"
for want in ("AgX - Medium High Contrast", "Medium High Contrast", "AgX - High Contrast", "High Contrast", "AgX - Punchy", "Punchy"):
    try:
        vs.look = want
        LOOK_STATUS = want
        break
    except Exception:
        continue
vs.exposure = -0.60

# =====================================================================================================
# 10. GAME PIPELINE  (Blender -> GLB -> React Three Fiber)
#   Automatic in this script : WW_Export / WW_Presentation split, *_GAME material twins, collision proxies (WW_COL_*),
#                              spawn markers with glTF extras, baked parquet textures (BAKE_GAME_TEXTURES), validation report,
#                              optional GLB export (EXPORT_GLB) and optional skyline panorama (RENDER_SKYLINE_DOME).
#   NOT automatic (later step) : baked lighting / lightmaps, Draco + texture compression of the GLB (gltf-transform CLI),
#                              the React-side physics/camera/lighting setup. See the instructions delivered with this script.
# =====================================================================================================
view_layer = bpy.context.view_layer

def _out_dir():
    d = EXPORT_DIR or (os.path.dirname(bpy.data.filepath) if bpy.data.filepath else os.path.expanduser("~"))
    os.makedirs(d, exist_ok=True)
    return d

# ---- 10a. game floor: ONE textured quad (the 1738-board mesh stays Cycles-only) ------------------------------------------
def build_game_floor():
    me = bpy.data.meshes.new("WW_GEO_Floor")
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.new("UVMap")
    vs_ = [bm.verts.new(p) for p in ((ROOM_X0, ROOM_Y0, 0.0), (ROOM_X1, ROOM_Y0, 0.0), (ROOM_X1, ROOM_Y1, 0.0), (ROOM_X0, ROOM_Y1, 0.0))]
    f = bm.faces.new(vs_)
    for lp, uv in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
        lp[uvl].uv = uv
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new("WW_GEO_Floor", me)
    COL["Floor"].objects.link(o)
    me.materials.append(GAME_MATS["WW_Parquet_Oak"])         # flat fallback; replaced by the baked material when the bake succeeds
    o.hide_render = True                                        # coplanar with the parquet: keep it out of Cycles renders
    return o

def bake_game_floor(quad, src, size):
    """Bake the procedural parquet (colour / roughness / tangent-space normal) onto the quad's 0-1 UV map."""
    sc = bpy.context.scene
    old = (sc.render.engine, sc.cycles.samples, sc.cycles.use_denoising)
    sc.render.engine, sc.cycles.samples, sc.cycles.use_denoising = 'CYCLES', 8, False
    tmp = new_mat("WW_Floor_BakeTarget")
    nt_ = tmp.node_tree
    quad.data.materials.clear()
    quad.data.materials.append(tmp)
    imgs = {}
    view_layer.update()                                        # newly created objects must be registered before selecting them
    quad.hide_render = False                                   # the bake target must be renderable; hidden again afterwards
    try:
        for kind, btype, cs in (("albedo", 'DIFFUSE', 'sRGB'), ("roughness", 'ROUGHNESS', 'Non-Color'), ("normal", 'NORMAL', 'Non-Color')):
            img = bpy.data.images.new(f"WW_Floor_{kind}", size, size, alpha=False)
            img.colorspace_settings.name = cs
            tex = nt_.nodes.new("ShaderNodeTexImage")
            tex.image = img
            nt_.nodes.active = tex
            for o_ in list(view_layer.objects):
                o_.select_set(False)
            src.select_set(True); quad.select_set(True)
            view_layer.objects.active = quad
            kw = dict(type=btype, use_selected_to_active=True, cage_extrusion=0.02, max_ray_distance=0.05, margin=4, use_clear=True)
            if btype == 'DIFFUSE':
                kw["pass_filter"] = {'COLOR'}
            if btype == 'NORMAL':
                kw["normal_space"] = 'TANGENT'
            bpy.ops.object.bake(**kw)
            img.pack()
            imgs[kind] = img
    except Exception as ex:
        print("floor bake failed, using flat colour:", ex)
        quad.hide_render = True
        sc.render.engine, sc.cycles.samples, sc.cycles.use_denoising = old
        quad.data.materials.clear()
        quad.data.materials.append(GAME_MATS["WW_Parquet_Oak"])
        return False
    quad.hide_render = True
    sc.render.engine, sc.cycles.samples, sc.cycles.use_denoising = old
    g = new_mat("WW_Parquet_Baked_GAME")
    gn = g.node_tree
    gb = gn.nodes["Principled BSDF"]
    for kind, sockname in (("albedo", "Base Color"), ("roughness", "Roughness")):
        t = gn.nodes.new("ShaderNodeTexImage"); t.image = imgs[kind]
        gn.links.new(t.outputs["Color"], gb.inputs[sockname])
    t = gn.nodes.new("ShaderNodeTexImage"); t.image = imgs["normal"]
    nm = gn.nodes.new("ShaderNodeNormalMap"); nm.uv_map = "UVMap"
    gn.links.new(t.outputs["Color"], nm.inputs["Color"])
    gn.links.new(nm.outputs["Normal"], gb.inputs["Normal"])
    quad.data.materials.clear()
    quad.data.materials.append(g)
    return True

game_floor = build_game_floor()
FLOOR_BAKED = False
if BAKE_GAME_TEXTURES:
    FLOOR_BAKED = bake_game_floor(game_floor, bpy.data.objects["WW_Parquet_Herringbone"], GAME_FLOOR_TEX)

# ---- 10b. collision proxies (invisible to Cycles, exported with extras so the game can build physics bodies) --------------
def build_colliders():
    def coll(name):
        return Builder(name, COL["Collision"])
    walls, floor_, glass, balc = coll("WW_COL_Walls"), coll("WW_COL_Floor"), coll("WW_COL_Glass"), coll("WW_COL_Balcony")
    floor_.box_min((ROOM_X0, ROOM_Y0, -0.3), (ROOM_X1, ROOM_Y1, 0.0), None)
    zt = H
    # left wall: solid segments between the three doorways (doorways stay open)
    segs = []
    prev_ = YA
    for a_, b_ in DOORS:
        segs.append((prev_, a_)); prev_ = b_
    segs.append((prev_, YB))
    for y0_, y1_ in segs:
        if y1_ - y0_ > 0.001:
            walls.box_min((WX - WALL_T, y0_, -0.3), (WX, y1_, zt), None)
    walls.box_min((WX - WALL_T, YA, -0.3), (ROOM_X1 + WALL_T, ROOM_Y0, zt), None)                 # front wall
    walls.box_min((ROOM_X1, ROOM_Y0, -0.3), (ROOM_X1 + WALL_T, 3.0, zt), None)                    # right plaster wall
    # adjoining rooms: floors (flush with the main floor) and walls
    for (ya_, yb_) in CELL_BOUNDS:
        floor_.box_min((cx_out, ya_, -0.3), (cx_in, yb_, 0.0), None)
        walls.box_min((cx_out - 0.12, ya_, 0.0), (cx_out, yb_, CH), None)
        walls.box_min((cx_out, ya_ - 0.12, 0.0), (cx_in, ya_, CH), None)
        walls.box_min((cx_out, yb_, 0.0), (cx_in, yb_ + 0.12, CH), None)
    glass.box_min((ROOM_X0, ROOM_Y1 - 0.03, -0.3), (ROOM_X1, ROOM_Y1 + 0.09, zt), None)
    glass.box_min((ROOM_X1 - 0.03, 3.0, -0.3), (ROOM_X1 + 0.09, ROOM_Y1, zt), None)
    balc.box_min((ROOM_X0, ROOM_Y1 + 0.075, BZ - 0.35), (BX1, BY1, BZ), None)
    balc.box_min((ROOM_X1 + 0.075, 3.0, BZ - 0.35), (BX1, ROOM_Y1 + 0.075, BZ), None)
    balc.box_min((ROOM_X0, BY1 - 0.1, BZ), (BX1, BY1, BZ + 1.1), None)
    balc.box_min((BX1 - 0.1, 3.0, BZ), (BX1, BY1, BZ + 1.1), None)
    balc.box_min((ROOM_X0, ROOM_Y1 + 0.3, BZ), (ROOM_X0 + 0.1, BY1, BZ + 1.1), None)
    balc.box_min((PX - 0.3, PY - 0.3, BZ), (PX + 0.3, PY + 0.3, BZ + 0.6), None)                  # planter
    objs_ = []
    for b_, kind in ((walls, "walls"), (floor_, "floor"), (glass, "glass"), (balc, "balcony")):
        o_ = b_.finish()
        o_.display_type = 'WIRE'
        o_.hide_render = True
        o_["ww_collider"] = True
        o_["ww_collider_kind"] = kind
        objs_.append(o_)
    return objs_
colliders = build_colliders()

# ---- 10c. material swap (presentation <-> game twins) and GLB export ------------------------------------------------------
def export_objects():
    return [o for o in COL_EXPORT.all_objects if o.type in ('MESH', 'EMPTY')]

_SWAP = {}
def swap_materials(to_game):
    for o in export_objects():
        if o.type != 'MESH':
            continue
        for i, slot in enumerate(o.material_slots):
            m = slot.material
            if m is None:
                continue
            if to_game and "ww_game" in m:
                _SWAP[(o.name, i)] = m
                slot.material = bpy.data.materials[m["ww_game"]]
            elif not to_game and (o.name, i) in _SWAP:
                slot.material = _SWAP.pop((o.name, i))

def export_game_glb(path=None):
    path = path or os.path.join(_out_dir(), "wellness_world_penthouse_v8.glb")
    try:                                   # the glTF exporter is bundled with Blender; make sure it is enabled (it is by default in the UI)
        import addon_utils
        addon_utils.enable("io_scene_gltf2", default_set=False, persistent=False)
    except Exception:
        pass
    swap_materials(True)
    view_layer.update()
    try:
        for o_ in view_layer.objects:
            o_.select_set(False)
        for o_ in export_objects():
            o_.hide_set(False)
            o_.select_set(True)
        base = dict(filepath=path, export_format='GLB', use_selection=True, export_apply=True, export_extras=True,
                    export_cameras=False, export_lights=False, export_yup=True)
        try:
            bpy.ops.export_scene.gltf(**base, export_image_format='JPEG', export_jpeg_quality=88)
        except (TypeError, RuntimeError):          # older/newer exporter versions may not know the image options
            bpy.ops.export_scene.gltf(**base)
    finally:
        swap_materials(False)
    return path

# ---- 10d. optional skyline panorama (360 x 180 equirectangular, interior hidden) for the game backdrop / reflections ------
def render_skyline_dome(path=None, width=None):
    width = width or DOME_W
    path = path or os.path.join(_out_dir(), "wellness_world_skyline_dome.jpg")
    sc = bpy.context.scene
    cd = bpy.data.cameras.new("WW_DomeCam")
    cd.type = 'PANO'
    try:
        cd.panorama_type = 'EQUIRECTANGULAR'
    except Exception:
        cd.cycles.panorama_type = 'EQUIRECTANGULAR'
    co = bpy.data.objects.new("WW_DomeCam", cd)
    co.location = (0.0, 6.0, 1.7)
    co.rotation_euler = (math.radians(90), 0, math.radians(-90))     # looks along +X so the image centre matches three.js' equirect centre
    sc.collection.objects.link(co)
    saved = (sc.camera, sc.render.resolution_x, sc.render.resolution_y, sc.render.filepath, sc.render.image_settings.file_format)
    COL_EXPORT.hide_render = True
    COL["Floor_Pres"].hide_render = True          # the Cycles-only parquet must not appear in the panorama either
    sc.camera = co
    sc.render.resolution_x, sc.render.resolution_y = width, width // 2
    sc.render.filepath = path
    sc.render.image_settings.file_format = 'JPEG'
    try:
        bpy.ops.render.render(write_still=True)
    finally:
        COL_EXPORT.hide_render = False
        COL["Floor_Pres"].hide_render = False
        sc.camera, sc.render.resolution_x, sc.render.resolution_y, sc.render.filepath, sc.render.image_settings.file_format = saved
        bpy.data.objects.remove(co, do_unlink=True)
    return path

# =====================================================================================================
# 11. VALIDATION  (printed to the console AND written to a Text block named "WW_V8_Validation")
# =====================================================================================================
def validate():
    rows = []
    def chk(name, ok, detail=""):
        rows.append(("PASS" if ok else "FAIL", name, detail))
    bpy.context.view_layer.update()
    for cn in ["WW_Export", "WW_Presentation", "WW_Architecture", "WW_Floor", "WW_Ceiling", "WW_Glazing", "WW_Balcony", "WW_Decor",
               "WW_Collision", "WW_Markers", "WW_Exterior_Skyline", "WW_River", "WW_Lighting", "WW_Cameras"]:
        chk("collection " + cn, cn in bpy.data.collections)
    for cam_n in ("CAM1_ReferenceMatch", "CAM2_ArchitecturalOverview", "CAM3_Gameplay_ThirdPerson", "CAM4_InteriorDetail"):
        chk("camera " + cam_n, cam_n in bpy.data.objects and bpy.data.objects[cam_n].type == 'CAMERA')
    chk("active camera is CAM1", scene.camera is not None and scene.camera.name == "CAM1_ReferenceMatch")
    c1 = scene.camera.location
    chk("CAM1 inside the room", ROOM_X0 < c1.x < ROOM_X1 and ROOM_Y0 < c1.y < ROOM_Y1 and 0.2 < c1.z < H)
    # materials + mesh validity
    bad_mat, bad_mesh = [], []
    for o in scene.objects:
        if o.type == 'MESH' and not o.get("ww_collider"):
            if not any(s.material for s in o.material_slots):
                bad_mat.append(o.name)
            if o.data.validate(verbose=False):
                bad_mesh.append(o.name)
            if len(o.data.polygons) == 0:
                bad_mesh.append(o.name + "(empty)")
    chk("every visible mesh has a material", not bad_mat, ", ".join(bad_mat))
    chk("mesh data valid (no degenerate geometry)", not bad_mesh, ", ".join(bad_mesh))
    miss_game = sorted({s.material.name for o in export_objects() if o.type == 'MESH' for s in o.material_slots
                        if s.material and "ww_game" not in s.material and not s.material.name.endswith("_GAME")})
    chk("every exported material has a *_GAME twin", not miss_game, ", ".join(miss_game))
    # winding
    inv = []
    for nm_ in ("WW_Walls", "WW_Trim_Mouldings", "WW_Ceiling", "WW_Adjoining_Rooms", "WW_Window_Frames", "WW_Balcony"):
        bm_ = bmesh.new(); bm_.from_mesh(bpy.data.objects[nm_].data)
        if bm_.calc_volume(signed=True) <= 0:
            inv.append(nm_)
        bm_.free()
    chk("face winding outward (positive signed volume)", not inv, ", ".join(inv))
    # elevations
    pz = [v.co.z for v in bpy.data.objects["WW_Parquet_Herringbone"].data.vertices]
    chk("parquet lies at z = 0", abs(min(pz)) < 1e-6 and abs(max(pz)) < 1e-6)
    chk("balcony deck 0.35 m below the floor", abs(BZ + 0.35) < 1e-6 and BZ < 0)
    # render visibility
    hid = [o.name for o in scene.objects if o.hide_render and not o.name.startswith("WW_COL_") and o.name != "WW_GEO_Floor"]
    chk("nothing unintentionally hidden from rendering", not hid, ", ".join(hid))
    # doorways: a ray through each opening must travel into the adjoining room (> 1.5 m) without being blocked
    dg = bpy.context.evaluated_depsgraph_get()
    blocked = []
    for k, (a_, b_) in enumerate(DOORS):
        for z_ in (0.3, 1.2, 2.4, 3.1):
            for off in (-0.25, 0.0, 0.25):
                y_ = (a_ + b_) / 2 + off
                hit, loc, nrm, idx, ob, mat_ = scene.ray_cast(dg, Vector((ROOM_X0 + 0.4, y_, z_)), Vector((-1, 0, 0)))
                if hit and (ROOM_X0 + 0.4 - loc.x) < 1.5:
                    blocked.append(f"door{k + 1}@z{z_}:{ob.name}")
    chk("doorways unobstructed", not blocked, ", ".join(blocked))
    # spawn points
    pl, ct = bpy.data.objects["SPAWN_Player"].location, bpy.data.objects["SPAWN_Cat"].location
    inroom = lambda p: ROOM_X0 + 1.0 < p.x < ROOM_X1 - 1.0 and ROOM_Y0 + 1.0 < p.y < ROOM_Y1 - 1.0
    chk("player and cat spawn inside the room, clear of walls", inroom(pl) and inroom(ct))
    # statistics
    meshes = [o for o in scene.objects if o.type == 'MESH']
    tri = lambda objs: sum(sum(len(p.vertices) - 2 for p in o.data.polygons) for o in objs)
    ex_vis = [o for o in COL_EXPORT.all_objects if o.type == 'MESH' and not o.get("ww_collider")]
    ex_col = [o for o in COL_EXPORT.all_objects if o.type == 'MESH' and o.get("ww_collider")]
    draw_calls = sum(len({s.material.name for s in o.material_slots if s.material}) or 1 for o in ex_vis)
    blended = sorted({m["ww_game"] for o in ex_vis for s in o.material_slots if (m := s.material) and "ww_game" in m
                      and getattr(bpy.data.materials[m["ww_game"]], "surface_render_method", "DITHERED") == 'BLENDED'})
    tex_mb = sum(i.size[0] * i.size[1] * 4 * 1.33 for i in bpy.data.images if i.name.startswith("WW_Floor_") and i.has_data) / 1048576.0
    stats = [
        f"Cycles scene : {len(scene.objects)} objects, {len(meshes)} meshes, {tri(meshes)} tris, {len([m for m in bpy.data.materials if m.users])} materials, {len([o for o in scene.objects if o.type == 'LIGHT'])} lights",
        f"WW_Export    : {len(ex_vis)} visual meshes ({tri(ex_vis)} tris, excludes the Cycles-only 1738-board parquet) + {len(ex_col)} collider meshes ({tri(ex_col)} tris)",
        f"Game draw calls (object x material, before merging/instancing): ~{draw_calls}",
        f"Transparent (alpha-blended) game materials: {len(blended)} -> {', '.join(blended) if blended else 'none'}",
        f"Baked floor textures: {'yes' if FLOOR_BAKED else 'NO (flat colour fallback)'}; approx GPU texture memory {tex_mb:.0f} MB uncompressed",
        f"Colour management: AgX, look = {LOOK_STATUS}; device = {GPU_STATUS}; Blender {bpy.app.version_string}",
    ]
    fails = [r_ for r_ in rows if r_[0] == "FAIL"]
    lines = ["WELLNESS WORLD - PENTHOUSE V8 VALIDATION", "=" * 60] + [f"[{s_}] {n_}" + (f"  -> {d_}" if d_ and s_ == "FAIL" else "") for s_, n_, d_ in rows] \
            + ["-" * 60] + stats + ["-" * 60, f"{len(rows) - len(fails)}/{len(rows)} checks passed"]
    if bpy.app.version < (5, 2, 3):
        lines.append(f"NOTE: running on Blender {bpy.app.version_string}; this script has only been tested on bpy 5.3.0 (headless, CPU), never on 5.2.3.")
    txt = bpy.data.texts.get("WW_V8_Validation") or bpy.data.texts.new("WW_V8_Validation")
    txt.clear(); txt.write("\n".join(lines))
    print("\n".join(lines))
    return len(fails) == 0

VALID = validate()
GLB_PATH = DOME_PATH = None
if EXPORT_GLB:
    try:
        GLB_PATH = export_game_glb()
        print("GLB written:", GLB_PATH, f"({os.path.getsize(GLB_PATH) / 1048576.0:.1f} MB)")
    except Exception as ex_:
        print("GLB export failed:", ex_)
if RENDER_SKYLINE_DOME:
    try:
        DOME_PATH = render_skyline_dome()
        print("Skyline dome written:", DOME_PATH)
    except Exception as ex_:
        print("Skyline dome failed:", ex_)

print("Wellness World - Penthouse V8 built: %d parquet boards, %d objects in the scene." % (n_boards, len(scene.objects)))
print("Press F12 to render CAM1_ReferenceMatch. Other cameras: CAM2_ArchitecturalOverview, CAM3_Gameplay_ThirdPerson, CAM4_InteriorDetail.")
