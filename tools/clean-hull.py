"""Strip detached junk geometry from the scanned hull.

The Meshy export carries a few small islands floating clear of the ship. They
are invisible in the shaded view but obvious in the wireframe. This welds
vertices by position, finds connected components, and keeps only those large
enough to be part of the hull.

    python3 tools/clean-hull.py <in.glb> <out.glb> [min_fraction]
"""
import json
import struct
import sys

import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

WELD_DECIMALS = 5


def read_glb(path):
    d = open(path, 'rb').read()
    off, chunks = 12, {}
    while off < len(d):
        clen, ctype = struct.unpack('<I4s', d[off:off + 8])
        chunks[ctype.rstrip(b'\x00')] = d[off + 8:off + 8 + clen]
        off += 8 + clen
    return json.loads(chunks[b'JSON']), bytearray(chunks[b'BIN'])


def write_glb(path, gltf, binary):
    js = json.dumps(gltf, separators=(',', ':')).encode()
    js += b' ' * (-len(js) % 4)
    binary += b'\x00' * (-len(binary) % 4)
    out = struct.pack('<I4s', len(js), b'JSON') + js
    out += struct.pack('<I4s', len(binary), b'BIN\x00') + bytes(binary)
    open(path, 'wb').write(struct.pack('<4sII', b'glTF', 2, 12 + len(out)) + out)


def main():
    src, dst = sys.argv[1], sys.argv[2]
    min_fraction = float(sys.argv[3]) if len(sys.argv) > 3 else 0.02

    gltf, binary = read_glb(src)
    prim = gltf['meshes'][0]['primitives'][0]

    def read(acc_i, dtype, comps):
        acc = gltf['accessors'][acc_i]
        bv = gltf['bufferViews'][acc['bufferView']]
        start = bv.get('byteOffset', 0) + acc.get('byteOffset', 0)
        n = acc['count'] * comps
        a = np.frombuffer(binary, dtype=dtype, count=n, offset=start)
        return a.reshape(acc['count'], comps) if comps > 1 else a

    idx = read(prim['indices'], np.uint32, 1).astype(np.int64)
    pos = read(prim['attributes']['POSITION'], np.float32, 3)
    nrm = read(prim['attributes']['NORMAL'], np.float32, 3)
    tris = idx.reshape(-1, 3)
    print('input  %d tris  %d verts' % (len(tris), len(pos)))

    # weld by position so seams do not read as separate islands
    _, weld = np.unique(np.round(pos, WELD_DECIMALS), axis=0, return_inverse=True)
    w = weld[tris]
    rows = np.concatenate([w[:, 0], w[:, 1], w[:, 2]])
    cols = np.concatenate([w[:, 1], w[:, 2], w[:, 0]])
    g = coo_matrix((np.ones(len(rows), np.uint8), (rows, cols)),
                   shape=(weld.max() + 1,) * 2)
    ncomp, label = connected_components(g, directed=False)

    tri_label = label[w[:, 0]]
    sizes = np.bincount(tri_label, minlength=ncomp)
    order = np.argsort(sizes)[::-1]
    print('components: %d' % ncomp)
    for c in order[:8]:
        if sizes[c]:
            print('   %8d tris  (%.4f%%)' % (sizes[c], 100 * sizes[c] / len(tris)))

    keep_labels = np.where(sizes >= min_fraction * len(tris))[0]
    keep = np.isin(tri_label, keep_labels)
    print('keeping %d of %d components -> %d tris (dropped %d)'
          % (len(keep_labels), (sizes > 0).sum(), keep.sum(), (~keep).sum()))

    tris = tris[keep]
    used = np.unique(tris)
    remap = np.full(len(pos), -1, np.int64)
    remap[used] = np.arange(len(used))
    tris = remap[tris]
    pos, nrm = pos[used], nrm[used]
    print('output %d tris  %d verts' % (len(tris), len(pos)))

    ib = tris.astype(np.uint32).tobytes()
    pb = pos.astype(np.float32).tobytes()
    nb = nrm.astype(np.float32).tobytes()
    binary = bytearray(ib + pb + nb)

    gltf['bufferViews'] = [
        {'buffer': 0, 'byteLength': len(ib), 'target': 34963},
        {'buffer': 0, 'byteOffset': len(ib), 'byteLength': len(pb), 'target': 34962},
        {'buffer': 0, 'byteOffset': len(ib) + len(pb), 'byteLength': len(nb), 'target': 34962},
    ]
    gltf['accessors'] = [
        {'bufferView': 0, 'componentType': 5125, 'count': tris.size, 'type': 'SCALAR'},
        {'bufferView': 1, 'componentType': 5126, 'count': len(pos), 'type': 'VEC3',
         'min': pos.min(0).tolist(), 'max': pos.max(0).tolist()},
        {'bufferView': 2, 'componentType': 5126, 'count': len(nrm), 'type': 'VEC3'},
    ]
    prim['indices'] = 0
    prim['attributes'] = {'POSITION': 1, 'NORMAL': 2}
    gltf['buffers'] = [{'byteLength': len(binary)}]

    write_glb(dst, gltf, binary)
    print('wrote', dst)


main()
