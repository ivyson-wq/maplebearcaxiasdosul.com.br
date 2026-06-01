"""
Gera as páginas de bairros restantes (Sanvitto, Petrópolis, Exposição,
São Pelegrino) + overview /em-caxias/ a partir do template já criado.
"""
from pathlib import Path

ROOT = Path(__file__).parent.parent

# Slug → (Nome, Sobre o bairro, Tempo de carro estimado, Razões específicas)
BAIRROS = {
    'sanvitto': {
        'nome': 'Sanvitto',
        'descritor': 'um dos bairros mais novos e procurados de Caxias',
        'tempo': '12 a 15 minutos',
        'contexto': 'O Sanvitto cresceu nos últimos anos com famílias jovens em condomínios fechados — perfil que busca educação de qualidade e infraestrutura próxima sem precisar morar no centro.',
        'razao_extra': 'Acessibilidade fácil para quem vive em condomínio: estacionamento confortável na unidade, fluxo de entrada/saída organizado',
    },
    'petropolis': {
        'nome': 'Petrópolis',
        'descritor': 'um bairro tradicional e arborizado da zona nobre',
        'tempo': '8 a 12 minutos',
        'contexto': 'Famílias de Petrópolis costumam priorizar tradição, ambiente acolhedor e equipe pedagógica que cria vínculo com cada criança — características que combinam com o jeito Maple Bear de operar.',
        'razao_extra': 'Tradição com método moderno: rede Maple Bear tem mais de 60 anos, com prática pedagógica testada em mais de 30 países',
    },
    'exposicao': {
        'nome': 'Exposição',
        'descritor': 'um bairro residencial central, próximo de todas as referências da cidade',
        'tempo': '6 a 10 minutos',
        'contexto': 'A proximidade do centro torna o Exposição um dos bairros com acesso mais rápido à unidade. Para famílias que valorizam logística simples — escola, casa e trabalho conectados — a Maple Bear se encaixa naturalmente na rotina.',
        'razao_extra': 'Rotina prática para famílias de duas carreiras: localização que conecta casa-escola-trabalho com tempo mínimo de deslocamento',
    },
    'sao-pelegrino': {
        'nome': 'São Pelegrino',
        'descritor': 'um bairro de referência cultural e de alto padrão',
        'tempo': '7 a 11 minutos',
        'contexto': 'O São Pelegrino abriga famílias atentas a referências culturais, qualidade de ensino e formação além do conteúdo acadêmico. A educação canadense Maple Bear conversa com esse perfil — método estruturado, formação socioemocional integrada, exposição cultural via inglês como ambiente.',
        'razao_extra': 'Formação cultural integrada: imersão em inglês significa também exposição à cultura, literatura e referências do mundo anglófono, não só ao idioma',
    },
}

