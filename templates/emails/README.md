# Drip email — Maple Bear Caxias do Sul

Sequência automatizada de emails enviada quando um lead entra pelo site
(formulário de visita ou lead magnet).

## Sequência

| Passo | Dia | Assunto | Quando dispara |
|---|---|---|---|
| 1 | D+0 | Bem-vindo(a) à família Maple Bear | Imediato após captura |
| 2 | D+1 | Como funciona uma escola bilíngue de verdade | 24h depois |
| 3 | D+3 | 22 perguntas para fazer numa visita | 3 dias depois |
| 4 | D+7 | O que as famílias contam sobre a Maple Bear Caxias | 1 semana |
| 5 | D+15 | Matrículas 2027 — vagas restantes | 2 semanas |
| 6 | D+30 | Open Day em Caxias | 1 mês (re-engajamento) |

## Como funciona (arquitetura)

```
[Site] /api/visit-lead → cria lead no Lumied (crm_leads)
                       → atribui cadência "boas-vindas" (crm_lead_cadencias)

[Lumied] pg_cron "crm-cadencias-process" (a cada 30min, 08-19h BRT)
        → encontra leads cujo próximo passo "venceu"
        → cria snooze (crm_snooze) — HOJE: operador dispara manual
                                   — FUTURO: cron auto-send via Resend
        → incrementa passo_atual no crm_lead_cadencias
```

## Templates

Cada `step-X-*.html` é um email standalone com:
- Header com lockup Maple Bear oficial
- Conteúdo curto e útil (não-vendas direta)
- 1 CTA claro
- Footer com unsubscribe + endereço LGPD
- Variáveis Handlebars-style: `{{nome_responsavel}}`, `{{nome_crianca}}`, `{{idade}}`

## Variáveis disponíveis (vêm de crm_leads + escola)

- `{{nome_responsavel}}` — nome do pai/mãe
- `{{nome_crianca}}` — nome do filho (se informado)
- `{{idade}}` — idade/série
- `{{escola_nome}}` — "Maple Bear Caxias do Sul"
- `{{escola_endereco}}` — endereço completo
- `{{escola_whatsapp}}` — número
- `{{unsubscribe_url}}` — link de descadastro (LGPD)

## Como ativar (TODO operacional)

1. Aplicar `migrations/lumied-drip-caxias.sql` no banco do Lumied:
   ```bash
   curl --ssl-no-revoke -s -X POST "https://api.supabase.com/v1/projects/brgorknbrjlfwvrrlwxj/database/query" \
     -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
     -d @migrations/lumied-drip-caxias.json
   ```
2. Confirmar que `crm-cadencias-process` está rodando: `SELECT * FROM cron.job WHERE jobname='crm-cadencias-process'`
3. Criar edge function `crm-drip-send` no Lumied que consome `crm_snooze` pendentes da escola Caxias e envia via Resend (TODO Fase 7)

Enquanto o auto-send não está pronto, snoozes pendentes aparecem no painel
da coordenação (`secretaria.html → CRM → Lembretes`) — Denise/Simone podem
disparar manualmente copiando o template.
