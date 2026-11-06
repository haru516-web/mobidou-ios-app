"""Generate and prepare the 1K PBR textures for the Kannon temple world.

Run:  blender -b -P scripts/kannon-textures.py

Generated procedurally with numpy (no downloads): vermilion lacquer, gold leaf, kawara roof tile,
plaster, fabric, lantern paper, shoji, foliage cards. Stone, planks, ground litter and bark are the
existing CC0 Poly Haven sources already in realistic-sources/, downsized and tinted for dusk.
"""
import bpy, os, math
import numpy as np

ASSETS = r'D:\mobby\mobidou\.worktrees\prayer-first-person\assets\prayer-first-person'
SRC = os.path.join(ASSETS, 'realistic-sources')
OUT = os.path.join(ASSETS, 'kannon-textures')
os.makedirs(OUT, exist_ok=True)
N = 1024
rng = np.random.default_rng(7)

# ------------------------------------------------------------------ helpers
SMALL = {'fabric_color', 'fabric_rough', 'fabric_normal', 'plaster_normal', 'plaster_rough', 'bark_normal', 'ground_normal', 'ground_rough', 'gold_rough', 'lacquer_rough', 'roof_rough', 'floor_rough', 'floor_normal', 'stone_rough', 'stone_normal', 'wood_color'}

def save(name, arr, fmt='JPEG', quality=88, nonColor=False):
    """arr: HxWx3 or HxWx4 floats 0..1 in the file's own encoding (sRGB for colour). Row 0 is the image top."""
    arr = np.clip(arr, 0, 1).astype(np.float32)
    if name in SMALL and arr.shape[0] >= 1024:
        arr = arr.reshape(arr.shape[0] // 2, 2, arr.shape[1] // 2, 2, arr.shape[2]).mean(axis=(1, 3))
    h, w = arr.shape[:2]
    if arr.shape[2] == 3:
        arr = np.concatenate([arr, np.ones((h, w, 1), np.float32)], axis=2)
    img = bpy.data.images.new(name, w, h, alpha=True, float_buffer=False)
    img.colorspace_settings.name = 'Non-Color' if nonColor else 'sRGB'
    img.pixels.foreach_set(np.flipud(arr).ravel())
    img.file_format = fmt
    if fmt == 'JPEG':
        img.save_render(os.path.join(OUT, name + '.jpg'), scene=_scene())
    else:
        img.file_format = 'PNG'
        img.save_render(os.path.join(OUT, name + '.png'), scene=_scene())
    bpy.data.images.remove(img)

_sc = None
def _scene():
    global _sc
    if _sc is None:
        _sc = bpy.context.scene
        _sc.view_settings.view_transform = 'Standard'
        _sc.display_settings.display_device = 'sRGB'
        _sc.render.image_settings.quality = 72
    return _sc

def smooth(t):
    return t * t * (3 - 2 * t)

def tile_noise(n, cells_y, cells_x, seed):
    """Tileable value noise, n x n."""
    r = np.random.default_rng(seed)
    g = r.random((cells_y, cells_x))
    y = np.arange(n) * cells_y / n
    x = np.arange(n) * cells_x / n
    y0, x0 = np.floor(y).astype(int) % cells_y, np.floor(x).astype(int) % cells_x
    y1, x1 = (y0 + 1) % cells_y, (x0 + 1) % cells_x
    fy, fx = smooth(y - np.floor(y))[:, None], smooth(x - np.floor(x))[None, :]
    a = g[y0][:, x0] * (1 - fx) + g[y0][:, x1] * fx
    b = g[y1][:, x0] * (1 - fx) + g[y1][:, x1] * fx
    return a * (1 - fy) + b * fy

def fbm(n, base_y, base_x, octaves, seed, gain=.5):
    out, amp, tot = np.zeros((n, n)), 1.0, 0.0
    for o in range(octaves):
        out += amp * tile_noise(n, base_y * 2 ** o, base_x * 2 ** o, seed + o * 17)
        tot += amp
        amp *= gain
    return out / tot

def normal_map(h, strength):
    dx = (np.roll(h, -1, 1) - np.roll(h, 1, 1)) * strength
    dy = (np.roll(h, 1, 0) - np.roll(h, -1, 0)) * strength   # row 0 is the top: +y (up) = smaller row index
    nz = np.ones_like(h)
    ln = np.sqrt(dx * dx + dy * dy + nz * nz)
    return np.stack([-dx / ln * .5 + .5, -dy / ln * .5 + .5, nz / ln * .5 + .5], axis=2)

def rgb(hexstr):
    h = hexstr.lstrip('#')
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])

