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

## Como funciona (arquitetura — Fase 7 ativa)

```
[Site] /api/visit-lead → cria lead no Lumied (/api/leads)
                       (o disparo imediato do D+0 pelo site foi removido: a cadência
                        roda pelo motor do Lumied, ver crm-cadencias)

[Lumied] pg_cron "crm-cadencias-process"  (0 11,20 UTC = 8h e 17h BRT, todo dia)
        → encontra leads cujo próximo passo "venceu"
        → incrementa passo_atual / cria snooze (visível pra operador)

[Lumied] pg_cron "crm-drip-send-process"  (5 11,20 UTC = 8:05 e 17:05 BRT, todo dia)
        → edge function crm-drip-send
        → encontra leads na cadência com passo pendente
        → renderiza template (fetch do site) + envia via Resend
        → marca interação no crm_interacoes
```

**Latência típica:**
- D+0 → segundos (trigger imediato do `/api/visit-lead`)
- D+1 … D+30 → no máximo ~9h após o vencimento (entre os 2 ticks diários)

**Por que 2x/dia em vez de 15min:** cadência tem passos em DIAS, não em minutos.
Com D+0 já instantâneo, rodar 4x/h só desperdiça ciclos. 2x/dia = ~120 ticks/mês
(0,012% do free tier), cobre manhã e fim do dia, suficiente pra todos os passos.

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

## Como ativar (operacional)

1. Aplicar `migrations/lumied-drip-caxias.sql` no banco do Lumied (já aplicado):
   ```bash
   curl --ssl-no-revoke -s -X POST "https://api.supabase.com/v1/projects/brgorknbrjlfwvrrlwxj/database/query" \
     -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" -H "Content-Type: application/json" \
     -d @migrations/lumied-drip-caxias.json
   ```
2. Confirmar crons rodando:
   ```sql
   SELECT jobname, schedule FROM cron.job
   WHERE jobname IN ('crm-cadencias-process','crm-drip-send-process');
   -- esperado:
   -- crm-cadencias-process  | 0 11,20 * * *
   -- crm-drip-send-process  | 5 11,20 * * *
   ```
3. Nada a configurar no Vercel do site: o `visit-lead.js` não dispara mais o drip
   (as variáveis DRIP_SEND_KEY, DRIP_SEND_URL e LUMIED_ANON_KEY foram aposentadas).
4. Validar end-to-end: cadastrar lead com e-mail em `/visite/` → conferir no Lumied
   que o lead entrou na cadência e que o primeiro passo saiu pelo motor do Lumied.

Snoozes ainda aparecem no painel da coordenação (`secretaria.html → CRM →
Lembretes`) como histórico/visibilidade, mas o envio é 100% automatizado.
