// ════════════════════════════════════════════════════════════════════
// Maple Bear Caxias do Sul — Lead capture widgets
// Exit-intent popup + Newsletter inline form handler
// POST direto pra /api/visit-lead (mesmo dominio)
// ════════════════════════════════════════════════════════════════════

(function () {
  'use strict';
  var API_ENDPOINT = '/api/visit-lead';
  var WA_URL = 'https://wa.me/5554997021634';

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    if (attrs) Object.keys(attrs).forEach(function (k) {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'text') node.textContent = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
    if (children) children.forEach(function (c) { if (c) node.appendChild(c); });
    return node;
  }

  // ── Exit-intent popup ──────────────────────────────────────────────
  function buildExitPopup() {
    var overlay = el('div', { class: 'exit-popup-overlay', role: 'dialog', 'aria-labelledby': 'exit-popup-title' });
    var box = el('div', { class: 'exit-popup' });

    var closeBtn = el('button', { class: 'exit-popup-close', 'aria-label': 'Fechar', text: '×' });
    closeBtn.addEventListener('click', function () { overlay.remove(); });
    box.appendChild(closeBtn);

    box.appendChild(el('img', {
      src: '/assets/brand/chinook-face-kiss.png',
      alt: '', width: '120', height: '118', class: 'exit-popup-mascot'
    }));
    box.appendChild(el('h3', { id: 'exit-popup-title', text: 'Antes de você ir...' }));

    var p = el('p');
    p.appendChild(document.createTextNode('Receba nosso guia '));
    p.appendChild(el('strong', { text: '"22 perguntas pra fazer numa escola bilíngue"' }));
    p.appendChild(document.createTextNode(' direto no seu WhatsApp. Sem custo, sem spam.'));
    box.appendChild(p);

    var form = el('form', { class: 'exit-popup-form', 'data-origem': 'exit-intent' });
    form.appendChild(el('input', { type: 'text', name: 'nome', placeholder: 'Seu nome', required: '', autocomplete: 'name' }));
    form.appendChild(el('input', { type: 'tel', name: 'telefone', placeholder: 'WhatsApp com DDD', required: '', autocomplete: 'tel', inputmode: 'numeric' }));
    var honeypot = el('input', { type: 'text', name: 'company', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' });
    honeypot.style.cssText = 'position:absolute;left:-9999px';
    form.appendChild(honeypot);
    form.appendChild(el('button', { type: 'submit', class: 'btn btn-primary', text: 'Quero receber o guia' }));
    form.appendChild(el('p', { class: 'exit-popup-fb', role: 'status', 'aria-live': 'polite' }));
    form.addEventListener('submit', handleSubmit);
    box.appendChild(form);

    overlay.appendChild(box);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });
  }

  if (!localStorage.getItem('mb_exit_seen')) {
    var triggered = false;
    function showExitPopup() {
      if (triggered) return;
      triggered = true;
      localStorage.setItem('mb_exit_seen', String(Date.now()));
      buildExitPopup();
    }
    document.addEventListener('mouseleave', function (e) { if (e.clientY < 10) showExitPopup(); });
    var maxScroll = 0;
    window.addEventListener('scroll', function () {
      maxScroll = Math.max(maxScroll, window.scrollY);
      if (maxScroll > 800 && window.scrollY < 200) showExitPopup();
    }, { passive: true });
  }

  // ── Newsletter inline form ─────────────────────────────────────────
  var anchor = document.getElementById('newsletter-form');
  if (anchor) anchor.addEventListener('submit', handleSubmit);

  async function handleSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var btn = form.querySelector('button[type="submit"]');
    var fb = form.querySelector('.exit-popup-fb, .newsletter-fb');
    var origem = form.getAttribute('data-origem') || 'newsletter';

    var data = { origem: origem, canal: 'whatsapp' };
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    if (data.company) { btn.disabled = true; return; }

    btn.disabled = true;
    var oldText = btn.textContent;
    btn.textContent = 'Enviando...';

    try {
      var r = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      var json = await r.json();
      if (r.ok && json.ok) {
        if (window.trackLead) window.trackLead({ canal: 'form', origem: origem });
        form.style.display = 'none';
        if (fb) {
          fb.textContent = '';
          var ok = el('strong', { text: 'Recebido! 🍁' });
          ok.style.color = 'var(--red)';
          fb.appendChild(ok);
          fb.appendChild(el('br'));
          fb.appendChild(document.createTextNode('Nossa coordenação vai falar contigo no WhatsApp em breve.'));
        }
      } else { throw new Error(json.error || 'Erro'); }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = oldText;
      if (fb) {
        fb.textContent = '';
        var errSpan = el('span', { text: 'Erro ao enviar. Tente o WhatsApp direto.' });
        errSpan.style.color = '#c00';
        fb.appendChild(errSpan);
      }
    }
  }

})();
