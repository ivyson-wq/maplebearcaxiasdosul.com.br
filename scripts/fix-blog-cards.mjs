// Corrige os cards do blog:
//  1. Regenera TODAS as seções "Leia também" (related) com relevância + distribuição
//     balanceada — elimina artigos sem related, órfãos (nunca citados) e a repetição
//     dos mesmos 4 cards em todo lugar.
//  2. Index: adiciona os 4 cards que faltavam, preenche 7 imagens vazias e remapeia
//     categorias soltas para os 4 buckets do filtro (senão o filtro escondia cards).
//
// Determinístico (sem Date/random). Idempotente.

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([a-zA-Z]):\//, '$1:/');
const blogDir = join(root, 'blog');
const SITE = 'https://maplebearcaxiasdosul.com.br';

// ── Buckets de categoria que casam com os botões de filtro do index ──────────
// Filtros existentes: educacao-bilingue | metodologia | familia | desenvolvimento
const BUCKET = {
  'adaptacao-escola-bilingue-dicas-pais': 'familia',
  'alfabetizacao-bilingue-fases': 'desenvolvimento',
  'ansiedade-infantil-escola-sinais': 'desenvolvimento',
  'bullying-escola-bilingue-prevencao': 'familia',
  'cambridge-young-learners-exam': 'metodologia',
  'como-escolher-escola-bilingue': 'educacao-bilingue',
  'como-saber-se-meu-filho-esta-aprendendo-ingles-de-verdade': 'desenvolvimento',
  'desenvolvimento-socioemocional-bilingue': 'desenvolvimento',
  'ed-infantil-bilingue-1-5-a-5-anos': 'educacao-bilingue',
  'educacao-bilingue-beneficios-criancas': 'educacao-bilingue',
  'escola-bilingue-caxias-do-sul': 'educacao-bilingue',
  'escola-bilingue-caxias-matricula-2026': 'educacao-bilingue',
  'escola-bilingue-confunde-crianca': 'desenvolvimento',
  'escola-bilingue-educacao-infantil-necessaria': 'educacao-bilingue',
  'escola-bilingue-ou-curso-de-ingles-qual-escolher': 'educacao-bilingue',
  'escola-bilingue': 'educacao-bilingue',
  'escolha-escola-particular-checklist': 'familia',
  'fundamental-1-escola-bilingue': 'educacao-bilingue',
  'habilidades-socioemocionais-bncc': 'desenvolvimento',
  'idade-certa-escola-bilingue': 'educacao-bilingue',
  'imersao-ingles-vs-aulas-ingles': 'metodologia',
  'ingles-em-casa-rotina-familia': 'familia',
  'leitura-infantil-bilingue-livros': 'familia',
  'maple-bear-caxias-infraestrutura': 'educacao-bilingue',
  'maple-bear-e-boa-vale-a-pena': 'educacao-bilingue',
  'matricula-escola-bilingue-documentacao': 'educacao-bilingue',
  'melhores-escolas-bilingues-caxias-do-sul': 'educacao-bilingue',
  'metodologia-canadense-maple-bear': 'metodologia',
  'metodologias-ativas-canadense': 'metodologia',
  'neurociencia-bilinguismo-cerebro': 'desenvolvimento',
  'pensamento-critico-criancas-como-desenvolver': 'desenvolvimento',
  'primeiro-dia-escola-bilingue-pais': 'familia',
  'quanto-custa-escola-bilingue-2026': 'educacao-bilingue',
  'resultado-enem-escola-bilingue': 'educacao-bilingue',
  'screen-time-bilingue-criancas': 'familia',
  'segundo-idioma-antes-dos-5-anos': 'desenvolvimento',
  'vocabulario-ingles-por-idade': 'desenvolvimento',
  // artigos publicados pela automação diária do blog:
  'curriculo-canadense-escola-bilingue': 'metodologia',
  'licao-de-casa-escola-bilingue': 'familia',
};
const BUCKET_LABEL = {
  'educacao-bilingue': 'EDUCAÇÃO BILÍNGUE',
  'metodologia': 'METODOLOGIA',
  'familia': 'FAMÍLIA & ROTINA',
  'desenvolvimento': 'DESENVOLVIMENTO INFANTIL',
};

