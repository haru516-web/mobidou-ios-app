"""Build the lavish 願い観音もび寺 world (used at 一番星もび宮) as an editable .blend and a mobile GLB.

Run (after scripts/kannon-textures.py):  blender -b -P scripts/build-kannon-temple.py

Everything is modelled in glTF space (Y up, the approach runs toward -Z) and rotated into Blender
space once at the end, so the numbers here are the numbers the app sees: the camera walks
z 15.6 -> 6 -> -2.5, so the gate sits at z=1.5 and the hall at z=-11.5.
Geometry is merged per material (one draw call each). Surfaces use PBR textures from
assets/prayer-first-person/kannon-textures (generated, or the CC0 Poly Haven sources already in the repo).
Signboard lettering uses Yuji Syuku (SIL OFL), the font the app already ships.
"""
import bpy, bmesh, math, os, random
from mathutils import Matrix, Vector

ROOT = r'D:\mobby\mobidou\.worktrees\prayer-first-person\assets\prayer-first-person'
TEX = os.path.join(ROOT, 'kannon-textures')
FONT = r'D:\mobby\mobidou\.worktrees\prayer-first-person\node_modules\@expo-google-fonts\yuji-syuku\400Regular\YujiSyuku_400Regular.ttf'
G = 0.1   # ground top
GZ = 1.5  # gate centre
random.seed(11)

# Walkable-area data for the free-roam prayer: circles (x, z, r) and rects (x0, z0, x1, z1), written to src/data/kannonColliders.ts
CIRCLES, RECTS = [], []
def blk_c(x, z, r):
    CIRCLES.append((round(x, 3), round(z, 3), round(r, 3)))
def blk_r(x0, z0, x1, z1):
    RECTS.append((round(min(x0, x1), 3), round(min(z0, z1), 3), round(max(x0, x1), 3), round(max(z0, z1), 3)))

bpy.ops.wm.read_factory_settings(use_empty=True)

# ------------------------------------------------------------------ materials
def _lin(h):
    h = h.lstrip('#')
    f = lambda c: (c / 12.92) if c <= .04045 else ((c + .055) / 1.055) ** 2.4
    return (*(f(int(h[i:i + 2], 16) / 255) for i in (0, 2, 4)), 1)

def _img(name, color=True):
    for ext in ('.jpg', '.png'):
        path = os.path.join(TEX, name + ext)
        if os.path.exists(path):
            im = bpy.data.images.load(path, check_existing=True)
            im.colorspace_settings.name = 'sRGB' if color else 'Non-Color'
            return im
    raise FileNotFoundError(name)

def _has(name):
    return any(os.path.exists(os.path.join(TEX, name + e)) for e in ('.jpg', '.png'))

def pbr(name, tex=None, color='#808080', metallic=0.0, rough=0.6, normal=1.0, emit=0.0, emit_tex=False,
        emit_color=None, alpha=False, double=False, has_rough=True, has_normal=True):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes['Principled BSDF']
    b.inputs['Metallic'].default_value = metallic
    b.inputs['Roughness'].default_value = rough
    x = -600
    if tex:
        t = nt.nodes.new('ShaderNodeTexImage')
        t.image = _img(tex + '_color' if _has(tex + '_color') else tex)
        t.location = (x, 300)
        nt.links.new(t.outputs['Color'], b.inputs['Base Color'])
        if alpha:
            nt.links.new(t.outputs['Alpha'], b.inputs['Alpha'])
        if emit and emit_tex:
            nt.links.new(t.outputs['Color'], b.inputs['Emission Color'])
        if has_rough and _has(tex + '_rough'):
            r = nt.nodes.new('ShaderNodeTexImage'); r.image = _img(tex + '_rough', False); r.location = (x, 0)
            sep = nt.nodes.new('ShaderNodeSeparateColor'); sep.location = (x + 280, 0)
            nt.links.new(r.outputs['Color'], sep.inputs['Color'])
            nt.links.new(sep.outputs['Green'], b.inputs['Roughness'])
        if has_normal and _has(tex + '_normal'):
            n = nt.nodes.new('ShaderNodeTexImage'); n.image = _img(tex + '_normal', False); n.location = (x, -300)
            nm = nt.nodes.new('ShaderNodeNormalMap'); nm.location = (x + 280, -300)
            nm.inputs['Strength'].default_value = normal
            nt.links.new(n.outputs['Color'], nm.inputs['Color'])
            nt.links.new(nm.outputs['Normal'], b.inputs['Normal'])
    else:
        b.inputs['Base Color'].default_value = _lin(color)
    if emit and not emit_tex:
        b.inputs['Emission Color'].default_value = _lin(emit_color or color)
    b.inputs['Emission Strength'].default_value = emit
    if alpha:
        m.surface_render_method = 'BLENDED'
    m.use_backface_culling = not (double or alpha)
    return m

MATS = {
    'lacquer': pbr('Vermilion lacquer', 'lacquer', normal=.6),
    'gold': pbr('Gold leaf', 'gold', metallic=1.0, normal=.7, emit=.10, emit_tex=True),
    'gold_soft': pbr('Kannon gold', 'gold', metallic=1.0, normal=.35, emit=.55, emit_tex=True),
    'tile': pbr('Roof tile', 'roof', normal=1.4, double=True),
    'wood': pbr('Dark wood', 'wood', rough=.55, has_rough=False, has_normal=False),
    'floor': pbr('Polished floor', 'floor', normal=.5),
    'plaster': pbr('White plaster', 'plaster', normal=.5),
    'stone': pbr('Stone', 'stone', normal=1.0),
    'ground': pbr('Dusk ground', 'ground', normal=1.0),
    'curtain': pbr('Hall curtain', 'fabric', normal=.8, double=True),
    'trunk': pbr('Tree bark', 'bark', rough=.9, normal=1.0, has_rough=False),
    'mountain': pbr('Far mountain', color='#5b4a73', rough=1.0),
    'water': pbr('Pond water', color='#16384f', metallic=.35, rough=.04, emit=.15, emit_color='#3b86ad'),
    'pad': pbr('Lotus pad', color='#3b7243', rough=.7, double=True),
    'lotus': pbr('Lotus bloom', color='#f6b2cb', rough=.55, emit=.35, emit_color='#ff9fc2'),
    'navy': pbr('Plaque navy', color='#101c44', metallic=.1, rough=.32),
    'rope': pbr('Bell rope', color='#efe6d2', rough=.9),
    'lantern': pbr('Paper lantern', 'lantern', emit=2.6, emit_tex=True, rough=.7, has_normal=False, has_rough=False),
    'shoji': pbr('Shoji glow', 'shoji', emit=2.4, emit_tex=True, rough=.8, has_normal=False, has_rough=False),
    'glow': pbr('Flame glow', color='#ff8a3a', emit=5.0, rough=.5),
    'halo': pbr('Halo light', color='#fff0c4', rough=.5, emit=1.6, alpha=True, emit_color='#ffe7a0'),
    'leaf_sakura': pbr('Foliage sakura', 'leaf_sakura', rough=.8, alpha=True, has_rough=False, has_normal=False, emit=.15, emit_tex=True),
    'leaf_maple': pbr('Foliage maple', 'leaf_maple', rough=.8, alpha=True, has_rough=False, has_normal=False, emit=.15, emit_tex=True),
    'leaf_ginkgo': pbr('Foliage ginkgo', 'leaf_ginkgo', rough=.8, alpha=True, has_rough=False, has_normal=False, emit=.15, emit_tex=True),
    'petal': pbr('Fallen petal', color='#f8c5d6', rough=.9, emit=.25, emit_color='#f8c5d6', double=True),
}
MATS['halo'].node_tree.nodes['Principled BSDF'].inputs['Alpha'].default_value = .2

