// ════════════════════════════════════════════════════════════════════
// Maple Bear Caxias do Sul — Lead capture widgets
// Exit-intent popup + Newsletter inline form handler
// POST direto pra /api/visit-lead (mesmo dominio)
// ════════════════════════════════════════════════════════════════════

(function () {
  'use strict';
  var API_ENDPOINT = '/api/visit-lead';
  var WA_URL = 'https://wa.me/5554996243857?text=' + encodeURIComponent('Olá! Vim do site da Maple Bear Caxias do Sul e gostaria de agendar uma visita.');

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

  // Procura o elemento de feedback dentro do form OU como irmão (newsletter-fb
  // costuma ficar fora do <form> no markup atual).
  function findFeedback(form) {
    return form.querySelector('.exit-popup-fb, .newsletter-fb')
      || (form.parentNode && form.parentNode.querySelector('.exit-popup-fb, .newsletter-fb'))
      || null;
  }

  function showFeedbackBox(fb, kind, lines) {
    if (!fb) return;
    fb.textContent = '';
    fb.style.cssText = 'margin-top:1rem;padding:0.9rem 1.1rem;border-left:3px solid '
      + (kind === 'success' ? 'var(--red, #b8112e)' : '#c00')
      + ';background:' + (kind === 'success' ? 'rgba(184,17,46,0.08)' : 'rgba(204,0,0,0.06)')
      + ';color:' + (kind === 'success' ? '#1a1814' : '#8a0d22')
      + ';border-radius:4px;line-height:1.5;font-size:0.95rem;';
    lines.forEach(function (line, i) {
      if (i > 0) fb.appendChild(el('br'));
      if (typeof line === 'string') fb.appendChild(document.createTextNode(line));
      else fb.appendChild(line);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var btn = form.querySelector('button[type="submit"]');
    var fb = findFeedback(form);
    var origem = form.getAttribute('data-origem') || 'newsletter';

    var data = { origem: origem, canal: 'whatsapp' };
    new FormData(form).forEach(function (v, k) { data[k] = v; });
    // Atribuição de campanha (utm_*/gclid) — helper definido em components.js
    if (window.mbUtm) {
      var utm = window.mbUtm();
      Object.keys(utm).forEach(function (k) { if (!data[k]) data[k] = utm[k]; });
    }
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
        var ok = el('strong', { text: 'Recebemos seu pedido. 🍁' });
        ok.style.color = 'var(--red, #b8112e)';
        showFeedbackBox(fb, 'success', [
          ok,
          'Vamos te chamar no WhatsApp em até um dia útil para conversar sem compromisso.'
        ]);
      } else { throw new Error(json.error || 'Erro'); }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = oldText;
      showFeedbackBox(fb, 'error', [
        'Não conseguimos enviar agora. Tente novamente ou nos chame direto no WhatsApp.'
      ]);
    }
  }

})();
