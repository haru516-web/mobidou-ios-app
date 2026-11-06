"""Paint the dusk sky of 願い観音もび寺: afterglow behind the camera, deep indigo ahead, cloud streaks, stars, the first star.

Run:  blender -b -P scripts/kannon-sky.py        (uses Blender's bundled numpy / image saving)
Output: assets/prayer-first-person/kannon-sky.jpg, equirect 2048x1024, three.js convention
        (u = atan2(z, x) / 2pi + .5, v = asin(y) / pi + .5), and the sun direction on stdout.
"""
import bpy, math, os
import numpy as np

OUT = r'D:\mobby\mobidou\.worktrees\prayer-first-person\assets\prayer-first-person\kannon-sky.jpg'
W, H = 2048, 1024
SUN = np.array([-.3478, 0.0, .9376])           # horizontal direction of the afterglow: behind the camera, a little left
SUN_ELEV = math.radians(5.0)
SUN = np.array([SUN[0] * math.cos(SUN_ELEV), math.sin(SUN_ELEV), SUN[2] * math.cos(SUN_ELEV)])
SUN /= np.linalg.norm(SUN)

def smooth(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)

def tile_noise(cy, cx, seed):
    r = np.random.default_rng(seed)
    g = r.random((cy, cx))
    y = np.arange(H) * cy / H
    x = np.arange(W) * cx / W
    y0, x0 = np.floor(y).astype(int) % cy, np.floor(x).astype(int) % cx
    y1, x1 = (y0 + 1) % cy, (x0 + 1) % cx
    fy, fx = smooth(y - np.floor(y))[:, None], smooth(x - np.floor(x))[None, :]
    a = g[y0][:, x0] * (1 - fx) + g[y0][:, x1] * fx
    b = g[y1][:, x0] * (1 - fx) + g[y1][:, x1] * fx
    return a * (1 - fy) + b * fy

def fbm(cy, cx, octaves, seed):
    out, amp, tot = 0, 1.0, 0
    for o in range(octaves):
        out = out + amp * tile_noise(cy * 2 ** o, cx * 2 ** o, seed + o * 13)
        tot += amp
        amp *= .55
    return out / tot

yy, xx = np.mgrid[0:H, 0:W]
u = (xx + .5) / W
v = 1 - (yy + .5) / H
elev = (v - .5) * math.pi
az = (u - .5) * 2 * math.pi
dx, dy, dz = np.cos(elev) * np.cos(az), np.sin(elev), np.cos(elev) * np.sin(az)
dot = dx * SUN[0] + dy * SUN[1] + dz * SUN[2]
toward = np.clip((dx * SUN[0] + dz * SUN[2]) / max(1e-6, math.hypot(SUN[0], SUN[2])), -1, 1)   # 1 = facing the afterglow, -1 = the far side
facing = (toward * .5 + .5)

def col(r, g, b):
    return np.array([r, g, b], dtype=np.float32)

e = np.clip(dy, 0, 1)
# vertical gradient: hot horizon -> rose -> violet -> indigo, colours differ toward / away from the afterglow
hor_near, hor_far = col(1.0, .55, .26), col(.93, .56, .62)
mid_near, mid_far = col(.80, .38, .42), col(.50, .30, .58)
up_near, up_far = col(.28, .22, .50), col(.10, .10, .30)
zen = col(.035, .05, .16)
f = facing[..., None]
hor = hor_far + (hor_near - hor_far) * f
mid = mid_far + (mid_near - mid_far) * f
up = up_far + (up_near - up_far) * f
t1 = smooth(e / .16)[..., None]
t2 = smooth((e - .08) / .32)[..., None]
t3 = smooth((e - .30) / .55)[..., None]
sky = hor * (1 - t1) + mid * t1
sky = sky * (1 - t2) + up * t2
sky = sky * (1 - t3) + zen * t3

# the afterglow itself, and a thin bright band hugging the horizon
glow = np.exp(-(np.arccos(np.clip(dot, -1, 1)) / .55) ** 2)[..., None]
sky = sky + glow * col(1.0, .5, .2) * .65
sky = sky + (np.exp(-e * 22) * (.35 + .65 * facing))[..., None] * col(1.0, .66, .45) * .35
disc = np.exp(-(np.arccos(np.clip(dot, -1, 1)) / .02) ** 2)[..., None]
sky = sky + disc * col(1.0, .9, .6) * 1.2

# long cloud streaks, lit from underneath on the afterglow side, slate-blue on the far side
cl = fbm(12, 3, 5, 3)
cl2 = fbm(22, 6, 4, 9)
cloud = smooth((cl * .65 + cl2 * .35 - .50) * 4.2) * smooth((e - .02) / .06) * (1 - smooth((e - .34) / .30))
lit = col(1.0, .55, .38) * (.4 + .9 * facing[..., None]) + col(.9, .35, .45) * .25
shade = col(.28, .24, .42)
cloud_col = shade + (lit - shade) * (np.clip(facing * 1.25 + .1 - e * 1.5, 0, 1))[..., None]
sky = sky * (1 - cloud[..., None] * .8) + cloud_col * cloud[..., None] * .8

# below the horizon (only ever seen in reflections): dim violet haze
below = (dy < 0)[..., None]
haze = col(.20, .15, .23) * (.5 + .5 * f)
sky = np.where(below, haze, sky)

# stars: fade in toward the zenith, strongest on the dark side
rs = np.random.default_rng(5)
night = smooth((e - .12) / .35) * (.25 + .75 * (1 - facing)) * (1 - cloud * .9)
star = (rs.random((H, W)) > .9992).astype(np.float32)
star = np.maximum(star, np.roll(star, 1, 1) * .55)
star = np.maximum(star, np.roll(star, 1, 0) * .55)
sky = sky + (star * night * rs.uniform(.45, 1.0, (H, W)))[..., None] * col(1.0, .96, .88)

# the first star: forward-left and high
fd = np.array([-.28, .62, -.74])
fd /= np.linalg.norm(fd)
ang = np.arccos(np.clip(dx * fd[0] + dy * fd[1] + dz * fd[2], -1, 1))
fs = np.exp(-(ang / .010) ** 2) * 2.6 + np.exp(-(ang / .045) ** 2) * .42 + np.exp(-ang / .20) * .045
cross = (np.exp(-(np.abs(dx * fd[2] - dz * fd[0]) / .0025)) * np.exp(-ang / .06)) * .6
sky = sky + (fs + cross)[..., None] * col(1.0, .94, .8)

sky = np.clip(sky, 0, 1)
sc = bpy.context.scene
sc.view_settings.view_transform = 'Standard'
sc.render.image_settings.quality = 92
img = bpy.data.images.new('kannon-sky', W, H, alpha=False)
img.colorspace_settings.name = 'sRGB'
rgba = np.concatenate([sky, np.ones((H, W, 1))], axis=2).astype(np.float32)
img.pixels.foreach_set(np.flipud(rgba).ravel())
img.file_format = 'JPEG'
img.save_render(OUT, scene=sc)
print('SUN_DIR_THREE', tuple(round(float(x), 4) for x in SUN), flush=True)
print('KANNON_SKY_OK', flush=True)