def mix(a, b, t):
    return a + (b - a) * t[..., None]

def gray(a):
    return np.stack([a, a, a], axis=2)

# ------------------------------------------------------------------ vermilion lacquer
grain = fbm(N, 3, 96, 4, 11)                 # long vertical streaks of the brush
speck = fbm(N, 64, 64, 3, 12)
peel = fbm(N, 40, 40, 3, 13)                 # orange-peel of the lacquer
base = mix(rgb('#8c1613'), rgb('#bf2a1f'), grain)
base = base * (.93 + .14 * speck[..., None])
dark_edge = smooth(np.clip(fbm(N, 6, 6, 3, 14) * 1.6 - .5, 0, 1))
base = mix(base, rgb('#4e0c0a'), dark_edge * .18)
save('lacquer_color', base)
save('lacquer_rough', gray(.2 + .22 * peel + .1 * grain), nonColor=True)
save('lacquer_normal', normal_map(peel * .5 + grain * .35, 5.0), nonColor=True)

# ------------------------------------------------------------------ gold leaf (brushed, hammered)
streak = fbm(N, 2, 160, 3, 21)
hammer = fbm(N, 28, 28, 3, 22)
g0 = mix(rgb('#b97d1d'), rgb('#f2c45a'), streak * .8 + hammer * .2)
g0 = g0 * (.9 + .2 * hammer[..., None])
save('gold_color', g0)
save('gold_rough', np.stack([np.ones_like(streak), .26 + .2 * streak + .06 * hammer, np.ones_like(streak)], axis=2), nonColor=True)   # G = roughness, B = metalness (glTF packing)
save('gold_normal', normal_map(streak * .5 + hammer * .6, 4.0), nonColor=True)

