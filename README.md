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

Formulário em `/visite/` → POST `/api/visit-lead` (Vercel Edge Function) → email Resend pra Denise/Simone + (opcional) lead no Lumied.

### Env vars necessárias

Plugar via `vercel env add <NOME> production` ou na UI do Vercel:

| Var | Obrigatório | Descrição |
|---|---|---|
| `RESEND_API_KEY` | ✅ | API key do Resend (mesma usada no Lumied) |
| `RESEND_FROM` | recomendado | Remetente (default: `Maple Bear Caxias <site@maplebearcaxiasdosul.com.br>`) |
| `LEAD_NOTIFY_TO` | ✅ | Lista de emails (vírgula) — Denise, Simone |
| `LUMIED_API_URL` | opcional | URL da edge function `api` do Lumied |
| `LUMIED_API_TOKEN` | opcional | Bearer token de service ou public submission |
| `LUMIED_ESCOLA_ID` | opcional | UUID da escola Maple Bear Caxias |

Se as três vars `LUMIED_*` estiverem ausentes, o endpoint funciona apenas com Resend (lead vai por email).

Ver `.env.example`.

## WhatsApp

Sticky mobile → `wa.me/5554996243857` (número produção Maple Bear Caxias).
