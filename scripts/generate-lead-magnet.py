"""
Gera o lead magnet PDF:
"22 perguntas para fazer numa visita a uma escola bilíngue"

Layout profissional, branding sutil Maple Bear Caxias.
Output: assets/materiais/22-perguntas-visita-escola-bilingue.pdf
"""
from pathlib import Path
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.colors import HexColor, Color
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Image, PageBreak, Table, TableStyle
)
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

BRAND = Path(__file__).parent.parent / "assets" / "brand"
OUT_DIR = Path(__file__).parent.parent / "assets" / "materiais"
OUT_DIR.mkdir(parents=True, exist_ok=True)
OUT = OUT_DIR / "22-perguntas-visita-escola-bilingue.pdf"

# Cores oficiais
RED = HexColor("#CC1216")
RED_DEEP = HexColor("#AA0413")
INK = HexColor("#1a1a1a")
INK_SOFT = HexColor("#555555")
CREAM = HexColor("#F6E9E1")

# Fonts (Windows)
try:
    pdfmetrics.registerFont(TTFont('Inter', 'C:/Windows/Fonts/arial.ttf'))
    pdfmetrics.registerFont(TTFont('Inter-Bold', 'C:/Windows/Fonts/arialbd.ttf'))
    BODY_FONT = 'Inter'
    BOLD_FONT = 'Inter-Bold'
except Exception:
    BODY_FONT = 'Helvetica'
    BOLD_FONT = 'Helvetica-Bold'

styles = getSampleStyleSheet()

title_style = ParagraphStyle(
    'title', fontName=BOLD_FONT, fontSize=32, leading=38,
    textColor=INK, alignment=TA_LEFT, spaceAfter=8
)
slogan_style = ParagraphStyle(
    'slogan', fontName=BOLD_FONT, fontSize=14, leading=18,
    textColor=RED_DEEP, alignment=TA_LEFT, spaceAfter=4
)
intro_style = ParagraphStyle(
    'intro', fontName=BODY_FONT, fontSize=11, leading=17,
    textColor=INK_SOFT, alignment=TA_JUSTIFY, spaceAfter=8
)
section_style = ParagraphStyle(
    'section', fontName=BOLD_FONT, fontSize=15, leading=20,
    textColor=RED, alignment=TA_LEFT, spaceBefore=14, spaceAfter=8
)
question_num_style = ParagraphStyle(
    'qnum', fontName=BOLD_FONT, fontSize=10, leading=12,
    textColor=RED, alignment=TA_LEFT
)
question_style = ParagraphStyle(
    'q', fontName=BOLD_FONT, fontSize=11.5, leading=16,
    textColor=INK, alignment=TA_LEFT, spaceAfter=3
)
why_style = ParagraphStyle(
    'why', fontName=BODY_FONT, fontSize=10, leading=14,
    textColor=INK_SOFT, alignment=TA_JUSTIFY,
    leftIndent=14, spaceAfter=9
)
cta_title_style = ParagraphStyle(
    'cta', fontName=BOLD_FONT, fontSize=22, leading=28,
    textColor=INK, alignment=TA_CENTER
)
cta_body_style = ParagraphStyle(
    'ctab', fontName=BODY_FONT, fontSize=11, leading=16,
    textColor=INK_SOFT, alignment=TA_CENTER
)
footer_style = ParagraphStyle(
    'footer', fontName=BODY_FONT, fontSize=8, leading=10,
    textColor=INK_SOFT, alignment=TA_CENTER
)

def make_header_footer(canvas, doc):
    canvas.saveState()
    # tricolor bar bottom
    pw, ph = A4
    bar_h = 3 * mm
    canvas.setFillColor(HexColor("#FF1C25"))
    canvas.rect(0, 0, pw / 3, bar_h, stroke=0, fill=1)
    canvas.setFillColor(RED)
    canvas.rect(pw / 3, 0, pw / 3, bar_h, stroke=0, fill=1)
    canvas.setFillColor(RED_DEEP)
    canvas.rect(2 * pw / 3, 0, pw / 3, bar_h, stroke=0, fill=1)
    # page number
    canvas.setFont(BODY_FONT, 8)
    canvas.setFillColor(INK_SOFT)
    canvas.drawCentredString(pw / 2, 8 * mm, f"Maple Bear Caxias do Sul · maplebearcaxiasdosul.com.br · {doc.page}")
    canvas.restoreState()

doc = SimpleDocTemplate(
    str(OUT), pagesize=A4,
    leftMargin=22*mm, rightMargin=22*mm,
    topMargin=22*mm, bottomMargin=16*mm,
    title="22 perguntas para fazer numa visita a uma escola bilíngue",
    author="Maple Bear Caxias do Sul"
)

story = []

