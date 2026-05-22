"""
PDF: "Inglês em casa sem saber inglês"
12 rotinas práticas para pais não-fluentes apoiarem o bilinguismo.
"""
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

BRAND = Path(__file__).parent.parent / "assets" / "brand"
OUT_DIR = Path(__file__).parent.parent / "assets" / "materiais"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT = OUT_DIR / "ingles-em-casa-sem-saber-ingles.pdf"

RED = HexColor("#CC1216")
RED_DEEP = HexColor("#AA0413")
RED_BRIGHT = HexColor("#FF1C25")
INK = HexColor("#1a1a1a")
INK_SOFT = HexColor("#555555")
CREAM = HexColor("#F6E9E1")

try:
    pdfmetrics.registerFont(TTFont('Inter', 'C:/Windows/Fonts/arial.ttf'))
    pdfmetrics.registerFont(TTFont('Inter-Bold', 'C:/Windows/Fonts/arialbd.ttf'))
    BODY, BOLD = 'Inter', 'Inter-Bold'
except Exception:
    BODY, BOLD = 'Helvetica', 'Helvetica-Bold'

styles = {
    'title': ParagraphStyle('title', fontName=BOLD, fontSize=30, leading=36, textColor=INK, alignment=TA_LEFT, spaceAfter=6),
    'subtitle': ParagraphStyle('sub', fontName=BOLD, fontSize=14, leading=18, textColor=RED_DEEP, alignment=TA_LEFT, spaceAfter=4),
    'body': ParagraphStyle('body', fontName=BODY, fontSize=11, leading=17, textColor=INK_SOFT, alignment=TA_JUSTIFY, spaceAfter=8),
    'section': ParagraphStyle('section', fontName=BOLD, fontSize=15, leading=20, textColor=RED, alignment=TA_LEFT, spaceBefore=14, spaceAfter=8),
    'rotina_num': ParagraphStyle('rnum', fontName=BOLD, fontSize=11, leading=13, textColor=RED, alignment=TA_LEFT),
    'rotina_titulo': ParagraphStyle('rt', fontName=BOLD, fontSize=12.5, leading=16, textColor=INK, alignment=TA_LEFT, spaceAfter=3),
    'rotina_corpo': ParagraphStyle('rc', fontName=BODY, fontSize=10.5, leading=15, textColor=INK_SOFT, alignment=TA_JUSTIFY, leftIndent=14, spaceAfter=10),
    'cta_t': ParagraphStyle('cta', fontName=BOLD, fontSize=22, leading=28, textColor=INK, alignment=TA_CENTER),
    'cta_b': ParagraphStyle('ctab', fontName=BODY, fontSize=11, leading=16, textColor=INK_SOFT, alignment=TA_CENTER),
    'footer': ParagraphStyle('footer', fontName=BODY, fontSize=8, leading=10, textColor=INK_SOFT, alignment=TA_CENTER),
}

def header_footer(canvas, doc):
    canvas.saveState()
    pw, ph = A4
    bar_h = 3 * mm
    canvas.setFillColor(RED_BRIGHT); canvas.rect(0, 0, pw/3, bar_h, stroke=0, fill=1)
    canvas.setFillColor(RED); canvas.rect(pw/3, 0, pw/3, bar_h, stroke=0, fill=1)
    canvas.setFillColor(RED_DEEP); canvas.rect(2*pw/3, 0, pw/3, bar_h, stroke=0, fill=1)
    canvas.setFont(BODY, 8); canvas.setFillColor(INK_SOFT)
    canvas.drawCentredString(pw/2, 8*mm, f"Maple Bear Caxias do Sul · maplebearcaxiasdosul.com.br · {doc.page}")
    canvas.restoreState()

doc = SimpleDocTemplate(
    str(OUT), pagesize=A4,
    leftMargin=22*mm, rightMargin=22*mm,
    topMargin=22*mm, bottomMargin=16*mm,
    title="Inglês em casa sem saber inglês",
    author="Maple Bear Caxias do Sul",
)

story = []

# CAPA
logo = BRAND / "logo-lockup-compact.png"
if logo.exists():
    story.append(Image(str(logo), width=80*mm, height=40*mm, hAlign='LEFT'))
story.append(Spacer(1, 30*mm))
story.append(Paragraph("Maple Bear:<br/>Muito além do bilíngue.", styles['subtitle']))
story.append(Spacer(1, 50*mm))
story.append(Paragraph("Inglês em casa", styles['title']))
story.append(Paragraph("<font color='#CC1216'>sem saber inglês.</font>", styles['title']))
story.append(Spacer(1, 16*mm))
story.append(Paragraph(
    "12 rotinas práticas — testadas por famílias da Maple Bear — para apoiar o bilinguismo "
    "do seu filho mesmo se você não fala inglês fluentemente.",
    styles['body']
))
story.append(PageBreak())

