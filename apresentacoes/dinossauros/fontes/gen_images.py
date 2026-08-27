import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.patches import Polygon, Circle
from matplotlib.colors import to_rgb

import os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "img")
os.makedirs(OUT, exist_ok=True)

KX, KY = 0.30, 0.20   # oblique depth projection

def obl(pts, z, kx=KX, ky=KY):
    return [(x + z*kx, y + z*ky) for x, y in pts]

def mix(a, b, t):
    a, b = np.array(to_rgb(a)), np.array(to_rgb(b))
    return tuple(a + (b - a) * t)

def extrude(ax, pts, z0, z1, c_back, c_front, n=110, z0order=0, kx=KX, ky=KY):
    """Solid extrusion drawn as stacked slices, back to front (painter's algorithm)."""
    for i in range(n):
        t = i / (n - 1)
        z = z0 + (z1 - z0) * t
        col = mix(c_back, c_front, t)
        ax.add_patch(Polygon(obl(pts, z, kx, ky), closed=True, facecolor=col,
                             edgecolor=col, lw=0.6, zorder=z0order + i))

# ---------------------------------------------------------------- 1. T. rex 3D
trex = [
    (0.15, 4.55), (1.20, 4.62), (2.30, 4.82), (3.40, 5.12),
    (4.40, 5.48), (5.30, 5.82), (6.10, 6.02),
    (6.90, 6.06), (7.50, 6.22),
    (8.05, 6.56), (8.75, 6.80), (9.40, 6.72), (9.92, 6.34),
    (9.96, 5.86), (9.20, 5.60), (8.50, 5.38),
    (7.92, 5.28), (7.48, 5.06),
    (7.22, 4.60), (7.06, 4.05),
    (6.55, 3.60), (5.80, 3.36), (5.00, 3.28), (4.55, 3.30),
    (4.92, 2.60), (4.94, 2.05), (4.80, 1.55), (5.02, 1.10), (5.06, 0.62),
    (5.55, 0.34), (6.02, 0.26), (6.04, 0.10), (4.62, 0.10), (4.66, 0.60),
    (4.58, 1.12), (4.30, 1.62), (3.96, 2.20), (3.48, 2.72), (3.20, 3.28),
    (2.45, 3.86), (1.40, 4.22),
]
far_leg = [(4.42, 3.30), (4.46, 2.55), (4.44, 2.00), (4.30, 1.52), (4.52, 1.08),
           (4.56, 0.60), (5.05, 0.32), (5.50, 0.24), (5.52, 0.08), (4.12, 0.08),
           (4.16, 0.58), (4.08, 1.10), (3.80, 1.60), (3.46, 2.18), (2.98, 2.70),
           (2.72, 3.26)]
arm = [(6.92, 4.74), (7.28, 4.24), (7.62, 3.94), (7.90, 3.86), (7.86, 3.74),
       (7.56, 3.76), (7.22, 4.02), (6.74, 4.52)]
mouth = [(9.86, 6.02), (8.62, 5.52), (8.58, 5.40), (9.84, 5.88)]

fig, ax = plt.subplots(figsize=(9, 6.2), dpi=220)
DEPTH = 2.6
# far leg sits deepest
extrude(ax, far_leg, -DEPTH * 0.55, -DEPTH * 0.30, "#2A1408", "#7A3617", n=40, z0order=0)
extrude(ax, trex, -DEPTH / 2, DEPTH / 2, "#4A1F0C", "#F0873C", n=130, z0order=100)
extrude(ax, arm, DEPTH * 0.40, DEPTH * 0.58, "#C25C22", "#FFB57A", n=34, z0order=400)
ax.add_patch(Polygon(obl(mouth, DEPTH / 2 + 0.02), closed=True, facecolor="#4A1F0C",
                     edgecolor="#4A1F0C", lw=0.5, zorder=500))
ex, ey = obl([(9.18, 6.26)], DEPTH / 2 + 0.02)[0]
ax.add_patch(Circle((ex, ey), 0.115, facecolor="#2A1408", edgecolor="none", zorder=501))
ax.add_patch(Circle((ex + 0.035, ey + 0.035), 0.035, facecolor="#FFD9B0", edgecolor="none", zorder=502))
ax.set_xlim(-0.7, 11.4); ax.set_ylim(-0.5, 7.9)
ax.set_aspect("equal"); ax.axis("off")
fig.savefig(f"{OUT}/trex3d.png", transparent=True, bbox_inches="tight", pad_inches=0.02)
plt.close(fig)

