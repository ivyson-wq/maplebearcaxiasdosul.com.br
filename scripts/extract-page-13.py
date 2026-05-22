"""
Extrai logos da página 13 do manual de marca Maple Bear,
mantendo fundo transparente.
"""
import fitz
from PIL import Image
from pathlib import Path

PDF = Path(__file__).parent.parent / "assets" / "brand" / "manual-maple-bear.pdf"
OUT = Path(__file__).parent.parent / "assets" / "brand"

doc = fitz.open(PDF)
# Página 13 (1-indexed) = índice 12
for page_num in (13, 14):
    page = doc[page_num - 1]
    # Render em 4x com alpha
    pix = page.get_pixmap(matrix=fitz.Matrix(4, 4), alpha=True)
    raw_path = OUT / f"_raw-page-{page_num}.png"
    pix.save(raw_path)

    # Abrir, recortar área com conteúdo, manter transparência
    im = Image.open(raw_path).convert("RGBA")
    pixels = im.load()
    w, h = im.size

    # Tornar branco/quase-branco TRANSPARENTE
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            if r > 245 and g > 245 and b > 245:
                pixels[x, y] = (r, g, b, 0)

    # Crop pelo conteúdo opaco
    bbox = im.getbbox()
    if bbox:
        left, top, right, bottom = bbox
        pad = 80
        left = max(0, left - pad)
        top = max(0, top - pad)
        right = min(w, right + pad)
        bottom = min(h, bottom + pad)
        cropped = im.crop((left, top, right, bottom))
        out_path = OUT / f"page-{page_num:02d}-transparent.png"
        cropped.save(out_path, "PNG", optimize=True)
        print(f"OK page-{page_num:02d}-transparent.png  ({cropped.size[0]}x{cropped.size[1]})")
    raw_path.unlink()

doc.close()