TEMPLATE = '''<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#CC1216">
  <title>Escola bilíngue no {nome} · Caxias do Sul — Maple Bear</title>
  <meta name="description" content="Famílias do bairro {nome}, em Caxias do Sul, chegam à Maple Bear Canadian School em poucos minutos. Educação bilíngue canadense com método próprio, do Bear Care ao Year 4 em 2027.">
  <link rel="canonical" href="https://maplebearcaxiasdosul.com.br/em-caxias/{slug}/">
  <meta name="robots" content="index, follow, max-image-preview:large">
  <meta property="og:type" content="article">
  <meta property="og:title" content="Escola bilíngue no {nome} · Maple Bear Caxias">
  <meta property="og:url" content="https://maplebearcaxiasdosul.com.br/em-caxias/{slug}/">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,250..600;1,9..144,250..600&family=Spectral:ital,wght@0,300..600;1,300..600&family=Inter:wght@400;500;600;700&display=swap">
  <link rel="stylesheet" href="/assets/styles.css">
  <meta property="og:image" content="https://maplebearcaxiasdosul.com.br/assets/og-image.png">
  <link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">

  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "EducationalOrganization",
    "@id": "https://maplebearcaxiasdosul.com.br/#school",
    "name": "Maple Bear Caxias do Sul",
    "url": "https://maplebearcaxiasdosul.com.br/",
    "address": {{ "@type": "PostalAddress", "streetAddress": "Rua Jacob Luchesi, 2374", "addressLocality": "Caxias do Sul", "addressRegion": "RS", "postalCode": "95032-000", "addressCountry": "BR" }},
    "areaServed": [
      {{ "@type": "AdministrativeArea", "name": "{nome}, Caxias do Sul" }},
      {{ "@type": "City", "name": "Caxias do Sul" }}
    ]
  }}
  </script>

  <script src="/assets/analytics.js" defer></script><script src="/assets/components.js" defer></script>
</head>
<body>
  <header class="site-header"><div class="container"><a href="/" class="brand"><img src="/assets/brand/logo-lockup-compact.png" alt="Maple Bear Canadian School · Canadian Elementary School" class="brand-logo"><span class="brand-divider"></span><span class="brand-text"><strong>Caxias do Sul</strong><small>Canadian School</small></span></a><nav class="site-nav"><a href="/sobre/">Sobre</a><a href="/metodologia/">Metodologia</a><a href="/niveis/">Níveis</a><a href="/estrutura/">Estrutura</a><a href="/matriculas/">Matrículas</a><a href="/blog/">Blog</a></nav><div class="header-cta"><a href="/visite/" class="btn btn-secondary" style="padding:0.65rem 1.15rem;min-height:40px;font-size:0.88rem;">Agendar visita</a><button class="nav-toggle" aria-label="Menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button></div></div></header>

  <main>
    <section class="page-header">
      <div class="container">
        <nav class="breadcrumb"><a href="/">Início</a><span class="sep">/</span><a href="/em-caxias/">Em Caxias do Sul</a><span class="sep">/</span><span>{nome}</span></nav>
        <p class="eyebrow" data-reveal>Escola bilíngue · Bairro {nome}</p>
        <h1 data-reveal data-delay="1">Para famílias do<br><em>{nome}</em>, a Maple Bear<br>está a poucos minutos.</h1>
        <p class="lede" data-reveal data-delay="2">
          A unidade Maple Bear Caxias do Sul fica na <strong>Rua Jacob Luchesi, 2374</strong>,
          conectada ao bairro {nome} por percurso direto. {contexto}
        </p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="two-col">
          <div class="stack-l">
            <p class="eyebrow" data-reveal>Como chegar</p>
            <h2 data-reveal data-delay="1">Do {nome}<br>à Maple Bear.</h2>
            <p data-reveal data-delay="2">
              A maior parte das famílias do {nome} chega à unidade em <strong>{tempo} de carro</strong>,
              dependendo do ponto de partida e horário. O caminho é direto e usa vias com fluxo
              previsível mesmo em horário de entrada/saída escolar.
            </p>
            <p data-reveal data-delay="3">
              Vale conhecer os arredores também: a região da Rua Jacob Luchesi tem comércio, fácil
              acesso a outras vias e estacionamento na própria escola para famílias visitantes.
            </p>
            <p class="mt-l" data-reveal data-delay="4">
              <a href="https://www.google.com/maps/dir/?api=1&origin={maps_query}+Caxias+do+Sul&destination=Rua+Jacob+Luchesi+2374+Caxias+do+Sul" target="_blank" rel="noopener" class="btn-text">Ver rota no Google Maps <span class="arrow">→</span></a>
            </p>
          </div>
          <div data-reveal data-delay="2">
            <iframe src="https://www.google.com/maps?q=Rua+Jacob+Luchesi+2374+Caxias+do+Sul+RS+95032-000&output=embed" width="100%" height="360" style="border:0; border-radius: var(--radius-m); display: block;" loading="lazy" title="Localização Maple Bear Caxias do Sul"></iframe>
          </div>
        </div>
      </div>
    </section>

    <section class="section" style="background: var(--paper-warm);">
      <div class="container">
        <div class="section-intro">
          <div>
            <p class="eyebrow mb-m" data-reveal>Por que famílias do {nome} escolhem</p>
            <h2 class="section-heading" data-reveal data-delay="1">Três razões<br><em>concretas</em>.</h2>
          </div>
          <p class="lede" data-reveal data-delay="2">
            {descritor_intro}
          </p>
        </div>
        <div class="pillars">
          <article class="pillar" data-reveal>
            <span class="numeral">01</span>
            <h3>Currículo canadense, não traduzido</h3>
            <p>Material didático Maple Bear desenvolvido no Canadá, atualizado anualmente pela rede global. Não é livro brasileiro convertido pra inglês.</p>
          </article>
          <article class="pillar" data-reveal data-delay="1">
            <span class="numeral">02</span>
            <h3>Turmas pequenas, atenção individual</h3>
            <p>Trabalhamos com número limitado de alunos por sala por convicção pedagógica. Cada criança é conhecida pela equipe.</p>
          </article>
          <article class="pillar" data-reveal data-delay="2">
            <span class="numeral">03</span>
            <h3>{razao_3_titulo}</h3>
            <p>{razao_extra}.</p>
          </article>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="container-narrow">
        <p class="eyebrow mb-m" data-reveal>Atendemos toda Caxias do Sul</p>
        <h2 class="mb-l" data-reveal data-delay="1">Bairros vizinhos<br>e <em>toda a cidade</em>.</h2>
        <p data-reveal data-delay="2">
          Hoje recebemos famílias de bairros como
          <a href="/em-caxias/cinquentenario/">Cinquentenário</a>,
          <a href="/em-caxias/petropolis/">Petrópolis</a>,
          <a href="/em-caxias/sao-pelegrino/">São Pelegrino</a>,
          <a href="/em-caxias/exposicao/">Exposição</a> e
          <a href="/em-caxias/sanvitto/">Sanvitto</a>. Caxias é uma cidade caminhável de carro —
          uma escola realmente boa não precisa estar no seu quarteirão.
        </p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="cta-banner" data-reveal>
          <div>
            <p class="eyebrow" style="color: var(--gold-pale);">Próximo passo</p>
            <h2 class="mt-s">Visita guiada,<br>sem <em>compromisso</em>.</h2>
            <p>Em uma hora você conhece a unidade, vê uma aula em ação e conversa com a coordenação pedagógica.</p>
          </div>
          <div class="actions"><a href="/visite/" class="btn btn-primary">Agendar visita</a><a href="https://wa.me/5554996243857?text=Ol%C3%A1!%20Sou%20do%20{nome_url}%20e%20quero%20conhecer%20a%20Maple%20Bear." class="btn btn-ghost" target="_blank" rel="noopener">WhatsApp</a></div>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer"><div class="container"><p class="footer-headline">Muito além<br>do <em>bilíngue.</em></p><div class="footer-grid"><div><h4>Maple Bear Caxias do Sul</h4><p>Escola bilíngue canadense em Caxias do Sul, RS.</p><p style="margin-top: 1rem; font-size: 0.92rem; line-height: 1.55;">Rua Jacob Luchesi, 2374<br>Caxias do Sul · RS · 95032-000</p><p style="margin-top: 0.5rem; font-size: 0.85rem; opacity: 0.7;">Seg–Sex · 07:30 às 19h</p></div><div><h4>Navegar</h4><a href="/sobre/">Sobre</a><a href="/metodologia/">Metodologia</a><a href="/niveis/">Níveis</a><a href="/estrutura/">Estrutura</a><a href="/equipe/">Equipe</a></div><div><h4>Conversar</h4><a href="/matriculas/">Matrículas 2027</a><a href="/visite/">Agendar visita</a><a href="/faq/">FAQ</a><a href="/contato/">Contato</a><a href="/blog/">Blog</a></div><div><h4>Contato</h4><a href="https://wa.me/5554996243857" target="_blank" rel="noopener">WhatsApp</a><a href="mailto:contato@maplebearcaxiasdosul.com.br">E-mail</a></div></div><div class="footer-bottom"><span>© <span id="year"></span> Maple Bear Caxias do Sul</span><span>Parte da rede Maple Bear Canadian Schools</span></div></div><script>document.getElementById('year').textContent = new Date().getFullYear();</script></footer>
  <a href="https://wa.me/5554996243857" class="wa-float" aria-label="WhatsApp" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>
</body>
</html>
'''

