"""Prepare the deck plates for the console.

The deck art arrives as fourteen interiors plus D00, a separate hull-outline
layer, all drawn on one shared 1672x941 frame and already aligned to each other.
So there is no per-deck fitting to do — one transform serves every layer, which
is why nothing can drift between decks.

The transform does two things: it centres the hull inside the frame (the art is
not centred vertically) and it matches the hull's proportions to the exterior top
view, which is what the 3D model and the beauty still are built from. The deck
art's hull is about 20% narrower in beam than the exterior, so without this the
plates would not line up with the hull the strip-away animation dissolves.

    python3 tools/register-decks.py
"""
import json
import os

import numpy as np
from PIL import Image
from scipy import ndimage

SRC = os.environ.get('DECK_SRC', 'refs-src/decks-v2')
OUT_DIR = 'public/refs/decks'
HULL_DATA = 'public/js/hull-data.js'

TITLE_ROWS = 62        # baked titles live above this; the outline starts at 68
OUT_HULL_W = 1600      # width the hull occupies after scaling
DISK = np.ones((5, 5), bool)


def plan_aspect():
    """Length:beam of the exterior, from the generated hull measurements."""
    txt = open(HULL_DATA).read()
    data = json.loads(txt[txt.index('{'):txt.rindex('}') + 1])
    return data['planAspect']


def silhouette(img, thr=6):
    a = np.asarray(img.convert('RGB')).astype(np.int32)
    m = (a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11) > thr
    m = ndimage.binary_closing(m, DISK, iterations=2)
    lab, n = ndimage.label(m)
    sizes = ndimage.sum(m, lab, range(1, n + 1))
    return ndimage.binary_fill_holes(lab == int(np.argmax(sizes)) + 1)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    aspect = plan_aspect()

    outline = Image.open(f'{SRC}/D00.webp').convert('RGB')
    W0, H0 = outline.size
    ys, xs = np.where(silhouette(outline))
    x0, x1, y0, y1 = int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())
    hw, hh = x1 - x0 + 1, y1 - y0 + 1
    print('shared frame %dx%d   hull %dx%d  aspect %.4f  (exterior %.4f)'
          % (W0, H0, hw, hh, hw / hh, aspect))

    # centre the hull in a padded canvas
    padx = max(x0, W0 - 1 - x1)
    pady = max(y0, H0 - 1 - y1)
    cw, ch = hw + 2 * padx, hh + 2 * pady
    offx, offy = padx - x0, pady - y0

    out_hull_h = int(round(OUT_HULL_W / aspect))
    sx = OUT_HULL_W / hw
    sy = out_hull_h / hh
    fw, fh = int(round(cw * sx)), int(round(ch * sy))
    print('centred canvas %dx%d -> output %dx%d, hull %dx%d (stretch y %.3f)'
          % (cw, ch, fw, fh, OUT_HULL_W, out_hull_h, (hw / hh) / aspect))

    def place(img, blank_title):
        src = img.convert('RGB')
        if blank_title:
            a = np.asarray(src).copy()
            a[:TITLE_ROWS] = 0          # drop the baked title, keep the frame
            src = Image.fromarray(a)
        canvas = Image.new('RGB', (cw, ch), (0, 0, 0))
        canvas.paste(src, (offx, offy))
        return canvas.resize((fw, fh), Image.LANCZOS)

    place(outline, False).save(f'{OUT_DIR}/hull-outline.webp', quality=88, method=6)

    for i in range(1, 15):
        plate = place(Image.open(f'{SRC}/aD{i}.webp'), True)
        plate.save(f'{OUT_DIR}/deck-{i:02d}.webp', quality=84, method=6)

    json.dump({'frame': [fw, fh],
               'hullFraction': round(OUT_HULL_W / fw, 5),
               'planAspect': aspect},
              open(f'{OUT_DIR}/registration.json', 'w'), indent=1)
    print('hullFraction %.4f' % (OUT_HULL_W / fw))
    print('wrote', OUT_DIR)


main()