// Imagens (Unsplash já em uso no site = carregam) para os 7 cards sem imagem + 4 novos.
const U = id => `https://images.unsplash.com/photo-${id}?w=800&auto=format&fit=crop`;
const IMG_FILL = {
  'maple-bear-e-boa-vale-a-pena': U('1580582932707-520aed937b7b'),
  'escola-bilingue-ou-curso-de-ingles-qual-escolher': U('1456513080510-7bf3a84b82f8'),
  'escola-bilingue-caxias-matricula-2026': U('1587654780291-39c9404d746b'),
  'escola-bilingue-educacao-infantil-necessaria': U('1503676260728-1c00da094a0b'),
  'maple-bear-caxias-infraestrutura': U('1588072432836-e10032774350'),
  'segundo-idioma-antes-dos-5-anos': U('1488521787991-ed7bbaae773c'),
  'quanto-custa-escola-bilingue-2026': U('1515488042361-ee00e0ddd4e4'),
  // 4 novos (faltavam no index):
  'como-escolher-escola-bilingue': U('1516627145497-ae6968895b74'),
  'escola-bilingue-confunde-crianca': U('1559757148-5c350d0d3c56'),
  'escola-bilingue': U('1580582932707-520aed937b7b'),
  'resultado-enem-escola-bilingue': U('1611532736597-de2d4265fba3'),
};

// Os 4 artigos que não tinham card no index (title/excerpt do <head>).
const NEW_CARDS = {
  'como-escolher-escola-bilingue': {
    title: 'Como Escolher a Melhor Escola Bilíngue para Seu Filho: 10 Critérios Essenciais em Caxias do Sul',
    excerpt: 'Guia completo com os 10 critérios essenciais para escolher a escola bilíngue certa em Caxias do Sul e garantir a melhor educação para seu filho.',
    date: '15 de abril de 2026', read: '11 min',
  },
  'escola-bilingue-confunde-crianca': {
    title: 'Escola Bilíngue Confunde a Criança? O Que a Neurociência Realmente Diz',
    excerpt: 'Desvendamos o mito: a neurociência mostra como o bilinguismo beneficia o desenvolvimento cognitivo e emocional — sem confundir a criança.',
    date: '22 de abril de 2026', read: '9 min',
  },
  'escola-bilingue': {
    title: 'Escola Bilíngue em Caxias do Sul: Educação Infantil e Ensino Fundamental',
    excerpt: 'Metodologia canadense e inglês por imersão desde 1,5 ano. Conheça a proposta bilíngue da Maple Bear em Caxias do Sul, da Educação Infantil ao Fundamental.',
    date: '10 de abril de 2026', read: '8 min',
  },
  'resultado-enem-escola-bilingue': {
    title: 'Escola Bilíngue e o ENEM: Como a Imersão em Inglês Potencializa Resultados',
    excerpt: 'Dados e evidências de como a imersão em inglês e a metodologia canadense preparam o aluno para o ENEM e o vestibular.',
    date: '28 de abril de 2026', read: '10 min',
  },
};

// ── Parse dos cards existentes no index ─────────────────────────────────────
const indexPath = join(blogDir, 'index.html');
let indexHtml = readFileSync(indexPath, 'utf8');

const cards = {};         // slug -> {title, excerpt, img, order}
const order = [];         // ordem de aparição no index
const cardRe = /<article class="blog-card"[^>]*>([\s\S]*?)<\/article>/g;
let m, idx = 0;
while ((m = cardRe.exec(indexHtml))) {
  const block = m[1];
  const slug = (block.match(/href="\/blog\/([a-z0-9-]+)\/"/) || [])[1];
  if (!slug) continue;
  const title = (block.match(/<h2 class="blog-card-title">([\s\S]*?)<\/h2>/) || [])[1]?.trim() || slug;
  const excerpt = (block.match(/<p class="blog-card-excerpt">([\s\S]*?)<\/p>/) || [])[1]?.trim() || '';
  let img = (block.match(/<div class="blog-card-img"><img src="([^"]+)"/) || [])[1] || '';
  if (!img && IMG_FILL[slug]) img = IMG_FILL[slug];
  cards[slug] = { title, excerpt, img, order: idx++ };
  order.push(slug);
}

// Junta os 4 novos no manifesto
for (const slug of Object.keys(NEW_CARDS)) {
  cards[slug] = {
    title: NEW_CARDS[slug].title,
    excerpt: NEW_CARDS[slug].excerpt,
    img: IMG_FILL[slug],
    order: idx++,
  };
}

const allSlugs = Object.keys(cards);

