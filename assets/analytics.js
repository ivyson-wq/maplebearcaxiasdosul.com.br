// ════════════════════════════════════════════════════════════════════
// Maple Bear Caxias do Sul — Tracking unificado (LGPD compliant)
// GA4 + Meta Pixel + dataLayer helpers
// ────────────────────────────────────────────────────────────────────
// Duas camadas, de propósito:
//   • GA4 + Google Ads carregam SEMPRE, sob Consent Mode v2. O default é
//     tudo 'denied': sem cookie, sem identificador — pings sem estado, que
//     é o que alimenta a conversão modelada. O banner manda o 'update'.
//   • Meta Pixel + beacon do Lumied continuam atrás do "Aceitar": o Pixel
//     não entende Consent Mode e o beacon cria sessão.
// O banner vive em components.js (chave mb_cookie_consent_v1) e chama
// window.mbConsentUpdate() + window.mbLoadTags().
// ════════════════════════════════════════════════════════════════════

(function () {
  'use strict';

  var GA_ID = 'G-7KN8ZP8NMF';
  var PIXEL_ID = '1653706552580782'; // Meta Pixel Maple Bear Caxias do Sul
  var CONSENT_KEY = 'mb_cookie_consent_v1';
  // Google Ads: conversão NATIVA do clique de WhatsApp. Antes o sinal só
  // chegava ao Ads pela importação do GA4 (generate_lead) — que atrasa e
  // modela. Com a tag própria o lance recebe o evento direto, e o
  // mbSetUserData() habilita Enhanced Conversions no mesmo clique.
  var AW_ID = 'AW-11302044142';
  var AW_WHATSAPP = 'AW-11302044142/hCf_CIyx1tocEO6Dno0q';
  // Agendamento de visita (/visite/) e lead magnets. Até 25/08/2026 o
  // formulário — a ação de MAIOR intenção do site — disparava só um evento
  // GA4 ('visit_request'), sem `send_to`: não existia conversão nativa do
  // Ads nesse caminho, e o mbSetUserData() ficava pendurado em nada.
  // PREENCHER com o rótulo de Metas › Conversões › (ação do formulário) ›
  // "Configurar tag" → o valor de send_to, formato 'AW-11302044142/XXXX'.
  // Vazio = comportamento antigo (só GA4), sem quebrar nada.
  var AW_FORMULARIO = '';
  var WA_NUMERO = '5554996243857'; // número da escola (≠ botões de compartilhar)

  // ── Consent Mode v2 ───────────────────────────────────────────────
  // Roda ANTES de qualquer tag. Sem isto, quem não clica "Aceitar" não
  // gera nem conversão modelada — é perda seca de sinal, não estimada.
  // O gtag passa a carregar SEMPRE; o que o consentimento controla é o
  // armazenamento (cookies), não a existência da tag.
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }
  window.gtag = gtag;

  var jaAceito = (function () {
    try { return localStorage.getItem(CONSENT_KEY) === 'accepted'; } catch (e) { return false; }
  })();

  gtag('consent', 'default', {
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
    analytics_storage: 'denied',
    wait_for_update: 500
  });
  // Quem já aceitou numa visita anterior não espera o banner: concede agora,
  // ainda dentro da janela do wait_for_update.
  if (jaAceito) concederConsentimento();

  function concederConsentimento() {
    gtag('consent', 'update', {
      ad_storage: 'granted',
      ad_user_data: 'granted',
      ad_personalization: 'granted',
      analytics_storage: 'granted'
    });
  }

  // Chamado pelo banner (components.js) na decisão do usuário.
  window.mbConsentUpdate = function (aceito) {
    if (aceito) concederConsentimento();
    else gtag('consent', 'update', {
      ad_storage: 'denied', ad_user_data: 'denied',
      ad_personalization: 'denied', analytics_storage: 'denied'
    });
  };

  // ── GA4 + Google Ads: carregam SEMPRE (o consentimento já os governa) ──
  if (GA_ID) {
    var gs = document.createElement('script');
    gs.async = true;
    gs.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(gs);

    gtag('js', new Date());
    gtag('config', GA_ID, {
      anonymize_ip: true,
      send_page_view: true,
      transport_type: 'beacon'
    });
    // Conversões do Google Ads na MESMA carga do gtag (o script já é o do
    // googletagmanager; AW só precisa do config próprio).
    gtag('config', AW_ID);
  }

  // ── Carrega o que NÃO tem consent mode (idempotente) ───────────────
  // Meta Pixel não respeita o Consent Mode do Google e o beacon do Lumied
  // cria sessão: os dois seguem atrás do "Aceitar", como antes.
  function loadTags() {
    if (window.__mbTagsLoaded) return;
    window.__mbTagsLoaded = true;

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

    // ── Lumied: pageview do site → CRM (alimenta o score do lead pela mesma
    // sessão). Dentro de loadTags = só APÓS consentimento, como GA/Meta.
    // Anônimo (só caminho + sessão), sem PII, até a família se identificar.
    try {
      var LK = 'lumied_sessao';
      var sid = sessionStorage.getItem(LK);
      if (!sid) {
        sid = (
          (window.crypto && crypto.randomUUID && crypto.randomUUID()) ||
          (String(Date.now()) + Math.random().toString(36).slice(2))
        ).slice(0, 36);
        sessionStorage.setItem(LK, sid);
      }
      var lutm = {};
      var lq = new URLSearchParams(location.search);
      ['source', 'medium', 'campaign', 'term', 'content'].forEach(function (p) {
        var v = lq.get('utm_' + p);
        if (v) lutm[p] = v.slice(0, 200);
      });
      // Identificadores de clique pago: sem eles a matrícula não volta pro
      // Google (o OCI precisa de gclid). Persistidos na sessão porque o
      // parâmetro só existe na PRIMEIRA página da visita.
      ['gclid', 'wbraid', 'gbraid'].forEach(function (p) {
        var v = lq.get(p);
        try {
          if (v) sessionStorage.setItem('mb_' + p, v.slice(0, 512));
          else v = sessionStorage.getItem('mb_' + p);
        } catch (e) { /* modo privado */ }
        if (v) lutm[p] = String(v).slice(0, 512);
      });
      var lpayload = JSON.stringify({
        escola: 'maplebearcaxias',
        path: (location.pathname || '/').slice(0, 300),
        sessao: sid,
        utm: lutm
      });
      var lurl = 'https://maplebearcaxias.lumied.com.br/api/track/pageview';
      var lblob = new Blob([lpayload], { type: 'text/plain' });
      if (navigator.sendBeacon) navigator.sendBeacon(lurl, lblob);
      else fetch(lurl, { method: 'POST', body: lpayload, keepalive: true, mode: 'no-cors' });
    } catch (e) { /* nunca quebra a página */ }
  }

  // Exposto pra components.js disparar assim que o usuário aceitar.
  window.mbLoadTags = loadTags;

  // ── Helper público pra trackear conversões ─────────────────────────
  // GA4/Ads sempre emitem (cookieless enquanto o consentimento é denied);
  // o fbq só existe depois do "Aceitar".
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
  // Chamado no sucesso do formulário, ANTES do evento de conversão — o
  // mbFormLead abaixo garante essa ordem. O gtag faz o hash client-side.
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

  // ── Ponto ÚNICO de conversão de FORMULÁRIO ─────────────────────────
  // Chamar SÓ depois de a API confirmar (r.ok && json.ok): conversão
  // disparada no submit conta tentativa que falhou, e o Smart Bidding
  // passa a perseguir formulário quebrado.
  // Ordem importa: user_data ANTES do evento, senão o Enhanced
  // Conversions não anexa nada.
  window.mbFormLead = function (form, origem) {
    if (form && window.mbSetUserData) window.mbSetUserData(form);
    if (window.gtag && AW_FORMULARIO) {
      gtag('event', 'conversion', { send_to: AW_FORMULARIO, transport_type: 'beacon' });
    }
    window.trackLead({ canal: 'form', origem: origem || 'formulario' });
  };

  // ── Marcador que SOBREVIVE ao pulo navegador→WhatsApp ──────────────
  // gclid e utm morrem no salto pro app: o lead chega "limpo" e a matrícula
  // nunca volta pro Google. O código curto da sessão viaja DENTRO da própria
  // mensagem; o Lumied resolve sessão → gclid no primeiro contato
  // (lib/ads/lp-atribuicao.ts). Sem consentimento não há sessão, e aí o link
  // segue limpo — como era antes.
  function refSessao() {
    try {
      var sid = sessionStorage.getItem('lumied_sessao');
      return sid ? sid.replace(/-/g, '').slice(0, 8).toUpperCase() : '';
    } catch (e) { return ''; }
  }

  // Devolve a URL do WhatsApp com o marcador no texto (idempotente).
  // Mexe SÓ no fim do valor de text=, na unha: passar por URLSearchParams
  // re-codificaria os espaços de %20 para '+', mudando a mensagem que o pai vê.
  function carimbar(url) {
    var ref = refSessao();
    if (!ref || !url || url.indexOf('ref%3A') > -1 || url.indexOf('(ref:') > -1) return url;
    var i = url.indexOf('text=');
    if (i < 0) return url;
    var ini = i + 5;
    var fim = url.indexOf('&', ini);
    var valor = fim < 0 ? url.slice(ini) : url.slice(ini, fim);
    if (!valor) return url;
    var novo = valor + encodeURIComponent(' (ref: ' + ref + ')');
    return url.slice(0, ini) + novo + (fim < 0 ? '' : url.slice(fim));
  }

  // Ponto ÚNICO de conversão do WhatsApp: registra e devolve a URL carimbada.
  // Usado pelo listener de <a> e por quem abre via window.open (components.js),
  // pra que os dois caminhos contem igual e carreguem a mesma atribuição.
  window.mbWhatsApp = function (url, origem) {
    window.trackLead({ canal: 'whatsapp', origem: origem || 'wa-click' });
    if (window.gtag) gtag('event', 'conversion', { send_to: AW_WHATSAPP });
    return carimbar(url);
  };

  // ── Track de cliques em WhatsApp automaticamente ───────────────────
  // (listener sempre ativo; sob Consent Mode o evento sai mesmo sem aceite)
  // SÓ o número da escola: os botões "compartilhar no WhatsApp" do blog
  // usam wa.me/?text=... e não são lead nenhum — contá-los inflava o
  // generate_lead que o Google Ads importa e usa pra dar lance.
  document.addEventListener('click', function (e) {
    var link = e.target.closest('a[href*="wa.me/' + WA_NUMERO + '"]');
    if (!link) return;
    // Mutar o href durante o clique vale para a navegação que vem a seguir.
    link.href = window.mbWhatsApp(link.href, link.getAttribute('data-origem'));
  }, { passive: true });

  // ── Gate: Pixel + beacon só se já aceito anteriormente ─────────────
  // (GA4/Ads já subiram acima sob Consent Mode; aqui é só o resto.)
  if (jaAceito) loadTags();

})();
