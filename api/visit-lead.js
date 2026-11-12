// POST /api/visit-lead
// Recebe submissão dos formulários do site (visita, landing pages, blog,
// materiais, exit-intent), valida campos, cria o lead no Lumied (8 s de
// timeout, 1 nova tentativa) e avisa a equipe por e-mail via Resend. Se o
// Lumied falhar, o e-mail sai com "[NÃO ENTROU NO CRM]" e o motivo.
// Este endpoint também recebe, por CORS, os leads do site de Bento Gonçalves
// (maplebearbg.com.br): body.escola = 'maplebearbg' roteia para o tenant
// maplebearbg do Lumied e o aviso vai para LEAD_NOTIFY_TO_BG.

export const config = { runtime: 'edge' };

const ALLOWED_ORIGINS = [
  'https://maplebearcaxiasdosul.com.br',
  'https://www.maplebearcaxiasdosul.com.br',
  'https://maplebearcaxiasdosul.vercel.app',
  'https://maplebearbg.com.br',
  'https://www.maplebearbg.com.br'
];

// Tenants do Lumied que este endpoint atende (slug enviado em body.escola).
const TENANT_PADRAO = 'maplebearcaxias';
const TENANT_BG = 'maplebearbg';

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

// Origens detalhadas por prefixo: cada landing (lp-<slug>) e cada artigo
// (blog-<slug>, blog-exit-<slug>) chega ao CRM com a origem real.
const ORIGEM_POR_PREFIXO = /^(blog|lp)-[a-z0-9][a-z0-9-]{0,50}$/;

function normalizarOrigem(v) {
  const o = String(v || '').trim().toLowerCase();
  if (ALLOWED_ORIGINS_LEAD.has(o) || ORIGEM_POR_PREFIXO.test(o)) return o;
  return 'site-visite';
}

