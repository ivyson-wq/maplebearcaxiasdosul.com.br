// ════════════════════════════════════════════════════════════════════
// Maple Bear Caxias do Sul — captura de leads do blog (formulário do artigo,
// pop-up de saída e formulário do índice do blog).
// Tudo vai para POST /api/visit-lead (mesmo domínio) via window.mbLead
// (components.js), com origem blog-<slug>, blog-exit-<slug> ou blog-index,
// sessão, página e UTM. Sucesso só depois da resposta ok da API; erro com
// mensagem humana e botão de WhatsApp. Sem alert() e sem abrir o WhatsApp
// à força. mbFormLead (analytics.js) dispara a conversão só no sucesso.
// ════════════════════════════════════════════════════════════════════
(function () {
  'use strict';

  var partes = location.pathname.split('/').filter(Boolean);
  var slug = (partes[0] === 'blog' && partes[1]) ? partes[1].replace(/[^a-z0-9-]/gi, '').toLowerCase() : 'index';

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* armazenamento bloqueado */ } }

  function campo(form, nomes) {
    for (var i = 0; i < nomes.length; i++) {
      var c = form.elements[nomes[i]];
      if (c && c.value !== undefined) return c.value;
    }
    return '';
  }

  // Área de aviso criada logo depois do formulário (erro e, quando preciso, sucesso).
  function areaAviso(form, cor) {
    var el = form.parentNode.querySelector('.mb-lead-fb');
    if (!el) {
      el = document.createElement('div');
      el.className = 'mb-lead-fb';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      form.parentNode.insertBefore(el, form.nextSibling);
    }
    el.style.cssText = 'margin:14px auto 0;max-width:420px;text-align:center;font-size:14px;line-height:1.5;color:' + cor + ';';
    return el;
  }

  function honeypot(form) {
    if (form.elements['company']) return;
    var h = document.createElement('input');
    h.type = 'text'; h.name = 'company'; h.tabIndex = -1; h.autocomplete = 'off';
    h.setAttribute('aria-hidden', 'true');
    h.style.cssText = 'position:absolute;left:-9999px;width:1px;height:1px;opacity:0;';
    form.appendChild(h);
  }

  // Envia e trata o resultado. `visual` = { corErro, corOk, aviso(form), onOk(form, box) }.
  async function enviar(form, origem, visual) {
    var L = window.mbLead;
    var btn = form.querySelector('button[type="submit"]');
    if (!L) return;
    honeypot(form);
    var nome = campo(form, ['nome', 'name', 'exit_name']).trim();
    var telefone = campo(form, ['telefone', 'phone', 'exit_phone']).trim();
    var data = L.coletar(form, { nome: nome, telefone: telefone, origem: origem, canal: 'whatsapp' });
    if (data.company) { if (btn) btn.disabled = true; return; }

    var rotulo = btn ? btn.textContent : '';
    if (btn) { btn.disabled = true; btn.textContent = 'Enviando...'; }
    try {
      await L.enviar(data);
      form.style.display = 'none';
      var velho = form.parentNode.querySelector('.mb-lead-fb'); // erro de tentativa anterior
      if (velho) velho.parentNode.removeChild(velho);
      var box = visual.sucesso(form);
      L.sucesso(box, nome, origem);
      box.style.color = visual.corOk;
      if (window.mbFormLead) window.mbFormLead(form, origem);
    } catch (err) {
      if (btn) { btn.disabled = false; btn.textContent = rotulo; }
      var aviso = areaAviso(form, visual.corErro);
      L.erro(aviso, err && err.message);
    }
  }

  // ── Formulário do artigo ───────────────────────────────────────────
  window.handleLeadCapture = function (e) {
    e.preventDefault();
    var form = e.target;
    enviar(form, 'blog-' + slug, {
      corErro: '#fecaca', corOk: '#4ade80',
      sucesso: function () {
        var box = document.getElementById('successMsg') || areaAviso(form, '#4ade80');
        box.style.display = 'block';
        return box;
      }
    });
    lsSet('exit_shown_' + slug, '1'); // quem já pediu contato não precisa do pop-up
    return false;
  };

  // ── Pop-up de saída ────────────────────────────────────────────────
  window.handleExitCapture = function (e) {
    e.preventDefault();
    enviar(e.target, 'blog-exit-' + slug, {
      corErro: '#8a0d22', corOk: '#166534',
      sucesso: function (form) {
        var box = areaAviso(form, '#166534');
        box.style.margin = '8px 0 0';
        return box;
      }
    });
    return false;
  };

  // ── Formulário do índice do blog ───────────────────────────────────
  var indice = document.querySelector('form[data-blog-lead]');
  if (indice) {
    indice.addEventListener('submit', function (e) {
      e.preventDefault();
      enviar(indice, indice.getAttribute('data-blog-lead') || 'blog-index', {
        corErro: '#fecaca', corOk: '#ffffff',
        sucesso: function (form) { return areaAviso(form, '#ffffff'); }
      });
    });
  }

  // ── Gatilho do pop-up de saída: só em computador ───────────────────
  // No celular não existe "saída do mouse"; o gatilho de rolar para cima
  // atrapalhava a leitura. Largura < 900px ou ponteiro "coarse" = desligado.
  var modal = document.getElementById('exitModal');
  if (modal) {
    var chave = 'exit_shown_' + slug;
    var mostrado = false;
    document.addEventListener('mouseleave', function (e) {
      if (mostrado || e.clientY >= 10) return;
      if (window.mbLead && window.mbLead.celular()) return;
      if (lsGet(chave)) return;
      mostrado = true;
      modal.classList.add('show');
      lsSet(chave, '1');
    });
  }
})();