// ── Relevância + distribuição balanceada ────────────────────────────────────
const STOP = new Set(['de','da','do','dos','das','e','a','o','os','as','para','em','que',
  'com','no','na','nos','nas','um','uma','por','se','ou','ao','5','2026','meu','filho','seu']);
const toks = s => s.split('-').filter(w => w && !STOP.has(w));
const tokenSet = {};
for (const slug of allSlugs) tokenSet[slug] = new Set([...toks(slug), ...toks(
  cards[slug].title.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9\s]/g,'').split(/\s+/).join('-'))]);

function baseScore(a, b) {
  let s = BUCKET[a] === BUCKET[b] ? 3 : 0;
  for (const t of tokenSet[a]) if (tokenSet[b].has(t)) s += 1;
  return s;
}

// Greedy com penalidade de uso → distribui e evita órfãos / repetição
const usage = Object.fromEntries(allSlugs.map(s => [s, 0]));
const PENALTY = 1.6;
const related = {};
const ordered = [...allSlugs].sort((a, b) => cards[a].order - cards[b].order);
for (const a of ordered) {
  const ranked = allSlugs
    .filter(b => b !== a)
    .map(b => ({ b, eff: baseScore(a, b) - PENALTY * usage[b] }))
    .sort((x, y) => y.eff - x.eff || baseScore(a, y.b) - baseScore(a, x.b) || x.b.localeCompare(y.b));
  const pick = ranked.slice(0, 3).map(r => r.b);
  related[a] = pick;
  pick.forEach(b => usage[b]++);
}

// Reparo de órfãos: quem nunca foi citado entra no lugar do alvo mais super-usado
function rebalance() {
  for (let pass = 0; pass < 6; pass++) {
    const orphans = allSlugs.filter(s => usage[s] === 0);
    if (!orphans.length) return;
    for (const orphan of orphans) {
      // acha o melhor doador: artigo cujo um dos picks tem usage alto e não é o órfão
      let best = null;
      for (const a of ordered) {
        if (a === orphan || related[a].includes(orphan)) continue;
        for (const cur of related[a]) {
          if (usage[cur] <= 2) continue;
          const gain = baseScore(a, orphan) - baseScore(a, cur) + (usage[cur] - 1);
          if (!best || gain > best.gain) best = { a, cur, gain };
        }
      }
      if (!best) break;
      related[best.a] = related[best.a].map(s => s === best.cur ? orphan : s);
      usage[best.cur]--; usage[orphan]++;
    }
  }
}
rebalance();

// ── Geração do HTML do related ──────────────────────────────────────────────
const esc = s => s.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const shortP = ex => {
  let t = ex.split(/(?<=\.)\s/)[0] || ex;
  if (t.length > 120) t = t.slice(0, 117).replace(/\s\S*$/,'') + '…';
  return t;
};
const relImg = url => url.includes('images.unsplash.com') ? url.replace(/w=800/, 'w=400') : url;

function relatedCard(slug) {
  const c = cards[slug];
  return `      <a href="${SITE}/blog/${slug}/" class="related-card">
        <img src="${relImg(c.img)}" alt="${esc(c.title)}" loading="lazy">
        <div class="related-card-body">
          <h4>${esc(c.title)}</h4>
          <p>${esc(shortP(c.excerpt))}</p>
        </div>
      </a>`;
}
function relatedBlock(slug) {
  return `  <div class="related">
    <h3>Leia também</h3>
    <div class="related-grid">
${related[slug].map(relatedCard).join('\n')}
    </div>
  </div>`;
}

