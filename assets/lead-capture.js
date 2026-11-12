// ════════════════════════════════════════════════════════════════════
// Maple Bear Caxias do Sul — Lead capture widgets
// Exit-intent popup (só desktop) + formulário do guia (newsletter-form).
// POST direto pra /api/visit-lead (mesmo domínio) via window.mbLead
// (components.js): sessão, página, UTM, envio verificado e telas de
// sucesso/erro são do núcleo.
// O que o site entrega de fato: o PDF do guia, na hora, com link direto.
// Nada é enviado por WhatsApp ou e-mail pelo site; a equipe entra em contato.
// ════════════════════════════════════════════════════════════════════

(function () {
  'use strict';
  var PDF_URL = '/assets/materiais/22-perguntas-visita-escola-bilingue.pdf';

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

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* armazenamento bloqueado */ } }

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
    p.appendChild(document.createTextNode('Baixe nosso guia '));
    p.appendChild(el('strong', { text: '"22 perguntas pra fazer numa escola bilíngue"' }));
    p.appendChild(document.createTextNode('. O PDF abre na hora, sem custo e sem spam.'));
    box.appendChild(p);

    var form = el('form', { class: 'exit-popup-form', 'data-origem': 'exit-intent' });
    form.appendChild(el('input', { type: 'text', name: 'nome', placeholder: 'Seu nome', required: '', autocomplete: 'name' }));
    form.appendChild(el('input', { type: 'tel', name: 'telefone', placeholder: 'WhatsApp com DDD', required: '', autocomplete: 'tel', inputmode: 'numeric' }));
    var honeypot = el('input', { type: 'text', name: 'company', tabindex: '-1', autocomplete: 'off', 'aria-hidden': 'true' });
    honeypot.style.cssText = 'position:absolute;left:-9999px';
    form.appendChild(honeypot);
    form.appendChild(el('button', { type: 'submit', class: 'btn btn-primary', text: 'Quero o guia' }));
    form.appendChild(el('p', { class: 'exit-popup-fb', role: 'status', 'aria-live': 'polite' }));
    form.addEventListener('submit', handleSubmit);
    box.appendChild(form);

    overlay.appendChild(box);
    overlay.addEventListener('click', function (e) { if (e.target === overlay) overlay.remove(); });
    document.body.appendChild(overlay);
    requestAnimationFrame(function () { overlay.classList.add('is-open'); });
  }

  // Exit-intent só em computador: no celular não há "saída do mouse", e o
  // gatilho de voltar ao topo da página atrapalhava quem estava lendo.
  function ehCelular() {
    return window.mbLead ? window.mbLead.celular()
      : (window.innerWidth < 900 || (window.matchMedia && window.matchMedia('(pointer: coarse)').matches));
  }

  if (!ehCelular() && !lsGet('mb_exit_seen')) {
    var triggered = false;
    var showExitPopup = function () {
      if (triggered || ehCelular()) return;
      triggered = true;
      lsSet('mb_exit_seen', String(Date.now()));
      buildExitPopup();
    };
    document.addEventListener('mouseleave', function (e) { if (e.clientY < 10) showExitPopup(); });
    var maxScroll = 0;
    window.addEventListener('scroll', function () {
      maxScroll = Math.max(maxScroll, window.scrollY);
      if (maxScroll > 800 && window.scrollY < 200) showExitPopup();
    }, { passive: true });
  }

  // ── Formulário do guia (home) ──────────────────────────────────────
  var anchor = document.getElementById('newsletter-form');
  if (anchor) anchor.addEventListener('submit', handleSubmit);

  // Procura o elemento de feedback dentro do form OU como irmão (newsletter-fb
  // costuma ficar fora do <form> no markup atual).
  function findFeedback(form) {
    return form.querySelector('.exit-popup-fb, .newsletter-fb')
      || (form.parentNode && form.parentNode.querySelector('.exit-popup-fb, .newsletter-fb'))
      || null;
  }

  function estilo(fb, kind) {
    fb.style.cssText = 'margin-top:1rem;padding:0.9rem 1.1rem;border-left:3px solid '
      + (kind === 'success' ? 'var(--red, #b8112e)' : '#c00')
      + ';background:' + (kind === 'success' ? 'rgba(184,17,46,0.08)' : 'rgba(204,0,0,0.06)')
      + ';color:' + (kind === 'success' ? '#1a1814' : '#8a0d22')
      + ';border-radius:4px;line-height:1.5;font-size:0.95rem;text-align:left;';
  }

  async function handleSubmit(e) {
    e.preventDefault();
    var form = e.target;
    var btn = form.querySelector('button[type="submit"]');
    var fb = findFeedback(form);
    var origem = form.getAttribute('data-origem') || 'newsletter';
    var L = window.mbLead;
    if (!L) return;

    var data = L.coletar(form, { origem: origem, canal: 'whatsapp' });
    if (data.company) { btn.disabled = true; return; }

    btn.disabled = true;
    var oldText = btn.textContent;
    btn.textContent = 'Enviando...';

    try {
      await L.enviar(data);
      // mbFormLead: para exit-intent/newsletter (material) o Ads NÃO recebe
      // conversão de formulário; sai só o evento de material (analytics.js).
      if (window.mbFormLead) window.mbFormLead(form, origem);
      form.style.display = 'none';
      if (fb) {
        estilo(fb, 'success');
        L.sucesso(fb, data.nome, origem, function (box) {
          box.appendChild(document.createElement('br'));
          var a = document.createElement('a');
          a.href = PDF_URL; a.target = '_blank'; a.rel = 'noopener';
          a.textContent = 'Baixar o guia em PDF';
          a.style.cssText = 'color:var(--red, #b8112e);font-weight:700;text-decoration:underline;';
          box.appendChild(a);
        });
      }
    } catch (err) {
      btn.disabled = false;
      btn.textContent = oldText;
      if (fb) { estilo(fb, 'error'); L.erro(fb, err && err.message); }
    }
  }

})();
