(function () {
  'use strict';

  /* UTM/gclid — persiste atribuição de campanha em sessionStorage para o
     lead chegar com utm_* mesmo quando o form é enviado em outra página.
     window.mbUtm() é consumido pelos forms que POSTam /api/visit-lead. */
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'gbraid', 'wbraid', 'fbclid'];
  const UTM_MAX = { gclid: 512, gbraid: 512, wbraid: 512, fbclid: 512 };
  const utmCorta = (k, v) => String(v).slice(0, UTM_MAX[k] || 200);
  try {
    const params = new URLSearchParams(location.search);
    const found = {};
    UTM_KEYS.forEach((k) => {
      const v = params.get(k);
      if (v) found[k] = utmCorta(k, v);
    });
    if (Object.keys(found).length) sessionStorage.setItem('mb_utm', JSON.stringify(found));
  } catch (e) { /* sessionStorage indisponível — segue sem atribuição */ }

  window.mbUtm = function () {
    let out = {};
    try { out = JSON.parse(sessionStorage.getItem('mb_utm') || '{}') || {}; } catch (e) { out = {}; }
    try {
      const params = new URLSearchParams(location.search);
      UTM_KEYS.forEach((k) => {
        const v = params.get(k);
        if (v) out[k] = utmCorta(k, v);
      });
    } catch (e) { /* noop */ }
    return out;
  };

  /* ════════════════════════════════════════════════════════════════════
     window.mbLead — núcleo único dos formulários de captura (blog, /visite/,
     materiais, exit-intent, landing pages). Tudo que é comum fica aqui:
     montar o corpo (sessão, página, UTM), enviar com resposta verificada,
     tela de sucesso e de erro, data de hoje, detecção de celular.
     ════════════════════════════════════════════════════════════════════ */
  (function () {
    const NUMERO = '5554996243857';
    const NUMERO_BONITO = '(54) 99624-3857';

    function hoje() {
      const d = new Date();
      const z = (n) => (n < 10 ? '0' : '') + n;
      return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
    }

    // Aplica max = hoje (e min = 15 anos atrás) em todo input de data de nascimento.
    function ajustarDatas(raiz) {
      const d = new Date();
      const z = (n) => (n < 10 ? '0' : '') + n;
      const min = (d.getFullYear() - 15) + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
      (raiz || document).querySelectorAll('input[type="date"][name="data_nascimento"]').forEach((i) => {
        i.setAttribute('max', hoje());
        i.setAttribute('min', min);
      });
    }

    function celular() {
      try {
        return window.innerWidth < 900 || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
      } catch (e) { return false; }
    }

    // Título curto da página para o texto do WhatsApp.
    function tituloCurto() {
      const h1 = document.querySelector('h1');
      let t = (document.title || (h1 && h1.textContent) || '').replace(/\s+/g, ' ').trim();
      t = t.split(/\s[|—–]\s|:\s/)[0].trim();
      if (t.length > 60) t = t.slice(0, 57).replace(/\s+\S*$/, '') + '...';
      return t || 'site';
    }

    function waUrl(texto) {
      return 'https://wa.me/' + NUMERO + '?text=' + encodeURIComponent(texto);
    }

    function waAdiantar(nome, origem) {
      const quem = String(nome || '').trim().split(/\s+/)[0];
      return waUrl('Olá! Sou ' + (quem || 'uma família') + '. Acabei de enviar meu pedido pelo site da Maple Bear Caxias do Sul'
        + (origem ? ' (origem: ' + origem + ')' : '') + ' e quero adiantar o atendimento.');
    }

    function waPagina() {
      return waUrl('Olá! Vim da página ' + tituloCurto() + ' do site da Maple Bear Caxias do Sul e quero saber mais.');
    }

    // Corpo padrão: campos do form + UTM + sessão + página.
    function coletar(form, extra) {
      const data = {};
      new FormData(form).forEach((v, k) => { data[k] = v; });
      if (extra) Object.keys(extra).forEach((k) => { data[k] = extra[k]; });
      if (window.mbUtm) {
        const utm = window.mbUtm();
        Object.keys(utm).forEach((k) => { if (!data[k]) data[k] = utm[k]; });
      }
      try { data.sessao = sessionStorage.getItem('lumied_sessao') || undefined; } catch (e) { /* modo privado */ }
      if (!data.pagina) data.pagina = location.pathname;
      return data;
    }

    // POST /api/visit-lead. Resolve só com resposta ok; rejeita com Error de
    // mensagem humana (err.humano = true quando o texto vem da API).
    async function enviar(data) {
      let r, json = null;
      try {
        r = await fetch('/api/visit-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        try { json = await r.json(); } catch (e) { json = null; }
      } catch (e) {
        throw new Error('Parece que você está sem conexão. Confira a internet e tente de novo.');
      }
      if (r.ok && json && json.ok) return json;
      if (r.status === 400 && json && json.message) {
        const err = new Error(json.message);
        err.humano = true;
        throw err;
      }
      throw new Error('Não conseguimos enviar agora.');
    }

    function botaoWa(href, rotulo) {
      const a = document.createElement('a');
      a.href = href; a.target = '_blank'; a.rel = 'noopener';
      a.className = 'mb-lead-wa';
      a.textContent = rotulo;
      a.style.cssText = 'display:inline-block;margin-top:.75rem;padding:.7rem 1.3rem;border-radius:999px;background:#25D366;color:#fff;font-weight:700;font-size:.95rem;text-decoration:none;';
      return a;
    }

    function limpar(el) { while (el.firstChild) el.removeChild(el.firstChild); }

    // Tela de sucesso padrão (mensagem + Adiantar pelo WhatsApp + número).
    // `extras(el)` permite acrescentar algo (ex.: link do PDF) antes do botão.
    function sucesso(el, nome, origem, extras) {
      if (!el) return;
      limpar(el);
      el.hidden = false;
      el.style.display = 'block';
      const t = document.createElement('strong');
      t.style.cssText = 'display:block;margin-bottom:.35rem;';
      t.textContent = 'Recebemos seu pedido.';
      el.appendChild(t);
      el.appendChild(document.createTextNode('A equipe da Maple Bear Caxias do Sul responde no horário comercial.'));
      if (extras) extras(el);
      el.appendChild(document.createElement('br'));
      el.appendChild(botaoWa(waAdiantar(nome, origem), 'Adiantar pelo WhatsApp'));
      const n = document.createElement('div');
      n.style.cssText = 'margin-top:.6rem;font-size:.88rem;opacity:.85;';
      n.textContent = 'Salve nosso número: ' + NUMERO_BONITO;
      el.appendChild(n);
    }

    // Erro com mensagem humana e botão de WhatsApp (sem alert, sem abrir nada sozinho).
    function erro(el, msg) {
      if (!el) return;
      limpar(el);
      el.hidden = false;
      el.style.display = 'block';
      const t = document.createElement('strong');
      t.style.cssText = 'display:block;margin-bottom:.35rem;';
      t.textContent = msg || 'Não conseguimos enviar agora.';
      el.appendChild(t);
      el.appendChild(document.createTextNode('Você pode tentar de novo ou falar direto com a gente.'));
      el.appendChild(document.createElement('br'));
      el.appendChild(botaoWa(waPagina(), 'Chamar no WhatsApp'));
    }

    window.mbLead = {
      NUMERO: NUMERO, NUMERO_BONITO: NUMERO_BONITO,
      hoje: hoje, ajustarDatas: ajustarDatas, celular: celular,
      tituloCurto: tituloCurto, waUrl: waUrl, waPagina: waPagina, waAdiantar: waAdiantar,
      coletar: coletar, enviar: enviar, sucesso: sucesso, erro: erro
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => ajustarDatas());
    else ajustarDatas();
  })();

  /* Service Worker registration (PWA) */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  /* Top bar — Matrículas 2027 (injetado em todas as páginas) */
  const DISMISS_KEY = 'mb_topbar_dismissed_v1';
  const wasDismissed = (() => { try { return sessionStorage.getItem(DISMISS_KEY); } catch { return null; } })();

  let bar = document.querySelector('.top-bar');
  if (wasDismissed && bar) { bar.remove(); bar = null; }
  if (!wasDismissed && document.body && !bar) {
    bar = document.createElement('div');
    bar.className = 'top-bar';
    bar.setAttribute('role', 'region');
    bar.setAttribute('aria-label', 'Matrículas 2027');
    bar.innerHTML = `
      <div class="top-bar-inner">
        <span class="top-bar-icon" aria-hidden="true">✦</span>
        <span class="top-bar-text">
          <strong>Matrículas 2027 abertas</strong>
          <small style="opacity: 0.85;">· Bear Care ao Year 4 · vagas limitadas</small>
        </span>
        <a href="/visite/" class="top-bar-cta">
          Agendar visita <span aria-hidden="true">→</span>
        </a>
        <button type="button" class="top-bar-dismiss" aria-label="Fechar aviso">×</button>
      </div>
    `;
    document.body.insertBefore(bar, document.body.firstChild);
  }

  if (bar) {
    bar.querySelector('.top-bar-dismiss').addEventListener('click', () => {
      try { sessionStorage.setItem(DISMISS_KEY, '1'); } catch {}
      bar.style.maxHeight = bar.offsetHeight + 'px';
      requestAnimationFrame(() => {
        bar.style.transition = 'max-height 280ms var(--easing-soft), opacity 280ms';
        bar.style.overflow = 'hidden';
        bar.style.maxHeight = '0';
        bar.style.opacity = '0';
      });
      setTimeout(() => bar.remove(), 320);
    });

    bar.querySelector('.top-bar-cta').addEventListener('click', () => {
      if (window.gtag) gtag('event', 'topbar_cta_click', { event_category: 'engagement', event_label: 'matriculas_2027' });
    });
  }

  /* Cookie banner LGPD — exibido até o usuário aceitar/rejeitar */
  const COOKIE_KEY = 'mb_cookie_consent_v1';
  const consent = (() => { try { return localStorage.getItem(COOKIE_KEY); } catch { return null; } })();

  if (!consent && document.body) {
    const banner = document.createElement('div');
    banner.className = 'cookie-banner';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Aviso de cookies');
    banner.innerHTML = `
      <div class="cookie-text">
        <strong>Usamos cookies</strong> para entender como o site é utilizado e melhorar sua experiência.
        Saiba mais na <a href="/privacidade/">Política de Privacidade</a>.
      </div>
      <div class="cookie-actions">
        <button type="button" class="cookie-btn cookie-btn-secondary" data-consent="rejected">Rejeitar</button>
        <button type="button" class="cookie-btn cookie-btn-primary" data-consent="accepted">Aceitar todos</button>
      </div>
    `;
    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('is-visible'));

    banner.addEventListener('click', (e) => {
      const target = e.target.closest('[data-consent]');
      if (!target) return;
      const value = target.getAttribute('data-consent');
      try { localStorage.setItem(COOKIE_KEY, value); } catch {}
      banner.classList.remove('is-visible');
      setTimeout(() => banner.remove(), 350);
      // Consent Mode v2 primeiro, nos DOIS caminhos: o gtag já está no ar
      // e precisa saber da decisão (aceitar libera cookie; rejeitar confirma
      // o denied e encerra o wait_for_update em vez de deixá-lo expirar).
      if (window.mbConsentUpdate) window.mbConsentUpdate(value === 'accepted');
      if (value === 'accepted' && window.mbLoadTags) {
        // Consentimento dado nesta sessão → carrega Meta Pixel + beacon agora
        window.mbLoadTags();
      }
      if (value === 'rejected' && window.gtag) {
        // Anonymize further — remover cookies GA
        document.cookie.split(';').forEach(c => {
          const name = c.split('=')[0].trim();
          if (name.startsWith('_ga') || name.startsWith('_gid')) {
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=.${location.hostname.replace(/^www\./, '')}`;
          }
        });
      }
    });
  }

  /* Garante link de Privacidade no footer (idempotente) */
  document.querySelectorAll('.site-footer .footer-grid > div:last-child').forEach((col) => {
    if (col.querySelector('a[href="/privacidade/"]')) return;
    const link = document.createElement('a');
    link.href = '/privacidade/';
    link.textContent = 'Privacidade · LGPD';
    col.appendChild(link);
  });

  /* Header — scroll state */
  const header = document.querySelector('.site-header');
  if (header) {
    let last = 0;
    const onScroll = () => {
      const y = window.scrollY;
      header.classList.toggle('is-scrolled', y > 8);
      last = y;
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* Mobile nav toggle */
  const toggle = document.querySelector('.nav-toggle');
  const nav = document.querySelector('.site-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', open);
      document.body.style.overflow = open ? 'hidden' : '';
    });
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('is-open');
      toggle.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }));
  }

  /* Barra de CTA fixa no rodapé (mobile) — CTA sempre ao alcance do polegar.
     O clique em /visite/ é interceptado abaixo e abre o WhatsApp com mensagem pronta. */
  if (document.body && !document.querySelector('.mobile-cta-bar')) {
    const ctaBar = document.createElement('div');
    ctaBar.className = 'mobile-cta-bar';
    ctaBar.setAttribute('role', 'region');
    ctaBar.setAttribute('aria-label', 'Agendar visita');
    ctaBar.innerHTML = `
      <a href="/visite/" class="mcta-primary">
        <span>Agendar visita guiada</span>
        <span class="mcta-arrow" aria-hidden="true">→</span>
      </a>
      <a href="https://wa.me/5554996243857?text=${encodeURIComponent('Olá! Vim do site da Maple Bear Caxias do Sul e gostaria de agendar uma visita.')}"
         class="mcta-wa" target="_blank" rel="noopener" aria-label="Conversar no WhatsApp">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
      </a>
    `;
    document.body.appendChild(ctaBar);
  }

  /* Reveal on scroll (IntersectionObserver) */
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const items = document.querySelectorAll('[data-reveal]');
  if (!reduce && 'IntersectionObserver' in window && items.length) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    items.forEach(el => io.observe(el));
  } else {
    items.forEach(el => el.classList.add('is-visible'));
  }

  /* Mark active nav link */
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  document.querySelectorAll('.site-nav a').forEach(a => {
    const href = a.getAttribute('href').replace(/\/$/, '') || '/';
    if (href === path || (href !== '/' && path.startsWith(href))) {
      a.classList.add('is-active');
    }
  });

  /* ════════════════════════════════════════════════════════════════════
     Agendar visita — CTAs que levam a /visite/
     Exceções: na própria /visite/, ou Ctrl/Cmd-click, ou target=_blank.
     ════════════════════════════════════════════════════════════════════ */
  const isVisitePage = /^\/visite\/?$/.test(window.location.pathname);

  // CTAs de "Agendar visita" abrem o WhatsApp já com mensagem pronta —
  // conversa direta converte melhor que formulário. O formulário continua
  // disponível em /visite/ (orgânico/SEO) e o lead é capturado pela ponte CRM↔WhatsApp.
  const WA_VISITA = 'https://wa.me/5554996243857?text='
    + encodeURIComponent('Olá! Vim do site da Maple Bear Caxias do Sul e gostaria de agendar uma visita.');

  if (!isVisitePage) {
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href]');
      if (!link) return;
      const href = link.getAttribute('href') || '';
      if (!/^\/visite\/?(\?|#|$)/.test(href)) return;
      // Respeita atalhos pra abrir em nova aba/janela
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      e.preventDefault();
      // mbWhatsApp (analytics.js) registra a conversão e devolve a URL com o
      // marcador de sessão — mesmo caminho dos links <a> de WhatsApp.
      if (window.gtag) window.gtag('event', 'visit_whatsapp_click', { event_category: 'lead', event_label: link.textContent.trim().slice(0, 60) });
      const destino = window.mbWhatsApp
        ? window.mbWhatsApp(WA_VISITA, 'agendar-visita-cta')
        : WA_VISITA;
      window.open(destino, '_blank', 'noopener');
    });
  }
})();
