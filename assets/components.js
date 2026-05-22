(function () {
  'use strict';

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
})();
