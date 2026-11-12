// ════════════════════════════════════════════════════════════════════
// Maple Bear Caxias do Sul — formulário de visita embutido nas landing
// pages de anúncio (form[data-lp-visita="lp-xxx"]).
// Mesmo mecanismo do /visite/: POST /api/visit-lead e, SÓ depois de a API
// confirmar, window.mbFormLead(form, origem) — conversão do Ads +
// Enhanced Conversions + generate_lead (ver analytics.js).
// A origem real da landing (lp-escola-bilingue, lp-creche...) vai no corpo:
// a API aceita `lp-*` e o Lumied recebe cada lead com a sua origem.
// Núcleo comum (sessão, página, UTM, envio, telas de sucesso/erro): window.mbLead
// em components.js.
// ════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  function ligar(form) {
    var L = window.mbLead;
    var origem = form.getAttribute('data-lp-visita') || 'lp';
    if (!/^lp-/.test(origem)) origem = 'lp-' + origem;
    var btn = form.querySelector('button[type="submit"]');
    var rotulo = btn.querySelector('.lp-btn-label') || btn;
    var textoBtn = rotulo.textContent;
    var fb = form.parentNode.querySelector('.lp-feedback');

    if (L) L.ajustarDatas(form);

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (!L) return;
      if (form.checkValidity && !form.checkValidity()) { form.reportValidity(); return; }

      var data = L.coletar(form, { origem: origem });

      btn.disabled = true;
      rotulo.textContent = 'Enviando...';
      if (fb) { fb.textContent = ''; fb.classList.remove('is-error'); }

      try {
        await L.enviar(data);
        form.hidden = true;
        if (fb) { fb.classList.remove('is-error'); L.sucesso(fb, data.nome, origem); }
        // Conversão só com a API confirmada — mesma ordem do /visite/.
        if (window.mbFormLead) window.mbFormLead(form, origem);
        else if (window.mbSetUserData) window.mbSetUserData(form);
        if (window.gtag) window.gtag('event', 'visit_request', { event_category: 'lead', event_label: origem });
      } catch (err) {
        btn.disabled = false;
        rotulo.textContent = textoBtn;
        if (fb) { fb.classList.add('is-error'); L.erro(fb, err && err.message); }
      }
    });
  }

  var forms = document.querySelectorAll('form[data-lp-visita]');
  for (var i = 0; i < forms.length; i++) ligar(forms[i]);
})();