# ------------------------------------------------- 2. strata blocks (3 eras)
def strata(name, highlight, hi_color):
    W, H, D = 3.0, 0.72, 1.5
    muted = ["#C9CEC4", "#BAC1B4", "#AAB2A3"]
    fig, ax = plt.subplots(figsize=(4.4, 3.4), dpi=220)
    for i in range(3):          # 0 = bottom (oldest)
        y0 = i * H
        base = hi_color if i == highlight else muted[i]
        front = base
        side = mix(base, "#000000", 0.30)
        top = mix(base, "#FFFFFF", 0.22)
        f = [(0, y0), (W, y0), (W, y0 + H), (0, y0 + H)]
        ax.add_patch(Polygon(obl(f, 0), closed=True, facecolor=front, edgecolor="none", zorder=10 * i + 1))
        s = [(W, y0), (W, y0 + H)]
        s = [obl([(W, y0)], 0)[0], obl([(W, y0)], D)[0],
             obl([(W, y0 + H)], D)[0], obl([(W, y0 + H)], 0)[0]]
        ax.add_patch(Polygon(s, closed=True, facecolor=side, edgecolor="none", zorder=10 * i + 2))
        t = [obl([(0, y0 + H)], 0)[0], obl([(W, y0 + H)], 0)[0],
             obl([(W, y0 + H)], D)[0], obl([(0, y0 + H)], D)[0]]
        ax.add_patch(Polygon(t, closed=True, facecolor=top, edgecolor="none", zorder=10 * i + 3))
    ax.set_xlim(-0.15, W + D * KX + 0.15); ax.set_ylim(-0.15, 3 * H + D * KY + 0.2)
    ax.set_aspect("equal"); ax.axis("off")
    fig.savefig(f"{OUT}/{name}.png", transparent=True, bbox_inches="tight", pad_inches=0.02)
    plt.close(fig)

strata("strata_tri", 0, "#B0603A")
strata("strata_jur", 1, "#5C8C4A")
strata("strata_cre", 2, "#E8712F")

# ------------------------------------------------------- 3. asteroid (raytraced)
N = 1200
yy, xx = np.mgrid[0:N, 0:N]
u = (xx - N / 2) / (N * 0.42)
v = (N / 2 - yy) / (N * 0.42)
r2 = u * u + v * v
inside = r2 <= 1.0
w = np.sqrt(np.clip(1.0 - r2, 0, 1))
nx, ny, nz = u, v, w

rng = np.random.default_rng(11)
craters = np.zeros_like(u)
for _ in range(30):
    c = rng.normal(size=3); c /= np.linalg.norm(c)
    d = np.arccos(np.clip(nx * c[0] + ny * c[1] + nz * c[2], -1, 1))
    rad = rng.uniform(0.09, 0.26)
    depth = rng.uniform(0.5, 1.0)
    prof = np.where(d < rad, -(np.cos(np.pi * d / rad) * 0.5 + 0.5), 0.0)
    band = np.clip((d - rad) / (0.28 * rad), 0, 1)
    rim_ring = np.where((d >= rad) & (d < rad * 1.28), np.sin(np.pi * band) * 0.22, 0.0)
    craters += (prof + rim_ring) * depth

gy, gx = np.gradient(craters)
K = N * 0.55
nx2, ny2, nz2 = nx - gx * K, ny + gy * K, nz
ln = np.sqrt(nx2 ** 2 + ny2 ** 2 + nz2 ** 2) + 1e-9
nx2, ny2, nz2 = nx2 / ln, ny2 / ln, nz2 / ln

L = np.array([-0.52, 0.60, 0.61]); L /= np.linalg.norm(L)
diff = np.clip(nx2 * L[0] + ny2 * L[1] + nz2 * L[2], 0, 1)
speck = np.kron(rng.normal(0, 1, (N // 3 + 1, N // 3 + 1)), np.ones((3, 3)))[:N, :N]
diff = np.clip(diff * (1 + speck * 0.05), 0, 1)
spec = diff ** 26
limb = np.clip(1 - nz, 0, 1) ** 4

rock_dark = np.array([0.09, 0.08, 0.08])
rock_lit = np.array([0.66, 0.58, 0.50])
lava = np.array([0.96, 0.45, 0.14])
col = (rock_dark + (rock_lit - rock_dark) * diff[..., None] ** 0.9
       + spec[..., None] * 0.18
       + limb[..., None] * lava * 1.15)
col = np.clip(col, 0, 1)
edge = np.clip((1.0 - r2) * N * 0.20, 0, 1)
alpha = np.where(inside, edge, 0.0)
col[~inside] = np.array([0.055, 0.122, 0.102])  # slide background, for alpha-blind renderers
plt.imsave(f"{OUT}/asteroid3d.png", np.dstack([col, alpha]))

from PIL import Image
im = Image.open(f"{OUT}/asteroid3d.png")
print("asteroid mode", im.mode, "corner alpha", im.getpixel((2, 2))[3])
print("images ok")