UVSIZE = {'lacquer': 2.0, 'gold': 1.2, 'gold_soft': 1.2, 'wood': 1.6, 'floor': 2.6, 'plaster': 3.2, 'stone': 2.2,
          'ground': 6.0, 'curtain': 1.2, 'trunk': 1.3, 'tile': 2.4}

class Builder:
    def __init__(self):
        self.bm = {k: bmesh.new() for k in MATS}

    @staticmethod
    def _faces(verts):
        return {f for v in verts for f in v.link_faces}

    def _xf(self, bm, verts, c, rot=None, ry=0.0, scale=(1, 1, 1)):
        m = Matrix.Translation(Vector(c))
        if rot is not None:
            m = m @ rot.to_4x4()
        if ry:
            m = m @ Matrix.Rotation(ry, 4, 'Y')
        m = m @ Matrix.Diagonal((*scale, 1))
        bmesh.ops.transform(bm, matrix=m, verts=verts)

    # -- UV helpers ------------------------------------------------------
    def _box_uv(self, mat, faces):
        bm = self.bm[mat]
        uv = bm.loops.layers.uv.verify()
        size = UVSIZE.get(mat, 2.0)
        for f in faces:
            f.normal_update()
            n = f.normal
            ax = max(range(3), key=lambda i: abs(n[i]))
            for l in f.loops:
                p = l.vert.co
                if ax == 0:
                    l[uv].uv = (p.z / size, p.y / size)
                elif ax == 1:
                    l[uv].uv = (p.x / size, p.z / size)
                else:
                    l[uv].uv = (p.x / size, p.y / size)

    def _cyl_uv(self, mat, faces, c, axis):
        bm = self.bm[mat]
        uv = bm.loops.layers.uv.verify()
        size = UVSIZE.get(mat, 2.0)
        for f in faces:
            f.normal_update()
            n = f.normal
            along = n[1] if axis == 'y' else n[2]
            if abs(along) > .9:      # caps
                self._box_uv(mat, [f])
                continue
            angs, rads = [], []
            for l in f.loops:
                p = l.vert.co
                if axis == 'y':
                    a, r, h = math.atan2(p.z - c[2], p.x - c[0]), math.hypot(p.x - c[0], p.z - c[2]), p.y
                else:
                    a, r, h = math.atan2(p.y - c[1], p.x - c[0]), math.hypot(p.x - c[0], p.y - c[1]), p.z
                angs.append(a); rads.append((r, h))
            a0 = angs[0]
            for l, a, (r, h) in zip(f.loops, angs, rads):
                d = (a - a0 + math.pi) % (2 * math.pi) - math.pi
                l[uv].uv = ((a0 + d) * max(r, .05) / size, h / size)

    # -- primitives ------------------------------------------------------
    def box(self, mat, c, s, ry=0.0, rot=None):
        bm = self.bm[mat]
        r = bmesh.ops.create_cube(bm, size=1.0)
        self._xf(bm, r['verts'], c, rot, ry, s)
        self._box_uv(mat, self._faces(r['verts']))

    def cyl(self, mat, c, r, h, seg=20, r2=None, axis='y', smooth=True, cylfull=False):
        bm = self.bm[mat]
        res = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg,
                                    radius1=r, radius2=r if r2 is None else r2, depth=h)
        verts = res['verts']
        if axis == 'y':
            bmesh.ops.transform(bm, matrix=Matrix.Rotation(-math.pi / 2, 4, 'X'), verts=verts)
        self._xf(bm, verts, c)
        faces = self._faces(verts)
        for f in faces:
            f.smooth = smooth
        if cylfull:
            uv = bm.loops.layers.uv.verify()
            y0, y1 = c[1] - h / 2, c[1] + h / 2
            for f in faces:
                f.normal_update()
                if abs(f.normal[1]) > .9:
                    for l in f.loops:
                        l[uv].uv = (.5 + (l.vert.co.x - c[0]) / (2 * r), .5 + (l.vert.co.z - c[2]) / (2 * r))
                    continue
                angs = [math.atan2(l.vert.co.z - c[2], l.vert.co.x - c[0]) for l in f.loops]
                a0 = angs[0]
                for l, a in zip(f.loops, angs):
                    d = (a - a0 + math.pi) % (2 * math.pi) - math.pi
                    l[uv].uv = ((a0 + d) / (2 * math.pi), (l.vert.co.y - y0) / (y1 - y0))
        else:
            self._cyl_uv(mat, faces, c, axis)

    def beam(self, mat, a, b2, r, r2=None, seg=10):
        """Tapered cylinder from point a to point b2 (branches and arms)."""
        a, b2 = Vector(a), Vector(b2)
        d = b2 - a
        L = d.length
        bm = self.bm[mat]
        res = bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r if r2 is None else r2, depth=L)
        verts = res['verts']
        bmesh.ops.transform(bm, matrix=Matrix.Rotation(-math.pi / 2, 4, 'X'), verts=verts)
        q = Vector((0, 1, 0)).rotation_difference(d.normalized())
        bmesh.ops.transform(bm, matrix=Matrix.Translation((a + b2) / 2) @ q.to_matrix().to_4x4(), verts=verts)
        faces = self._faces(verts)
        for f in faces:
            f.smooth = True
        self._box_uv(mat, faces)

    def sphere(self, mat, c, r, scale=(1, 1, 1), seg=14):
        bm = self.bm[mat]
        res = bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(6, seg // 2), radius=r)
        self._xf(bm, res['verts'], c, scale=scale)
        faces = self._faces(res['verts'])
        for f in faces:
            f.smooth = True
        self._box_uv(mat, faces)

    def torus(self, mat, c, R, r, seg=44, tube=7):
        bm = self.bm[mat]
        rings = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            ring = []
            for j in range(tube):
                b = 2 * math.pi * j / tube
                rad = R + r * math.cos(b)
                ring.append(bm.verts.new((c[0] + rad * math.cos(a), c[1] + rad * math.sin(a), c[2] + r * math.sin(b))))
            rings.append(ring)
        faces = []
        for i in range(seg):
            for j in range(tube):
                a, b = rings[i], rings[(i + 1) % seg]
                f = bm.faces.new((a[j], b[j], b[(j + 1) % tube], a[(j + 1) % tube]))
                f.smooth = True
                faces.append(f)
        self._box_uv(mat, faces)

    def plane(self, mat, c, w, h, ry=0.0):
        """Upright quad facing +Z (rotated by ry about Y), UV 0..1."""
        bm = self.bm[mat]
        vs = [bm.verts.new(p) for p in ((-.5, -.5, 0), (.5, -.5, 0), (.5, .5, 0), (-.5, .5, 0))]
        self._xf(bm, vs, c, ry=ry, scale=(w, h, 1))
        f = bm.faces.new(vs)
        uv = bm.loops.layers.uv.verify()
        for l, uvp in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
            l[uv].uv = uvp

    def card(self, mat, c, w, h, rot):
        bm = self.bm[mat]
        vs = [bm.verts.new(Vector(p)) for p in ((-w / 2, -h / 2, 0), (w / 2, -h / 2, 0), (w / 2, h / 2, 0), (-w / 2, h / 2, 0))]
        bmesh.ops.transform(bm, matrix=Matrix.Translation(Vector(c)) @ rot.to_4x4(), verts=vs)
        f = bm.faces.new(vs)
        uv = bm.loops.layers.uv.verify()
        for l, uvp in zip(f.loops, ((0, 0), (1, 0), (1, 1), (0, 1))):
            l[uv].uv = uvp

    def roof(self, c, w, d, h, rx, rz, lift, thick=0.18, finials=True, rafters=True):
        """Hip roof: concave kawara slope, up-turned corners, gold eave trim, dark soffit and rafter ends."""
        bm = self.bm['tile']
        uvl = bm.loops.layers.uv.verify()
        N = 30
        top, bot = [], []
        tdat = {}
        for i in range(N + 1):
            rowt, rowb = [], []
            for j in range(N + 1):
                x = -w / 2 + w * i / N
                z = -d / 2 + d * j / N
                ax, az = abs(x), abs(z)
                tx = 0 if ax <= rx else (ax - rx) / (w / 2 - rx)
                tz = 0 if az <= rz else (az - rz) / (d / 2 - rz)
                t = max(tx, tz)
                y = h * (1 - t) ** 1.7 + lift * (tx * tz) ** 2 + lift * .25 * t ** 6
                rowt.append(bm.verts.new((c[0] + x, c[1] + y, c[2] + z)))
                rowb.append(bm.verts.new((c[0] + x * .985, c[1] + y - thick, c[2] + z * .985)))
                tdat[(i, j)] = (x, z, tx, tz)
            top.append(rowt)
            bot.append(rowb)
        S = UVSIZE['tile']
        for i in range(N):
            for j in range(N):
                f = bm.faces.new((top[i][j], top[i][j + 1], top[i + 1][j + 1], top[i + 1][j]))
                x, z, tx, tz = tdat[(i, j)]
                x2, z2, tx2, tz2 = tdat[(i + 1, j + 1)]
                cxm, czm = (x + x2) / 2, (z + z2) / 2
                if max(tz, tz2) >= max(tx, tx2):      # front / back slope: tiles run along x, rows down the slope in z
                    sgn = 1 if czm >= 0 else -1
                    for l in f.loops:
                        p = l.vert.co
                        l[uvl].uv = ((p.x - c[0]) / S, sgn * (p.z - c[2]) / S * 1.12)
                else:                                  # side slope
                    sgn = 1 if cxm >= 0 else -1
                    for l in f.loops:
                        p = l.vert.co
                        l[uvl].uv = ((p.z - c[2]) / S, sgn * (p.x - c[0]) / S * 1.12)
        # soffit (underside) in dark wood
        wb = self.bm['wood']
        uvw = wb.loops.layers.uv.verify()
        bv = {}
        def wv(i, j):
            if (i, j) not in bv:
                bv[(i, j)] = wb.verts.new(bot[i][j].co.copy())
            return bv[(i, j)]
        for i in range(0, N, 2):
            for j in range(0, N, 2):
                i2, j2 = min(i + 2, N), min(j + 2, N)
                f = wb.faces.new((wv(i, j), wv(i2, j), wv(i2, j2), wv(i, j2)))
                for l in f.loops:
                    l[uvw].uv = (l.vert.co.x / 1.6, l.vert.co.z / 1.6)
        # gold eave trim following the curve
        gb = self.bm['gold']
        uvg = gb.loops.layers.uv.verify()
        edge = [(i, 0) for i in range(N + 1)] + [(N, j) for j in range(1, N + 1)] + [(i, N) for i in range(N - 1, -1, -1)] + [(0, j) for j in range(N - 1, 0, -1)]
        for k in range(len(edge)):
            a, b2 = edge[k], edge[(k + 1) % len(edge)]
            pa, pb = top[a[0]][a[1]].co, top[b2[0]][b2[1]].co
            vs = [gb.verts.new((pa.x, pa.y + .02, pa.z)), gb.verts.new((pb.x, pb.y + .02, pb.z)),
                  gb.verts.new((pb.x, pb.y - thick - .12, pb.z)), gb.verts.new((pa.x, pa.y - thick - .12, pa.z))]
            f = gb.faces.new(vs)
            for l in f.loops:
                l[uvg].uv = ((l.vert.co.x + l.vert.co.z) / 1.2, l.vert.co.y / 1.2)
        # rafter ends under the front / back eaves
        if rafters:
            for sx in (0, N):
                for i in range(2, N - 1, 2):
                    pa = top[i][sx].co
                    inward = .38 if sx == 0 else -.38
                    self.box('wood', (pa.x, pa.y - thick - .12, pa.z + inward), (.12, .13, .75))
                    self.box('gold', (pa.x, pa.y - thick - .12, pa.z), (.14, .15, .05))
        if rz == 0 and finials:
            ridge = max(rx, 0.3)
            self.box('gold', (c[0], c[1] + h + .08, c[2]), (ridge * 2 + .6, .2, .34))
            for s in (-1, 1):
                self.cyl('gold', (c[0] + s * (ridge + .35), c[1] + h + .45, c[2]), .17, .75, 8, r2=.02)
                self.sphere('gold', (c[0] + s * (ridge + .35), c[1] + h + .85, c[2]), .1, seg=8)

    def finish(self):
        c4 = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))  # glTF Y-up -> Blender Z-up
        for name, bm in self.bm.items():
            if not bm.verts:
                bm.free(); continue
            bmesh.ops.transform(bm, matrix=c4, verts=bm.verts)
            mesh = bpy.data.meshes.new(name + ' mesh')
            bm.to_mesh(mesh); bm.free()
            obj = bpy.data.objects.new('Temple ' + name, mesh)
            mesh.materials.append(MATS[name])
            bpy.context.scene.collection.objects.link(obj)