# ============ CAPA ============
logo_path = BRAND / "logo-lockup-compact.png"
if logo_path.exists():
    story.append(Image(str(logo_path), width=80*mm, height=40*mm, hAlign='LEFT'))
story.append(Spacer(1, 30*mm))
story.append(Paragraph("Maple Bear:<br/>Muito além do bilíngue.", slogan_style))
story.append(Spacer(1, 60*mm))
story.append(Paragraph("22 perguntas", title_style))
story.append(Paragraph("que você precisa fazer<br/>numa visita a uma<br/>escola bilíngue.", title_style))
story.append(Spacer(1, 30*mm))
story.append(Paragraph(
    "Um guia honesto para famílias atentas — escrito pela coordenação pedagógica<br/>"
    "da Maple Bear Caxias do Sul.",
    intro_style
))
story.append(PageBreak())

# ============ PÁG 2: INTRODUÇÃO ============
story.append(Paragraph("Antes de começar", section_style))
story.append(Spacer(1, 4*mm))
story.append(Paragraph(
    "Escolher a escola do seu filho é uma das decisões mais relevantes que sua família vai tomar — "
    "e talvez a única em que você confia a uma instituição a maior parte da semana do seu filho, "
    "ano após ano.",
    intro_style
))
story.append(Paragraph(
    "Diretores e coordenadores são treinados para visitas. Sabem o que mostrar, sabem o que dizer, "
    "sabem por onde te levar. Estas 22 perguntas foram montadas para te ajudar a ir <b>além</b> do "
    "tour padrão — a entender o que <i>realmente</i> acontece quando ninguém está visitando.",
    intro_style
))
story.append(Paragraph(
    "Use à vontade em qualquer escola. Inclusive — e principalmente — na nossa.",
    intro_style
))
story.append(Spacer(1, 8*mm))
story.append(Paragraph("Como usar este guia", section_style))
story.append(Paragraph(
    "<b>Antes da visita:</b> imprima ou abra no celular. Marque as perguntas que mais te interessam.",
    intro_style
))
story.append(Paragraph(
    "<b>Durante:</b> não tenha vergonha. Boas escolas adoram responder. Anote as respostas — depois "
    "você compara.",
    intro_style
))
story.append(Paragraph(
    "<b>Depois:</b> revise com calma, em casa, sem pressão de decisão imediata.",
    intro_style
))
story.append(PageBreak())