# INTRO
story.append(Paragraph("Antes de começar", styles['section']))
story.append(Paragraph(
    "Muitos pais nos perguntam: <i>\"meu filho estuda em escola bilíngue, mas eu não falo inglês. "
    "Como ajudo em casa?\"</i> A resposta curta: <b>você não precisa falar inglês para ajudar</b>.",
    styles['body']
))
story.append(Paragraph(
    "O que crianças bilíngues precisam em casa não é uma segunda professora — é <i>exposição</i>, "
    "<i>rotina</i> e <i>validação do esforço</i>. Tudo isso, qualquer pai consegue oferecer.",
    styles['body']
))
story.append(Paragraph(
    "Este guia traz 12 rotinas práticas que famílias da nossa escola incorporaram ao dia a dia. "
    "Não precisa fazer as 12. Comece com 1 ou 2 — as que melhor encaixam na sua rotina — e veja "
    "o efeito.",
    styles['body']
))
story.append(Paragraph(
    "<b>Importante:</b> a criança vai te corrigir. Vai rir da sua pronúncia. Isso é <i>excelente</i> — "
    "significa que ela está confiante no idioma e que ensinar te diverte. Aceite a inversão.",
    styles['body']
))
story.append(PageBreak())

# 12 ROTINAS
rotinas = [
    ("Música no carro", "Substitua a playlist do caminho da escola por canções infantis em inglês. Não precisa entender — a criança vai. Em duas semanas, ela já está cantando trechos. Sugestões: Super Simple Songs, Cocomelon, Pinkfong."),
    ("Desenhos em inglês — sem dublagem", "Por padrão, deixe os desenhos em inglês com legendas em português. A criança liga as imagens às palavras. Tempo de tela continua o mesmo; só muda o idioma de entrada."),
    ("Pergunta do dia em inglês", "Uma única pergunta por dia: 'How was your day at school?' Não precisa entender a resposta — só ouvir. Em duas semanas, ela responde sem pensar."),
    ("Audiolivros antes de dormir", "20 minutos de audiolivro infantil em inglês antes de dormir. Funciona melhor que história lida porque libera o pai. Apps: Storynory (grátis), Audible Kids, Spotify."),
    ("Etiquetas em casa", "Etiquetas com nomes em inglês nos objetos mais usados: fridge, door, chair, table, window. A criança vai apontar e ler. Inglês entra pela visão diária."),
    ("Receita em inglês", "Uma vez por semana, cozinhem juntos seguindo uma receita simples em inglês (YouTube tem milhares de pancakes, cookies). Vocabulário entra contextualizado e divertido."),
    ("Jogo de mesa traduzido", "Use jogos como UNO, Pictionary, Memory dizendo em inglês: 'red', 'blue', 'your turn', 'one more'. Tempo de jogo continua o mesmo; idioma muda."),
    ("Letra de música favorita", "Quando a criança ama uma música em inglês, sentem juntos no Google e leiam a letra. Não precisa traduzir tudo — só as palavras que ela quer entender. Eficácia altíssima."),
    ("Conversa com o gato (ou o cachorro)", "Encorajem a criança a falar com o pet em inglês. É baixo risco (animal não corrige), divertido, e ela pratica conversação espontânea. Funciona muito bem para tímidos."),
    ("YouTube de adultos sobre interesses dela", "Se a criança curte LEGO, Minecraft, futebol, etc., há centenas de canais de adultos em inglês sobre o tema. Conteúdo de alto nível vocabular, ela aguenta porque ama o assunto."),
    ("Pedido em restaurante", "Quando saírem para comer, deixe a criança pedir em inglês para o garçom (mesmo que o garçom não entenda). É treino de coragem mais que de idioma — e cria memória afetiva forte com o bilinguismo."),
    ("Mensagem de voz para um amigo bilíngue", "Se conhecem outra família bilíngue, criem o hábito de mandar mensagens de voz em inglês entre as crianças. Comunicação real, com sentido, sem julgamento adulto."),
]

q = 0
for nome, corpo in rotinas:
    q += 1
    story.append(Paragraph(f"#{q:02d}", styles['rotina_num']))
    story.append(Paragraph(nome, styles['rotina_titulo']))
    story.append(Paragraph(corpo, styles['rotina_corpo']))

story.append(PageBreak())

# CTA
story.append(Spacer(1, 30*mm))
if logo.exists():
    story.append(Image(str(logo), width=70*mm, height=35*mm, hAlign='CENTER'))
story.append(Spacer(1, 12*mm))
story.append(Paragraph("Quer ver a imersão acontecendo<br/>na prática?", styles['cta_t']))
story.append(Spacer(1, 8*mm))
story.append(Paragraph(
    "Em uma visita guiada de 1 hora você assiste a uma aula em ação,<br/>"
    "conversa com a coordenação pedagógica e tira todas as dúvidas.",
    styles['cta_b']
))
story.append(Spacer(1, 14*mm))
story.append(Paragraph(
    "<b>Agende em maplebearcaxiasdosul.com.br/visite</b><br/>"
    "ou no WhatsApp (54) 9 9702-1634",
    styles['cta_b']
))
story.append(Spacer(1, 8*mm))
story.append(Paragraph(
    "Rua Jacob Luchesi, 2374 · Caxias do Sul · RS · 95032-000",
    styles['cta_b']
))
story.append(Spacer(1, 24*mm))
story.append(Paragraph(
    "© Maple Bear Caxias do Sul · Material gratuito · Compartilhe com famílias amigas.",
    styles['footer']
))

doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
print(f"OK PDF: {OUT}  ({OUT.stat().st_size // 1024} KB)")
