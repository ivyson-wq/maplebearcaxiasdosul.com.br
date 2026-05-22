// Substitui o "M" no .brand-mark por SVG da folha de bordo
// em todas as páginas institucionais + posts do blog.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([a-zA-Z]):\//, '$1:/');

const LEAF_SVG = '<svg viewBox="0 0 64 64"><path d="M32 14 L34 24 L41 21 L37 30 L48 28 L40 35 L52 37 L40 40 L48 47 L37 44 L41 53 L34 50 L32 60 L30 50 L23 53 L27 44 L16 47 L24 40 L12 37 L24 35 L16 28 L27 30 L23 21 L30 24 Z"/></svg>';

const OLD = '<span class="brand-mark" aria-hidden="true">M</span>';
const NEW = `<span class="brand-mark" aria-hidden="true">${LEAF_SVG}</span>`;

const OLD_SHORT = '<span class="brand-mark">M</span>';
const NEW_SHORT = `<span class="brand-mark">${LEAF_SVG}</span>`;

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (entry === 'index.html') files.push(full);
  }
  return files;
}

const files = walk(root);
let touched = 0;
for (const file of files) {
  let html = readFileSync(file, 'utf8');
  const before = html;
  html = html.replaceAll(OLD, NEW).replaceAll(OLD_SHORT, NEW_SHORT);
  if (html !== before) {
    writeFileSync(file, html, 'utf8');
    touched++;
    console.log(`  ✓ ${file.replace(root, '')}`);
  }
}
console.log(`\nDone: ${touched} files updated.`);
