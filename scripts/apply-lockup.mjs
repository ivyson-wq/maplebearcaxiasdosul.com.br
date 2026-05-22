// Substitui o logo-horizontal.png (versão master da rede) pelo
// logo-lockup-compact.png (lockup oficial da unidade: Chinook + Shield Elementary)
// em todas as 53 páginas.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([a-zA-Z]):\//, '$1:/');

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
  // Trocar src do logo no header
  html = html.replaceAll(
    'src="/assets/brand/logo-horizontal.png" alt="Maple Bear"',
    'src="/assets/brand/logo-lockup-compact.png" alt="Maple Bear Canadian School · Canadian Elementary School"'
  );
  if (html !== before) {
    writeFileSync(file, html, 'utf8');
    touched++;
  }
}
console.log(`Done: ${touched}/${files.length} files updated.`);