b = Builder()

# ------------------------------------------------------------------ signboard lettering (3D gold text)
font = bpy.data.fonts.load(FONT)

def lettering(body, size, pos, back=False, spacing=1.0):
    curve = bpy.data.curves.new('Text ' + body, 'FONT')
    curve.body = body
    curve.font = font
    curve.size = size
    curve.align_x = 'CENTER'
    curve.align_y = 'CENTER'
    curve.extrude = .035
    curve.bevel_depth = 0.0
    curve.resolution_u = 3
    curve.render_resolution_u = 3
    curve.space_line = spacing
    holder = bpy.data.objects.new('t', curve)
    bpy.context.scene.collection.objects.link(holder)
    dg = bpy.context.evaluated_depsgraph_get()
    mesh = bpy.data.meshes.new_from_object(holder.evaluated_get(dg))
    mesh.materials.append(MATS['gold'])
    obj = bpy.data.objects.new('Lettering ' + body.replace('\n', ''), mesh)
    m = Matrix.Translation((pos[0], -pos[2], pos[1])) @ Matrix.Rotation(math.pi / 2, 4, 'X')
    if back:
        m = m @ Matrix.Rotation(math.pi, 4, 'Y')
    obj.matrix_world = m
    bpy.context.scene.collection.objects.link(obj)
    bpy.data.objects.remove(holder)
    bpy.data.curves.remove(curve)

