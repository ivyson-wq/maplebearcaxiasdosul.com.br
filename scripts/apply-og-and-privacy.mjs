// Adiciona OG image + apple-touch-icon em todas as páginas
// + adiciona link "Privacidade" no footer

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([a-zA-Z]):\//, '$1:/');

const OG_TAG = `\n  <meta property="og:image" content="https://maplebearcaxiasdosul.com.br/assets/og-image.png">\n  <meta property="og:image:width" content="1200">\n  <meta property="og:image:height" content="630">\n  <meta name="twitter:image" content="https://maplebearcaxiasdosul.com.br/assets/og-image.png">\n  <link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">`;

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

for (const file of files) {
  let html = readFileSync(file, 'utf8');
  const before = html;

  // Adicionar OG image antes do </head>, se não existir ainda
  if (!html.includes('og:image" content="https://maplebearcaxiasdosul.com.br/assets/og-image.png"')) {
    // Remover qualquer og:image antiga
    html = html.replace(/\s*<meta property="og:image"[^>]*>/g, '');
    html = html.replace(/\s*<meta name="twitter:image"[^>]*>/g, '');
    html = html.replace(/\s*<link rel="apple-touch-icon"[^>]*>/g, '');
    // Adicionar antes do favicon link
    html = html.replace(
      /(<link rel="icon" type="image\/svg\+xml"[^>]*>)/,
      `${OG_TAG}\n  $1`
    );
  }

  // Adicionar link "Privacidade · LGPD" no footer-grid (se não existe)
  if (!html.includes('href="/privacidade/"')) {
    // Append à última div do footer-grid (cluster Contato)
    html = html.replace(
      /(<div class="footer-grid">[\s\S]*?<\/div><\/div>)/,
      (match) => {
        // Adicionar nova coluna "Legal" se grid permite ou patch no cluster Contato
        return match.replace(
          /(<\/div><div class="footer-bottom">|<\/div><\/div>$)/,
          (m, end) => {
            if (end.startsWith('<div class="footer-bottom">')) {
              // tem footer-bottom — inserir antes
              return `<div><h4>Legal</h4><a href="/privacidade/">Privacidade · LGPD</a></div></div>${end}`;
            }
            return m;
          }
        );
      }
    );
  }

  if (html !== before) {
    writeFileSync(file, html, 'utf8');
    touched++;
    console.log(`  OK ${file.replace(root, '')}`);
  }
}

console.log(`\nDone: ${touched}/${files.length} files updated.`);
