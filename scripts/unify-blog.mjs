// Unifica o template dos posts de /blog/ com o novo design system.
// Pragmático: substitui só <header>, <footer> e WhatsApp antigo.
// Preserva: meta tags, JSON-LD, conteúdo do <article>, CSS inline + JS funcional.

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const root = new URL('..', import.meta.url).pathname.replace(/^\/([a-zA-Z]):\//, '$1:/');
const blogDir = join(root, 'blog');

// Header novo — string template
const NEW_HEADER = `<header class="site-header">
  <div class="container">
    <a href="/" class="brand" aria-label="Maple Bear Caxias do Sul"><span class="brand-mark">M</span><span class="brand-text"><strong>Maple Bear</strong><small>Caxias do Sul</small></span></a>
    <nav class="site-nav" aria-label="Principal">
      <a href="/sobre/">Sobre</a><a href="/metodologia/">Metodologia</a><a href="/niveis/">Níveis</a><a href="/estrutura/">Estrutura</a><a href="/matriculas/">Matrículas</a><a href="/blog/">Blog</a>
    </nav>
    <div class="header-cta">
      <a href="/visite/" class="btn btn-secondary" style="padding:0.65rem 1.15rem;min-height:40px;font-size:0.88rem;">Agendar visita</a>
      <button class="nav-toggle" aria-label="Menu" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>
    </div>
  </div>
</header>`;

// Footer novo
const NEW_FOOTER = `<footer class="site-footer">
  <div class="container">
    <p class="footer-headline">Bilíngue desde o<br><em>primeiro sorriso.</em></p>
    <div class="footer-grid">
      <div><h4>Maple Bear Caxias do Sul</h4><p>Escola bilíngue canadense em Caxias do Sul, RS.</p></div>
      <div><h4>Navegar</h4><a href="/sobre/">Sobre</a><a href="/metodologia/">Metodologia</a><a href="/niveis/">Níveis</a><a href="/estrutura/">Estrutura</a><a href="/equipe/">Equipe</a></div>
      <div><h4>Conversar</h4><a href="/matriculas/">Matrículas 2027</a><a href="/visite/">Agendar visita</a><a href="/faq/">FAQ</a><a href="/contato/">Contato</a><a href="/blog/">Blog</a></div>
      <div><h4>Contato</h4><a href="https://wa.me/5554996243857" target="_blank" rel="noopener">WhatsApp</a><a href="mailto:contato@maplebearcaxiasdosul.com.br">E-mail</a></div>
    </div>
    <div class="footer-bottom"><span>© <span class="footer-year"></span> Maple Bear Caxias do Sul</span><span>Parte da rede Maple Bear Canadian Schools</span></div>
  </div>
  <script>document.querySelectorAll('.footer-year').forEach(e => e.textContent = new Date().getFullYear());</script>
</footer>`;

const WA_FLOAT = `<a href="https://wa.me/5554996243857?text=Ol%C3%A1!%20Quero%20saber%20mais%20sobre%20a%20Maple%20Bear%20Caxias%20do%20Sul." class="wa-float" aria-label="WhatsApp" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>`;

// CSS extra que isola o blog do design system principal (escopo .blog-page)
const BLOG_HEAD_INJECT = `
  <link rel="stylesheet" href="/assets/styles.css">
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
  <script src="/assets/analytics.js" defer></script>
  <script src="/assets/components.js" defer></script>
  <style>
    /* Blog post — coexiste com /assets/styles.css (header/footer do design system).
       O conteúdo do <article> mantém sua tipografia/cores próprias inline. */
    body { background: var(--paper, #faf6ee) !important; padding-top: 0 !important; }
    .progress-bar { top: 0 !important; background: var(--red, #b8112e) !important; }
    .float-wa, .sticky-cta { display: none !important; } /* substituídos pelo .wa-float novo */
  </style>
`;

function transform(html) {
  let out = html;
  let changed = false;

  // 1. Atualizar canonical e og:url pra apex sem www
  out = out.replace(/https:\/\/www\.maplebearcaxiasdosul\.com\.br/g, 'https://maplebearcaxiasdosul.com.br');

  // 2. WhatsApp antigo → produção
  out = out.replace(/5554999396742/g, '5554996243857');

  // 3. Injetar styles novos antes de </head> (uma vez só)
  if (!out.includes('/assets/styles.css')) {
    out = out.replace('</head>', `${BLOG_HEAD_INJECT}\n</head>`);
    changed = true;
  }

  // 4. Substituir header antigo pelo novo
  out = out.replace(
    /<header class="header"[\s\S]*?<\/header>/m,
    NEW_HEADER
  );

  // 5. Substituir footer antigo pelo novo (caso exista)
  out = out.replace(
    /<footer class="footer"[\s\S]*?<\/footer>/m,
    NEW_FOOTER
  );
  // Caso o footer use <div class="footer">
  out = out.replace(
    /<div class="footer"[\s\S]*?<\/div>(?=\s*<script|\s*<\/body)/m,
    NEW_FOOTER
  );

  // 6. Adicionar WhatsApp float novo se ainda não existe wa-float
  if (!out.includes('class="wa-float"') && out.includes('</body>')) {
    out = out.replace('</body>', `${WA_FLOAT}\n</body>`);
  }

  return out;
}

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, files);
    else if (entry === 'index.html') files.push(full);
  }
  return files;
}

const posts = walk(blogDir);
console.log(`Found ${posts.length} blog HTML files`);

let touched = 0;
for (const file of posts) {
  const original = readFileSync(file, 'utf8');
  const transformed = transform(original);
  if (transformed !== original) {
    writeFileSync(file, transformed, 'utf8');
    touched++;
    console.log(`  ✓ ${file.replace(root, '')}`);
  }
}

console.log(`\nDone: ${touched}/${posts.length} files updated.`);
