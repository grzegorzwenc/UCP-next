"""Build app/favicon.ico from the same geometry as app/icon.svg.

The polygons are taken straight from the source project's favicon.svg (viewBox 0 0 172 172,
group translated by y+43.5), so the .ico and the .svg are the same drawing — a browser that
prefers one over the other shows no difference. Rendered at 16x and downsampled with LANCZOS
for clean edges at favicon sizes, then packed as an ICO of PNG frames.
"""
import io, struct
from PIL import Image, ImageDraw

VB, SS = 172, 16            # viewBox size, supersample factor
WHITE, RED = (255, 255, 255, 255), (0xDB, 0x00, 0x11, 255)
DY = 43.5                   # the SVG's <g transform="translate(0 43.5)">

POLYS = [
    (WHITE, [(128.9, 0), (43.9, 0), (1.4, 42.5), (43.9, 85), (128.9, 85), (171.5, 42.5)]),
    (RED,   [(171.5, 42.5), (128.9, 0), (128.9, 85)]),
    (RED,   [(86.4, 42.5), (128.9, 0), (43.9, 0)]),
    (RED,   [(1.4, 42.5), (43.9, 85), (43.9, 0)]),
    (RED,   [(86.4, 42.5), (43.9, 85), (128.9, 85)]),
]

master = Image.new("RGBA", (VB * SS, VB * SS), (0, 0, 0, 0))
d = ImageDraw.Draw(master)
for fill, pts in POLYS:
    d.polygon([((x) * SS, (y + DY) * SS) for x, y in pts], fill=fill)

SIZES = [16, 32, 48, 64, 128, 256]
frames = [master.resize((s, s), Image.LANCZOS) for s in SIZES]

# ICO container: 6-byte header, one 16-byte directory entry per frame, then the PNG payloads.
blobs = []
for im in frames:
    b = io.BytesIO()
    im.save(b, format="PNG", optimize=True)
    blobs.append(b.getvalue())

offset = 6 + 16 * len(frames)
header = struct.pack("<HHH", 0, 1, len(frames))
entries = b""
for s, blob in zip(SIZES, blobs):
    # 256 is stored as 0 in the single-byte width/height fields
    entries += struct.pack("<BBBBHHII", 0 if s == 256 else s, 0 if s == 256 else s, 0, 0, 1, 32, len(blob), offset)
    offset += len(blob)

with open("app/favicon.ico", "wb") as f:
    f.write(header + entries + b"".join(blobs))
print("wrote app/favicon.ico:", sum(len(b) for b in blobs) + 6 + 16 * len(frames), "bytes,", len(frames), "frames", SIZES)
