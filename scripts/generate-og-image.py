"""
Gera OG image 1200x630 oficial Maple Bear Caxias com:
- Cream background (#F6E9E1)
- Logo horizontal Maple Bear no topo
- Slogan "Muito além do bilíngue." em destaque
- Chinook lendo no canto direito
- "Caxias do Sul" subtitle
"""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path

BRAND = Path(__file__).parent.parent / "assets" / "brand"
OUT = Path(__file__).parent.parent / "assets" / "og-image.png"

W, H = 1200, 630
CREAM = (246, 233, 225, 255)
RED = (204, 18, 22, 255)
RED_DEEP = (170, 4, 19, 255)
INK = (0, 0, 0, 255)
INK_SOFT = (50, 50, 50, 255)

# Fontes — Windows system fonts (Inter ou Arial)
def font(size, bold=False):
    # Tentar Inter (instalada via Google Fonts no sistema?) ou fallback Arial
    for name in (
        "C:/Windows/Fonts/arialbd.ttf" if bold else "C:/Windows/Fonts/arial.ttf",
        "C:/Windows/Fonts/segoeuib.ttf" if bold else "C:/Windows/Fonts/segoeui.ttf",
    ):
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()

# Canvas
img = Image.new("RGBA", (W, H), CREAM)
draw = ImageDraw.Draw(img)

# Logo Maple Bear horizontal — topo esquerdo
logo = Image.open(BRAND / "logo-horizontal.png").convert("RGBA")
logo_w = 320
ratio = logo_w / logo.width
logo_h = int(logo.height * ratio)
logo = logo.resize((logo_w, logo_h), Image.LANCZOS)
img.paste(logo, (60, 50), logo)

# Divisor + "Caxias do Sul"
draw.rectangle([(60 + logo_w + 20, 50 + 15), (60 + logo_w + 22, 50 + logo_h - 15)], fill=INK)
caxias_font = font(26, bold=True)
draw.text((60 + logo_w + 38, 50 + 18), "CAXIAS DO SUL", font=caxias_font, fill=INK)
sub_font = font(18)
draw.text((60 + logo_w + 38, 50 + 50), "Canadian School", font=sub_font, fill=INK_SOFT)

# Slogan principal — "Muito além do bilíngue."
# Lockup oficial: "Maple Bear:" preto + "Muito além do bilíngue." vermelho highlighter
slogan_y = 230

# Linha 1
mb_font = font(72, bold=True)
draw.text((60, slogan_y), "Muito além do", font=mb_font, fill=INK)

# Linha 2 com highlighter vermelho
slogan_text = "bilíngue."
slogan_font = font(72, bold=True)
bbox = draw.textbbox((0, 0), slogan_text, font=slogan_font)
text_w = bbox[2] - bbox[0]
text_h = bbox[3] - bbox[1]
y2 = slogan_y + 95
pad_x, pad_y = 20, 12
draw.rectangle(
    [(60 - pad_x + 10, y2 - pad_y + 10), (60 + text_w + pad_x, y2 + text_h + pad_y + 5)],
    fill=RED_DEEP
)
draw.text((60, y2), slogan_text, font=slogan_font, fill=CREAM)

# Tagline curta
tag_font = font(24)
draw.text((60, y2 + text_h + pad_y + 35), "Educação canadense em Caxias do Sul, RS.", font=tag_font, fill=INK_SOFT)

# Chinook lendo no canto direito
chinook = Image.open(BRAND / "chinook-reading.png").convert("RGBA")
ch_w = 420
ratio = ch_w / chinook.width
ch_h = int(chinook.height * ratio)
chinook = chinook.resize((ch_w, ch_h), Image.LANCZOS)
img.paste(chinook, (W - ch_w - 40, (H - ch_h) // 2 + 20), chinook)

# Barra de cores Maple Bear no rodapé (red bright + red + red deep)
bar_h = 14
draw.rectangle([(0, H - bar_h), (W // 3, H)], fill=(255, 28, 37, 255))
draw.rectangle([(W // 3, H - bar_h), (2 * W // 3, H)], fill=RED)
draw.rectangle([(2 * W // 3, H - bar_h), (W, H)], fill=RED_DEEP)

# Site URL
url_font = font(18)
draw.text((60, H - 50), "maplebearcaxiasdosul.com.br", font=url_font, fill=INK_SOFT)

img.save(OUT, "PNG", optimize=True)
print(f"OK OG image saved: {OUT}  ({img.size[0]}x{img.size[1]})")