# ------------------------------------------------------------------ kawara roof tile (8 x 8 tiles per texture)
cols, rows = 8, 8
yy, xx = np.mgrid[0:N, 0:N]
cx = (xx * cols / N) % 1.0
cy = (yy * rows / N) % 1.0                    # 0 = upper (ridge side) edge of a tile row, 1 = lower edge
tid = (xx * cols // N) + (yy * rows // N) * cols
tint = np.random.default_rng(31).random(cols * rows)[tid]
profile = np.sin(np.pi * cx) ** .65           # half-pipe cross section
step = .45 + .55 * smooth(np.clip(cy * 1.5, 0, 1)) * (1 - .35 * cy)
height = profile * step
height *= 1 - .9 * np.clip((.06 - cy) / .06, 0, 1)   # hard shadow line where the next row overlaps
wear = fbm(N, 16, 16, 4, 32)
tile = mix(rgb('#1b2029'), rgb('#3d4655'), (tint * .6 + wear * .4))
tile = tile * (.28 + .95 * np.clip(height, 0, 1)[..., None] ** .9)
tile = mix(tile, rgb('#5d6b63'), np.clip(fbm(N, 8, 8, 4, 33) * 1.8 - 1.05, 0, 1) * .5)   # faint lichen
save('roof_color', tile)
save('roof_rough', gray(.4 + .25 * wear - .15 * height), nonColor=True)
save('roof_normal', normal_map(height, 7.0), nonColor=True)

# ------------------------------------------------------------------ plaster
st = fbm(N, 5, 5, 5, 41)
vert = np.linspace(0, 1, N)[:, None] * np.ones((1, N))
pl = mix(rgb('#f4ecd9'), rgb('#cdbf9f'), np.clip(st * 1.3 - .35 + vert * .15, 0, 1))
pl = pl * (.97 + .06 * fbm(N, 80, 80, 2, 42)[..., None])
save('plaster_color', pl)
save('plaster_rough', gray(.82 + .12 * st), nonColor=True)
save('plaster_normal', normal_map(fbm(N, 60, 60, 4, 43), 3.0), nonColor=True)

# ------------------------------------------------------------------ fabric (woven crimson curtain)
weave = (np.sin(xx * 2 * np.pi / 6) * np.sin(yy * 2 * np.pi / 6) * .5 + .5)
slub = fbm(N, 3, 200, 2, 51)
fab = rgb('#8e1a20')[None, None, :] * (.78 + .3 * weave[..., None]) * (.92 + .16 * slub[..., None])
save('fabric_color', fab)
save('fabric_rough', gray(.85 + 0 * weave), nonColor=True)
save('fabric_normal', normal_map(weave * .6 + slub * .3, 4.0), nonColor=True)

# ------------------------------------------------------------------ lantern paper (emissive) 1024 x 512, wraps horizontally
H2 = 512
yy2, xx2 = np.mgrid[0:H2, 0:N]
ribs = np.abs(np.sin(xx2 * math.pi * 24 / N)) ** 14
paper = mix(rgb('#ff7a2c'), rgb('#ffb257'), fbm(N, 4, 8, 3, 61)[:H2] * .8)
paper = paper * (1 - .5 * ribs[..., None])
band = ((yy2 < 38) | (yy2 > H2 - 38))
paper[band] = rgb('#241410')
ink = (np.abs(yy2 - H2 / 2) < 90) & ((np.abs(((xx2 + 128) % 512) - 256) < 70) | (np.abs(((xx2 + 128) % 512) - 256) < 0))
ring = np.abs(np.hypot(((xx2 % 512) - 256) * 1.0, (yy2 - H2 / 2) * 1.0) - 78)
ink_mask = (ring < 7) | ((np.abs(((xx2 % 512) - 256)) < 8) & (np.abs(yy2 - H2 / 2) < 78))
paper[ink_mask] = rgb('#3a1410')
save('lantern_color', paper)

# ------------------------------------------------------------------ shoji (emissive paper with lattice) 256 x 384
Hs, Ws = 384, 256
ys, xs = np.mgrid[0:Hs, 0:Ws]
lat = ((xs % 64) < 5) | ((ys % 64) < 5) | (xs > Ws - 6) | (ys > Hs - 6)
sh = np.ones((Hs, Ws, 3)) * rgb('#ffbf6a')
sh = sh * (.92 + .12 * fbm(384, 6, 6, 3, 71)[:, :Ws][..., None])
sh[lat] = rgb('#2b1a12')
save('shoji_color', sh)

# ------------------------------------------------------------------ foliage cards (RGBA PNG, 512 x 512)
def foliage(name, shape, colors, count, rmin, rmax, seed, sparse_green=0.0):
    r = np.random.default_rng(seed)
    S = 512
    rgba = np.zeros((S, S, 4), np.float32)
    yy, xx = np.mgrid[0:S, 0:S]
    order = np.argsort(r.random(count))
    for i in range(count):
        cx_, cy_ = r.random() * S, r.random() * S
        rad = r.uniform(rmin, rmax)
        th = r.random() * 2 * np.pi
        x0, x1 = int(max(0, cx_ - rad * 1.4)), int(min(S, cx_ + rad * 1.4))
        y0, y1 = int(max(0, cy_ - rad * 1.4)), int(min(S, cy_ + rad * 1.4))
        if x1 <= x0 or y1 <= y0:
            continue
        dx, dy = xx[y0:y1, x0:x1] - cx_, yy[y0:y1, x0:x1] - cy_
        d = np.hypot(dx, dy) / rad
        a = np.arctan2(dy, dx) - th
        if shape == 'blossom':
            edge = .62 + .38 * np.abs(np.cos(2.5 * a))
        elif shape == 'maple':
            edge = .55 + .45 * np.abs(np.cos(2.5 * a)) ** .6
        else:  # ginkgo fan
            ang = (a + np.pi) % (2 * np.pi) - np.pi
            edge = np.where(np.abs(ang) < 1.0, 1.0 - .18 * np.cos(ang * 9) ** 2, 0.0)
        inside = d < edge
        c = colors[int(r.integers(len(colors)))]
        shade = .8 + .35 * np.clip(1 - d, 0, 1)
        col = np.stack([c[0] * shade, c[1] * shade, c[2] * shade], axis=2)
        if shape == 'blossom':
            col = np.where((d < .16)[..., None], np.array([.78, .26, .38]), col)
        sub = rgba[y0:y1, x0:x1]
        m = inside[..., None]
        sub[...] = np.where(m, np.concatenate([col, np.ones_like(col[..., :1])], axis=2), sub)
    save(name, rgba, fmt='PNG')

foliage('leaf_sakura', 'blossom', [rgb('#ffe3ea'), rgb('#f9bfd0'), rgb('#f4a3bd'), rgb('#ffeef2')], 340, 11, 19, 81)
foliage('leaf_maple', 'maple', [rgb('#b81d12'), rgb('#d83b17'), rgb('#e8631c'), rgb('#9b1410')], 190, 18, 28, 82)
foliage('leaf_ginkgo', 'ginkgo', [rgb('#f4c21c'), rgb('#e6a410'), rgb('#ffd84a')], 200, 15, 24, 83)

# ------------------------------------------------------------------ prepared real-world sources (existing CC0 files), 1K
def prepared(src, name, tint=None, nonColor=False, rough_scale=None, fmt='JPEG'):
    img = bpy.data.images.load(src, check_existing=False)
    img.colorspace_settings.name = 'Non-Color' if nonColor else 'sRGB'
    img.scale(N, N)
    arr = np.array(img.pixels[:], dtype=np.float32).reshape(N, N, 4)
    arr = np.flipud(arr)[..., :3]
    if tint is not None:
        arr = arr * np.array(tint)
    if rough_scale is not None:
        arr = arr * rough_scale
    bpy.data.images.remove(img)
    save(name, arr, fmt=fmt, nonColor=nonColor)

prepared(os.path.join(SRC, 'stone_tiles_02', 'Diffuse.jpg'), 'stone_color', tint=(1.0, .96, .93))
prepared(os.path.join(SRC, 'stone_tiles_02', 'Rough.jpg'), 'stone_rough', nonColor=True)
prepared(os.path.join(SRC, 'stone_tiles_02', 'nor_gl.jpg'), 'stone_normal', nonColor=True)
prepared(os.path.join(SRC, 'wood_planks_dirt', 'Diffuse.jpg'), 'floor_color', tint=(.62, .44, .34))
prepared(os.path.join(SRC, 'wood_planks_dirt', 'Rough.jpg'), 'floor_rough', nonColor=True, rough_scale=.55)
prepared(os.path.join(SRC, 'wood_planks_dirt', 'nor_gl.jpg'), 'floor_normal', nonColor=True)
prepared(os.path.join(SRC, 'wood_planks_dirt', 'Diffuse.jpg'), 'wood_color', tint=(.38, .27, .22))
prepared(os.path.join(SRC, 'forest_floor', 'Diffuse.jpg'), 'ground_color', tint=(.62, .56, .66))
prepared(os.path.join(SRC, 'forest_floor', 'Rough.jpg'), 'ground_rough', nonColor=True)
prepared(os.path.join(SRC, 'forest_floor', 'nor_gl.jpg'), 'ground_normal', nonColor=True)
prepared(os.path.join(SRC, 'pine_tree_01', 'bark_diff.png'), 'bark_color', tint=(.8, .74, .72))
prepared(os.path.join(SRC, 'pine_tree_01', 'bark_nor_gl.png'), 'bark_normal', nonColor=True)
print('KANNON_TEXTURES_OK', sorted(os.listdir(OUT)), flush=True)
