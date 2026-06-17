# -*- coding: utf-8 -*-
"""Conservative internal-linking pass for blog posts.
- Adds ONE end-of-article CTA block (links to /visite/ and /matriculas/) before the lead-form, if absent.
- Adds 1-2 in-content contextual links to the most relevant pillar page, if a natural anchor phrase exists and isn't already linked.
Idempotent: re-running makes no further changes.
"""
import os, re, sys

BLOG = os.path.join(os.path.dirname(__file__), "..", "blog")
BLOG = os.path.abspath(BLOG)

CTA_MARKER = 'data-cta="internal-links"'
CTA_BLOCK = '''  <!-- CTA interno (links de site) -->
  <div class="cta-box" data-cta="internal-links">
    <h3>Pronto para conhecer a Maple Bear Caxias do Sul?</h3>
    <p>Veja a metodologia canadense de perto e tire suas dúvidas com a nossa equipe.</p>
    <a href="/visite/">Agendar uma visita</a>
    <p class="urgency" style="margin-top:14px"><a href="/matriculas/" style="color:#FCA5A5;text-decoration:underline;background:none;padding:0;display:inline">Ver como funcionam as matrículas 2026</a></p>
  </div>

'''

LEADFORM_RE = re.compile(r'(\n[ \t]*)(<div class="lead-form" id="leadForm")')

# Map: slug -> list of (pillar_url, [candidate anchor phrases]).
# First phrase found in body (case-insensitive, not already inside an <a>) gets linked.
# Order matters; we add at most 2 contextual links per post, preferring distinct pillars.
M = "/metodologia/"
N = "/niveis/"
NI = "/niveis/infantil/"
NF = "/niveis/fundamental-1/"

