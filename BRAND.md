# Maple Bear — Brand Source of Truth

Documento canônico de identidade visual para os sites Maple Bear Caxias do Sul (`maplebearcaxiasdosul.com.br`) e Maple Bear Bento Gonçalves (`maplebearbg.com.br`).

Toda decisão de cor, tipografia, logo e imagem nos dois sites deve referenciar este documento. Atualizou aqui? Sincroniza no outro repo.

Referência oficial: `assets/brand/manual-maple-bear.pdf` (manual de marca Maple Bear, 2MB).

---

## 1. Paleta canônica

```css
/* Vermelhos Maple Bear oficiais */
--maple-red:         #CC1216;   /* vermelho institucional principal (manual) */
--maple-red-bright:  #FF1C25;   /* vermelho vibrante — CTAs, destaques */
--maple-red-deep:    #AA0413;   /* bordô — hover, fundos escuros */
--maple-red-darker:  #780009;   /* contraste extra, sombras */

/* Neutros editoriais */
--ink:               #000000;   /* preto puro Maple Bear */
--ink-soft:          #2a2a2a;
--ink-faint:         #6a6a6a;
--paper:             #F6E9E1;   /* cream oficial Maple Bear (fundo principal) */
--paper-warm:        #F0DDD0;   /* cream mais escuro (cards, accents) */
--cream:             #E8D3C2;   /* cream profundo */
--line:              #DEC6B5;   /* divisores */
--line-soft:         #ECDDD0;

/* Accents editoriais (escolha nossa, não-manual) */
--sage:              #5a6d4d;   /* maple leaf dessaturado — natureza */
--sage-deep:         #3f4d36;
--gold:              #b8884a;   /* aged brass — texto secundário, ornamentos */
--gold-pale:         #d9bb86;
```

**Regras:**
- Vermelho `#CC1216` é o vermelho-mãe — botões primários, headlines, links.
- `#FF1C25` é o "vermelho de comunicação" — CTAs grandes, badges urgência, destaques de KPI.
- Cream `#F6E9E1` é o fundo padrão. **Não** usar branco puro (`#FFFFFF`) como background principal — quebra o tom escolar/editorial.
- Sage e gold são acentos editoriais **nossos**, não do manual. Usar com parcimônia.

---

## 2. Tipografia

```css
--font-display: 'Fraunces', 'Cormorant Garamond', Georgia, serif;
--font-body:    'Spectral', 'Iowan Old Style', Georgia, serif;
--font-ui:      'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
```

- **Display (Fraunces):** headlines, hero, títulos de seção. Pesos 700–900.
- **Body (Spectral):** parágrafos, descrições, listas. Pesos 400–500. Line-height 145%+.
- **UI (Inter):** botões, labels, badges, metadata, microcopy. Pesos 500–700.

**Importante:** o **wordmark oficial Maple Bear é sans-serif humanista** (presente no logo PNG). Não tentar recriar com Fraunces — sempre usar a PNG/SVG oficial pro logo.

**Escala fluida (Utopia.fyi):** já configurada em `assets/styles.css` via `clamp()`.

---

## 3. Inventário de assets oficiais

Localização canônica: `assets/brand/`

### Logos
| Arquivo | Uso |
|---------|-----|
| `logo-lockup-compact.png` | Header padrão dos sites |
| `logo-lockup.png` | Versão completa (footer, OG) |
| `logo-horizontal.png` | Horizontal estreita |
| `logo-canadian-school.png` | Versão "Canadian School" wordmark |
| `logo-chinook-canadian.png` | Lockup Chinook + Canadian |
| `logo-shield-elementary.png` | Shield "Canadian Elementary School" (urso preto) |
| `logo-maple-bear.png` | Logo principal (símbolo + wordmark) |
| `logo-maple-bear-alt.png` | Variação para footer |
| `lockups-trio-color.png` | Trio (Preschool/Elementary/School) lado-a-lado |
| `shields-color-pair.png` | Par de shields color |