# ------------------------------------------------------------------ ground, path, ponds
b.box('ground', (0, G / 2 - .1, 0), (260, G + .2, 260))
b.box('stone', (0, G + .03, 6.75), (4.6, .06, 22.5))                        # approach path
b.box('stone', (0, G + .03, -2.4), (24, .06, 6.2))                          # forecourt between gate and hall
b.box('stone', (0, G + .03, GZ), (6.0, .06, 6.0))                           # paving under the gate
for s in (-1, 1):
    b.box('stone', (s * 2.45, G + .09, 6.75), (.3, .18, 22.5))             # path curbs

for s in (-1, 1):
    px = s * 7.6
    blk_r(px - 4.4, 5.6, px + 4.4, 16.4)
    b.box('stone', (px, G + .12, 11), (8.8, .34, 10.8))
    b.box('water', (px, G + .31, 11), (8.3, .05, 10.3))
    for _ in range(18):
        x, z = px + random.uniform(-3.7, 3.7), 11 + random.uniform(-4.4, 4.4)
        b.cyl('pad', (x, G + .35, z), random.uniform(.28, .5), .02, 12)
    for _ in range(12):
        x, z = px + random.uniform(-3.6, 3.6), 11 + random.uniform(-4.3, 4.3)
        for ring, (rad, tilt, cnt) in enumerate(((.17, .55, 8), (.1, .15, 6))):
            for p in range(cnt):
                a = p * 2 * math.pi / cnt + ring * .3
                rot = Matrix.Rotation(-a, 3, 'Y') @ Matrix.Rotation(tilt, 3, 'X')
                b.box('lotus', (x + math.cos(a) * rad * .5, G + .5 + ring * .08, z + math.sin(a) * rad * .5), (.1, .24, .035), rot=rot)
        b.sphere('gold', (x, G + .44, z), .05, seg=6)

# ------------------------------------------------------------------ stone lanterns & paper-lantern lines
def stone_lantern(x, z):
    blk_c(x, z, .5)
    b.cyl('stone', (x, G + .1, z), .38, .2, 8)
    b.cyl('stone', (x, G + .22, z), .3, .08, 8)
    b.cyl('stone', (x, G + .72, z), .12, .92, 8)
    b.cyl('stone', (x, G + 1.22, z), .36, .12, 8, r2=.42)
    b.cyl('stone', (x, G + 1.28, z), .42, .06, 8)
    b.cyl('glow', (x, G + 1.52, z), .22, .42, 6)
    for k in range(4):
        a = k * math.pi / 2 + math.pi / 4
        b.box('stone', (x + math.cos(a) * .27, G + 1.52, z + math.sin(a) * .27), (.07, .46, .07))
    b.cyl('stone', (x, G + 1.94, z), .66, .32, 8, r2=.07)
    b.sphere('stone', (x, G + 2.16, z), .1, seg=8)

def paper_lantern(x, y, z, r=.3, h=.78):
    b.cyl('gold', (x, y + h / 2 + .03, z), r * .55, .06, 12)
    b.cyl('lantern', (x, y, z), r, h, 20, cylfull=True)
    b.cyl('gold', (x, y - h / 2 - .03, z), r * .5, .06, 12)
    b.cyl('rope', (x, y - h / 2 - .17, z), .015, .24, 5)
    b.sphere('lacquer', (x, y - h / 2 - .33, z), .05, seg=6)

for s in (-1, 1):
    for z in (13.5, 10.2, 7.0):
        stone_lantern(s * 3.0, z)

