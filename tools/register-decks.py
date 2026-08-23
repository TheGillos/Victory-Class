"""Register the deck plan renders onto the hull's plan silhouette.

Each deck was generated independently, so the hull drifts: length-to-width
ranges 1.63 to 1.93 across the fourteen, and only 59% of the combined footprint
is common to all of them. Scrolling between decks, the ship visibly breathes.

Bounding-box alignment is not enough — Deck 9's ordnance loading trunk hangs
outside the hull, which would mis-scale that sheet. So each deck is fitted to
the top view's silhouette by maximising overlap, which the bulk of the hull
dominates and a protrusion barely moves.

    python3 tools/register-decks.py
"""
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage

DECK_SRC = os.environ.get('DECK_SRC', 'refs-src/decks')
OUT_DIR = 'public/refs/decks'
CANON_SRC = 'public/refs/topview.png'

TITLE_BAND = 80        # rows of baked title to discard before measuring
OUT_WIDTH = 1600       # width the hull itself occupies in the output
PAD = 1.25             # output canvas is larger, so a fitted plate never clips
TRIM = 0.004           # fraction of mask area ignored when measuring extent
COARSE = 64            # working resolution for the fit
DISK = np.ones((5, 5), bool)


def silhouette(rgb, thr=8):
    """Filled outline of the largest blob of ink."""
    a = np.asarray(rgb).astype(np.int32)
    lum = a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11
    m = lum > thr
    m = ndimage.binary_closing(m, DISK, iterations=2)
    lab, n = ndimage.label(m)
    if n == 0:
        raise SystemExit('no silhouette found')
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    return ndimage.binary_fill_holes(lab == int(np.argmax(sizes)) + 1)


def extent(mask):
    """Bounding box of the hull, ignoring thin protrusions.

    Deck 9's ordnance loading trunk hangs well below the hull. An absolute
    min/max would treat it as part of the ship and shrink that whole sheet, so
    each axis is trimmed to the span holding all but a sliver of the area."""
    out = []
    for axis in (0, 1):
        proj = mask.sum(axis=axis).astype(np.float64)
        c = np.cumsum(proj) / max(1.0, proj.sum())
        lo = int(np.searchsorted(c, TRIM))
        hi = int(np.searchsorted(c, 1.0 - TRIM))
        out.append((lo, max(lo + 1, hi)))
    (x0, x1), (y0, y1) = out
    return x0, x1, y0, y1


def unit_box(mask, size=COARSE):
    """Rasterise a mask into a fixed grid, normalised to its hull extent."""
    x0, x1, y0, y1 = extent(mask)
    sub = mask[y0:y1 + 1, x0:x1 + 1]
    im = Image.fromarray((sub * 255).astype(np.uint8)).resize((size, size), Image.BILINEAR)
    return np.asarray(im) > 127, (x0, x1, y0, y1)


def iou(a, b):
    return (a & b).sum() / max(1, (a | b).sum())


def fit(deck_mask, canon_mask):
    """Best scale and offset mapping the deck silhouette onto the canonical one.

    Both are rasterised into a square normalised by bounding box, so the search
    only has to recover the residual aspect and centring error."""
    d, dbox = unit_box(deck_mask)
    c, _ = unit_box(canon_mask)

    best = (-1, 1.0, 1.0, 0.0, 0.0)
    for sx in np.linspace(0.80, 1.40, 25):
        for sy in np.linspace(0.80, 1.40, 25):
            warped = warp(d, sx, sy, 0, 0)
            for tx in range(-6, 7, 2):
                for ty in range(-6, 7, 2):
                    s = iou(np.roll(np.roll(warped, ty, 0), tx, 1), c)
                    if s > best[0]:
                        best = (s, sx, sy, tx, ty)
    return best, dbox


def warp(m, sx, sy, tx, ty):
    n = m.shape[0]
    im = Image.fromarray((m * 255).astype(np.uint8))
    w, h = max(1, int(round(n * sx))), max(1, int(round(n * sy)))
    im = im.resize((w, h), Image.BILINEAR)
    out = Image.new('L', (n, n), 0)
    out.paste(im, ((n - w) // 2 + tx, (n - h) // 2 + ty))
    return np.asarray(out) > 127


def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    canon = silhouette(Image.open(CANON_SRC).convert('RGB'))
    kx0, kx1, ky0, ky1 = extent(canon)
    cw, ch = kx1 - kx0 + 1, ky1 - ky0 + 1
    out_h = int(round(OUT_WIDTH * ch / cw))
    pad_w, pad_h = int(round(OUT_WIDTH * PAD)), int(round(out_h * PAD))
    print('canonical plan %d x %d  aspect %.3f -> hull %d x %d in a %d x %d frame'
          % (cw, ch, cw / ch, OUT_WIDTH, out_h, pad_w, pad_h))

    report = {'hullFraction': round(1 / PAD, 5), 'frame': [pad_w, pad_h], 'decks': {}}
    for i in range(1, 15):
        src = Image.open(f'{DECK_SRC}/D{i}.webp').convert('RGB')
        src = src.crop((0, TITLE_BAND, src.width, src.height))
        mask = silhouette(src)
        (score, sx, sy, tx, ty), (x0, x1, y0, y1) = fit(mask, canon)

        # Map the deck's hull extent onto the canonical frame, apply the residual
        # scale and offset the fit found, and composite into a padded canvas so
        # a plate scaled past the frame keeps its edges.
        margin = int(round((PAD - 1) / 2 * OUT_WIDTH / (x1 - x0 + 1) * src.width))
        crop = src.crop((x0 - margin, y0 - margin, x1 + 1 + margin, y1 + 1 + margin))
        tw = int(round(pad_w * sx))
        th = int(round(pad_h * sy * (crop.height / crop.width) / (pad_h / pad_w)))
        plate = crop.resize((tw, max(1, th)), Image.LANCZOS)

        canvas = Image.new('RGB', (pad_w, pad_h), (0, 0, 0))
        ox = (pad_w - tw) // 2 + int(round(tx / COARSE * OUT_WIDTH))
        oy = (pad_h - plate.height) // 2 + int(round(ty / COARSE * out_h))
        canvas.paste(plate, (ox, oy))

        # Opaque, not alpha-cut: the stage behind is pure black, so the plate's
        # own background is invisible anyway, and carrying an alpha channel costs
        # 25 MB across the fourteen against 1.4 MB without.
        canvas.save(f'{OUT_DIR}/deck-{i:02d}.webp', quality=84, method=6)

        report['decks'][i] = {'iou': round(float(score), 4),
                              'sx': round(float(sx), 3), 'sy': round(float(sy), 3)}
        print('deck %-3d fit IoU %.3f   scale %.3f x %.3f' % (i, score, sx, sy))

    json.dump(report, open(f'{OUT_DIR}/registration.json', 'w'), indent=1)
    print('wrote', OUT_DIR)


main()
