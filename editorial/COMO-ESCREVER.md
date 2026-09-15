# Como um artigo nasce neste repositório

1. Leia `editorial/fatos.md` inteiro. Só ele (e o site) autoriza afirmações sobre a escola.
2. Pegue o PRIMEIRO tema de "A escrever" em `editorial/pauta.md`. Confira no `sitemap.xml` que não há artigo sobre o mesmo assunto.
3. Escreva o conteúdo num JSON em `editorial/rascunhos/<slug>.json` (campos no topo de `editorial/gerar-artigo.py`):
   - 700 a 1.000 palavras, português do Brasil, tom de quem é da escola falando com uma família — direto, sem jargão, sem promessa.
   - Estrutura: intro (2 parágrafos que dizem para quem é e o que a pessoa vai conseguir decidir), 4 a 6 seções `<h2 id="...">`, listas quando ajuda a decidir, FAQ com 5 perguntas (as que a família digitaria no Google).
   - Linkar 3 a 5 páginas do site (lista em fatos.md), com âncora natural.
   - `title_tag` ≤ 60 caracteres, `descricao` ≤ 155, `h1` = título.
   - Capa: uma foto de `assets/photos/` que combine com o tema.
4. Rode `python3 editorial/gerar-artigo.py editorial/rascunhos/<slug>.json`. Ele recusa se houver valor em R$ ou título longo.
5. Abra o HTML gerado e leia como leitor: título, breadcrumb, FAQ, links, CTA. Se algo estiver quebrado, conserte o JSON e gere de novo.
6. Marque o tema como feito em `editorial/pauta.md` (data + slug).
7. Commit em branch `artigo/<slug>`, push, e abra um PR para `main` com o título do artigo e, no corpo, o resumo do tema, a busca que motivou e os links internos usados. Quem aprova é a escola; o merge publica.

Nunca: valores/mensalidade; nomes de outras escolas; promessas de vaga ou data; nomes de crianças ou famílias.
