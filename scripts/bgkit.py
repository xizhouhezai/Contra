"""Turn a generated 21:9 panorama into a seamless 16:9 parallax layer.

Shared by build-backgrounds.py (the default industrial backdrop) and
build-scenes.py (the per-stage variants), so the keying and tiling rules stay
identical across every layer the game loads.

Layers are painted on a light backdrop, so alpha comes from a luma key: pixels
near the backdrop brightness go transparent, dark structure stays opaque, and
saturated pixels are rescued so warm lamps survive. The sky layer is opaque.

Tiling: the right edge fades into a mirrored copy of the left edge, ending with
both boundary columns on the same pixel, so the tile repeats without a hard
seam. The fade band is the only ghosted area.
"""

from PIL import Image, ImageChops

W, H = 1920, 1080


def clamp(v, lo=0, hi=255):
    return max(lo, min(hi, int(round(v))))


def fit(im: Image.Image, offset=None, size=(W, H)) -> Image.Image:
    """Crop the 21:9 source to 16:9; a custom offset also drops the corner mark."""
    w, h = size
    im = im.convert('RGB')
    im = im.resize((round(im.width * h / im.height), h), Image.LANCZOS)
    left = (im.width - w) // 2 if offset is None else min(max(0, offset), im.width - w)
    return im.crop((left, 0, left + w, h))


def key_white(im: Image.Image, clear: int, solid: int) -> Image.Image:
    """Alpha from how far a pixel sits below the painted backdrop near-white."""
    r, g, b = im.split()
    minc = ImageChops.darker(ImageChops.darker(r, g), b)
    maxc = ImageChops.lighter(ImageChops.lighter(r, g), b)
    spread = ImageChops.subtract(maxc, minc)

    span = max(1, clear - solid)
    luma = minc.point(lambda v: 0 if v >= clear else (255 if v <= solid else clamp((clear - v) * 255 / span)))
    colour = spread.point(lambda v: 0 if v <= 30 else (255 if v >= 72 else clamp((v - 30) * 255 / 42)))
    alpha = ImageChops.lighter(luma, colour).point(lambda v: 0 if v < 14 else v)

    out = im.copy()
    out.putalpha(alpha)
    return out


def auto_key(im: Image.Image) -> tuple:
    """Read the painted backdrop off the border, then key relative to it.

    Each stage is lit differently - dawn fog, high-altitude sky, furnace glow -
    so a fixed threshold either leaves a milky veil or eats the far silhouettes.
    """
    w, h = im.size
    rgb = im.convert('RGB').load()
    samples = [min(rgb[x, y]) for x in range(0, w, 8) for y in (0, 3)]
    samples += [min(rgb[x, y]) for y in range(0, h, 8) for x in (0, w - 1)]
    samples.sort()
    backdrop = samples[len(samples) // 2]
    return clamp(backdrop - 2, 120, 255), clamp(backdrop - 62, 60, 220)


def wrap(im: Image.Image, band: int, size=(W, H)) -> Image.Image:
    """Make the layer tile horizontally."""
    w, h = size
    im = im.convert('RGBA')
    left = im.crop((0, 0, band, h)).transpose(Image.FLIP_LEFT_RIGHT)
    right = im.crop((w - band, 0, w, h))

    ramp = []
    for i in range(band):
        t = i / (band - 1)
        ramp.append(clamp(255 * t * t * (3 - 2 * t)))
    mask = Image.new('L', (band, 1))
    mask.putdata(ramp)
    mask = mask.resize((band, h), Image.NEAREST)

    out = im.copy()
    out.paste(Image.composite(left, right, mask), (w - band, 0))
    out.paste(out.crop((0, 0, 1, h)), (w - 1, 0))
    return out


def wrap_vertical(im: Image.Image, band: int) -> Image.Image:
    """Tile a layer top-to-bottom instead of left-to-right.

    Stage 11 is a vertical scroller, so its layers repeat on y. Transposing
    reuses the same crossfade without duplicating the ramp maths.
    """
    turned = im.transpose(Image.TRANSPOSE)
    turned = wrap(turned, band, size=(turned.width, turned.height))
    return turned.transpose(Image.TRANSPOSE)


def seam_delta(im: Image.Image) -> float:
    """Mean per-channel difference across the tile wrap; lower is seamless."""
    w, h = im.size
    diff = ImageChops.difference(im.crop((0, 0, 1, h)), im.crop((w - 1, 0, w, h)))
    return sum(diff.tobytes()) / (h * 4)


def edge_delta(im: Image.Image) -> float:
    """Mean per-channel delta of neighbouring columns, as a seam reference."""
    w, h = im.size
    diff = ImageChops.difference(im.crop((0, 0, w - 1, h)), im.crop((1, 0, w, h)))
    return sum(diff.tobytes()) / ((w - 1) * h * 4)


def save_webp(im: Image.Image, path, quality=90):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path, 'WEBP', quality=quality, method=6)
