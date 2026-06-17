// ════════════════════════════════════════════════════════════════════
// Maple Bear Caxias do Sul — Tracking unificado (LGPD compliant)
// GA4 + Meta Pixel + dataLayer helpers
// ────────────────────────────────────────────────────────────────────
// As tags só carregam APÓS consentimento ('accepted'). O banner vive em
// components.js (chave mb_cookie_consent_v1) e chama window.mbLoadTags()
// ao aceitar. Quem rejeita / ainda não escolheu NÃO é rastreado.
// ════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var GA_ID = 'G-7KN8ZP8NMF';
  var PIXEL_ID = '1653706552580782'; // Meta Pixel Maple Bear Caxias do Sul
  var CONSENT_KEY = 'mb_cookie_consent_v1';

  // ── Carrega GA4 + Meta Pixel (idempotente) ─────────────────────────
  function loadTags() {
    if (window.__mbTagsLoaded) return;
    window.__mbTagsLoaded = true;

    // Google Analytics 4
    if (GA_ID) {
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
      document.head.appendChild(s);

      window.dataLayer = window.dataLayer || [];
      function gtag() { window.dataLayer.push(arguments); }
      window.gtag = gtag;

      gtag('js', new Date());
      gtag('config', GA_ID, {
        anonymize_ip: true,
        send_page_view: true,
        transport_type: 'beacon'
      });
    }

    // Meta Pixel
    if (PIXEL_ID) {
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', PIXEL_ID);
      fbq('track', 'PageView');
    }
  }

  // Exposto pra components.js disparar assim que o usuário aceitar.
  window.mbLoadTags = loadTags;

  // ── Helper público pra trackear conversões (no-op sem consentimento) ──
  window.trackLead = function (params) {
    var data = params || {};
    if (window.gtag) {
      gtag('event', 'generate_lead', {
        method: data.canal || 'whatsapp',
        origem: data.origem || 'unknown'
      });
    }
    if (window.fbq) {
      fbq('track', 'Lead', { content_name: data.origem || 'site' });
    }
  };

  // ── Enhanced Conversions: anexa dados do usuário (email/telefone) ──
  // Chamado no submit de formulário de lead, ANTES do evento de conversão.
  // O gtag faz o hash client-side; só roda se as tags já carregaram (consentimento).
  window.mbSetUserData = function (form) {
    if (!window.gtag || !form) return;
    var val = function (sel) { var el = form.querySelector(sel); return el && el.value ? el.value.trim() : ''; };
    var email = val('input[type="email"], input[name="email"]');
    var phone = val('input[type="tel"], input[name="telefone"], input[name="tel"]');
    var ud = {};
    if (email) ud.email = email.toLowerCase();
    if (phone) {
      var d = phone.replace(/\D/g, '').replace(/^0+/, '');
      if (d.length >= 10) {
        if (d.indexOf('55') === 0 && d.length > 11) d = d.slice(2);
        ud.phone_number = '+55' + d;
      }
    }
    if (ud.email || ud.phone_number) gtag('set', 'user_data', ud);
  };

  // ── Track de cliques em WhatsApp automaticamente ───────────────────
  // (listener sempre ativo; trackLead só emite se as tags já carregaram)
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href*="wa.me"]');
    if (!link) return;
    window.trackLead({ canal: 'whatsapp', origem: link.getAttribute('data-origem') || 'wa-click' });
  }, { passive: true });

  // ── Gate de consentimento: só carrega se já aceito anteriormente ───
  try {
    if (localStorage.getItem(CONSENT_KEY) === 'accepted') loadTags();
  } catch (e) {
    // localStorage indisponível (modo privado) — não carrega tags
  }

})();