for s in (-1, 1):
    poles = (16.5, 12.5, 8.5)
    for z in poles:
        blk_c(s * 3.7, z, .2)
        b.cyl('lacquer', (s * 3.7, G + 2.4, z), .1, 4.7, 10)
        b.sphere('gold', (s * 3.7, G + 4.78, z), .13, seg=8)
        b.cyl('gold', (s * 3.7, G + .3, z), .15, .1, 10)
    for a, z2 in zip(poles, poles[1:]):
        b.box('wood', (s * 3.7, G + 4.55, (a + z2) / 2), (.03, .03, abs(a - z2)))
        for k in range(1, 4):
            zz = a + (z2 - a) * k / 4
            paper_lantern(s * 3.7, G + 4.05, zz, .29, .72)

# ------------------------------------------------------------------ the great gate (sanmon) at z = 1.5
for px in (-5.8, -3.0, 3.0, 5.8):
    for dz in (-1.8, 1.8):
        blk_c(px, GZ + dz, .6)
        b.cyl('stone', (px, G + .18, GZ + dz), .66, .36, 16)
        b.cyl('lacquer', (px, G + 3.3, GZ + dz), .42, 6.3, 20)
        b.cyl('gold', (px, G + 6.45, GZ + dz), .47, .16, 20)
        b.cyl('gold', (px, G + .46, GZ + dz), .49, .12, 20)
b.box('lacquer', (0, 6.55, GZ), (13.4, .5, 4.5))
b.box('gold', (0, 6.28, GZ), (13.5, .1, 4.6))
b.box('gold', (0, 6.82, GZ), (13.5, .08, 4.6))
for s in (-1, 1):
    blk_r(s * 3.0, GZ - .3, s * 5.8, GZ + .3)
    b.box('plaster', (s * 4.4, G + 1.8, GZ), (2.8, 3.4, .32))
    b.box('lacquer', (s * 4.4, G + 3.55, GZ), (2.9, .16, .4))
    b.box('lacquer', (s * 4.4, G + .12, GZ), (2.9, .16, .4))
    for fz in (.19, -.19):
        b.box('gold', (s * 4.4, G + 1.8, GZ + fz), (1.7, 1.7, .03))
        b.box('plaster', (s * 4.4, G + 1.8, GZ + fz * 1.1), (1.5, 1.5, .02))
for px in (-6.4, -3.0, 0, 3.0, 6.4):
    for dz in (-1.8, 1.8):
        for k, sw in enumerate((.9, 1.4, 2.0)):
            b.box('gold' if k == 1 else 'wood', (px, 6.95 + k * .17, GZ + dz), (sw, .16, .5))
b.box('lacquer', (0, 7.2, GZ), (13.8, .22, 5.0))             # balcony floor
b.box('plaster', (0, 8.45, GZ), (12.6, 2.3, 3.9))
for px in (-6, -3.6, -1.2, 1.2, 3.6, 6):
    for dz in (-1.98, 1.98):
        b.cyl('lacquer', (px, 8.4, GZ + dz), .17, 2.4, 14)
for px in (-4.8, -2.4, 0, 2.4, 4.8):
    b.plane('shoji', (px, 8.5, GZ + 2.0), 1.5, 1.3)
    b.plane('shoji', (px, 8.5, GZ - 2.0), 1.5, 1.3, ry=math.pi)
for dz in (-2.45, 2.45):
    b.box('gold', (0, 7.8, GZ + dz), (13.8, .12, .14))
    for k in range(-22, 23):
        b.box('lacquer', (k * .3, 7.55, GZ + dz), (.07, .5, .07))
for sx in (-6.9, 6.9):
    b.box('gold', (sx, 7.8, GZ), (.14, .12, 4.9))
b.roof((0, 7.25, GZ), 15.8, 7.6, 1.15, 5.8, 1.6, .45)       # lower roof
b.roof((0, 9.7, GZ), 14.8, 6.6, 2.5, 4.0, 0, .55)            # upper roof
b.sphere('gold', (0, 12.55, GZ), .42, seg=12)
b.cyl('gold', (0, 12.1, GZ), .26, .5, 10, r2=.08)
for dz, back in ((2.2, False), (-2.2, True)):                # signboards: 一番星もび宮
    sgn = 1 if dz > 0 else -1
    b.box('gold', (0, 5.5, GZ + dz), (5.0, 1.55, .08))
    b.box('navy', (0, 5.5, GZ + dz + .05 * sgn), (4.7, 1.3, .06))
    lettering('一番星もび宮', .72, (0, 5.5, GZ + dz + .1 * sgn), back=back)
paper_lantern(0, 4.35, GZ, .5, 1.05)
b.cyl('gold', (0, 5.6, GZ), .04, 1.2, 6)

# precinct walls running out from the gate
for s in (-1, 1):
    blk_r(s * 5.9, GZ - .4, s * 27.0, GZ + .4)
    b.box('plaster', (s * 16.4, G + 1.3, GZ), (20.8, 2.6, .5))
    b.box('lacquer', (s * 16.4, G + 2.0, GZ), (20.8, .22, .54))
    b.roof((s * 16.4, G + 2.62, GZ), 21.4, 1.5, .35, 10.0, 0, .0, thick=.14, finials=False, rafters=False)

# ------------------------------------------------------------------ the Kannon hall
HZ = -11.5               # hall centre
KZ_ = -14.4
PT = 7.6                 # top of the pillars
FY = 0.7                 # floor height
blk_r(3.2, -5.75, 8.9, -5.4)          # platform front edge beside the stair
blk_r(-8.9, -5.75, -3.2, -5.4)
blk_r(8.5, -17.9, 9.0, -5.4)           # platform sides and back
blk_r(-9.0, -17.9, -8.5, -5.4)
blk_r(-9.0, -17.9, 9.0, -17.5)
for sgn in (-1, 1):
    blk_r(sgn * 3.2, -5.5, sgn * 3.8, -3.7)   # stair cheek stones
    blk_r(sgn * 7.4, -17.5, sgn * 8.4, -7.3)  # hall side walls
blk_r(-8.4, -17.5, 8.4, -16.6)         # hall back wall
blk_r(-1.6, -9.5, 1.6, -7.5)           # offering box, with room in front so the Kannon stays in view
blk_c(0, KZ_, 3.1)                      # Kannon throne
for sgn in (-1, 1):
    for zz_ in (-9.4, -11.2):
        blk_c(sgn * 3.8, zz_, .35)         # candle stands
