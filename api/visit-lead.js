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

// Configuração por escola (origem -bg vai pra Bento Gonçalves)
function escolaConfig(origem) {
  const isBG = String(origem || '').endsWith('-bg');
  if (isBG) {
    return {
      nome: 'Maple Bear Bento Gonçalves',
      cidade: 'Bento Gonçalves',
      site: 'https://maplebearbg.com.br',
      whatsappE164: '5554999315480',
      whatsappLabel: '(54) 9 9931-5480',
      replyTo: 'contato@maplebearbg.com.br',
      from: 'Maple Bear Bento Gonçalves <ola@maplebearcaxiasdosul.com.br>',
      assuntos: {
        magnet: 'Seu guia chegou — Maple Bear Bento Gonçalves',
        visita: 'Recebemos seu pedido de visita — Maple Bear Bento Gonçalves'
      }
    };
  }
  return {
    nome: 'Maple Bear Caxias do Sul',
    cidade: 'Caxias do Sul',
    site: 'https://maplebearcaxiasdosul.com.br',
    whatsappE164: '5554997021634',
    whatsappLabel: '(54) 9 9702-1634',
    replyTo: 'contato@maplebearcaxiasdosul.com.br',
    from: 'Maple Bear Caxias do Sul <ola@maplebearcaxiasdosul.com.br>',
    assuntos: {
      magnet: 'Seu guia chegou — Maple Bear Caxias do Sul',
      visita: 'Recebemos seu pedido de visita — Maple Bear Caxias do Sul'
    }
  };
}

// Email D+0 enviado IMEDIATAMENTE ao lead (não depende do cron de cadência).
// Tom acolhedor, não-comercial. Sem "coordenação vai te chamar" — quem entra
// em contato é a equipe de matrículas; usamos "nossa equipe" pra não mentir.
function buildWelcomeEmail({ lead, cfg }) {
  const firstName = escapeHtml(String(lead.nome || '').split(/\s+/)[0] || 'olá');
  const isMagnet = String(lead.origem || '').startsWith('lead-magnet')
    || lead.origem === 'newsletter' || lead.origem === 'newsletter-bg'
    || lead.origem === 'exit-intent' || lead.origem === 'exit-intent-bg';

  const intro = isMagnet
    ? `Obrigado por se inscrever, ${firstName}. Seu material gratuito já está a caminho — em instantes vamos te mandar o guia direto no WhatsApp.`
    : `Recebemos seu pedido de contato, ${firstName} — obrigado por nos confiar esse momento.`;

  const promessa = isMagnet
    ? `Se você quiser, depois conversamos sobre como é o dia a dia da escola — sem pressão, no seu tempo.`
    : `Em até <strong>um dia útil</strong>, alguém da nossa equipe vai te chamar no WhatsApp para entender o momento da sua família e, se fizer sentido, combinar uma visita sem compromisso.`;

  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${escapeHtml(cfg.nome)}</title></head>
<body style="margin:0;padding:0;background:#f5efe4;font-family:Georgia,serif;color:#1a1814;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#f5efe4;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;background:#faf6ee;border:1px solid #e4dac3;border-radius:8px;overflow:hidden;">
        <tr><td style="background:#b8112e;color:#faf6ee;padding:22px 28px;">
          <p style="margin:0 0 6px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;opacity:0.85;">${escapeHtml(cfg.nome)}</p>
          <h1 style="margin:0;font-size:22px;font-weight:400;line-height:1.25;">Olá, ${firstName}. ✦</h1>
        </td></tr>
        <tr><td style="padding:28px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">${intro}</p>
          <p style="margin:0 0 22px;font-size:16px;line-height:1.6;">${promessa}</p>

          <p style="margin:0 0 12px;font-size:13px;letter-spacing:0.14em;text-transform:uppercase;color:#b8112e;font-family:-apple-system,sans-serif;">Enquanto isso</p>
          <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
            <tr><td style="padding:12px 0;border-top:1px solid #e4dac3;">
              <a href="${cfg.site}/" style="font-size:16px;color:#1a1814;text-decoration:none;font-weight:600;">Conheça a escola pelo site →</a>
              <p style="margin:4px 0 0;font-size:14px;color:#7a7268;">Quem somos, como ensinamos, como é o dia das crianças.</p>
            </td></tr>
            <tr><td style="padding:12px 0;border-top:1px solid #e4dac3;border-bottom:1px solid #e4dac3;">
              <a href="https://wa.me/${cfg.whatsappE164}" style="font-size:16px;color:#1a1814;text-decoration:none;font-weight:600;">Falar agora no WhatsApp →</a>
              <p style="margin:4px 0 0;font-size:14px;color:#7a7268;">${cfg.whatsappLabel} · respondemos em horário comercial.</p>
            </td></tr>
          </table>

          <p style="margin:28px 0 4px;font-size:16px;line-height:1.6;">Até logo,</p>
          <p style="margin:0;font-size:16px;line-height:1.6;"><strong>Equipe ${escapeHtml(cfg.nome)}</strong></p>
        </td></tr>
        <tr><td style="background:#1a1814;color:#cfc7b8;padding:16px 28px;font-family:-apple-system,sans-serif;font-size:12px;line-height:1.5;">
          Você recebeu este email porque pediu contato em <a href="${cfg.site}" style="color:#cfc7b8;">${cfg.site.replace('https://','')}</a>. Se preferir não receber mais, é só responder esta mensagem com "sair" — a gente para na hora.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const subject = isMagnet ? cfg.assuntos.magnet : cfg.assuntos.visita;
  return { html, subject };
}

