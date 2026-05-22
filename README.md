# maplebearcaxiasdosul.com.br

Site institucional da **Maple Bear Caxias do Sul** — escola bilíngue canadense em Caxias do Sul, RS.

## Stack

- HTML/CSS/JS estático puro
- Deploy: Vercel
- Analytics: GA4 (`G-7KN8ZP8NMF`)
- Blog: 38 posts editoriais em `/blog/` (migrado do monorepo Lumied em 2026-05-22, URLs preservadas)

## Estrutura

```
.
├── index.html             # Home
├── sobre/                 # História da unidade
├── metodologia/           # Método Maple Bear canadense
├── niveis/                # Infantil, Fundamental I, Fundamental II
├── estrutura/             # Tour fotográfico
├── equipe/                # Coordenação pedagógica
├── matriculas/            # Valores 2027 + processo
├── visite/                # Agendamento de visita
├── contato/
├── depoimentos/
├── faq/
├── blog/                  # 38 posts (NÃO mexer em URLs — SEO indexado)
└── assets/
    ├── styles.css
    ├── analytics.js
    └── photos/
```

## Deploy

`git push origin main` → Vercel deploy automático.

## SEO

- Sitemap: `/sitemap.xml`
- Robots: `/robots.txt`
- llms.txt + llms-full.txt (AEO)
- JSON-LD: School + LocalBusiness + FAQPage + BreadcrumbList

## Captura de leads

Formulário → Lumied (cria lead com `escola_id` Maple Caxias) + email Resend pra Denise Magnus + Simone Onzi.

## WhatsApp

Sticky mobile → `wa.me/5554997021634` (número produção Maple Bear Caxias).
