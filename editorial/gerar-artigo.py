#!/usr/bin/env python3
"""Gera um artigo do blog a partir de um JSON de conteúdo, usando um artigo existente como template.

Uso:  python3 editorial/gerar-artigo.py editorial/rascunhos/<slug>.json

O JSON tem: slug, titulo, title_tag (<=60), descricao (<=155), h1, data (AAAA-MM-DD), minutos,
capa (caminho em /assets/photos/), capa_alt, intro (HTML), toc ([[id, nome], ...]), corpo (HTML com <h2 id=...>),
faq ([[pergunta, resposta], ...]), cta_wa_texto, lead_titulo, lead_texto, cta1_p, cta2_p, keywords.
Nunca inclua valores de mensalidade. Só fatos de editorial/fatos.md.
"""
import re, json, os, sys
from urllib.parse import quote

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TEMPLATE = "blog/escola-infantil-segura-caxias-do-sul/index.html"
BASE = "https://maplebearcaxiasdosul.com.br"
ESCOLA = "Maple Bear Caxias do Sul"
WA = "5554996243857"
MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"]


def data_extenso(iso):
    a, m, d = iso.split("-")
    return f"{int(d)} de {MESES[int(m) - 1]} de {a}"


def gerar(c):
    for k in ("slug", "titulo", "title_tag", "descricao", "h1", "data", "intro", "corpo", "faq"):
        if not c.get(k):
            raise SystemExit(f"falta o campo {k}")
    if len(c["title_tag"]) > 60:
        raise SystemExit("title_tag passa de 60 caracteres")
    if len(c["descricao"]) > 160:
        raise SystemExit("descricao passa de 160 caracteres")
    if re.search(r"R\$\s?\d", c["intro"] + c["corpo"] + " ".join(a for _, a in c["faq"])):
        raise SystemExit("o artigo menciona valores — não publicamos mensalidade")
    t = open(os.path.join(REPO, TEMPLATE), encoding="utf-8").read()
    old_url = re.search(r'<link rel="canonical" href="([^"]+)"', t).group(1)
    new_url = f"{BASE}/blog/{c['slug']}/"
    t = t.replace(old_url, new_url)
    t = re.sub(r"<title>.*?</title>", f"<title>{c['title_tag']}</title>", t, count=1, flags=re.S)
    t = re.sub(r'<meta name="description" content="[^"]*"', f'<meta name="description" content="{c["descricao"]}"', t, count=1)
    t = re.sub(r'<meta name="keywords" content="[^"]*"', f'<meta name="keywords" content="{c.get("keywords", "")}"', t, count=1)
    for prop in ("og:title", "twitter:title"):
        t = re.sub(rf'(<meta (?:property|name)="{prop}" content=")[^"]*"', rf'\g<1>{c["titulo"]}"', t, count=1)
    for prop in ("og:description", "twitter:description"):
        t = re.sub(rf'(<meta (?:property|name)="{prop}" content=")[^"]*"', rf'\g<1>{c["descricao"]}"', t, count=1)
    t = re.sub(r'("headline":\s*")[^"]*"', rf'\g<1>{c["titulo"]}"', t, count=1)
    t = re.sub(r'("description":\s*")[^"]*"', rf'\g<1>{c["descricao"]}"', t, count=1)
    t = re.sub(r'("datePublished":\s*")[^"]*"', rf'\g<1>{c["data"]}T09:00:00.000-03:00"', t)
    t = re.sub(r'("dateModified":\s*")[^"]*"', rf'\g<1>{c["data"]}T09:00:00.000-03:00"', t)
    palavras = len(re.sub(r"<[^>]+>", " ", c["intro"] + c["corpo"]).split())
    t = re.sub(r'("wordCount":\s*)\d+', rf'\g<1>{palavras}', t)
    faqld = {"@context": "https://schema.org", "@type": "FAQPage", "mainEntity": [
        {"@type": "Question", "name": q, "acceptedAnswer": {"@type": "Answer", "text": re.sub(r"<[^>]+>", "", a)}} for q, a in c["faq"]]}
    t = re.sub(r'<script type="application/ld\+json">\s*\{[^<]*?"FAQPage".*?</script>',
               '<script type="application/ld+json">\n' + json.dumps(faqld, ensure_ascii=False, indent=2) + '\n  </script>', t, count=1, flags=re.S)
    t = re.sub(r'(<nav class="breadcrumbs".*?<span>›</span>\s*<span>)[^<]*(</span>)', rf'\g<1>{c["h1"][:60]}\g<2>', t, count=1, flags=re.S)
    bc = re.search(r'"@type":\s*"BreadcrumbList".*?</script>', t, re.S)
    if bc:
        bloco = bc.group(0)
        nomes = list(re.finditer(r'"name":\s*"[^"]*"', bloco))
        last = nomes[-1]
        bloco = bloco[:last.start()] + f'"name": "{c["h1"][:60]}"' + bloco[last.end():]
        t = t[:bc.start()] + bloco + t[bc.end():]
    ini = t.find("\n<article>") + 1
    fim = t.find('<div class="cta-box"', ini)
    if ini <= 0 or fim < 0:
        raise SystemExit("template sem <article>/cta-box")
    faq_html = "".join(f"  <h3>{q}</h3>\n  <p>{a}</p>\n" for q, a in c["faq"])
    toc_html = "".join(f'      <li><a href="#{i}">{n}</a></li>\n' for i, n in c.get("toc", []))
    art = f"""<article>
  <h1>{c['h1']}</h1>
  <div class="article-meta">
    <time datetime="{c['data']}T09:00:00.000-03:00">{data_extenso(c['data'])}</time>
    <span class="reading-badge">⏱ {c.get('minutos', 6)} min de leitura</span>
    <span>{ESCOLA}</span>
  </div>

  <img src="{c.get('capa', '/assets/photos/atividade-mesa.jpg')}" alt="{c.get('capa_alt', ESCOLA)}" class="cover-img" loading="lazy" decoding="async">

{c['intro']}

  <div class="toc">
    <h4>Neste artigo</h4>
    <ol>
{toc_html}    </ol>
  </div>

{c['corpo']}

  <h2 id="faq">Perguntas Frequentes</h2>
{faq_html}
  """
    t = t[:ini] + art + t[fim:]
    t = re.sub(r'(<div class="cta-box" data-cta="internal-links">\s*<h3>[^<]*</h3>\s*<p>)[^<]*(</p>)', rf'\g<1>{c.get("cta1_p", "Veja a metodologia canadense de perto e tire suas dúvidas com a nossa equipe.")}\g<2>', t, count=1, flags=re.S)
    t = re.sub(r'(<div class="lead-form" id="leadForm">\s*<h3>)[^<]*(</h3>\s*<p>)[^<]*(</p>)',
               rf'\g<1>{c.get("lead_titulo", "Receba mais conteúdo no seu WhatsApp")}\g<2>{c.get("lead_texto", "Cadastre-se e receba conteúdo semanal sobre primeira infância e educação bilíngue")}\g<3>', t, count=1, flags=re.S)
    wa_txt = c.get("cta_wa_texto", f"Olá! Li o artigo {c['h1']} e quero agendar uma visita.")
    t = re.sub(r'(<div class="cta-box">\s*<h3>[^<]*</h3>\s*<p>)[^<]*(</p>\s*<a href=")https://wa\.me/[^"]*(")',
               lambda m: m.group(1) + c.get("cta2_p", "Conheça a escola num dia comum de aula.") + m.group(2) + f"https://wa.me/{WA}?text=" + quote(wa_txt) + m.group(3), t, count=1, flags=re.S)
    t = re.sub(r'<div class="highlight-box" data-xref="1">.*?</div>\s*', "", t, count=1, flags=re.S)
    out = os.path.join(REPO, "blog", c["slug"], "index.html")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    open(out, "w", encoding="utf-8", newline="\n").write(t)
    sm_path = os.path.join(REPO, "sitemap.xml")
    sm = open(sm_path, encoding="utf-8").read()
    if new_url not in sm:
        entry = f"  <url>\n    <loc>{new_url}</loc>\n    <lastmod>{c['data']}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.6</priority>\n  </url>\n"
        open(sm_path, "w", encoding="utf-8", newline="\n").write(sm.replace("</urlset>", entry + "</urlset>"))
    print("ok", new_url, palavras, "palavras")


if __name__ == "__main__":
    gerar(json.load(open(sys.argv[1], encoding="utf-8")))