b.box('stone', (0, G + .1, HZ), (18.4, .3, 12.8))
b.box('stone', (0, (G + FY) / 2, HZ), (17.4, FY - G, 12.2))
b.box('gold', (0, FY - .02, HZ), (17.5, .06, 12.3))
b.box('floor', (0, FY + .04, HZ - .5), (16.0, .06, 10.8))
for k in range(3):  # grand stair
    top = (k + 1) / 3 * (FY - G)
    b.box('stone', (0, G + top / 2, -5.5 + .6 * (2 - k) + .3), (6.4, top, .6))
for s in (-1, 1):
    for k in range(3):
        b.box('stone', (s * 3.45, G + ((k + 1) / 3 * (FY - G) + .15) / 2, -5.5 + .6 * (2 - k) + .3), (.55, (k + 1) / 3 * (FY - G) + .15, .6))
    for z in (-3.5, -5.2):
        b.cyl('gold', (s * 3.45, FY + .25, z), .1, .22, 8)
        b.sphere('gold', (s * 3.45, FY + .45, z), .1, seg=8)
    stone_lantern(s * 4.6, -3.9)

for px in (-7.5, -4.5, -1.5, 1.5, 4.5, 7.5):
    blk_c(px, -7.2, .5)
    b.cyl('stone', (px, FY + .15, -7.2), .46, .3, 18)
    b.cyl('lacquer', (px, FY + (PT - FY) / 2 + .15, -7.2), .31, PT - FY, 20)
    b.cyl('gold', (px, FY + .4, -7.2), .36, .1, 20)
    b.cyl('gold', (px, PT - .1, -7.2), .36, .12, 20)
    for k, sw in enumerate((.9, 1.5, 2.2)):
        b.box('gold' if k == 1 else 'wood', (px, PT + .22 + k * .17, -7.2), (sw, .16, .55))
b.box('lacquer', (0, PT + .1, -7.2), (16.8, .55, .6))
b.box('gold', (0, PT - .22, -7.2), (16.9, .09, .66))
b.box('gold', (0, PT + .4, -7.2), (16.9, .09, .66))
for s in (-1, 1):                                              # veranda rail beside the stair
    x0, x1 = 3.7, 8.2
    b.box('lacquer', (s * (x0 + x1) / 2, FY + .95, -5.8), (x1 - x0, .09, .09))
    b.box('lacquer', (s * (x0 + x1) / 2, FY + .35, -5.8), (x1 - x0, .07, .07))
    for k in range(int((x1 - x0) / .25)):
        b.cyl('lacquer', (s * (x0 + .12 + k * .25), FY + .65, -5.8), .03, .6, 6)
    for xx in (x0, (x0 + x1) / 2, x1):
        b.cyl('gold', (s * xx, FY + .55, -5.8), .06, 1.0, 8)
        b.sphere('gold', (s * xx, FY + 1.08, -5.8), .08, seg=8)
for s in (-1, 1):
    b.box('plaster', (s * 7.9, FY + (PT - FY) / 2, HZ - 1.2), (.4, PT - FY, 10.2))
    for z in (-9.5, -12.0, -14.5):
        b.cyl('lacquer', (s * 7.7, FY + (PT - FY) / 2, z), .26, PT - FY, 16)
b.box('lacquer', (0, FY + (PT - FY) / 2, -17.0), (16.0, PT - FY, .4))
b.box('gold', (0, 4.5, -16.78), (11.0, 5.4, .08))               # gold folding-screen wall
for k in range(-5, 6):
    b.box('lacquer', (k * 1.0, 4.5, -16.72), (.06, 5.4, .04))
for k in range(-3, 4):                                          # lotus panels on the screen
    b.cyl('lacquer', (k * 1.5, 4.6, -16.7), .5, .03, 20, axis='z')
b.box('lacquer', (0, PT + .05, HZ - 1.5), (16.2, .3, 10.2))     # ceiling
for k in range(9):
    b.box('gold', (-7.2 + k * 1.8, PT - .05, HZ - 1.5), (.08, .06, 10.0))
for k in range(6):
    b.box('gold', (0, PT - .05, -8.4 - k * 1.8), (16.0, .06, .08))
b.roof((0, PT + .95, HZ + .6), 22.0, 16.2, 1.7, 5.6, 3.4, .75)    # lower roof with a flat top
b.box('plaster', (0, PT + 3.1, HZ + .6), (10.6, 3.1, 6.8))
for px in (-4.5, -2.7, -.9, .9, 2.7, 4.5):
    b.cyl('lacquer', (px, PT + 3.1, HZ + .6 + 3.5), .17, 3.1, 14)
for px in (-3.6, -1.8, 1.8, 3.6):
    b.plane('shoji', (px, PT + 3.1, HZ + .6 + 3.45), 1.4, 1.6)
b.box('gold', (0, PT + 3.1, HZ + .6 + 3.46), (1.75, 3.05, .08))       # vertical signboard: 願い観音
b.box('navy', (0, PT + 3.1, HZ + .6 + 3.52), (1.55, 2.85, .06))
lettering('願\nい\n観\n音', .62, (0, PT + 3.1, HZ + .6 + 3.58), spacing=.92)
b.box('gold', (0, PT + 4.7, HZ + .6 + 3.5), (11.0, .12, .2))
b.roof((0, PT + 4.65, HZ + .6), 15.4, 11.2, 2.8, 3.2, 0, .6)      # top roof
b.cyl('gold', (0, PT + 8.0, HZ + .6), .12, 1.6, 8, r2=.04)
b.sphere('gold', (0, PT + 7.5, HZ + .6), .52, scale=(1, 1.25, 1), seg=14)
for k in range(5):
    b.cyl('gold', (0, PT + 7.55 + k * .26, HZ + .6), .32 - k * .04, .06, 16)

for k, px in enumerate((-6, -3, 0, 3, 6)):                   # entrance curtains and lanterns
    b.plane('curtain', (px, 5.9, -7.45), 2.6, 1.2)
    b.box('gold', (px, 5.28, -7.44), (2.6, .06, .04))
    b.box('gold', (px, 6.52, -7.44), (2.6, .06, .04))
    for q in range(3):
        b.box('gold', (px - .7 + q * .7, 5.9, -7.43), (.06, 1.0, .02))
    if px != 0:
        paper_lantern(px, 4.0, -7.4, .36, .86)

