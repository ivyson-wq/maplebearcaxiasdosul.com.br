"""
Extrai imagens e cores oficiais Maple Bear do PDF do brand kit.
Salva PNGs em assets/brand/extracted/ e cores em CONSOLE.
"""
import fitz  # pymupdf
import os
from pathlib import Path
from collections import Counter

PDF = Path(__file__).parent.parent / "assets" / "brand" / "manual-maple-bear.pdf"
OUT = Path(__file__).parent.parent / "assets" / "brand" / "extracted"
OUT.mkdir(exist_ok=True, parents=True)

doc = fitz.open(PDF)
print(f"Pages: {len(doc)}")

# 1. Renderizar páginas-chave como PNG em alta resolução
key_pages = {
    # logos
    3: "logos-color-shields",        # 2 escudos coloridos (Elementary + High)
    5: "logos-bw-shields",            # 2 escudos B&W
    11: "logos-color-trio-canadian",  # Chinook canadian + Elementary
    33: "logo-canadian-school-mascot",# Logo MapleBear Canadian School (chinook reading)
    35: "logo-horizontal-school",     # Logo horizontal com Chinook
    36: "logo-bw-canadian-school",    # MapleBear Canadian School B&W
    43: "logos-trio-color",           # 3 lockups coloridos
    47: "logos-trio-bw",              # 3 lockups B&W
    # new brand
    60: "brand-slogan-pt",            # Maple Bear: Muito além do bilíngue
    62: "logo-horizontal-new-color",  # Folha + MAPLE BEAR novo
    # Chinook isolated
    29: "chinook-reading-large",
    34: "chinook-reading-iconic",
    70: "chinook-face-happy",
    71: "chinook-face-smiling",
    72: "chinook-face-love",
    73: "chinook-face-kiss",
    # Selo
    59: "selo-duplo-diploma",
    # Maple leaf solo
    66: "maple-leaf-solid-red",
    65: "maple-leaf-outline",
    69: "maple-leaf-bright",
}

print("\n=== Rendering key pages ===")
for page_num, name in key_pages.items():
    if page_num >= len(doc):
        continue
    page = doc[page_num - 1]  # 0-indexed
    # Render at 3x resolution
    pix = page.get_pixmap(matrix=fitz.Matrix(3, 3), alpha=True)
    out_path = OUT / f"page-{page_num:02d}-{name}.png"
    pix.save(out_path)
    print(f"  OK{out_path.name} ({pix.width}x{pix.height})")

# 2. Extrair imagens embedded direto do PDF (pode pegar logos originais)
print("\n=== Extracting embedded images ===")
extracted_imgs = 0
for page_num in range(len(doc)):
    page = doc[page_num]
    images = page.get_images(full=True)
    for img_index, img in enumerate(images):
        xref = img[0]
        pix = fitz.Pixmap(doc, xref)
        if pix.n - pix.alpha < 4:  # GRAY or RGB
            out_path = OUT / f"embedded-p{page_num+1:02d}-{img_index}.png"
            pix.save(out_path)
            extracted_imgs += 1
        else:  # CMYK -> convert to RGB
            pix2 = fitz.Pixmap(fitz.csRGB, pix)
            out_path = OUT / f"embedded-p{page_num+1:02d}-{img_index}.png"
            pix2.save(out_path)
            extracted_imgs += 1

print(f"  Total embedded: {extracted_imgs}")

# 3. Sample cores oficiais das páginas de cor sólida (50-55)
print("\n=== Sampling official colors ===")
color_pages = [50, 51, 52, 53, 54, 55]
for page_num in color_pages:
    if page_num > len(doc):
        continue
    page = doc[page_num - 1]
    pix = page.get_pixmap(matrix=fitz.Matrix(0.5, 0.5))  # low res ok
    # Sample center
    w, h = pix.width, pix.height
    samples = []
    for x in range(w // 4, 3 * w // 4, 20):
        for y in range(h // 4, 3 * h // 4, 20):
            r, g, b = pix.pixel(x, y)[:3]
            samples.append((r, g, b))
    if samples:
        # Mode (most common color)
        c = Counter(samples).most_common(1)[0][0]
        r, g, b = c
        hex_color = f"#{r:02X}{g:02X}{b:02X}"
        print(f"  Page {page_num}: {hex_color}  (RGB {r},{g},{b})")

doc.close()
print("\nOK Extraction complete. Files in assets/brand/extracted/")