### Mascote Chinook (urso amarelo com toque vermelha — Canadian School)
| Arquivo | Quando usar |
|---------|-------------|
| `chinook-reading-iconic.png` | Hero principal (Chinook lendo bandeira do Canadá) |
| `chinook-reading.png` | Seções de educação, blog, conteúdo |
| `chinook-face-happy.png` | Acolhimento, depoimentos, FAQs positivas |
| `chinook-face-smiling.png` | Quote pulls, microinterações |
| `chinook-face-love.png` | Família, comunidade |
| `chinook-face-kiss.png` | Onboarding, agradecimento |

### Símbolos Maple Bear
| Arquivo | Uso |
|---------|-----|
| `maple-leaf.png` | Folha de bordo vermelha — ornamentos, separadores, accents |
| `selo-duplo-diploma.png` | Selo Duplo Diploma Brasil+Canadá |
| `brand-slogan-pt.png` | Slogan em PT-BR |
| `favicon-256.png` / `apple-touch-icon.png` | Favicons |

### Manual
- `manual-maple-bear.pdf` — manual completo (2MB). Página 13/14 já extraídas como `page-13-transparent.png` / `page-14-transparent.png`.

---

## 4. Tagline oficial

> **"The best of Canadian education for a global future."**

Em PT-BR (não-oficial, usar com cautela):
> "O melhor da educação canadense para um futuro global."

---

## 5. Regras de uso de logo

- **Área de respiro:** mínimo igual à altura da letra "M" do wordmark ao redor do logo.
- **Tamanho mínimo:** 120px de largura em digital. Abaixo disso, usar só o `logo-shield-elementary.png` (símbolo).
- **Fundos escuros:** usar versão com fundo cream/branco ou aplicar logo claro (se disponível).
- **Não distorcer, não recolorir, não combinar com outros logos sem permissão da rede MB.**

---

## 6. Fotografia

**Estilo aprovado:**
- Crianças reais em ambiente escolar (sala, pátio, biblioteca).
- Luz natural, tom morno.
- Composição com espaço pra texto/overlay.
- Atenção pra autorização de imagem (LGPD).

**Tratamento no site:**
- Cantos arredondados (`--radius-md: 14px` ou `--radius-lg: 28px`).
- Overlay cream sutil em fotos muito brancas.
- Légendas em `--font-ui` peso 500.
- Sempre `loading="lazy"` exceto hero.

**Status fotos atuais:**
- **Caxias:** ❌ Não tem fotos da unidade. Cliente vai enviar (TODO).
- **Bento Gonçalves:** ✅ 6 fotos em `assets/photos/` (class-group, easter-event, hug-trio, nursery-drawing, toddler-swing, welcome-entrance).

---

## 7. Componentes visuais derivados (uso comum)

### Header
- Lockup compacto à esquerda + nome da unidade ("Caxias do Sul" / "Bento Gonçalves") em `--font-ui` peso 500 ao lado.
- Background cream, borda inferior `--line-soft`.

### Hero
- Background cream com leaf-pattern sutil (`maple-leaf.png` 5% opacity, repeat).
- Chinook reading à direita (ou ilustração editorial).
- Headline Fraunces 900, vermelho oficial.
- CTA `--maple-red-bright` com hover `--maple-red-deep`.

### Selo Duplo Diploma
- Sempre presente em hero ou seção "Por que Maple Bear".
- Tamanho mín 120×144px.

### Footer
- Cream profundo (`--paper-warm`).
- Lockup horizontal + endereço + CNPJ + links.

---

## 8. Acessibilidade

- Contraste mínimo 4.5:1 (AA). Vermelho `#CC1216` em fundo cream `#F6E9E1` passa.
- Vermelho `#FF1C25` em fundo cream NÃO passa AA para texto pequeno — usar só em CTAs grandes (≥18px bold).
- Foco visível em todos os interativos: outline 3px `--maple-red-deep`.

---

## 9. Histórico de mudanças

- **2026-05-25** — Documento criado consolidando manual oficial + decisões editoriais Caxias + sync com BG.