razao_3_titulos = {
    'sanvitto': 'Logística confortável',
    'petropolis': 'Tradição com método moderno',
    'exposicao': 'Rotina prática',
    'sao-pelegrino': 'Formação cultural integrada',
}

for slug, b in BAIRROS.items():
    out_dir = ROOT / 'em-caxias' / slug
    out_dir.mkdir(parents=True, exist_ok=True)
    html = TEMPLATE.format(
        slug=slug,
        nome=b['nome'],
        descritor=b['descritor'],
        tempo=b['tempo'],
        contexto=b['contexto'],
        razao_3_titulo=razao_3_titulos[slug],
        razao_extra=b['razao_extra'],
        descritor_intro=f"Famílias do bairro {b['nome']} costumam priorizar três coisas quando escolhem escola bilíngue. A Maple Bear endereça as três sem rodeios.",
        nome_url=b['nome'].replace(' ', '%20'),
        maps_query=b['nome'].replace(' ', '+'),
    )
    (out_dir / 'index.html').write_text(html, encoding='utf-8')
    print(f"OK em-caxias/{slug}/index.html")

# Overview /em-caxias/
OVERVIEW = '''<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="theme-color" content="#CC1216">
  <title>Maple Bear em Caxias do Sul — Atendemos toda a cidade</title>
  <meta name="description" content="A Maple Bear Caxias do Sul recebe famílias de todos os bairros: Cinquentenário, Petrópolis, São Pelegrino, Exposição, Sanvitto e além. Veja o caminho do seu bairro à unidade.">
  <link rel="canonical" href="https://maplebearcaxiasdosul.com.br/em-caxias/">
  <meta name="robots" content="index, follow">
  <link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,250..600;1,9..144,250..600&family=Spectral:ital,wght@0,300..600;1,300..600&family=Inter:wght@400;500;600;700&display=swap">
  <link rel="stylesheet" href="/assets/styles.css">
  <meta property="og:image" content="https://maplebearcaxiasdosul.com.br/assets/og-image.png">
  <link rel="apple-touch-icon" href="/assets/brand/apple-touch-icon.png">
  <link rel="icon" type="image/svg+xml" href="/assets/favicon.svg">
  <script src="/assets/analytics.js" defer></script><script src="/assets/components.js" defer></script>
</head>
<body>
  <header class="site-header"><div class="container"><a href="/" class="brand"><img src="/assets/brand/logo-lockup-compact.png" alt="Maple Bear Canadian School" class="brand-logo"><span class="brand-divider"></span><span class="brand-text"><strong>Caxias do Sul</strong><small>Canadian School</small></span></a><nav class="site-nav"><a href="/sobre/">Sobre</a><a href="/metodologia/">Metodologia</a><a href="/niveis/">Níveis</a><a href="/estrutura/">Estrutura</a><a href="/matriculas/">Matrículas</a><a href="/blog/">Blog</a></nav><div class="header-cta"><a href="/visite/" class="btn btn-secondary" style="padding:0.65rem 1.15rem;min-height:40px;font-size:0.88rem;">Agendar visita</a><button class="nav-toggle" aria-label="Menu"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button></div></div></header>

  <main>
    <section class="page-header">
      <div class="container">
        <nav class="breadcrumb"><a href="/">Início</a><span class="sep">/</span><span>Em Caxias do Sul</span></nav>
        <p class="eyebrow" data-reveal>Atendemos toda Caxias do Sul</p>
        <h1 data-reveal data-delay="1">Maple Bear<br><em>perto de você</em>.</h1>
        <p class="lede" data-reveal data-delay="2">
          A unidade Maple Bear Caxias do Sul fica na Rua Jacob Luchesi, 2374 — uma localização
          central que conecta a maioria dos bairros da cidade em poucos minutos de carro. Confira
          o caminho saindo do seu bairro.
        </p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        <div class="levels" data-reveal>
          <a href="/em-caxias/cinquentenario/" class="level"><span class="age">~10min</span><h3><small>Bairro</small>Cinquentenário</h3><p>Bairro residencial central com acesso direto à Rua Jacob Luchesi.</p><span class="read">Ver caminho <span class="arrow">→</span></span></a>
          <a href="/em-caxias/petropolis/" class="level"><span class="age">~10min</span><h3><small>Bairro</small>Petrópolis</h3><p>Bairro tradicional e arborizado da zona nobre, próximo da unidade.</p><span class="read">Ver caminho <span class="arrow">→</span></span></a>
          <a href="/em-caxias/sao-pelegrino/" class="level"><span class="age">~9min</span><h3><small>Bairro</small>São Pelegrino</h3><p>Referência cultural e de alto padrão, com acesso rápido à escola.</p><span class="read">Ver caminho <span class="arrow">→</span></span></a>
          <a href="/em-caxias/exposicao/" class="level"><span class="age">~8min</span><h3><small>Bairro</small>Exposição</h3><p>Bairro residencial central, conectado a todas as referências da cidade.</p><span class="read">Ver caminho <span class="arrow">→</span></span></a>
          <a href="/em-caxias/sanvitto/" class="level"><span class="age">~13min</span><h3><small>Bairro</small>Sanvitto</h3><p>Bairro novo, classe média-alta, ligado por vias estruturais.</p><span class="read">Ver caminho <span class="arrow">→</span></span></a>
        </div>

        <p class="mt-2xl text-center" data-reveal>
          Seu bairro não está na lista? Mande mensagem que respondemos com o caminho até nós.
        </p>
        <p class="text-center mt-l" data-reveal>
          <a href="https://wa.me/5554996243857" class="btn btn-primary" target="_blank" rel="noopener">Falar no WhatsApp</a>
        </p>
      </div>
    </section>
  </main>

  <footer class="site-footer"><div class="container"><p class="footer-headline">Muito além<br>do <em>bilíngue.</em></p><div class="footer-grid"><div><h4>Maple Bear Caxias do Sul</h4><p>Rua Jacob Luchesi, 2374 · Caxias do Sul/RS · CEP 95032-000</p><p style="margin-top: 0.5rem; font-size: 0.85rem; opacity: 0.7;">Seg–Sex · 07:30 às 19h</p></div><div><h4>Navegar</h4><a href="/sobre/">Sobre</a><a href="/metodologia/">Metodologia</a><a href="/niveis/">Níveis</a><a href="/estrutura/">Estrutura</a><a href="/equipe/">Equipe</a></div><div><h4>Conversar</h4><a href="/matriculas/">Matrículas 2027</a><a href="/visite/">Agendar visita</a><a href="/faq/">FAQ</a><a href="/contato/">Contato</a><a href="/blog/">Blog</a></div><div><h4>Contato</h4><a href="https://wa.me/5554996243857" target="_blank" rel="noopener">WhatsApp</a><a href="mailto:contato@maplebearcaxiasdosul.com.br">E-mail</a></div></div><div class="footer-bottom"><span>© <span id="year"></span> Maple Bear Caxias do Sul</span><span>Parte da rede Maple Bear Canadian Schools</span></div></div><script>document.getElementById('year').textContent = new Date().getFullYear();</script></footer>
  <a href="https://wa.me/5554996243857" class="wa-float" aria-label="WhatsApp" target="_blank" rel="noopener"><svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg></a>
</body>
</html>
'''
overview_path = ROOT / 'em-caxias' / 'index.html'
overview_path.parent.mkdir(parents=True, exist_ok=True)
overview_path.write_text(OVERVIEW, encoding='utf-8')
print("OK em-caxias/index.html (overview)")
