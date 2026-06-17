#!/usr/bin/env node
// Gera sitemap.xml a partir das páginas reais no disco (todo index.html público).
// Root cause do drift anterior: o sitemap era mantido à mão e ficava desatualizado.
// Uso: node scripts/gen-sitemap.mjs   (rode antes de cada deploy; ou no CI)
import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, relative, sep } from 'node:path';

const ROOT = process.cwd();
const ORIGIN = 'https://maplebearcaxiasdosul.com.br';

// Diretórios que NÃO são páginas públicas (sem entrar no sitemap).
const SKIP_DIRS = new Set([
  'node_modules', '.git', '.vercel', '.wrangler', 'dist',
  'assets', 'api', 'scripts', 'templates', 'migrations',
]);

/** Coleta recursivamente todos os index.html (exceto dirs em SKIP_DIRS). */
function collect(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const rel = relative(ROOT, full);
    if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
    const st = statSync(full);
    if (st.isDirectory()) collect(full, out);
    else if (name === 'index.html') out.push(rel);
  }
  return out;
}

/** caminho/index.html -> URL com cleanUrls (barra final, raiz = /). */
function toUrl(relPath) {
  const dir = relPath.replace(/index\.html$/, '').split(sep).join('/');
  return dir === '' ? `${ORIGIN}/` : `${ORIGIN}/${dir.replace(/\/$/, '')}/`;
}

/** Última data de commit do arquivo (YYYY-MM-DD); fallback = hoje. */
function lastmod(relPath) {
  try {
    const d = execFileSync('git', ['log', '-1', '--format=%cs', '--', relPath], { encoding: 'utf8' }).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
  } catch { /* arquivo novo / sem git */ }
  return new Date().toISOString().slice(0, 10);
}

/** Heurística de prioridade + changefreq por seção. */
function meta(url) {
  const p = url.replace(ORIGIN, '');
  if (p === '/') return { freq: 'weekly', pri: '1.0' };
  if (/^\/(matriculas|visite)\//.test(p)) return { freq: 'weekly', pri: '0.95' };
  if (/^\/(metodologia|niveis|estagios)\//.test(p)) return { freq: 'monthly', pri: '0.9' };
  if (/^\/(escola-particular-caxias-do-sul)\//.test(p)) return { freq: 'monthly', pri: '0.9' };
  if (/^\/materiais\//.test(p)) return { freq: 'monthly', pri: '0.85' };
  if (/^\/em-caxias\//.test(p)) return { freq: 'monthly', pri: '0.75' };
  if (/^\/blog\/.+/.test(p)) return { freq: 'monthly', pri: '0.7' };
  if (/^\/(privacidade|termos|dpa)\//.test(p)) return { freq: 'yearly', pri: '0.3' };
  if (/^\/en\//.test(p)) return { freq: 'monthly', pri: '0.8' };
  return { freq: 'monthly', pri: '0.7' };
}

const urls = [...new Set(collect(ROOT).map(toUrl))].sort((a, b) => {
  // raiz primeiro, depois alfabético
  if (a === `${ORIGIN}/`) return -1;
  if (b === `${ORIGIN}/`) return 1;
  return a.localeCompare(b);
});

const relByUrl = new Map();
for (const rel of collect(ROOT)) relByUrl.set(toUrl(rel), rel);

const body = urls.map((u) => {
  const { freq, pri } = meta(u);
  const lm = lastmod(relByUrl.get(u));
  return `  <url><loc>${u}</loc><lastmod>${lm}</lastmod><changefreq>${freq}</changefreq><priority>${pri}</priority></url>`;
}).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`;
writeFileSync(join(ROOT, 'sitemap.xml'), xml);
console.log(`sitemap.xml gerado com ${urls.length} URLs`);
