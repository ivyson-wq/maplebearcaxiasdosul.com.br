// POST /api/curriculos
// Banco de Talentos — recebe currículo do formulário /trabalhe-conosco/
// (Caxias + BG), valida, encaminha pro Lumied (action rh_curriculo_publico,
// que sobe o CV no Storage + grava o candidato) e notifica o RH via Resend.
//
// O front-end envia JSON com o arquivo em base64 (cap 3 MB — o limite de
// body do Vercel Edge é ~4 MB e o base64 infla ~33%).

export const config = { runtime: 'edge' };

const ALLOWED_ORIGINS = [
  'https://maplebearcaxiasdosul.com.br',
  'https://www.maplebearcaxiasdosul.com.br',
  'https://maplebearcaxiasdosul.vercel.app',
  'https://maplebearbg.com.br',
  'https://www.maplebearbg.com.br',
  'https://maplebearbg.vercel.app',
];

const MAX_BYTES = 3 * 1024 * 1024; // 3 MB
const ALLOWED_MIME = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
};

// Mapa unidade → escola + notificação
const UNIDADES = {
  caxias: {
    slug: 'maplebearcaxias',
    nome: 'Maple Bear Caxias do Sul',
    site: 'maplebearcaxiasdosul.com.br',
    origem: 'site-trabalhe',
    from: 'Maple Bear Caxias <site@maplebearcaxiasdosul.com.br>',
    notifyEnv: 'TALENTOS_NOTIFY_TO',
    cor: '#b8112e',
  },
  bg: {
    slug: 'maplebearbg',
    nome: 'Maple Bear Bento Gonçalves',
    site: 'maplebearbg.com.br',
    origem: 'site-trabalhe-bg',
    from: 'Maple Bear Bento Gonçalves <site@maplebearcaxiasdosul.com.br>',
    notifyEnv: 'TALENTOS_NOTIFY_TO_BG',
    cor: '#b8112e',
  },
};

function corsHeaders(origin) {
  const allow = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function jsonResponse(body, init = {}, origin = '') {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...corsHeaders(origin), ...(init.headers || {}) },
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function base64Bytes(b64) {
  const raw = String(b64 || '').replace(/^data:[^;]+;base64,/, '');
  // Tamanho aproximado em bytes a partir do comprimento base64
  const len = raw.length;
  const padding = (raw.endsWith('==') ? 2 : raw.endsWith('=') ? 1 : 0);
  return Math.floor((len * 3) / 4) - padding;
}

async function sendEmail({ from, to, subject, html, replyTo }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { skipped: true, reason: 'RESEND_API_KEY ausente' };
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from, to, subject, html, reply_to: replyTo }),
  });
  const text = await r.text();
  return { ok: r.ok, status: r.status, body: text };
}

async function criarCandidatoLumied(payload) {
  const url = process.env.LUMIED_API_URL || 'https://brgorknbrjlfwvrrlwxj.supabase.co/functions/v1/api';
  const anonKey = process.env.LUMIED_ANON_KEY;
  const headers = { 'Content-Type': 'application/json' };
  if (anonKey) headers['Authorization'] = `Bearer ${anonKey}`;
  const r = await fetch(url, { method: 'POST', headers, body: JSON.stringify(payload) });
  let data = {};
  try { data = await r.json(); } catch { /* ignore */ }
  return { ok: r.ok && data && data.success === true, status: r.status, data };
}

