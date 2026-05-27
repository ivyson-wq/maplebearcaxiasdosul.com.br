// POST /api/visit-lead
// Recebe submissão do formulário de visita em /visite/, valida campos,
// dispara email pra equipe via Resend e (opcionalmente) cria lead no Lumied.

export const config = { runtime: 'edge' };

const ALLOWED_ORIGINS = [
  'https://maplebearcaxiasdosul.com.br',
  'https://www.maplebearcaxiasdosul.com.br',
  'https://maplebearcaxiasdosul.vercel.app',
  'https://maplebearbg.com.br',
  'https://www.maplebearbg.com.br'
];

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}

function jsonResponse(body, init = {}, origin = '') {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...corsHeaders(origin),
      ...(init.headers || {})
    }
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function formatBrDate(iso) {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

const ALLOWED_ORIGINS_LEAD = new Set([
  'site-visite',
  'site-visite-bg',
  'lead-magnet-22-perguntas',
  'lead-magnet-ingles-em-casa',
  'lead-magnet-checklist',
  'newsletter',
  'newsletter-bg',
  'open-day',
  'exit-intent',
  'exit-intent-bg',
]);

// Calcula idade descritiva a partir de data ISO (YYYY-MM-DD).
// Retorna ex: "3 anos e 4 meses", "18 meses", "9 meses".
function formatAge(isoDate) {
  if (!isoDate) return '';
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  let months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) months--;
  if (months < 0) return '';
  if (months < 24) return `${months} meses`;
  const years = Math.floor(months / 12);
  const rem = months % 12;
  return rem === 0 ? `${years} anos` : `${years} anos e ${rem} ${rem === 1 ? 'mês' : 'meses'}`;
}

// Mapeia idade descritiva pro intervalo Maple Bear pra usar como serie_interesse no Lumied.
function ageToBracket(months) {
  if (months == null) return '';
  if (months < 24) return '1 a 2 anos (Bear Care / Toddler)';
  if (months < 36) return '2 anos (Toddler)';
  if (months < 48) return '3 anos (Nursery)';
  if (months < 60) return '4 anos (Junior Kindergarten)';
  if (months < 72) return '5 anos (Senior Kindergarten)';
  if (months < 132) return '6 a 10 anos (Fundamental I)';
  return '11 a 14 anos (Fundamental II)';
}

function monthsSince(isoDate) {
  if (!isoDate) return null;
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let m = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
  if (now.getDate() < d.getDate()) m--;
  return m < 0 ? null : m;
}

function validate(body) {
  const errs = [];
  const nome = String(body.nome || '').trim();
  const telefone = String(body.telefone || '').trim();
  const email = String(body.email || '').trim();
  const criancaNome = String(body.crianca_nome || '').trim();
  // Backward compat: aceita data_nascimento (novo) ou crianca_idade (legado)
  const dataNasc = String(body.data_nascimento || '').trim();
  const months = dataNasc ? monthsSince(dataNasc) : null;
  const idadeDescricao = dataNasc ? formatAge(dataNasc) : String(body.crianca_idade || '').trim();
  const idadeBracket = dataNasc ? ageToBracket(months) : String(body.crianca_idade || '').trim();
  const periodo = String(body.melhor_periodo || '').trim();
  const mensagem = String(body.mensagem || '').trim();
  const origem = ALLOWED_ORIGINS_LEAD.has(String(body.origem || '')) ? body.origem : 'site-visite';
  // "Light leads" = não pedem data de nascimento/período. Newsletter, exit-intent e lead magnets
  // capturam só nome+WhatsApp pra não friccionar conversão.
  const isLight = origem.startsWith('lead-magnet')
    || origem === 'newsletter' || origem === 'newsletter-bg'
    || origem === 'exit-intent' || origem === 'exit-intent-bg';
  const isMagnet = isLight;
  // Lead magnets: WhatsApp obrigatório por padrão; email só se explicitamente solicitado
  const canal = isMagnet ? (body.canal === 'email' ? 'email' : 'whatsapp') : 'whatsapp';
  const phoneDigits = telefone.replace(/\D/g, '');

  if (nome.length < 2 || nome.length > 120) errs.push('nome inválido');
  if (isMagnet) {
    if (canal === 'whatsapp') {
      if (phoneDigits.length < 10 || phoneDigits.length > 13) errs.push('WhatsApp inválido');
    } else {
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('email inválido');
    }
  } else {
    if (phoneDigits.length < 10 || phoneDigits.length > 13) errs.push('telefone inválido');
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('email inválido');
    if (!dataNasc && !body.crianca_idade) errs.push('data de nascimento obrigatória');
    if (dataNasc && months == null) errs.push('data de nascimento inválida');
  }
  if (mensagem.length > 2000) errs.push('mensagem muito longa');

  return {
    ok: errs.length === 0,
    errs,
    data: {
      nome, telefone, email,
      criancaNome,
      dataNascimento: dataNasc,
      idade: idadeDescricao,        // texto pra humano: "3 anos e 4 meses"
      idadeBracket: idadeBracket,   // pra Lumied: "3 anos (Nursery)"
      periodo, mensagem, origem
    }
  };
}