PLAN = {
 "adaptacao-escola-bilingue-dicas-pais": [(NI, ["educação infantil bilíngue", "educação infantil"])],
 "alfabetizacao-bilingue-fases": [(NF, ["Ensino Fundamental I", "ensino fundamental"]), (M, ["metodologia canadense"])],
 "ansiedade-infantil-escola-sinais": [(NI, ["educação infantil"])],
 "bercario-bilingue-caxias-do-sul": [(NI, ["educação infantil bilíngue", "educação infantil"])],
 "birras-e-limites-primeira-infancia": [(NI, ["educação infantil"])],
 "bullying-escola-bilingue-prevencao": [(M, ["desenvolvimento socioemocional"])],
 "cambridge-young-learners-exam": [(NF, ["Ensino Fundamental I", "ensino fundamental"])],
 "como-escolher-escola-bilingue": [(M, ["metodologia canadense", "metodologia"]), (N, ["educação infantil ao ensino fundamental", "níveis de ensino"])],
 "como-saber-se-meu-filho-esta-aprendendo-ingles-de-verdade": [(M, ["metodologia canadense", "metodologia"])],
 "curriculo-canadense-escola-bilingue": [(M, ["metodologia canadense", "currículo canadense"])],
 "desenvolvimento-socioemocional-bilingue": [(M, ["metodologia canadense", "desenvolvimento socioemocional"])],
 "ed-infantil-bilingue-1-5-a-5-anos": [(NI, ["educação infantil bilíngue", "educação infantil"])],
 "educacao-bilingue-beneficios-criancas": [(M, ["metodologia canadense"])],
 "educacao-infantil-em-caxias-do-sul": [(NI, ["educação infantil bilíngue", "educação infantil"])],
 "escola-bilingue-caxias-do-sul": [(M, ["metodologia canadense"]), (N, ["educação infantil"])],
 "escola-bilingue-caxias-matricula-2026": [(M, ["metodologia canadense"])],
 "escola-bilingue-confunde-crianca": [(M, ["metodologia canadense", "imersão"])],
 "escola-bilingue-educacao-infantil-necessaria": [(NI, ["educação infantil bilíngue", "educação infantil"])],
 "escola-bilingue-ou-curso-de-ingles-qual-escolher": [(M, ["metodologia canadense", "imersão"])],
 "escola-inclusiva-educacao-infantil-caxias-do-sul": [(NI, ["educação infantil"])],
 "escola-infantil-acolhedora-caxias-do-sul": [(NI, ["educação infantil"])],
 "escola-infantil-montessori-caxias-do-sul": [(NI, ["educação infantil"]), (M, ["metodologia canadense"])],
 "escola-infantil-periodo-integral-caxias-do-sul": [(NI, ["educação infantil"])],
 "escola-infantil-segura-caxias-do-sul": [(NI, ["educação infantil"])],
 "escola-infantil-sem-telas-caxias-do-sul": [(NI, ["educação infantil"])],
 "escola-infantil-turmas-pequenas-caxias-do-sul": [(NI, ["educação infantil"])],
 "escola-internacional-caxias-do-sul": [(M, ["metodologia canadense"])],
 "escola-reggio-emilia-caxias-do-sul": [(NI, ["educação infantil"]), (M, ["metodologia canadense"])],
 "escola-respeita-ritmo-crianca-caxias-do-sul": [(NI, ["educação infantil"])],
 "escola-waldorf-caxias-do-sul": [(NI, ["educação infantil"]), (M, ["metodologia canadense"])],
 "escolha-escola-particular-checklist": [(M, ["metodologia canadense", "metodologia"])],
 "fundamental-1-escola-bilingue": [(NF, ["Ensino Fundamental I", "ensino fundamental"]), (M, ["metodologia canadense"])],
 "habilidades-socioemocionais-bncc": [(M, ["desenvolvimento socioemocional", "metodologia canadense"])],
 "idade-certa-escola-bilingue": [(NI, ["educação infantil bilíngue", "educação infantil"]), (M, ["metodologia canadense"])],
 "imersao-ingles-vs-aulas-ingles": [(M, ["metodologia canadense", "imersão"])],
 "ingles-em-casa-rotina-familia": [(M, ["metodologia canadense"])],
 "leitura-infantil-bilingue-livros": [(NI, ["educação infantil"])],
 "licao-de-casa-escola-bilingue": [(NF, ["Ensino Fundamental I", "ensino fundamental"])],
 "maple-bear-caxias-infraestrutura": [(M, ["metodologia canadense"])],
 "maple-bear-e-boa-vale-a-pena": [(M, ["metodologia canadense"])],
 "matricula-escola-bilingue-documentacao": [(N, ["educação infantil ao ensino fundamental", "níveis de ensino", "educação infantil"])],
 "melhor-escola-educacao-infantil-caxias-do-sul": [(NI, ["educação infantil"])],
 "melhores-escolas-bilingues-caxias-do-sul": [(M, ["metodologia canadense"])],
 "mensalidade-maple-bear-caxias-do-sul": [(M, ["metodologia canadense"])],
 "metodologia-canadense-maple-bear": [(M, ["metodologia canadense"])],
 "metodologias-ativas-canadense": [(M, ["metodologia canadense"])],
 "neurociencia-bilinguismo-cerebro": [(M, ["metodologia canadense"])],
 "pensamento-critico-criancas-como-desenvolver": [(M, ["metodologia canadense", "pensamento crítico"])],
 "preparacao-cambridge-criancas": [(NF, ["Ensino Fundamental I", "ensino fundamental"])],
 "primeiro-dia-escola-bilingue-pais": [(NI, ["educação infantil"])],
 "professor-bilingue-o-que-avaliar": [(M, ["metodologia canadense"])],
 "quanto-custa-escola-bilingue-2026": [(M, ["metodologia canadense"])],
 "resultado-enem-escola-bilingue": [(NF, ["Ensino Fundamental", "ensino fundamental"])],
 "rotina-escola-bilingue-dia-a-dia": [(NI, ["educação infantil"]), (M, ["metodologia canadense"])],
 "screen-time-bilingue-criancas": [(NI, ["educação infantil"])],
 "segundo-idioma-antes-dos-5-anos": [(NI, ["educação infantil bilíngue", "educação infantil"])],
 "vocabulario-ingles-por-idade": [(NI, ["educação infantil"])],
}

# Posts to skip entirely for CTA (bespoke hub-style template).
SKIP_CTA = {"escola-bilingue"}