// Acha o fim do bloco <div class="related"> contando profundidade de <div>.
function findDivBlockEnd(html, start) {
  const re = /<\/?div\b[^>]*>/g;
  re.lastIndex = start;
  let depth = 0, m;
  while ((m = re.exec(html))) {
    depth += m[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return re.lastIndex;
  }
  return -1;
}
// Remove TODOS os blocos related existentes (independente de onde estejam).
function stripRelated(html) {
  let i;
  while ((i = html.indexOf('<div class="related">')) !== -1) {
    const end = findDivBlockEnd(html, i);
    if (end === -1) break;
    const lineStart = html.lastIndexOf('\n', i - 1) + 1;
    let e = end;
    while (html[e] === '\n' || html[e] === ' ' || html[e] === '\t') e++;
    html = html.slice(0, lineStart) + html.slice(e);
  }
  return html;
}

// ── Aplica related em cada artigo ───────────────────────────────────────────
let touched = 0;
for (const slug of allSlugs) {
  const p = join(blogDir, slug, 'index.html');
  let html;
  try { html = readFileSync(p, 'utf8'); } catch { console.log('SKIP (sem arquivo):', slug); continue; }

  const orig = html;
  html = stripRelated(html);

  // âncora: share-bar, senão float-wa
  let anchorIdx = html.indexOf('<div class="share-bar"');
  if (anchorIdx === -1) {
    const f = html.indexOf('class="float-wa"');
    anchorIdx = f === -1 ? -1 : html.lastIndexOf('<a ', f);
  }
  if (anchorIdx === -1) { console.log('SKIP (sem âncora):', slug); continue; }
  const anchorLineStart = html.lastIndexOf('\n', anchorIdx - 1) + 1;

  const next = html.slice(0, anchorLineStart) + relatedBlock(slug) + '\n\n' + html.slice(anchorLineStart);
  if (next !== orig) { writeFileSync(p, next); touched++; }
}

// ── Index: remapeia categorias soltas para os buckets do filtro ─────────────
const CAT_REMAP = {
  pedagogia: 'metodologia', certificacoes: 'metodologia',
  'etapas-escolares': 'educacao-bilingue', matricula: 'educacao-bilingue',
  'saude-infantil': 'desenvolvimento', 'seguranca-infantil': 'familia',
  tecnologia: 'familia',
};
for (const [from, to] of Object.entries(CAT_REMAP)) {
  indexHtml = indexHtml.split(`data-category="${from}"`).join(`data-category="${to}"`);
}

// ── Index: preenche imagens vazias dos 7 cards ──────────────────────────────
for (const slug of Object.keys(IMG_FILL)) {
  if (NEW_CARDS[slug]) continue; // novos entram já com imagem
  const href = `href="/blog/${slug}/"`;
  const hi = indexHtml.indexOf(href);
  if (hi === -1) continue;
  const emptyAt = indexHtml.indexOf('<div class="blog-card-img"></div>', hi);
  if (emptyAt === -1 || emptyAt - hi > 400) continue;
  const imgTag = `<div class="blog-card-img"><img src="${IMG_FILL[slug]}" alt="${esc(cards[slug].title)}" loading="lazy"></div>`;
  indexHtml = indexHtml.slice(0, emptyAt) + imgTag + indexHtml.slice(emptyAt + '<div class="blog-card-img"></div>'.length);
}

// ── Index: adiciona os 4 cards que faltavam ─────────────────────────────────
function indexCard(slug) {
  const c = cards[slug], b = BUCKET[slug];
  return `<article class="blog-card" data-category="${b}">
  <a href="/blog/${slug}/" class="blog-card-link">
    <div class="blog-card-img"><img src="${c.img}" alt="${esc(c.title)}" loading="lazy"></div>
    <div class="blog-card-body">
      <span class="blog-card-cat" data-cat="${b}">${BUCKET_LABEL[b]}</span>
      <h2 class="blog-card-title">${esc(c.title)}</h2>
      <p class="blog-card-excerpt">${esc(c.excerpt)}</p>
      <div class="blog-card-meta">
        <span>Maple Bear Caxias do Sul</span>
        <span>·</span>
        <time>${NEW_CARDS[slug].date}</time>
        <span class="reading-time">⏱ ${NEW_CARDS[slug].read}</span>
      </div>
    </div>
  </a>
</article>`;
}
const newCardsHtml = Object.keys(NEW_CARDS)
  .filter(slug => !indexHtml.includes(`href="/blog/${slug}/"`))
  .map(indexCard).join('\n');
if (newCardsHtml) {
  const lastClose = indexHtml.lastIndexOf('</article>');
  const insertAt = lastClose + '</article>'.length;
  indexHtml = indexHtml.slice(0, insertAt) + '\n' + newCardsHtml + indexHtml.slice(insertAt);
}

writeFileSync(indexPath, indexHtml);

// ── Resumo ──────────────────────────────────────────────────────────────────
const dist = {};
for (const s of allSlugs) dist[usage[s]] = (dist[usage[s]] || 0) + 1;
console.log(`Artigos: ${allSlugs.length} | related reescritos: ${touched}`);
console.log('Distribuição de uso como related (uso: nº de artigos):', dist);
console.log('Órfãos restantes:', allSlugs.filter(s => usage[s] === 0));
console.log('Cards novos no index:', Object.keys(NEW_CARDS).length);
