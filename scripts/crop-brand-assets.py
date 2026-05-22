"""
Recorta os PNGs renderizados pra deixar só o logo (sem whitespace).
Salva em assets/brand/ com nomes finais (chinook-reading.png, logo-horizontal.png, etc).
"""
from PIL import Image
from pathlib import Path

EXTRACTED = Path(__file__).parent.parent / "assets" / "brand" / "extracted"
OUT = Path(__file__).parent.parent / "assets" / "brand"

def crop_to_content(img_path, out_path, padding=40):
    """Recorta a imagem removendo whitespace (pixels brancos/transparentes)."""
    im = Image.open(img_path).convert("RGBA")
    bbox = im.getbbox()
    if not bbox:
        return None

    # Encontrar bbox real do conteúdo (não-branco e não-transparente)
    pixels = im.load()
    w, h = im.size
    left, top, right, bottom = w, h, 0, 0
    for y in range(h):
        for x in range(w):
            r, g, b, a = pixels[x, y]
            # Considera "conteúdo" se NÃO é branco/quase-branco e tem alpha
            if a > 30 and not (r > 245 and g > 245 and b > 245):
                if x < left: left = x
                if y < top: top = y
                if x > right: right = x
                if y > bottom: bottom = y

    if left >= right or top >= bottom:
        return None

    # Adicionar padding
    left = max(0, left - padding)
    top = max(0, top - padding)
    right = min(w, right + padding)
    bottom = min(h, bottom + padding)

    cropped = im.crop((left, top, right, bottom))
    cropped.save(out_path, "PNG", optimize=True)
    return cropped.size

# Mapeamento de arquivos extraídos -> nomes finais oficiais
crops = {
    "page-62-logo-horizontal-new-color.png": "logo-horizontal.png",
    "page-29-chinook-reading-large.png": "chinook-reading.png",
    "page-34-chinook-reading-iconic.png": "chinook-reading-iconic.png",
    "page-70-chinook-face-happy.png": "chinook-face-happy.png",
    "page-71-chinook-face-smiling.png": "chinook-face-smiling.png",
    "page-72-chinook-face-love.png": "chinook-face-love.png",
    "page-73-chinook-face-kiss.png": "chinook-face-kiss.png",
    "page-59-selo-duplo-diploma.png": "selo-duplo-diploma.png",
    "page-66-maple-leaf-solid-red.png": "maple-leaf.png",
    "page-65-maple-leaf-outline.png": "maple-leaf-outline.png",
    "page-03-logos-color-shields.png": "shields-color-pair.png",
    "page-43-logos-trio-color.png": "lockups-trio-color.png",
    "page-33-logo-canadian-school-mascot.png": "logo-canadian-school.png",
    "page-60-brand-slogan-pt.png": "brand-slogan-pt.png",
}

print(f"Cropping {len(crops)} assets...")
for src, dst in crops.items():
    src_path = EXTRACTED / src
    dst_path = OUT / dst
    if not src_path.exists():
        print(f"  SKIP {src} (not found)")
        continue
    size = crop_to_content(src_path, dst_path, padding=40)
    if size:
        print(f"  OK {dst}  ({size[0]}x{size[1]})")

print("\nDone.")
