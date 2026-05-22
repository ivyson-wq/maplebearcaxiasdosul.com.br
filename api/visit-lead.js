// POST /api/visit-lead
// Recebe submissão do formulário de visita em /visite/, valida campos,
// dispara email pra equipe via Resend e (opcionalmente) cria lead no Lumied.

export const config = { runtime: 'edge' };

const ALLOWED_ORIGINS = [
  'https://maplebearcaxiasdosul.com.br',
  'https://www.maplebearcaxiasdosul.com.br',
  'https://maplebearcaxiasdosul.vercel.app'
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

function validate(body) {
  const errs = [];
  const nome = String(body.nome || '').trim();
  const telefone = String(body.telefone || '').trim();
  const email = String(body.email || '').trim();
  const idade = String(body.crianca_idade || '').trim();
  const periodo = String(body.melhor_periodo || '').trim();
  const mensagem = String(body.mensagem || '').trim();

  if (nome.length < 2 || nome.length > 120) errs.push('nome inválido');
  const phoneDigits = telefone.replace(/\D/g, '');
  if (phoneDigits.length < 10 || phoneDigits.length > 13) errs.push('telefone inválido');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('email inválido');
  if (!idade) errs.push('idade obrigatória');
  if (mensagem.length > 2000) errs.push('mensagem muito longa');

  return { ok: errs.length === 0, errs, data: { nome, telefone, email, idade, periodo, mensagem } };
}

async function sendEmail({ to, subject, html, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'Maple Bear Caxias <site@maplebearcaxiasdosul.com.br>';
  if (!key) return { skipped: true, reason: 'RESEND_API_KEY ausente' };

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      html,
      reply_to: replyTo
    })
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, body: text };
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
      serie_interesse: lead.idade,
      origem: 'site-visite',
      observacoes: [
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
          <tr><td style="padding: 8px 0; color: #7a7268;">Filho(a)</td><td style="padding: 8px 0;">${escapeHtml(data.idade)}</td></tr>
          ${data.periodo ? `<tr><td style="padding: 8px 0; color: #7a7268;">Período</td><td style="padding: 8px 0;">${escapeHtml(data.periodo)}</td></tr>` : ''}
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

  const [emailRes, lumiedRes] = await Promise.allSettled([
    sendEmail({
      to,
      subject: `[Visita] ${data.nome} — filho(a) ${data.idade}`,
      html,
      replyTo: data.email || undefined
    }),
    createLumiedLead(data)
  ]);

  const emailOk = emailRes.status === 'fulfilled' && emailRes.value.ok === true;
  const lumiedOk = lumiedRes.status === 'fulfilled' && lumiedRes.value.ok === true;
  const emailSkipped = emailRes.status === 'fulfilled' && emailRes.value.skipped === true;
  const lumiedSkipped = lumiedRes.status === 'fulfilled' && lumiedRes.value.skipped === true;

  // Sucesso se ao menos um canal real recebeu o lead.
  // Se ambos skipped (sem env) ou ambos falharam: 502.
  if (!emailOk && !lumiedOk) {
    console.error('visit-lead: nenhum canal recebeu o lead', {
      emailRes: emailRes.status === 'fulfilled' ? emailRes.value : { error: String(emailRes.reason) },
      lumiedRes: lumiedRes.status === 'fulfilled' ? lumiedRes.value : { error: String(lumiedRes.reason) }
    });
    return jsonResponse({
      ok: false,
      error: 'falha ao notificar equipe',
      detail: { emailSkipped, lumiedSkipped }
    }, { status: 502 }, origin);
  }

  return jsonResponse({
    ok: true,
    channels: {
      email: emailOk ? 'sent' : emailSkipped ? 'skipped' : 'failed',
      lumied: lumiedOk ? 'created' : lumiedSkipped ? 'skipped' : 'failed'
    }
  }, { status: 200 }, origin);
}
