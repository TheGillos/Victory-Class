import numpy as np, json
from PIL import Image
from scipy import ndimage

N = 160          # stations along the hull
TEXW, TEXH = 1280, 928

def hull_mask(path, thr=26):
    im = Image.open(path).convert('RGBA')
    a = np.array(im).astype(np.int32)
    lum = a[...,0]*0.3 + a[...,1]*0.59 + a[...,2]*0.11
    m = (lum > thr) & (a[...,3] > 40)
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n+1))
    m = (lab == int(np.argmax(sizes)) + 1)
    return ndimage.binary_fill_holes(m), im

def bbox(m):
    ys, xs = np.where(m)
    return int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())

def smooth(v, k=5):
    v = np.asarray(v, float)
    ker = np.ones(k) / k
    pad = np.r_[np.repeat(v[0], k), v, np.repeat(v[-1], k)]
    return np.convolve(pad, ker, mode='same')[k:-k]

# ---------------------------------------------------------------- plan ------
mt, imt = hull_mask('public/refs/topview.png')
tx0, tx1, ty0, ty1 = bbox(mt)
TH = ty1 - ty0 + 1
tmid = (ty0 + ty1) / 2.0

zpos, zneg = [], []
for i in range(N + 1):
    xi = int(round(tx0 + (tx1 - tx0) * i / N))
    col = np.where(mt[:, xi])[0]
    if len(col) == 0:
        zpos.append(0.0); zneg.append(0.0); continue
    zpos.append((tmid - col.min()) / (TH / 2.0))
    zneg.append((col.max() - tmid) / (TH / 2.0))
zpos = smooth(zpos, 5); zneg = smooth(zneg, 5)
zpos[0] = zneg[0] = max(zpos[0], zneg[0]) * 0.99   # square off the blunt bow
zpos[-1] = max(zpos[-1], 0.02); zneg[-1] = max(zneg[-1], 0.02)

# ------------------------------------------------------------- profile ------
ms, _ = hull_mask('public/refs/sideview.png')
sx0, sx1, sy0, sy1 = bbox(ms)
SH = sy1 - sy0 + 1
smid = (sy0 + sy1) / 2.0

yup, ydn = [], []
for i in range(N + 1):
    xi = int(round(sx0 + (sx1 - sx0) * i / N))
    col = np.where(ms[:, xi])[0]
    if len(col) == 0:
        yup.append(0.0); ydn.append(0.0); continue
    yup.append((smid - col.min()) / (SH / 2.0))
    ydn.append((col.max() - smid) / (SH / 2.0))
yup = smooth(yup, 9); ydn = smooth(ydn, 9)

# ---------------------------------------------------------- textures --------
def crop(path, out, size=None):
    """Crop to the hull bounding box and carry the silhouette as alpha, so the
    shader can cut concave detail (the bow notch, the transom scoop) that a
    single-valued loft cannot express."""
    m, im = hull_mask(path)
    x0, x1, y0, y1 = bbox(m)
    box = (x0, y0, x1 + 1, y1 + 1)
    w, h = (x1 - x0 + 1), (y1 - y0 + 1)
    # dorsal/ventral share the model's UV space; the stills keep their own aspect
    tw, th = size if size else (TEXW, TEXH)
    rgb = im.crop(box).convert('RGB').resize((tw, th), Image.LANCZOS)
    alpha = Image.fromarray((m[y0:y1 + 1, x0:x1 + 1] * 255).astype(np.uint8), 'L')
    alpha = alpha.resize((tw, th), Image.LANCZOS)
    out_im = rgb.convert('RGBA')
    out_im.putalpha(alpha)
    out_im.save(out)
    return (x1 - x0 + 1) / (y1 - y0 + 1)

a_top = crop('public/refs/topview.png',    'public/refs/tex-dorsal.png')
a_bot = crop('public/refs/bottomview.png', 'public/refs/tex-ventral.png')
crop('public/refs/sideview.png',   'public/refs/still-side.png',  (1600, int(round(1600 / 4.955))))
crop('public/refs/frontview.png',  'public/refs/still-front.png', (1600, int(round(1600 / 4.560))))
print('cropped texture aspects  dorsal %.3f  ventral %.3f' % (a_top, a_bot))

# ------------------------------------------------------------- emit ---------
data = {
  'n': N,
  'planAspect': round((tx1 - tx0 + 1) / TH, 4),
  'sideAspect': round((sx1 - sx0 + 1) / SH, 4),
  'zPos': [round(float(v), 5) for v in zpos],
  'zNeg': [round(float(v), 5) for v in zneg],
  'yUp':  [round(float(v), 5) for v in yup],
  'yDn':  [round(float(v), 5) for v in ydn]
}

js = ("/* Generated from refs/*.png by tools/extract-hull.py — do not hand-edit.\n"
      "   zPos/zNeg: half-beam at each station (fraction of max half-beam)\n"
      "   yUp/yDn:   hull envelope above/below the reference waterline\n"
      "              (fraction of max half-height). Station 0 is the bow. */\n\n"
      "export const HULL = " + json.dumps(data, indent=1) + ";\n")
open('public/js/hull-data.js', 'w').write(js)
print('plan aspect %.3f   side aspect %.3f' % (data['planAspect'], data['sideAspect']))
print('bow  half-beam %.3f / %.3f   height  +%.3f / -%.3f' % (zpos[0], zneg[0], yup[0], ydn[0]))
print('mid  half-beam %.3f          height  +%.3f / -%.3f' % (zpos[N//2], yup[N//2], ydn[N//2]))
print('tail half-beam %.3f          height  +%.3f / -%.3f' % (zpos[-1], yup[-1], ydn[-1]))
print('max half-beam at station', int(np.argmax(zpos)), 'of', N)