# ============ PERGUNTAS ============
sections = [
    ("Sobre o método", [
        ("Quantas horas do dia letivo são em inglês — efetivamente?",
         "Atenção: não confunda \"escola bilíngue\" com \"escola com aulas de inglês\". A diferença é o quanto do dia acontece NO idioma, não SOBRE o idioma. Em escolas bilíngues sérias, 40-50% ou mais do tempo é em inglês."),
        ("Quem é o autor do material didático que vocês usam?",
         "Materiais próprios desenvolvidos por uma rede internacional indicam currículo testado em escala. Materiais avulsos comprados separadamente exigem mais escrutínio sobre como se conectam."),
        ("A escola segue a BNCC integralmente?",
         "Currículo internacional não pode substituir o currículo brasileiro. A escola deve manter os dois em paralelo — sem reduzir nenhum."),
        ("Que metodologia pedagógica vocês usam? Por que essa escolha?",
         "Resposta vaga (\"método próprio\", \"construtivista mas adaptado\") sem capacidade de explicar a escolha é sinal de alerta. Bons educadores articulam por quê."),
    ]),
    ("Sobre a equipe", [
        ("Qual a formação dos professores de inglês?",
         "Proficiência em inglês deve ser comprovada. Pergunte por certificações internacionais (Cambridge, TOEFL, IELTS) ou tempo de vivência em país anglófono."),
        ("Como vocês formam continuamente os professores?",
         "Boa escola tem programa estruturado de formação continuada, com horas dedicadas no calendário escolar. Pergunte quantas horas por ano por professor."),
        ("Qual a rotatividade de professores nos últimos 3 anos?",
         "Alta rotatividade é vermelho. Sua filha vai criar vínculo com a professora — se ela troca toda semana, o vínculo não acontece."),
        ("Posso conhecer a coordenação pedagógica? Não só na visita, mas no dia a dia?",
         "Coordenação pedagógica deve ser presente e acessível. Se a escola é \"grande demais para isso\", talvez seja grande demais para sua família."),
    ]),
    ("Sobre o cotidiano", [
        ("Como é um dia letivo típico? Pode me descrever hora a hora?",
         "Resposta detalhada e calma indica rotina pensada. Resposta genérica (\"a gente brinca, aprende, almoça\") indica falta de estrutura."),
        ("Quantos alunos por turma — e qual o limite?",
         "Atenção individual exige tamanho de turma controlado. Pergunte qual o número MÁXIMO de alunos por sala, não apenas a média."),
        ("Como é o processo de adaptação para crianças novas?",
         "Adaptação cuidadosa significa entrada gradual, com presença dos pais nos primeiros dias se necessário. Quem trata como \"deixar e ir embora\" não está pronto para o pequeno."),
        ("Como vocês acolhem crianças com diferenças (TEA, TDAH, dislexia, etc.)?",
         "Resposta evasiva ou \"a gente não recebe esses casos\" diz muito. Boas escolas têm prática real de inclusão, com profissionais preparados."),
    ]),
    ("Sobre a comunicação com a família", [
        ("Como vocês se comunicam comigo no dia a dia?",
         "App próprio? WhatsApp? Email? Pergunte o canal, a frequência, e o tipo de informação que você vai receber (fotos, agenda, recados, avaliações)."),
        ("Com que frequência tenho reuniões formais com a professora?",
         "Mínimo aceitável: duas por ano. Boas escolas oferecem reuniões individuais sempre que necessário, sem custo extra."),
        ("Como vocês resolvem conflitos entre crianças?",
         "Resposta que envolve diálogo, mediação e acompanhamento parental é o esperado. Punições rápidas (suspensão, isolamento) sem trabalho de fundo são vermelho."),
    ]),
    ("Sobre dinheiro (sem medo)", [
        ("Qual o valor exato da mensalidade — e o que está incluso?",
         "Pergunte material, contraturno, alimentação, atividades extras, eventos. Algumas escolas têm \"taxas\" surpresa que somam 20-30% na conta final."),
        ("Há reajustes ao longo do ano? Como são calculados?",
         "Idealmente, reajuste anual conforme INPC ou IPCA. Reajustes \"a critério da direção\" são vermelho."),
        ("Tem desconto para irmãos, pagamento anual, ou bolsa estudo?",
         "Política de descontos transparente é sinal de maturidade institucional. Bolsas demonstram compromisso social."),
        ("E se eu precisar cancelar a matrícula no meio do ano?",
         "Pergunte explicitamente. Contrato precisa ser claro sobre rescisão, multas, e devolução proporcional."),
    ]),
    ("Sobre você como família", [
        ("Posso conversar com algumas famílias que estudam aqui?",
         "Resposta sem hesitação: ótimo sinal. Hesitação ou recusa: vermelho. Boas escolas têm famílias que adoram falar bem dela espontaneamente."),
        ("Posso visitar uma aula em andamento, não só ver as salas vazias?",
         "Atenção à resposta: \"sim, claro\" é o que você quer ouvir. \"Não, atrapalha\" pode indicar que tem algo que não querem mostrar."),
        ("Se eu não tiver inglês fluente, vocês me ajudam a acompanhar?",
         "Em escolas bilíngues, muitos pais não falam inglês. Boa escola oferece tradução de avisos, ferramentas de acompanhamento bilíngue, e nunca te faz sentir excluído."),
    ]),
]

q_counter = 0
for section_name, questions in sections:
    story.append(Paragraph(section_name, section_style))
    for question_text, why_text in questions:
        q_counter += 1
        story.append(Paragraph(f"#{q_counter:02d}", question_num_style))
        story.append(Paragraph(question_text, question_style))
        story.append(Paragraph(why_text, why_style))

story.append(PageBreak())

# ============ CTA FINAL ============
story.append(Spacer(1, 40*mm))
if logo_path.exists():
    story.append(Image(str(logo_path), width=70*mm, height=35*mm, hAlign='CENTER'))
story.append(Spacer(1, 12*mm))
story.append(Paragraph(
    "Use estas 22 perguntas na sua próxima visita.<br/>Inclusive — e principalmente — na nossa.",
    cta_title_style
))
story.append(Spacer(1, 8*mm))
story.append(Paragraph(
    "Maple Bear Caxias do Sul<br/>"
    "Rua Jacob Luchesi, 2374 · Caxias do Sul, RS · CEP 95032-000<br/>"
    "WhatsApp: (54) 9 9624-3857 · maplebearcaxiasdosul.com.br",
    cta_body_style
))
story.append(Spacer(1, 14*mm))
story.append(Paragraph(
    "<b>Agende sua visita guiada em maplebearcaxiasdosul.com.br/visite</b>",
    cta_body_style
))
story.append(Spacer(1, 30*mm))
story.append(Paragraph(
    "© Maple Bear Canadian School Caxias do Sul · Material gratuito · "
    "Compartilhe à vontade com famílias amigas.",
    footer_style
))

doc.build(story, onFirstPage=make_header_footer, onLaterPages=make_header_footer)
print(f"OK PDF gerado: {OUT}  ({OUT.stat().st_size // 1024} KB)")