async function sendEmail({ from, to, subject, html, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  const fromAddr = from || process.env.RESEND_FROM || 'Maple Bear Caxias <site@maplebearcaxiasdosul.com.br>';
  if (!key) return { skipped: true, reason: 'RESEND_API_KEY ausente' };

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: fromAddr,
      to,
      subject,
      html,
      reply_to: replyTo
    })
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, body: text };
}

// Trigger imediato da cadência "Boas-vindas" (D+0) via edge function Lumied
// crm-drip-send. Sem isso, o lead esperaria até a próxima execução do
// pg_cron 'crm-drip-send-process' (a cada hora, só 08-19h BRT seg-sáb).
async function triggerImmediateDrip() {
  const url = process.env.DRIP_SEND_URL
    || 'https://brgorknbrjlfwvrrlwxj.supabase.co/functions/v1/crm-drip-send';
  const anonKey = process.env.LUMIED_ANON_KEY;
  const dripKey = process.env.DRIP_SEND_KEY;
  if (!anonKey || !dripKey) {
    return { skipped: true, reason: 'DRIP_SEND_KEY ou LUMIED_ANON_KEY ausentes' };
  }
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${anonKey}`,
        'X-Drip-Key': dripKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });
    const text = await r.text();
    return { ok: r.ok, status: r.status, body: text.slice(0, 400) };
  } catch (err) {
    return { ok: false, error: String(err) };
  }
}

async function createLumiedLead(lead) {
  const url = process.env.LUMIED_API_URL;
  const slug = process.env.LUMIED_ESCOLA_SLUG || 'maplebearcaxias';
  const anonKey = process.env.LUMIED_ANON_KEY;
  if (!url) return { skipped: true, reason: 'LUMIED_API_URL ausente' };

  // crm_captura_publica é a action pública existente no Lumied
  // (api/handlers/public.ts:1942): rate-limit por IP, honeypot, valida campos
  const headers = {
    'Content-Type': 'application/json'
  };
  if (anonKey) headers['Authorization'] = `Bearer ${anonKey}`;

  const r = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      action: 'crm_captura_publica',
      escola_slug: slug,
      nome_responsavel: lead.nome,
      telefone: lead.telefone,
      email: lead.email || undefined,
      serie_interesse: lead.idadeBracket || lead.idade || undefined,
      origem: lead.origem,
      observacoes: [
        lead.criancaNome ? `Filho(a): ${lead.criancaNome}` : null,
        lead.dataNascimento ? `Data de nascimento: ${formatBrDate(lead.dataNascimento)} (${lead.idade})` : null,
        lead.periodo ? `Período preferido: ${lead.periodo}` : null,
        lead.mensagem ? `Mensagem:\n${lead.mensagem}` : null
      ].filter(Boolean).join('\n\n') || undefined
    })
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, body: text };
}

export default async function handler(req) {
  const origin = req.headers.get('origin') || '';

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'method not allowed' }, { status: 405 }, origin);
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ ok: false, error: 'invalid JSON' }, { status: 400 }, origin);
  }

  // Honeypot anti-bot — campo invisível "company" no form
  if (body.company) {
    return jsonResponse({ ok: true, id: 'noop' }, { status: 200 }, origin);
  }

  const { ok, errs, data } = validate(body);
  if (!ok) {
    return jsonResponse({ ok: false, errors: errs }, { status: 400 }, origin);
  }

  const to = (process.env.LEAD_NOTIFY_TO || 'contato@maplebearcaxiasdosul.com.br')
    .split(',').map(s => s.trim()).filter(Boolean);

  const html = `
    <div style="font-family: Georgia, serif; max-width: 580px; margin: 0 auto; color: #1a1814;">
      <div style="background: #b8112e; color: #faf6ee; padding: 24px; border-radius: 8px 8px 0 0;">
        <p style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 8px; opacity: 0.85;">Maple Bear Caxias do Sul · Novo lead</p>
        <h1 style="margin: 0; font-size: 26px; font-weight: 400;">Pedido de visita guiada</h1>
      </div>
      <div style="background: #faf6ee; padding: 24px; border: 1px solid #d4c7ad; border-top: 0; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr><td style="padding: 8px 0; color: #7a7268; width: 130px;">Nome</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(data.nome)}</td></tr>
          <tr><td style="padding: 8px 0; color: #7a7268;">WhatsApp</td><td style="padding: 8px 0;"><a href="https://wa.me/55${data.telefone.replace(/\D/g, '')}" style="color: #b8112e;">${escapeHtml(data.telefone)}</a></td></tr>
          ${data.email ? `<tr><td style="padding: 8px 0; color: #7a7268;">E-mail</td><td style="padding: 8px 0;"><a href="mailto:${escapeHtml(data.email)}" style="color: #b8112e;">${escapeHtml(data.email)}</a></td></tr>` : ''}
          ${data.criancaNome ? `<tr><td style="padding: 8px 0; color: #7a7268;">Filho(a)</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(data.criancaNome)}</td></tr>` : ''}
          ${data.dataNascimento ? `<tr><td style="padding: 8px 0; color: #7a7268;">Nascimento</td><td style="padding: 8px 0;"><strong>${escapeHtml(formatBrDate(data.dataNascimento))}</strong> · ${escapeHtml(data.idade)}</td></tr>` : (data.idade ? `<tr><td style="padding: 8px 0; color: #7a7268;">Idade</td><td style="padding: 8px 0;">${escapeHtml(data.idade)}</td></tr>` : '')}
          ${data.periodo ? `<tr><td style="padding: 8px 0; color: #7a7268;">Período</td><td style="padding: 8px 0;">${escapeHtml(data.periodo)}</td></tr>` : ''}
          <tr><td style="padding: 8px 0; color: #7a7268;">Origem</td><td style="padding: 8px 0; font-size: 13px; color: #b8112e;">${escapeHtml(data.origem)}</td></tr>
        </table>
        ${data.mensagem ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e4dac3;">
          <p style="color: #7a7268; font-size: 13px; margin: 0 0 8px;">Mensagem</p>
          <p style="margin: 0; line-height: 1.5;">${escapeHtml(data.mensagem).replace(/\n/g, '<br>')}</p>
        </div>` : ''}
        <p style="margin: 24px 0 0; padding-top: 16px; border-top: 1px solid #e4dac3; font-size: 13px; color: #7a7268;">
          Recebido em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Brasília) via maplebearcaxiasdosul.com.br/visite/
        </p>
      </div>
    </div>
  `;

  // 2 chamadas paralelas obrigatórias: notifica equipe interna + cria lead no Lumied.
  const [teamRes, lumiedRes] = await Promise.allSettled([
    sendEmail({
      to,
      subject: data.origem.startsWith('lead-magnet')
        ? `[Lead magnet] ${data.nome} — ${data.origem}`
        : `[Visita] ${data.nome} — filho(a) ${data.idade}`,
      html,
      replyTo: data.email || undefined
    }),
    createLumiedLead(data)
  ]);

  const teamOk = teamRes.status === 'fulfilled' && teamRes.value.ok === true;
  const lumiedOk = lumiedRes.status === 'fulfilled' && lumiedRes.value.ok === true;
  const teamSkipped = teamRes.status === 'fulfilled' && teamRes.value.skipped === true;
  const lumiedSkipped = lumiedRes.status === 'fulfilled' && lumiedRes.value.skipped === true;

  // Sucesso se ao menos um canal real recebeu o lead.
  // Se ambos skipped (sem env) ou ambos falharam: 502.
  if (!teamOk && !lumiedOk) {
    console.error('visit-lead: nenhum canal recebeu o lead', {
      teamRes: teamRes.status === 'fulfilled' ? teamRes.value : { error: String(teamRes.reason) },
      lumiedRes: lumiedRes.status === 'fulfilled' ? lumiedRes.value : { error: String(lumiedRes.reason) }
    });
    return jsonResponse({
      ok: false,
      error: 'falha ao notificar equipe',
      detail: { teamSkipped, lumiedSkipped }
    }, { status: 502 }, origin);
  }

  // Trigger imediato do drip-send após criar o lead. Se o crm_captura_publica
  // do Lumied atribui a cadência sincronamente, o drip-send vai encontrar
  // este lead pendente em passo 1 e enviar o D+0 na mesma requisição.
  // Se falhar, o pg_cron pega no próximo tick (não bloqueia resposta).
  let dripRes = { skipped: true };
  if (lumiedOk) {
    try {
      dripRes = await triggerImmediateDrip();
    } catch (err) {
      console.warn('visit-lead: trigger drip falhou', err);
      dripRes = { ok: false, error: String(err) };
    }
  }

  return jsonResponse({
    ok: true,
    channels: {
      team: teamOk ? 'sent' : teamSkipped ? 'skipped' : 'failed',
      lumied: lumiedOk ? 'created' : lumiedSkipped ? 'skipped' : 'failed',
      drip: dripRes.ok ? 'triggered' : dripRes.skipped ? 'skipped' : 'failed'
    }
  }, { status: 200 }, origin);
}