// Telefone BR como o Lumied valida: tira zeros à esquerda e o +55, exige 10 ou 11
// dígitos e DDD existente (11-99, sem final 0). Devolve { digitos } ou { erro }.
function telefoneBr(bruto) {
  let d = String(bruto || '').replace(/\D/g, '').replace(/^0+/, '');
  if (d.length >= 12 && d.startsWith('55')) d = d.slice(2);
  if (d.length !== 10 && d.length !== 11) return { erro: 'Confira o telefone: DDD + número (ex.: 54 99624-3857).' };
  const ddd = Number(d.slice(0, 2));
  if (!(ddd >= 11 && ddd <= 99 && ddd % 10 !== 0)) return { erro: 'Confira o DDD do telefone.' };
  if (/(\d)\1{6,}/.test(d) || /(\d)\1{3}(\d)\2{3}$/.test(d) || ['123456789', '987654321', '012345678', '876543210'].some((x) => d.includes(x))) {
    return { erro: 'Confira o telefone: o número parece inválido.' };
  }
  return { digitos: d };
}

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
  const origem = normalizarOrigem(body.origem);
  // "Light leads" = não pedem data de nascimento/período: newsletter, exit-intent,
  // lead magnets e os formulários do blog capturam só nome + WhatsApp.
  const isLight = origem.startsWith('lead-magnet')
    || origem === 'newsletter' || origem === 'newsletter-bg'
    || origem === 'exit-intent' || origem === 'exit-intent-bg'
    || origem.startsWith('blog-')
    // materiais e guia do site de Bento (lp-guia, lp-material-<slug>): só nome + WhatsApp
    || origem === 'lp-guia' || origem.startsWith('lp-material-');
  // Lead magnets: WhatsApp obrigatório por padrão; email só se explicitamente solicitado
  const canal = isLight ? (body.canal === 'email' ? 'email' : 'whatsapp') : 'whatsapp';

  // Nome: mínimo 3 caracteres com ao menos 2 letras seguidas (igual ao Lumied);
  // marcas de código no nome são recusadas.
  if (nome.length < 3 || nome.length > 120 || !/[A-Za-zÀ-ÿ]{2,}/.test(nome)) {
    errs.push('Informe seu nome (pelo menos 3 letras).');
  } else if (/[<>]|\{\{|\$\{|:\/\/|@/.test(nome)) {
    errs.push('Confira o nome: use apenas letras.');
  }

  let telefoneDigitos = '';
  if (isLight && canal === 'email') {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('Confira o e-mail.');
  } else {
    const t = telefoneBr(telefone);
    if (t.erro) errs.push(t.erro); else telefoneDigitos = t.digitos;
  }
  if (!isLight) {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.push('Confira o e-mail.');
    if (!dataNasc && !body.crianca_idade) errs.push('Informe a data de nascimento do(a) filho(a).');
    if (dataNasc && months == null) errs.push('Confira a data de nascimento.');
  }
  if (mensagem.length > 2000) errs.push('A mensagem ficou muito longa (máximo 2000 caracteres).');

  // Atribuição de campanha: utm_* + ids de clique lidos do form (o front
  // persiste via sessionStorage entre páginas). Sanitizados e truncados.
  const utm = {};
  for (const k of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'fbclid']) {
    const max = /clid$|braid$/.test(k) ? 512 : 200;
    const v = String(body[k] || '').trim().replace(/[\r\n]+/g, ' ').slice(0, max);
    if (v) utm[k] = v;
  }

  return {
    ok: errs.length === 0,
    errs,
    data: {
      nome, telefone: telefoneDigitos || telefone, email,
      criancaNome,
      dataNascimento: dataNasc,
      idade: idadeDescricao,        // texto pra humano: "3 anos e 4 meses"
      idadeBracket: idadeBracket,   // pra Lumied: "3 anos (Nursery)"
      periodo, mensagem, origem, utm, isLight
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

// Chamada ao /api/leads do Lumied V2 (captura pública dos sites MB): cria o
// lead e liga o comportamento anônimo da sessão (lp_evento) a ele.
// Timeout de 8 s por tentativa e 1 nova tentativa em falha de rede, timeout,
// 429 ou 5xx. Erro 4xx de validação não se repete. Nunca lança: devolve
// { ok, status, motivo, tentativas }.
const LUMIED_URL = 'https://maplebearcaxias.lumied.com.br/api/leads';
const LUMIED_TIMEOUT_MS = 8000;

async function createLumiedLead(lead) {
  // Tenant pelo slug do lead: Caxias por padrão; o site de Bento Gonçalves
  // posta aqui via CORS com escola:'maplebearbg'. Qualquer outro valor cai em Caxias.
  const utm = lead.utm || {};
  const payload = {
    escola: lead.escola === TENANT_BG ? TENANT_BG : TENANT_PADRAO,
    nome: lead.nome,
    telefone: lead.telefone,
    email: lead.email || undefined,
    crianca: lead.criancaNome || undefined,
    serie: lead.idadeBracket || lead.idade || undefined,
    // O Lumied aceita texto livre (até 60 caracteres) e deriva o canal
    // (blog -> Site, lp -> Página de captura) a partir do prefixo.
    origem: String(lead.origem || 'site').slice(0, 60),
    sessao: lead.sessao || undefined,
    pagina: lead.pagina || undefined,
    gclid: utm.gclid || undefined,
    gbraid: utm.gbraid || undefined,
    wbraid: utm.wbraid || undefined,
    fbclid: utm.fbclid || undefined,
    utm_source: utm.utm_source || undefined,
    utm_medium: utm.utm_medium || undefined,
    utm_campaign: utm.utm_campaign || undefined,
    utm_term: utm.utm_term || undefined,
    utm_content: utm.utm_content || undefined
  };
  const corpo = JSON.stringify(payload);
  let ultimo = { ok: false, status: 0, motivo: 'sem tentativa' };
  const MAX = 2;
  for (let tentativa = 1; tentativa <= MAX; tentativa++) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), LUMIED_TIMEOUT_MS);
    try {
      const r = await fetch(LUMIED_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: corpo,
        signal: ctl.signal
      });
      const text = await r.text();
      if (r.ok) return { ok: true, status: r.status, tentativas: tentativa };
      ultimo = { ok: false, status: r.status, motivo: `Lumied respondeu HTTP ${r.status}: ${text.slice(0, 200)}`, tentativas: tentativa };
      const repetivel = r.status === 429 || r.status >= 500;
      console.error('visit-lead: Lumied recusou o lead', { tentativa, status: r.status, corpo: text.slice(0, 300), origem: lead.origem });
      if (!repetivel) return ultimo;
    } catch (err) {
      const abortou = err && err.name === 'AbortError';
      ultimo = {
        ok: false, status: 0, tentativas: tentativa,
        motivo: abortou ? `Lumied não respondeu em ${LUMIED_TIMEOUT_MS / 1000} s` : `falha de rede ao chamar o Lumied: ${String(err)}`
      };
      console.error('visit-lead: falha ao chamar o Lumied', { tentativa, erro: String(err), timeout: abortou, origem: lead.origem });
    } finally {
      clearTimeout(timer);
    }
  }
  return ultimo;
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
    // `message` é o texto pronto para a família; `errors` segue para quem integra.
    return jsonResponse({ ok: false, errors: errs, message: errs.join(' ') }, { status: 400 }, origin);
  }
  // sessão do pixel do site (enviada pelo cliente) → liga comportamento ao lead
  data.sessao = String(body.sessao || '').trim().slice(0, 60);
  // página do site onde o formulário foi enviado (landing page do anúncio).
  // O Lumied guarda em observações ("Página do site: ...").
  data.pagina = String(body.pagina || '').trim().replace(/[^\w\-./~%]/g, '').slice(0, 200);
  // escola do lead (BG posta cross-origin; default Caxias) p/ rotear o tenant
  data.escola = String(body.escola || '').trim() === TENANT_BG ? TENANT_BG : TENANT_PADRAO;
  const isBg = data.escola === TENANT_BG;
  // Notificação vai pro time da escola do lead (lista separada por vírgula).
  const to = (
    isBg
      ? (process.env.LEAD_NOTIFY_TO_BG || 'contato@maplebearbg.com.br')
      : (process.env.LEAD_NOTIFY_TO || 'comercial@maplebearcaxiasdosul.com.br')
  ).split(',').map(s => s.trim()).filter(Boolean);
  const escolaNome = isBg ? 'Maple Bear Bento Gonçalves' : 'Maple Bear Caxias do Sul';
  const siteHost = isBg ? 'maplebearbg.com.br' : 'maplebearcaxiasdosul.com.br';

  // 1) Lumied primeiro (8 s + 1 nova tentativa): o e-mail da equipe precisa dizer
  //    se o lead entrou ou não no CRM.
  let lumiedRes;
  try {
    lumiedRes = await createLumiedLead(data);
  } catch (err) {
    lumiedRes = { ok: false, status: 0, motivo: `erro inesperado: ${String(err)}` };
    console.error('visit-lead: erro inesperado no Lumied', err);
  }
  const lumiedOk = lumiedRes.ok === true;
  const motivoCrm = lumiedOk ? '' : (lumiedRes.motivo || 'motivo desconhecido');

  const ehVisita = !data.isLight;
  const ehMagnet = data.origem.startsWith('lead-magnet');
  const tituloEmail = ehVisita ? 'Pedido de visita guiada'
    : ehMagnet ? 'Baixou um material'
    : 'Pediu contato pelo site';
  const wa = `https://wa.me/55${String(data.telefone).replace(/\D/g, '')}`;

  const html = `
    <div style="font-family: Georgia, serif; max-width: 580px; margin: 0 auto; color: #1a1814;">
      <div style="background: #b8112e; color: #faf6ee; padding: 24px; border-radius: 8px 8px 0 0;">
        <p style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; margin: 0 0 8px; opacity: 0.85;">${escapeHtml(escolaNome)} · Novo lead</p>
        <h1 style="margin: 0; font-size: 26px; font-weight: 400;">${escapeHtml(tituloEmail)}</h1>
      </div>
      ${lumiedOk ? '' : `<div style="background: #fff3cd; border: 2px solid #b8112e; color: #5c0a18; padding: 14px 18px; font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 14px; line-height: 1.5;"><strong>NÃO ENTROU NO CRM: cadastrar este lead manualmente no Lumied.</strong><br>Motivo: ${escapeHtml(motivoCrm)}</div>`}
      <div style="background: #faf6ee; padding: 24px; border: 1px solid #d4c7ad; border-top: 0; border-radius: 0 0 8px 8px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 15px;">
          <tr><td style="padding: 8px 0; color: #7a7268; width: 130px;">Nome</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(data.nome)}</td></tr>
          <tr><td style="padding: 8px 0; color: #7a7268;">WhatsApp</td><td style="padding: 8px 0;"><a href="${wa}" style="color: #b8112e;">${escapeHtml(data.telefone)}</a></td></tr>
          ${data.email ? `<tr><td style="padding: 8px 0; color: #7a7268;">E-mail</td><td style="padding: 8px 0;"><a href="mailto:${escapeHtml(data.email)}" style="color: #b8112e;">${escapeHtml(data.email)}</a></td></tr>` : ''}
          ${data.criancaNome ? `<tr><td style="padding: 8px 0; color: #7a7268;">Filho(a)</td><td style="padding: 8px 0; font-weight: 600;">${escapeHtml(data.criancaNome)}</td></tr>` : ''}
          ${data.dataNascimento ? `<tr><td style="padding: 8px 0; color: #7a7268;">Nascimento</td><td style="padding: 8px 0;"><strong>${escapeHtml(formatBrDate(data.dataNascimento))}</strong> · ${escapeHtml(data.idade)}</td></tr>` : (data.idade ? `<tr><td style="padding: 8px 0; color: #7a7268;">Idade</td><td style="padding: 8px 0;">${escapeHtml(data.idade)}</td></tr>` : '')}
          ${data.periodo ? `<tr><td style="padding: 8px 0; color: #7a7268;">Período</td><td style="padding: 8px 0;">${escapeHtml(data.periodo)}</td></tr>` : ''}
          <tr><td style="padding: 8px 0; color: #7a7268;">Origem</td><td style="padding: 8px 0; font-size: 13px; color: #b8112e;">${escapeHtml(data.origem)}</td></tr>
          ${data.pagina ? `<tr><td style="padding: 8px 0; color: #7a7268;">Página</td><td style="padding: 8px 0; font-size: 13px;">${escapeHtml(data.pagina)}</td></tr>` : ''}
          ${Object.keys(data.utm || {}).length ? `<tr><td style="padding: 8px 0; color: #7a7268;">Campanha</td><td style="padding: 8px 0; font-size: 12px; color: #7a7268;">${escapeHtml(Object.entries(data.utm).map(([k, v]) => `${k}=${v}`).join(' · '))}</td></tr>` : ''}
        </table>
        ${data.mensagem ? `
        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e4dac3;">
          <p style="color: #7a7268; font-size: 13px; margin: 0 0 8px;">Mensagem</p>
          <p style="margin: 0; line-height: 1.5;">${escapeHtml(data.mensagem).replace(/\n/g, '<br>')}</p>
        </div>` : ''}
        <p style="margin: 24px 0 0; padding-top: 16px; border-top: 1px solid #e4dac3; font-size: 13px; color: #7a7268;">
          Recebido em ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })} (Brasília) via ${siteHost}${escapeHtml(data.pagina || '/visite/')}
        </p>
      </div>
    </div>
  `;

  const prefixo = lumiedOk ? '' : '[NÃO ENTROU NO CRM] ';
  const assunto = ehVisita
    ? `${prefixo}[Visita] ${data.nome} — filho(a) ${data.idade}`
    : ehMagnet
      ? `${prefixo}[Lead magnet] ${data.nome} — ${data.origem}`
      : `${prefixo}[Contato] ${data.nome} — ${data.origem}`;

  // 2) E-mail para a equipe.
  let teamRes;
  try {
    teamRes = await sendEmail({ to, subject: assunto, html, replyTo: data.email || undefined });
  } catch (err) {
    teamRes = { ok: false, error: String(err) };
  }
  const teamOk = teamRes.ok === true;
  const teamSkipped = teamRes.skipped === true;

  if (!lumiedOk) {
    console.error('visit-lead: lead NÃO entrou no CRM', {
      motivo: motivoCrm, status: lumiedRes.status, tentativas: lumiedRes.tentativas,
      origem: data.origem, pagina: data.pagina, emailEquipe: teamOk ? 'enviado' : 'FALHOU'
    });
  }

  // Sucesso se ao menos um canal real recebeu o lead. Nenhum -> 502.
  if (!teamOk && !lumiedOk) {
    console.error('visit-lead: nenhum canal recebeu o lead', { team: teamRes, lumied: lumiedRes });
    return jsonResponse({
      ok: false,
      error: 'falha ao notificar equipe',
      detail: { teamSkipped }
    }, { status: 502 }, origin);
  }

  return jsonResponse({
    ok: true,
    channels: {
      team: teamOk ? 'sent' : teamSkipped ? 'skipped' : 'failed',
      lumied: lumiedOk ? 'created' : 'failed'
    }
  }, { status: 200 }, origin);
}
