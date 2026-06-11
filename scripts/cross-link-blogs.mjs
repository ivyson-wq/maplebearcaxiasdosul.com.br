// Cross-reference artigo→artigo entre os blogs das duas unidades.
//
// Problema que resolve: as URLs do diário do BG estão "URL is unknown to Google"
// (snapshot GSC 2026-06-11) — links profundos vindos de um domínio já indexado
// são o sinal de descoberta mais forte que controlamos. O bloco data-xref="1"
// existente só aponta pra HOME da unidade irmã; este script adiciona o link
// pro ARTIGO mais relevante do outro blog.
//
// - Caxias (43 artigos) → 1 link cada pro diário BG (13 artigos ⇒ ~3 inbound/artigo BG)
// - BG (13 artigos) → 2 links cada pro blog Caxias (bonus pra artigos não indexados)
// - Relevância por token overlap (slug+title) com penalidade de uso (balanceia)
//
// Determinístico e idempotente: remove <span data-xref-art> antes de reinjetar.

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

const CAX_ROOT = 'C:/Claude/maplebearcaxiasdosul.com.br';
const BG_ROOT = 'C:/Claude/maplebearbg.com.br';
const CAX_SITE = 'https://maplebearcaxiasdosul.com.br';
const BG_SITE = 'https://maplebearbg.com.br';

// Artigos de Caxias JÁ indexados (report GSC 2026-06-11) — recebem menos prioridade
// como alvo dos links BG→Caxias (o objetivo é destravar os não indexados).
const CAX_INDEXED = new Set([
  'educacao-bilingue-beneficios-criancas', 'como-escolher-escola-bilingue',
  'metodologia-canadense-maple-bear', 'desenvolvimento-socioemocional-bilingue',
  'idade-certa-escola-bilingue', 'adaptacao-escola-bilingue-dicas-pais',
]);

const STOP = new Set(['de','da','do','dos','das','e','a','o','os','as','para','em','que',
  'com','no','na','nos','nas','um','uma','por','se','ou','ao','5','2026','meu','filho','seu',
  'escola','bilingue','maple','bear','crianca','criancas']);

function loadArticles(dir, site, base) {
  const out = [];
  for (const slug of readdirSync(dir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name)) {
    const p = join(dir, slug, 'index.html');
    if (!existsSync(p)) continue;
    const html = readFileSync(p, 'utf8');
    const title = (html.match(/<title>([^<]+)<\/title>/) || [, slug])[1].split('|')[0].trim();
    out.push({ slug, path: p, html, title, url: `${site}/${base}/${slug}/` });
  }
  return out;
}

const toks = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[^a-z0-9\s-]/g, ' ').split(/[\s-]+/).filter(w => w.length > 2 && !STOP.has(w));

function tokenSet(a) { return new Set([...toks(a.slug), ...toks(a.title)]); }

function score(setA, setB) {
  let s = 0;
  for (const t of setA) if (setB.has(t)) s += 1;
  return s;
}

const cax = loadArticles(join(CAX_ROOT, 'blog'), CAX_SITE, 'blog');
const bg = loadArticles(join(BG_ROOT, 'diario'), BG_SITE, 'diario');
for (const a of [...cax, ...bg]) a.tokens = tokenSet(a);

// ── Escolha balanceada ───────────────────────────────────────────────────────
function pickTargets(sources, targets, perSource, bonusFn) {
  const usage = Object.fromEntries(targets.map(t => [t.slug, 0]));
  const PENALTY = 1.4;
  const picks = {};
  for (const src of [...sources].sort((a, b) => a.slug.localeCompare(b.slug))) {
    const ranked = targets
      .filter(t => t.slug !== src.slug) // não linkar slug homônimo (ex-duplicados): âncora idêntica entre versões confundiria o dedup
      .map(t => ({ t, eff: score(src.tokens, t.tokens) + (bonusFn ? bonusFn(t) : 0) - PENALTY * usage[t.slug] }))
      .sort((x, y) => y.eff - x.eff || x.t.slug.localeCompare(y.t.slug));
    picks[src.slug] = ranked.slice(0, perSource).map(r => r.t);
    picks[src.slug].forEach(t => usage[t.slug]++);
  }
  return { picks, usage };
}

