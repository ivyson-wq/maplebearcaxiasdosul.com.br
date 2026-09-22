// ════════════════════════════════════════════════════════════════════
// Maple Bear Caxias do Sul — formulário de visita embutido nas landing
// pages de anúncio (form[data-lp-visita="lp-xxx"]).
// Mesmo mecanismo do /visite/: POST /api/visit-lead e, SÓ depois de a API
// confirmar (r.ok && json.ok), window.mbFormLead(form, origem) — conversão
// do Ads + Enhanced Conversions + generate_lead (ver analytics.js).
// O corpo não manda `origem`: a API só aceita os valores canônicos (o drip
// comercial casa cadência por eles) e cairia em 'site-visite' de qualquer
// jeito. A página de origem vai no evento (mbFormLead / visit_request).
// ════════════════════════════════════════════════════════════════════
(function () {
  'use strict';
  var WA = 'https://wa.me/5554996243857?text=' + encodeURIComponent('Olá! Vim do site da Maple Bear Caxias do Sul e gostaria de agendar uma visita.');

  function mostrar(fb, erro, titulo, texto, comLinkWa) {
    fb.textContent = '';
    fb.classList.toggle('is-error', !!erro);
    var s = document.createElement('strong');
    s.textContent = titulo;
    s.style.display = 'block';
    fb.appendChild(s);
    fb.appendChild(document.createTextNode(texto));
    if (comLinkWa) {
      var a = document.createElement('a');
      a.href = WA; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = 'chamar no WhatsApp';
      fb.appendChild(document.createTextNode(' Se preferir, é só '));
      fb.appendChild(a);
      fb.appendChild(document.createTextNode('.'));
    }
  }

  function ligar(form) {
    var origem = form.getAttribute('data-lp-visita') || 'lp';
    var btn = form.querySelector('button[type="submit"]');
    var rotulo = btn.querySelector('.lp-btn-label') || btn;
    var textoBtn = rotulo.textContent;
    var fb = form.parentNode.querySelector('.lp-feedback');

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (form.checkValidity && !form.checkValidity()) { form.reportValidity(); return; }

      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      if (window.mbUtm) {
        var utm = window.mbUtm();
        Object.keys(utm).forEach(function (k) { if (!data[k]) data[k] = utm[k]; });
      }
      try { data.sessao = sessionStorage.getItem('lumied_sessao') || undefined; } catch (err) { /* modo privado */ }

      btn.disabled = true;
      rotulo.textContent = 'Enviando...';
      if (fb) fb.textContent = '';

      try {
        var r = await fetch('/api/visit-lead', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        var json = await r.json();
        if (!(r.ok && json.ok)) {
          throw new Error((json.errors && json.errors.join(', ')) || json.error || 'erro desconhecido');
        }
        form.hidden = true;
        if (fb) mostrar(fb, false, 'Recebemos seu pedido.', ' Nossa equipe vai te chamar no WhatsApp em até um dia útil para confirmar o melhor horário.', false);
        // Conversão só com a API confirmada — mesma ordem do /visite/.
        if (window.mbFormLead) window.mbFormLead(form, origem);
        else if (window.mbSetUserData) window.mbSetUserData(form);
        if (window.gtag) window.gtag('event', 'visit_request', { event_category: 'lead', event_label: origem });
      } catch (err) {
        btn.disabled = false;
        rotulo.textContent = textoBtn;
        if (fb) mostrar(fb, true, 'Não conseguimos enviar agora.', ' ' + (err && err.message ? 'Motivo: ' + err.message + '.' : 'Tente de novo em instantes.'), true);
      }
    });
  }

  var forms = document.querySelectorAll('form[data-lp-visita]');
  for (var i = 0; i < forms.length; i++) ligar(forms[i]);
})();