# offering box & bell
b.box('wood', (0, FY + .3, -8.9), (2.6, .6, 1.1))
b.box('gold', (0, FY + .62, -8.9), (2.7, .08, 1.2))
for k in range(9):
    b.box('lacquer', (-1.12 + k * .28, FY + .68, -8.9), (.1, .06, 1.0))
for k in range(5):
    b.box('gold', (-1.0 + k * .5, FY + .3, -8.34), (.05, .38, .03))
b.sphere('gold', (0, 5.1, -8.0), .34, seg=14)
b.cyl('gold', (0, 5.4, -8.0), .12, .3, 8)
b.cyl('lacquer', (0, 4.7, -8.0), .06, .3, 8)

# interior: ceiling lanterns, candle stands
for x in (-5.2, -2.6, 2.6, 5.2):
    for z in (-10.2, -12.6, -15.0):
        paper_lantern(x, 5.6, z, .3, .7)
        b.cyl('gold', (x, 6.5, z), .02, 1.7, 5)
for s in (-1, 1):
    for zz in (-9.4, -11.2):
        b.cyl('gold', (s * 3.8, FY + .9, zz), .07, 1.8, 10)
        b.cyl('gold', (s * 3.8, FY + .12, zz), .28, .24, 10, r2=.12)
        b.cyl('gold', (s * 3.8, FY + 1.85, zz), .17, .08, 12)
        b.cyl('glow', (s * 3.8, FY + 2.0, zz), .05, .3, 6, r2=.01)

# Kannon, her thousand arms, halo and lotus throne
KZ, KY = -14.4, FY + .85
b.cyl('stone', (0, FY + .3, KZ), 2.9, .6, 36)
b.cyl('gold', (0, FY + .62, KZ), 3.0, .1, 36)
b.cyl('gold', (0, FY + .15, KZ), 3.0, .1, 36)
for k in range(4):
    b.cyl('gold', (0, FY + .7 + k * .05, KZ), 2.6 - k * .15, .05, 36)
b.cyl('gold', (0, KY + .25, KZ), 2.0, .5, 32)
b.cyl('gold', (0, KY + .55, KZ), 1.7, .15, 32)
for ring, (R, tilt, cnt, h) in enumerate(((1.75, .55, 20, .95), (1.45, .25, 16, .8))):
    for p in range(cnt):
        a = 2 * math.pi * p / cnt + ring * .15
        rot = Matrix.Rotation(a, 3, 'Y') @ Matrix.Rotation(tilt, 3, 'X')
        pos = Matrix.Rotation(a, 3, 'Y') @ Vector((0, KY + .85 + ring * .18, R))
        b.box('lotus', (pos.x, pos.y, KZ + pos.z), (.52, h, .08), rot=rot)
b.cyl('gold', (0, KY + .85, KZ), 1.15, .35, 24)
b.sphere('gold_soft', (0, KY + 1.3, KZ), 1.9, scale=(1.0, .5, .78), seg=24)               # crossed legs / robe spread over the throne
b.cyl('gold_soft', (0, KY + 2.6, KZ), .85, 1.9, 24, r2=.62)                              # waist
b.sphere('gold_soft', (0, KY + 3.55, KZ), .8, scale=(1.55, .9, .78), seg=24)             # broad chest and shoulders
for s in (-1, 1):
    b.beam('gold_soft', (s * 1.2, KY + 3.75, KZ), (s * 1.45, KY + 2.7, KZ + .5), .17, .13)               # upper arms
    b.beam('gold_soft', (s * 1.45, KY + 2.7, KZ + .5), (s * .22, KY + 2.7, KZ + .9), .12, .09)         # forearms joined in prayer
b.sphere('gold_soft', (0, KY + 2.72, KZ + .95), .17, scale=(.8, 1.2, .8), seg=10)
b.cyl('gold_soft', (0, KY + 4.2, KZ), .25, .4, 14)
b.sphere('gold_soft', (0, KY + 4.8, KZ), .6, scale=(1, 1.1, 1), seg=20)
b.sphere('gold_soft', (0, KY + 5.35, KZ - .05), .32, scale=(1, .9, 1), seg=14)
for s in (-1, 1):                                                                 # ears
    b.sphere('gold_soft', (s * .6, KY + 4.65, KZ), .12, scale=(.6, 2.2, .6), seg=8)
b.sphere('glow', (0, KY + 4.92, KZ + .58), .045, seg=6)                             # urna
b.cyl('gold', (0, KY + 5.5, KZ), .42, .3, 16, r2=.48)
for k in range(6):
    a = k * math.pi / 3
    b.cyl('gold', (math.cos(a) * .34, KY + 5.85, KZ + math.sin(a) * .34), .06, .4, 6, r2=.01)
b.cyl('gold', (0, KY + 5.95, KZ), .24, .55, 12, r2=.07)
b.sphere('glow', (0, KY + 6.35, KZ), .09, seg=8)
for deg in range(-155, 156, 8):                                                   # the thousand hands
    a = math.radians(deg)
    for ring_r, ln in ((2.0, 1.7), (2.85, 1.0)):
        cx, cy = math.sin(a) * ring_r, KY + 3.55 + math.cos(a) * ring_r
        b.box('gold', (cx, cy, KZ - .5), (.07, ln, .04), rot=Matrix.Rotation(-a, 3, 'Z'))
    hx, hy = math.sin(a) * 3.15, KY + 3.55 + math.cos(a) * 3.15
    b.sphere('gold_soft', (hx, hy, KZ - .5), .15, scale=(.8, 1.2, .5), seg=8)
for deg in range(-170, 171, 20):                                                  # flame aureole
    a = math.radians(deg)
    b.box('gold', (math.sin(a) * 4.0, KY + 3.55 + math.cos(a) * 4.0, KZ - .62), (.28, .9, .03), rot=Matrix.Rotation(-a, 3, 'Z'))
b.torus('gold', (0, KY + 3.55, KZ - .62), 3.5, .07)
b.torus('gold', (0, KY + 3.55, KZ - .62), 3.85, .04)
b.torus('gold', (0, KY + 3.55, KZ - .62), 2.3, .05)
b.cyl('halo', (0, KY + 3.55, KZ - .7), 3.7, .02, 40, axis='z')
b.box('gold', (0, PT - .55, KZ + 1.0), (5.2, .14, 3.6))                            # canopy
b.box('lacquer', (0, PT - .45, KZ + 1.0), (4.8, .1, 3.2))
for k in range(26):
    a = 2 * math.pi * k / 26
    b.cyl('gold', (math.cos(a) * 2.5, PT - 1.1, KZ + 1.0 + math.sin(a) * 1.7), .02, 1.0, 5)
    b.sphere('gold', (math.cos(a) * 2.5, PT - 1.65, KZ + 1.0 + math.sin(a) * 1.7), .05, seg=6)

