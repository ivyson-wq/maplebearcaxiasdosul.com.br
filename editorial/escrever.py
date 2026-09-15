#!/usr/bin/env python3
"""Escreve o próximo artigo da pauta com o Claude e gera a página.

Roda na GitHub Action editorial (a cada 15 dias) ou à mão:
    ANTHROPIC_API_KEY=... python3 editorial/escrever.py

Saída: editorial/rascunhos/<slug>.json + a página gerada + pauta.md atualizada.
Quem publica é o PR que a Action abre — nada vai ao ar sem aprovação.
"""
import json, os, re, subprocess, sys, datetime
import anthropic

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ED = os.path.join(REPO, "editorial")
CFG = json.load(open(os.path.join(ED, "config.json"), encoding="utf-8"))


def ler(nome):
    return open(os.path.join(ED, nome), encoding="utf-8").read()


def proximo_tema(pauta):
    m = re.search(r"## A escrever[^\n]*\n((?:\d+\.[^\n]*\n?)+)", pauta)
    if not m:
        return None
    for linha in m.group(1).splitlines():
        t = re.sub(r"^\d+\.\s*", "", linha).strip()
        if t:
            return t
    return None


def slugs_existentes():
    sm = open(os.path.join(REPO, "sitemap.xml"), encoding="utf-8").read()
    return sorted(set(re.findall(rf"{CFG['base_url']}/{CFG['pasta']}/([^/<]+)/", sm)))


def fotos():
    d = os.path.join(REPO, CFG["fotos"])
    return sorted(f for f in os.listdir(d) if f.lower().endswith((".jpg", ".jpeg", ".png")))


SCHEMA = {
    "type": "object",
    "additionalProperties": False,
    "required": ["slug", "titulo", "title_tag", "descricao", "h1", "minutos", "capa", "capa_alt", "intro", "corpo", "faq", "cta_wa_texto"] + CFG["campos_extras"],
    "properties": {
        "slug": {"type": "string", "description": "kebab-case, sem acento, 3 a 8 palavras, com a cidade"},
        "titulo": {"type": "string"},
        "title_tag": {"type": "string", "description": "até 60 caracteres, termina com ' | ' + marca curta"},
        "descricao": {"type": "string", "description": "até 155 caracteres"},
        "h1": {"type": "string"},
        "minutos": {"type": "integer"},
        "capa": {"type": "string", "description": "caminho de uma foto existente, exatamente como listado"},
        "capa_alt": {"type": "string"},
        "intro": {"type": "string", "description": "HTML: dois <p>"},
        "corpo": {"type": "string", "description": "HTML: 4 a 6 seções <h2 id=...> com <p>, <ul>/<ol> quando ajuda; 700 a 1000 palavras no total com a intro"},
        "faq": {"type": "array", "description": "exatamente 5 perguntas; cada item é [pergunta, resposta]", "items": {"type": "array", "items": {"type": "string"}}},
        "cta_wa_texto": {"type": "string", "description": "mensagem pré-preenchida do WhatsApp, 1 frase, começa com 'Olá!'"},
        **CFG["schema_extras"],
    },
}


def main():
    pauta = ler("pauta.md")
    tema = proximo_tema(pauta)
    if not tema:
        print("pauta vazia — nada a escrever"); return 0
    existentes = slugs_existentes()
    hoje = datetime.date.today().isoformat()
    system = (
        "Você escreve artigos para o site de uma escola bilíngue, em português do Brasil, na voz de quem é da escola falando com uma família. "
        "Direto, concreto, sem jargão, sem promessa, sem adjetivo vazio. Só afirma sobre a escola o que está em FATOS. "
        "Nunca cita valores, mensalidade, desconto ou 'a partir de R$'. Nunca nomeia outras escolas. Nunca inventa datas, eventos ou horários. "
        "Não atribui à equipe formação, nacionalidade, certificação ou experiência que não estejam em FATOS; não descreve espaços físicos que não estejam lá. "
        "Linka de 3 a 5 páginas do site (lista em FATOS) com âncora natural, em HTML (<a href=\"/caminho/\">). "
        "Devolve SOMENTE o JSON pedido."
    )
    user = (
        f"# FATOS (única fonte sobre a escola)\n{ler('fatos.md')}\n\n"
        f"# COMO ESCREVER\n{ler('COMO-ESCREVER.md')}\n\n"
        f"# TEMA DE HOJE\n{tema}\n\n"
        f"# ARTIGOS QUE JÁ EXISTEM (não repita assunto nem slug)\n" + "\n".join(existentes) + "\n\n"
        f"# FOTOS DISPONÍVEIS PARA CAPA (use o caminho exato: {CFG['fotos']}/<arquivo>)\n" + "\n".join(fotos()) + "\n\n"
        f"# DATA\n{hoje}\n\n"
        f"Escreva o artigo completo para o tema de hoje seguindo COMO ESCREVER. {CFG['instrucao_extra']}"
    )
    client = anthropic.Anthropic()
    with client.messages.stream(
        model="claude-opus-5",
        max_tokens=16000,
        system=system,
        messages=[{"role": "user", "content": user}],
        output_config={"effort": "high", "format": {"type": "json_schema", "schema": SCHEMA}},
    ) as stream:
        resp = stream.get_final_message()
    if resp.stop_reason == "refusal":
        print("o modelo recusou o pedido:", resp.stop_details); return 2
    texto = next(b.text for b in resp.content if b.type == "text")
    c = json.loads(texto)
    c["data"] = hoje
    if c["slug"] in existentes:
        c["slug"] += "-" + hoje[:7]
    c["faq"] = [x for x in c.get("faq", []) if isinstance(x, list) and len(x) == 2][:5]
    if len(c["faq"]) < 3:
        print("FAQ veio incompleto"); return 4
    if re.search(r"R\$\s?\d", json.dumps(c, ensure_ascii=False)):
        print("artigo menciona valores — descartado"); return 3
    os.makedirs(os.path.join(ED, "rascunhos"), exist_ok=True)
    rasc = os.path.join(ED, "rascunhos", f"{c['slug']}.json")
    json.dump(c, open(rasc, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    r = subprocess.run([sys.executable, os.path.join(ED, "gerar-artigo.py"), rasc], capture_output=True, text=True)
    print(r.stdout, r.stderr)
    if r.returncode != 0:
        return r.returncode
    # pauta: tira o tema da fila (renumerando) e registra em Feitos
    m = re.search(r"(## A escrever[^\n]*\n)((?:\d+\.[^\n]*\n?)+)", pauta)
    itens = [re.sub(r"^\d+\.\s*", "", l).strip() for l in m.group(2).splitlines() if l.strip()]
    itens = [i for i in itens if i != tema]
    lista = "".join(f"{n}. {i}\n" for n, i in enumerate(itens, 1))
    nova = pauta[:m.start(2)] + lista + pauta[m.end(2):]
    nova = nova.rstrip("\n") + f"\n- {hoje} — /{CFG['pasta']}/{c['slug']}/ ({tema[:70]})\n"
    open(os.path.join(ED, "pauta.md"), "w", encoding="utf-8", newline="\n").write(nova)
    open(os.path.join(ED, "ultimo.json"), "w", encoding="utf-8").write(json.dumps({"slug": c["slug"], "titulo": c["titulo"], "tema": tema, "url": f"{CFG['base_url']}/{CFG['pasta']}/{c['slug']}/"}, ensure_ascii=False))
    print("pronto:", c["slug"])
    return 0


if __name__ == "__main__":
    sys.exit(main())
