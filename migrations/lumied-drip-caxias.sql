-- ═════════════════════════════════════════════════════════════
-- Cadência "Boas-vindas — Maple Bear Caxias"
-- 6 passos: D+0, D+1, D+3, D+7, D+15, D+30
--
-- Aplicar via Supabase Management API:
--   curl --ssl-no-revoke -s -X POST \
--     "https://api.supabase.com/v1/projects/brgorknbrjlfwvrrlwxj/database/query" \
--     -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
--     -H "Content-Type: application/json" \
--     -d "{\"query\":\"$(cat lumied-drip-caxias.sql | tr '\n' ' ')\"}"
--
-- Pré-requisito: crm_cadencias existir (mig 340) — já existe.
-- ═════════════════════════════════════════════════════════════

INSERT INTO crm_cadencias (
  escola_id,
  nome,
  descricao,
  ativo,
  passos,
  parar_quando
) VALUES (
  'f0ab6402-67a0-4829-bdaa-05e90e0b6f9b',  -- Maple Bear Caxias do Sul
  'Boas-vindas — Site Caxias',
  'Sequência de 6 emails para leads que entram via formulário de visita ou lead magnet em maplebearcaxiasdosul.com.br. Pausa automaticamente se o lead responder por WhatsApp.',
  true,
  jsonb_build_array(
    jsonb_build_object(
      'passo', 1,
      'dias_apos', 0,
      'canal', 'email',
      'descricao', 'D+0 · Boas-vindas',
      'template_url', 'https://maplebearcaxiasdosul.com.br/templates/emails/step-1-d0-boas-vindas.html',
      'assunto', '{{nome_responsavel}}, bem-vindo(a) à família Maple Bear Caxias'
    ),
    jsonb_build_object(
      'passo', 2,
      'dias_apos', 1,
      'canal', 'email',
      'descricao', 'D+1 · Bilíngue de verdade',
      'template_url', 'https://maplebearcaxiasdosul.com.br/templates/emails/step-2-d1-bilingue-de-verdade.html',
      'assunto', 'Como saber se uma escola é bilíngue de verdade?'
    ),
    jsonb_build_object(
      'passo', 3,
      'dias_apos', 2,
      'canal', 'email',
      'descricao', 'D+3 · Lead magnet 22 perguntas',
      'template_url', 'https://maplebearcaxiasdosul.com.br/templates/emails/step-3-d3-22-perguntas.html',
      'assunto', '{{nome_responsavel}}, baixou nosso guia das 22 perguntas?'
    ),
    jsonb_build_object(
      'passo', 4,
      'dias_apos', 4,
      'canal', 'email',
      'descricao', 'D+7 · Prova social (depoimentos)',
      'template_url', 'https://maplebearcaxiasdosul.com.br/templates/emails/step-4-d7-depoimentos.html',
      'assunto', 'O que famílias contam sobre a Maple Bear Caxias'
    ),
    jsonb_build_object(
      'passo', 5,
      'dias_apos', 8,
      'canal', 'email',
      'descricao', 'D+15 · Urgência matrículas 2027',
      'template_url', 'https://maplebearcaxiasdosul.com.br/templates/emails/step-5-d15-matriculas.html',
      'assunto', 'Matrículas 2027 Maple Bear Caxias — vagas restantes'
    ),
    jsonb_build_object(
      'passo', 6,
      'dias_apos', 15,
      'canal', 'email',
      'descricao', 'D+30 · Open Day re-engajamento',
      'template_url', 'https://maplebearcaxiasdosul.com.br/templates/emails/step-6-d30-open-day.html',
      'assunto', 'Open Day Maple Bear Caxias — visita aberta sem agendamento'
    )
  ),
  'qualquer_resposta'
)
ON CONFLICT (escola_id, nome) DO UPDATE SET
  passos = EXCLUDED.passos,
  ativo = EXCLUDED.ativo,
  descricao = EXCLUDED.descricao;

-- Retornar ID da cadência criada (usar no /api/visit-lead pra atribuir leads novos)
SELECT id, nome FROM crm_cadencias
WHERE escola_id = 'f0ab6402-67a0-4829-bdaa-05e90e0b6f9b'
  AND nome = 'Boas-vindas — Site Caxias';