async function sendWelcomeToLead(lead) {
  if (!lead.email) return { skipped: true, reason: 'lead sem email' };
  const cfg = escolaConfig(lead.origem);
  const { html, subject } = buildWelcomeEmail({ lead, cfg });
  return sendEmail({
    from: cfg.from,
    to: [lead.email],
    subject,
    html,
    replyTo: cfg.replyTo
  });
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
          ${data.dataNascimento ? `<tr><td style="padding: 8px 0; color: #7a7268;">Nascimento</td><td style="padding: 8px 0;"><strong>${escapeHtml(formatBrDate(data.dataNascimento))}</strong> · ${escapeHtml(data.idade)}</td></tr>` : (data.idade ? `<tr><td style="padding: 8px 0; color: #7a7268;">Filho(a)</td><td style="padding: 8px 0;">${escapeHtml(data.idade)}</td></tr>` : '')}
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

  // 3 chamadas paralelas: notifica equipe interna, cria lead no Lumied,
  // e envia o D+0 de boas-vindas IMEDIATO ao lead (não espera cron da cadência,
  // que só roda 30/30min em horário comercial e ainda exige disparo manual).
  const [teamRes, lumiedRes, welcomeRes] = await Promise.allSettled([
    sendEmail({
      to,
      subject: data.origem.startsWith('lead-magnet')
        ? `[Lead magnet] ${data.nome} — ${data.origem}`
        : `[Visita] ${data.nome} — filho(a) ${data.idade}`,
      html,
      replyTo: data.email || undefined
    }),
    createLumiedLead(data),
    sendWelcomeToLead(data)
  ]);

  const teamOk = teamRes.status === 'fulfilled' && teamRes.value.ok === true;
  const lumiedOk = lumiedRes.status === 'fulfilled' && lumiedRes.value.ok === true;
  const welcomeOk = welcomeRes.status === 'fulfilled' && welcomeRes.value.ok === true;
  const teamSkipped = teamRes.status === 'fulfilled' && teamRes.value.skipped === true;
  const lumiedSkipped = lumiedRes.status === 'fulfilled' && lumiedRes.value.skipped === true;
  const welcomeSkipped = welcomeRes.status === 'fulfilled' && welcomeRes.value.skipped === true;

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

  if (welcomeRes.status === 'rejected' || (welcomeRes.status === 'fulfilled' && welcomeRes.value.ok === false)) {
    console.warn('visit-lead: welcome email não saiu', welcomeRes);
  }

  return jsonResponse({
    ok: true,
    channels: {
      team: teamOk ? 'sent' : teamSkipped ? 'skipped' : 'failed',
      lumied: lumiedOk ? 'created' : lumiedSkipped ? 'skipped' : 'failed',
      welcome: welcomeOk ? 'sent' : welcomeSkipped ? 'skipped' : 'failed'
    }
  }, { status: 200 }, origin);
}