def body_bounds(html):
    """Return (start, end) char offsets bounding the article body where we may
    safely add contextual links (between first <h1> and the Lead Capture / lead-form / cta-box)."""
    h1 = html.find("<h1>")
    start = h1 if h1 != -1 else 0
    # earliest of these markers ends the body
    ends = []
    for m in ['<div class="lead-form"', '<!-- Lead Capture Form -->', '<!-- Bottom CTA -->', '<div class="cta-box"']:
        i = html.find(m)
        if i != -1:
            ends.append(i)
    end = min(ends) if ends else len(html)
    return start, end

def add_contextual(html, slug):
    """Add up to the planned contextual links inside the body. Returns (html, n_added)."""
    targets = PLAN.get(slug, [])
    if not targets:
        return html, 0
    added = 0
    used_pillars = set()
    for pillar, phrases in targets:
        if added >= 2:
            break
        if pillar in used_pillars:
            continue
        # skip if a body link to this pillar already exists
        bstart, bend = body_bounds(html)
        body = html[bstart:bend]
        if ('href="%s"' % pillar) in body:
            used_pillars.add(pillar)
            continue
        done = False
        for phrase in phrases:
            # Find phrase in body, not already inside an anchor. Conservative: match
            # a plain text occurrence (no '<' between), case-insensitive on first letter.
            # Build a regex for the exact phrase as a standalone text run.
            pat = re.compile(r'(?<![\w/>"])(' + re.escape(phrase) + r')(?![\w<])', re.IGNORECASE)
            # search within body, but ensure the match is not inside an <a ...>...</a>
            for mt in pat.finditer(body):
                s, e = mt.start(), mt.end()
                # check not inside an existing anchor: look back for unclosed <a
                before = body[:s]
                last_open = before.rfind("<a ")
                last_close = before.rfind("</a>")
                if last_open > last_close:
                    continue  # inside an anchor
                # check not inside a tag (between < and >)
                lt = before.rfind("<"); gt = before.rfind(">")
                if lt > gt:
                    continue
                # avoid linking inside headings (h1-h4): if the nearest unclosed
                # block-open before the match is a heading, skip this occurrence.
                hopen = max(before.rfind("<h1"), before.rfind("<h2"),
                            before.rfind("<h3"), before.rfind("<h4"))
                if hopen != -1:
                    hclose = before.rfind("</h")
                    if hopen > hclose:
                        continue  # inside a heading
                # Build replacement
                anchor = '<a href="%s">%s</a>' % (pillar, mt.group(1))
                new_body = body[:s] + anchor + body[e:]
                html = html[:bstart] + new_body + html[bend:]
                added += 1
                used_pillars.add(pillar)
                done = True
                break
            if done:
                break
    return html, added

def add_cta(html, slug):
    if slug in SKIP_CTA:
        return html, False
    if CTA_MARKER in html:
        return html, False
    m = LEADFORM_RE.search(html)
    if not m:
        return html, False
    indent = m.group(1)  # leading newline+ws
    insert_at = m.start()
    # Insert CTA block + a newline before the lead-form's leading whitespace
    new = html[:insert_at] + "\n" + CTA_BLOCK + html[insert_at+1:]
    return new, True

def main():
    cta_added = cta_existing = 0
    ctx_added_total = 0
    posts_ctx = 0
    report = []
    for slug in sorted(os.listdir(BLOG)):
        d = os.path.join(BLOG, slug)
        f = os.path.join(d, "index.html")
        if not os.path.isdir(d) or not os.path.isfile(f):
            continue
        with open(f, "r", encoding="utf-8") as fh:
            html = fh.read()
        orig = html
        # contextual first (body bounds computed before CTA insertion)
        html, nctx = add_contextual(html, slug)
        html, cta = add_cta(html, slug)
        if cta:
            cta_added += 1
        elif slug not in SKIP_CTA:
            cta_existing += 1
        if nctx:
            ctx_added_total += nctx
            posts_ctx += 1
        if html != orig:
            with open(f, "w", encoding="utf-8") as fh:
                fh.write(html)
        report.append((slug, cta, nctx))
    print("CTA added:", cta_added)
    print("CTA skipped (hub/bespoke):", len(SKIP_CTA))
    print("posts with >=1 contextual link added:", posts_ctx)
    print("total contextual links added:", ctx_added_total)
    print("--- per post (slug, cta_added, ctx_added) ---")
    for r in report:
        print(r)

if __name__ == "__main__":
    main()