# ------------------------------------------------------------------ five-storey pagoda at the left
PX, PZ = -18.5, -7.5
blk_r(PX - 2.9, PZ - 2.9, PX + 2.9, PZ + 2.9)
b.box('stone', (PX, G + .3, PZ), (5.6, .6, 5.6))
b.box('stone', (PX, G + .75, PZ), (4.6, .3, 4.6))
for t in range(5):
    w = 3.6 - t * .42
    y = G + .9 + t * 2.15
    b.box('plaster', (PX, y + 1.0, PZ), (w - .4, 1.6, w - .4))
    for sx in (-1, 1):
        for sz in (-1, 1):
            b.cyl('lacquer', (PX + sx * (w / 2 - .25), y + 1.0, PZ + sz * (w / 2 - .25)), .13, 1.7, 10)
    for face in range(4):
        a = face * math.pi / 2
        b.plane('shoji', (PX + math.sin(a) * ((w - .4) / 2 + .02), y + 1.0, PZ + math.cos(a) * ((w - .4) / 2 + .02)), .8, .9, ry=a)
    b.roof((PX, y + 1.85, PZ), w + 1.9, w + 1.9, .55, .35, .35, .25, .1, finials=False)
b.cyl('gold', (PX, G + 12.6, PZ), .09, 3.0, 8)
for k in range(9):
    b.cyl('gold', (PX, G + 11.7 + k * .32, PZ), .3 - k * .02, .06, 14)
b.sphere('gold', (PX, G + 14.4, PZ), .24, seg=12)

# ------------------------------------------------------------------ trees (bark + foliage cards), mountains, petals
KINDS = ['leaf_sakura', 'leaf_maple', 'leaf_ginkgo', 'leaf_sakura', 'leaf_maple']

def tree(x, z, kind, s=1.0):
    blk_c(x, z, .5 * s)
    h = 3.4 * s
    b.beam('trunk', (x, G, z), (x + random.uniform(-.2, .2), G + h, z + random.uniform(-.2, .2)), .36 * s, .2 * s, 9)
    tops = []
    for k in range(5):
        a = random.uniform(0, 2 * math.pi) + k * 1.2
        L = random.uniform(1.6, 2.4) * s
        start = (x, G + h * random.uniform(.55, .95), z)
        end = (x + math.cos(a) * L, G + h + random.uniform(.5, 1.6) * s, z + math.sin(a) * L)
        b.beam('trunk', start, end, .12 * s, .05 * s, 6)
        tops.append(end)
    tops.append((x, G + h + 1.4 * s, z))
    for tx_, ty_, tz_ in tops:
        for _ in range(8):
            rot = (Matrix.Rotation(random.uniform(0, 2 * math.pi), 3, 'Y') @ Matrix.Rotation(random.uniform(-.9, .9), 3, 'X') @ Matrix.Rotation(random.uniform(0, 3.14), 3, 'Z'))
            sz_ = random.uniform(1.8, 2.7) * s
            b.card(kind, (tx_ + random.uniform(-.8, .8) * s, ty_ + random.uniform(-.5, .6) * s, tz_ + random.uniform(-.8, .8) * s), sz_, sz_, rot)

spots = []
for sgn in (-1, 1):
    for z in (14, 8, 2, -4, -10, -17, -24):
        spots.append((sgn * random.uniform(12.5, 16), z + random.uniform(-1, 1)))
    for z in (16, 9, 3):
        spots.append((sgn * random.uniform(21, 26), z))
for x in (-12, -4, 4, 12):
    spots.append((x + random.uniform(-1.5, 1.5), -24 + random.uniform(-2, 1)))
for i, (x, z) in enumerate(spots):
    if abs(x - PX) < 5 and abs(z - PZ) < 5:
        continue
    tree(x, z, KINDS[i % len(KINDS)], random.uniform(.85, 1.25))

for i in range(14):
    a = math.pi * 2 * i / 14 + random.uniform(-.1, .1)
    r = random.uniform(80, 95)
    b.cyl('mountain', (math.cos(a) * r, 8, math.sin(a) * r), random.uniform(13, 21), random.uniform(18, 30), 6, r2=1.0, smooth=False)

for _ in range(140):
    x = random.choice([random.uniform(-2.2, 2.2), random.uniform(-11, 11)])
    z = random.uniform(-4, 18)
    if abs(x) > 2.4 and abs(z - GZ) < 3.5:
        continue
    b.box('petal', (x, G + .075, z), (.11, .004, .07), ry=random.uniform(0, 3.14))

b.finish()

# ------------------------------------------------------------------ export
NL = chr(10)
out_ts = os.path.normpath(os.path.join(ROOT, '..', '..', 'src', 'data', 'kannonColliders.ts'))
with open(out_ts, 'w', encoding='utf-8') as f:
    f.write('// Generated by scripts/build-kannon-temple.py. Do not edit by hand.' + NL)
    f.write('/** Blocked circles [x, z, radius]. */' + NL)
    f.write('export const KANNON_CIRCLES: readonly (readonly [number, number, number])[] = ' + repr([list(c) for c in CIRCLES]) + ';' + NL)
    f.write('/** Blocked rectangles [x0, z0, x1, z1]. */' + NL)
    f.write('export const KANNON_RECTS: readonly (readonly [number, number, number, number])[] = ' + repr([list(r) for r in RECTS]) + ';' + NL)
bpy.ops.wm.save_as_mainfile(filepath=os.path.join(ROOT, 'kannon-temple-world.blend'))
valid = {p.identifier for p in bpy.ops.export_scene.gltf.get_rna_type().properties}
kw = dict(filepath=os.path.join(ROOT, 'kannon-temple-world.glb'), export_format='GLB', export_apply=True,
          export_cameras=False, export_lights=False)
if 'export_image_format' in valid:
    kw['export_image_format'] = 'AUTO'
bpy.ops.export_scene.gltf(**kw)
polys = sum(len(o.data.polygons) for o in bpy.context.scene.objects if o.type == 'MESH')
print('KANNON_TEMPLE_OK', len(bpy.context.scene.objects), 'objects', polys, 'polys', flush=True)
