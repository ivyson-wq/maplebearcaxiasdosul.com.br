(function () {
  'use strict';

  /* UTM/gclid — persiste atribuição de campanha em sessionStorage para o
     lead chegar com utm_* mesmo quando o form é enviado em outra página.
     window.mbUtm() é consumido pelos forms que POSTam /api/visit-lead. */
  const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'gclid'];
  try {
    const params = new URLSearchParams(location.search);
    const found = {};
    UTM_KEYS.forEach((k) => {
      const v = params.get(k);
      if (v) found[k] = String(v).slice(0, 120);
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
        if (v) out[k] = String(v).slice(0, 120);
      });
    } catch (e) { /* noop */ }
    return out;
  };

  /* Service Worker registration (PWA) */
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    });
  }

  /* Top bar — Matrículas 2027 (injetado em todas as páginas) */
  const DISMISS_KEY = 'mb_topbar_dismissed_v1';
  const wasDismissed = (() => { try { return sessionStorage.getItem(DISMISS_KEY); } catch { return null; } })();

  if (!wasDismissed && document.body && !document.querySelector('.top-bar')) {
    const bar = document.createElement('div');
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
      if (value === 'accepted' && window.mbLoadTags) {
        // Consentimento dado nesta sessão → carrega GA4 + Meta Pixel agora
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
     Agendar visita — modal/popup universal
     Intercepta cliques em links pra /visite/ e abre formulário inline.
     Exceções: na própria /visite/, ou Ctrl/Cmd-click, ou target=_blank.
     ════════════════════════════════════════════════════════════════════ */
  const isVisitePage = /^\/visite\/?$/.test(window.location.pathname);

  function buildVisitModal() {
    if (document.querySelector('.visit-modal-overlay')) return;
    const overlay = document.createElement('div');
    overlay.className = 'exit-popup-overlay visit-modal-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'visit-modal-title');
    overlay.innerHTML = `
      <div class="exit-popup visit-modal">
        <button type="button" class="exit-popup-close" aria-label="Fechar">&times;</button>
        <img src="/assets/brand/chinook-face-happy.png" alt="" width="100" height="98" class="exit-popup-mascot">
        <h3 id="visit-modal-title">Agendar visita guiada</h3>
        <p>Preencha rapidinho e nossa equipe te chama no WhatsApp pra confirmar o melhor dia e horário.</p>
        <form class="exit-popup-form visit-modal-form" data-origem="site-visite" novalidate>
          <label class="vm-field">
            <span>Seu nome</span>
            <input type="text" name="nome" placeholder="Como podemos te chamar" required autocomplete="name">
          </label>
          <label class="vm-field">
            <span>WhatsApp</span>
            <input type="tel" name="telefone" placeholder="(54) 99999-9999" required autocomplete="tel" inputmode="numeric">
          </label>
          <label class="vm-field">
            <span>Nome da criança</span>
            <input type="text" name="crianca_nome" placeholder="Primeiro nome" required autocomplete="off">
          </label>
          <label class="vm-field">
            <span>Data de nascimento da criança</span>
            <input type="date" name="data_nascimento" required>
          </label>
          <input type="text" name="company" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px">
          <button type="submit" class="btn btn-primary">Quero agendar minha visita</button>
          <p class="exit-popup-fb visit-modal-fb" role="status" aria-live="polite"></p>
          <p class="visit-modal-note">Resposta em até um dia útil. Sem compromisso.</p>
        </form>
      </div>
    `;
    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector('.exit-popup-close');
    const form = overlay.querySelector('form');
    const dateInput = form.querySelector('input[name="data_nascimento"]');
    if (dateInput) {
      const today = new Date();
      const max = today.toISOString().slice(0, 10);
      const minDate = new Date(today.getFullYear() - 15, today.getMonth(), today.getDate());
      dateInput.setAttribute('max', max);
      dateInput.setAttribute('min', minDate.toISOString().slice(0, 10));
    }

    const close = () => {
      overlay.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(() => overlay.remove(), 300);
    };
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function onEsc(e) {
      if (e.key === 'Escape' && document.body.contains(overlay)) {
        close();
        document.removeEventListener('keydown', onEsc);
      }
    });

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const fb = form.querySelector('.visit-modal-fb');
      const data = { origem: 'site-visite', canal: 'whatsapp' };
      new FormData(form).forEach((v, k) => { data[k] = v; });
      if (window.mbUtm) { const utm = window.mbUtm(); Object.keys(utm).forEach((k) => { if (!data[k]) data[k] = utm[k]; }); }
      if (data.company) { btn.disabled = true; return; }

      // Validação client-side leve
      if (!data.nome || data.nome.trim().length < 2) { showFb(fb, 'error', 'Conte seu nome.'); return; }
      const phoneDigits = String(data.telefone || '').replace(/\D/g, '');
      if (phoneDigits.length < 10 || phoneDigits.length > 13) { showFb(fb, 'error', 'WhatsApp inválido — inclua DDD.'); return; }
      if (!data.crianca_nome || data.crianca_nome.trim().length < 2) { showFb(fb, 'error', 'Conte o nome da criança.'); return; }
      if (!data.data_nascimento) { showFb(fb, 'error', 'Informe a data de nascimento.'); return; }

      btn.disabled = true;
      const oldText = btn.textContent;
      btn.textContent = 'Enviando...';
      fb.textContent = '';

      try {
        const r = await fetch('/api/visit-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        const json = await r.json();
        if (r.ok && json.ok) {
          if (window.mbSetUserData) window.mbSetUserData(form); // Enhanced Conversions
          if (window.trackLead) window.trackLead({ canal: 'form', origem: 'site-visite' });
          if (window.gtag) window.gtag('event', 'visit_modal_submit', { event_category: 'lead', event_label: 'agendar_visita_modal' });
          form.style.display = 'none';
          const success = document.createElement('div');
          success.className = 'visit-modal-success';
          success.innerHTML = `
            <strong>Pedido recebido 🍁</strong>
            <p>Vamos te chamar no WhatsApp em até um dia útil para combinar o horário da visita.</p>
            <button type="button" class="btn btn-secondary visit-modal-ok">Fechar</button>
          `;
          overlay.querySelector('.visit-modal').appendChild(success);
          success.querySelector('.visit-modal-ok').addEventListener('click', close);
        } else {
          throw new Error((json && json.errors && json.errors.join(', ')) || (json && json.error) || 'erro');
        }
      } catch (err) {
        btn.disabled = false;
        btn.textContent = oldText;
        showFb(fb, 'error', 'Não conseguimos enviar agora. Tente novamente ou nos chame no WhatsApp.');
      }
    });

    requestAnimationFrame(() => {
      overlay.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      const firstInput = form.querySelector('input[name="nome"]');
      if (firstInput) firstInput.focus();
    });
  }

  function showFb(fb, kind, msg) {
    if (!fb) return;
    fb.textContent = msg;
    fb.style.cssText = 'margin-top:0.5rem;padding:0.7rem 0.9rem;border-left:3px solid '
      + (kind === 'success' ? 'var(--red, #b8112e)' : '#c00')
      + ';background:' + (kind === 'success' ? 'rgba(184,17,46,0.08)' : 'rgba(204,0,0,0.06)')
      + ';color:' + (kind === 'success' ? '#1a1814' : '#8a0d22')
      + ';border-radius:6px;font-size:0.92rem;text-align:left;';
  }

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
      if (window.trackLead) window.trackLead({ canal: 'whatsapp', origem: 'agendar-visita-cta' });
      if (window.gtag) window.gtag('event', 'visit_whatsapp_click', { event_category: 'lead', event_label: link.textContent.trim().slice(0, 60) });
      window.open(WA_VISITA, '_blank', 'noopener');
    });
  }
})();
