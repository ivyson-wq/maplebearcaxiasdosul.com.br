# Maple Bear — Assets oficiais

Esta pasta contém as assets da identidade visual Maple Bear usadas no site.

## ✅ Já temos (baixados do site oficial)

- `logo-maple-bear.png` — 230×41 PNG (versão com 3 lockups + tagline) — **muito pequeno, ideal apenas como referência**
- `logo-maple-bear-alt.png` — 230×41 PNG (variação footer)

## 🔴 Precisamos do user (idealmente em SVG ou PNG ≥1024px)

### Logo Maple Bear
- [ ] `logo-primary.svg` — logo principal vertical (símbolo + wordmark + tagline)
- [ ] `logo-horizontal.svg` — versão horizontal
- [ ] `logo-symbol.svg` — só o escudo/símbolo do urso (pra favicon e ícones)
- [ ] `logo-white.svg` — versão clara pra usar em fundos escuros
- [ ] `logo-canadian-school.svg` — versão "Canadian School" / wordmark

### Mascote Chinook
- [ ] `chinook-default.png` — Chinook em pose padrão (PNG transparente, ≥1024px)
- [ ] `chinook-waving.png` — saudando (acolhimento, hero)
- [ ] `chinook-reading.png` — lendo (educação, blog)
- [ ] `chinook-playing.png` — brincando (Infantil)
- [ ] `chinook-learning.png` — em situação acadêmica (Fundamental)

> Estes são poses sugeridas; pode mandar tudo que tiver da unidade Caxias

### Brand guidelines
- [ ] `brand-manual.pdf` (se houver) — manual de identidade visual oficial Maple Bear
- [ ] Cores HEX oficiais (já temos `#DE3712` extraído do PNG — confirmar)
- [ ] Tipografia oficial (família de fontes da rede)

## Cores atuais aplicadas (extraídas / interpretadas)

```css
--red: #DE3712            /* Maple Bear official red */
--red-deep: #B22A0E       /* hover */
--red-darker: #8C200A
--paper: #faf6ee          /* off-white quente (escolha editorial nossa) */
--ink: #1a1814            /* preto suave */
--sage: #5a6d4d           /* verde maple folha (escolha nossa) */
--gold: #b8884a           /* dourado antigo (escolha nossa) */
```

Quando chegarem os arquivos oficiais + brand guide, ajusto a paleta pra match exato.

## Onde os logos são usados

- **Header** (`site-header .brand`): logo horizontal pequeno + texto "Caxias do Sul"
- **Footer** (`site-footer`): logo white (clara) em pequeno
- **OG image** (1200×630): logo + tagline (gerado, vai pra `/assets/og-image.png`)
- **Favicon**: `logo-symbol.svg` ou `favicon.svg` (atual é placeholder com "M")
