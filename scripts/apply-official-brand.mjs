// Aplica o brand oficial Maple Bear em TODAS as páginas (51 arquivos):
// - Substitui brand-mark SVG da folha pelo logo horizontal PNG oficial
// - Atualiza footer-headline pro slogan oficial "Muito além do bilíngue."
// - Atualiza brand-text: "Caxias do Sul / Canadian School"

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([a-zA-Z]):\//, '$1:/');

// Header brand antigo → novo
const OLD_BRAND_HEADER_REGEX = /<a href="\/" class="brand"[^>]*><span class="brand-mark"[^>]*><svg viewBox="0 0 64 64"><path d="M32 14[^"]*"\/><\/svg><\/span><span class="brand-text"><strong>Maple Bear<\/strong><small>Caxias do Sul<\/small><\/span><\/a>/g;
const NEW_BRAND_HEADER = `<a href="/" class="brand" aria-label="Maple Bear Caxias do Sul — início"><img src="/assets/brand/logo-horizontal.png" alt="Maple Bear" class="brand-logo"><span class="brand-divider" aria-hidden="true"></span><span class="brand-text"><strong>Caxias do Sul</strong><small>Canadian School</small></span></a>`;

// Footer headline antigo → slogan oficial
const OLD_FOOTER_HEADLINE = `<p class="footer-headline">Bilíngue desde o<br><em>primeiro sorriso.</em></p>`;
const NEW_FOOTER_HEADLINE = `<p class="footer-headline">Muito além<br>do <em>bilíngue.</em></p>`;

function walk(dir, files = []) {
  for (const e of readdirSync(dir)) {
    if (e === 'node_modules' || e.startsWith('.')) continue;
    const full = join(dir, e);
    if (statSync(full).isDirectory()) walk(full, files);
    else if (e === 'index.html') files.push(full);
  }
  return files;
}

const files = walk(root);
let touched = 0;
let warns = 0;

for (const file of files) {
  let html = readFileSync(file, 'utf8');
  const before = html;

  html = html.replace(OLD_BRAND_HEADER_REGEX, NEW_BRAND_HEADER);
  html = html.replaceAll(OLD_FOOTER_HEADLINE, NEW_FOOTER_HEADLINE);
  // Theme-color pro vermelho oficial
  html = html.replaceAll('content="#DE3712"', 'content="#CC1216"');

  if (html !== before) {
    writeFileSync(file, html, 'utf8');
    touched++;
    console.log(`  OK ${file.replace(root, '')}`);
  }
}

console.log(`\nDone: ${touched}/${files.length} files updated, ${warns} warnings.`);