const caxToBg = pickTargets(cax, bg, 1);
const bgToCax = pickTargets(bg, cax, 2, t => CAX_INDEXED.has(t.slug) ? -0.5 : 0.5);

// ── Injeção no bloco data-xref="1" existente ────────────────────────────────
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function injectXref(article, targets, label) {
  let html = article.html;
  // idempotência: remove injeção anterior
  html = html.replace(/\s*<br>\s*<span data-xref-art>[\s\S]*?<\/span>/g, '');
  const i = html.indexOf('data-xref="1"');
  if (i === -1) return { html, ok: false };
  const end = html.indexOf('</div>', i);
  if (end === -1) return { html, ok: false };
  const links = targets.map(t =>
    `<a href="${t.url}" target="_blank" rel="noopener">${esc(t.title)}</a>`).join(' · ');
  const span = `\n    <br><span data-xref-art>📖 ${label}: ${links}</span>\n  `;
  html = html.slice(0, end) + span + html.slice(end);
  return { html, ok: true };
}

let cOk = 0, cSkip = [];
for (const a of cax) {
  const { html, ok } = injectXref(a, caxToBg.picks[a.slug], 'No diário de Bento Gonçalves');
  if (ok) { if (html !== a.html) writeFileSync(a.path, html); cOk++; } else cSkip.push(a.slug);
}
let bOk = 0, bSkip = [];
for (const a of bg) {
  const { html, ok } = injectXref(a, bgToCax.picks[a.slug], 'No blog de Caxias do Sul');
  if (ok) { if (html !== a.html) writeFileSync(a.path, html); bOk++; } else bSkip.push(a.slug);
}

// ── Hubs: blog index ↔ diario index ─────────────────────────────────────────
function linkHub(indexPath, href, text) {
  if (!existsSync(indexPath)) return 'index não encontrado';
  let html = readFileSync(indexPath, 'utf8');
  if (html.includes('data-xref-hub')) return 'já tinha';
  const anchor = `\n  <p data-xref-hub style="text-align:center;margin:2rem auto;max-width:720px;color:#666">🍁 A Maple Bear também está em ${text.split('|')[0]}: visite o <a href="${href}" target="_blank" rel="noopener">${text.split('|')[1]}</a>.</p>\n`;
  const fi = html.lastIndexOf('<footer');
  if (fi === -1) return 'sem <footer>';
  html = html.slice(0, fi) + anchor + html.slice(fi);
  writeFileSync(indexPath, html);
  return 'injetado';
}
const hub1 = linkHub(join(CAX_ROOT, 'blog', 'index.html'), `${BG_SITE}/diario/`, 'Bento Gonçalves|diário da Maple Bear Bento Gonçalves');
const hub2 = linkHub(join(BG_ROOT, 'diario', 'index.html'), `${CAX_SITE}/blog/`, 'Caxias do Sul|blog da Maple Bear Caxias do Sul');

// ── Resumo ──────────────────────────────────────────────────────────────────
console.log(`Caxias→BG: ${cOk}/${cax.length} artigos com xref (skip: ${cSkip.join(',') || 'nenhum'})`);
console.log(`BG→Caxias: ${bOk}/${bg.length} artigos com xref (skip: ${bSkip.join(',') || 'nenhum'})`);
console.log('Inbound BG por artigo:', JSON.stringify(caxToBg.usage));
console.log('Inbound Caxias (alvos distintos):', Object.values(bgToCax.usage).filter(v => v > 0).length, 'de', cax.length);
console.log('Hub Caxias:', hub1, '| Hub BG:', hub2);