export default async function handler(req) {
  const origin = req.headers.get('origin') || '';

  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== 'POST') return jsonResponse({ ok: false, error: 'method not allowed' }, { status: 405 }, origin);

  let body;
  try { body = await req.json(); }
  catch { return jsonResponse({ ok: false, error: 'invalid JSON' }, { status: 400 }, origin); }

  // Honeypot anti-bot (campo invisível "company")
  if (body.company) return jsonResponse({ ok: true, id: 'noop' }, { status: 200 }, origin);

  const unidade = UNIDADES[String(body.unidade || 'caxias')] || UNIDADES.caxias;

  // Validações de entrada
  const nome = String(body.nome || '').trim();
  const email = String(body.email || '').trim();
  const telefone = String(body.telefone || '').trim();
  const cargo = String(body.cargo || '').trim();
  const phoneDigits = telefone.replace(/\D/g, '');
  const errs = [];
  if (nome.length < 3 || nome.length > 120) errs.push('Informe seu nome completo.');
  if (!cargo) errs.push('Selecione o cargo de interesse.');
  if (!email && !phoneDigits) errs.push('Informe e-mail ou WhatsApp.');
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('E-mail inválido.');
  if (phoneDigits && (phoneDigits.length < 10 || phoneDigits.length > 13)) errs.push('WhatsApp inválido.');
  if (!body.consentimento_lgpd) errs.push('É necessário concordar com o uso dos seus dados (LGPD).');

  // Validação do arquivo (opcional mas recomendado)
  let cv_base64 = null, cv_tipo = null, cv_nome = null;
  if (body.cv_base64 && body.cv_tipo) {
    cv_tipo = String(body.cv_tipo);
    if (!ALLOWED_MIME[cv_tipo]) errs.push('Currículo deve ser PDF, DOC ou DOCX.');
    else {
      const bytes = base64Bytes(body.cv_base64);
      if (bytes > MAX_BYTES) errs.push('Currículo acima de 3 MB.');
      else { cv_base64 = String(body.cv_base64); cv_nome = String(body.cv_nome || 'curriculo').slice(0, 160); }
    }
  }
  if (errs.length) return jsonResponse({ ok: false, errors: errs }, { status: 400 }, origin);

  // 1) Cria o candidato no Lumied (sobe o CV + grava registro)
  const lumiedRes = await criarCandidatoLumied({
    action: 'rh_curriculo_publico',
    escola_slug: unidade.slug,
    nome, email: email || undefined, telefone: telefone || undefined,
    cargo,
    area: String(body.area || '').trim() || undefined,
    linkedin: String(body.linkedin || '').trim() || undefined,
    mensagem: String(body.mensagem || '').trim() || undefined,
    origem: unidade.origem,
    consentimento_lgpd: true,
    cv_base64: cv_base64 || undefined,
    cv_tipo: cv_base64 ? cv_tipo : undefined,
    cv_nome: cv_base64 ? cv_nome : undefined,
  });

  if (!lumiedRes.ok) {
    console.error('curriculos: Lumied falhou', { status: lumiedRes.status, data: lumiedRes.data });
    const motivo = (lumiedRes.data && lumiedRes.data.error) ? lumiedRes.data.error : 'Falha ao registrar o currículo.';
    return jsonResponse({ ok: false, error: motivo }, { status: 502 }, origin);
  }

  const cvUrl = lumiedRes.data.cv_signed_url || null;

  // 2) Notifica o RH/equipe por e-mail (não bloqueia o sucesso se faltar config)
  const to = (process.env[unidade.notifyEnv] || process.env.TALENTOS_NOTIFY_TO || process.env.LEAD_NOTIFY_TO || '')
    .split(',').map(s => s.trim()).filter(Boolean);
  const cargoLabel = String(body.area || '').trim() ? `${cargo} · ${String(body.area).trim()}` : cargo;
  const html = `
    <div style="font-family: Georgia, serif; max-width: 580px; margin: 0 auto; color: #1a1814;">
      <div style="background: ${unidade.cor}; color: #faf6ee; padding: 24px; border-radius: 8px 8px 0 0;">
        <p style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 8px; opacity: 0.85;">${escapeHtml(unidade.nome)} · Banco de Talentos</p>
        <h1 style="margin: 0; font-size: 26px; font-weight: 400;">Novo currículo recebido</h1>
      </div>
      <div style="background: #faf6ee; padding: 24px; border: 1px solid #d4c7ad; border-top: 0; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr><td style="padding: 8px 0; color: #7a7268; width: 130px;">Nome</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(nome)}</td></tr>
          <tr><td style="padding: 8px 0; color: #7a7268;">Cargo</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(cargoLabel)}</td></tr>
          ${phoneDigits ? `<tr><td style="padding: 8px 0; color: #7a7268;">WhatsApp</td><td style="padding: 8px 0;"><a href="https://wa.me/55${phoneDigits}" style="color: ${unidade.cor};">${escapeHtml(telefone)}</a></td></tr>` : ''}
          ${email ? `<tr><td style="padding: 8px 0; color: #7a7268;">E-mail</td><td style="padding: 8px 0;"><a href="mailto:${escapeHtml(email)}" style="color: ${unidade.cor};">${escapeHtml(email)}</a></td></tr>` : ''}
          ${body.linkedin ? `<tr><td style="padding: 8px 0; color: #7a7268;">LinkedIn</td><td style="padding: 8px 0;"><a href="${escapeHtml(body.linkedin)}" style="color: ${unidade.cor};">${escapeHtml(body.linkedin)}</a></td></tr>` : ''}
        </table>
        ${body.mensagem ? `<div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e4dac3;"><p style="color: #7a7268; font-size: 13px; margin: 0 0 8px;">Mensagem</p><p style="margin: 0; line-height: 1.5;">${escapeHtml(body.mensagem).replace(/\n/g, '<br>')}</p></div>` : ''}
        ${cvUrl ? `<p style="margin: 24px 0 0;"><a href="${cvUrl}" style="display:inline-block;background:${unidade.cor};color:#faf6ee;text-decoration:none;padding:12px 22px;border-radius:8px;font-family:-apple-system,sans-serif;font-size:14px;font-weight:600;">📄 Baixar currículo</a> <span style="font-size:12px;color:#7a7268;">(link válido por 7 dias)</span></p>` : '<p style="margin:24px 0 0;color:#7a7268;font-size:13px;">Candidato não anexou currículo — entre em contato pelos dados acima.</p>'}
        <p style="margin: 20px 0 0; padding-top: 16px; border-top: 1px solid #e4dac3; font-size: 13px; color: #7a7268;">
          Disponível também no portal: Gerente/Equipe → Banco de Talentos.<br>
          Recebido em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Brasília) via ${escapeHtml(unidade.site)}/trabalhe-conosco/
        </p>
      </div>
    </div>`;

  let emailRes = { skipped: true };
  if (to.length) {
    try {
      emailRes = await sendEmail({
        from: process.env.RESEND_FROM || unidade.from,
        to,
        subject: `[Talentos] ${nome} — ${cargo}`,
        html,
        replyTo: email || undefined,
      });
    } catch (err) {
      console.warn('curriculos: email falhou', err);
      emailRes = { ok: false, error: String(err) };
    }
  }

  return jsonResponse({
    ok: true,
    id: lumiedRes.data.id,
    channels: {
      lumied: 'created',
      email: emailRes.ok ? 'sent' : emailRes.skipped ? 'skipped' : 'failed',
    },
  }, { status: 200 }, origin);
}
