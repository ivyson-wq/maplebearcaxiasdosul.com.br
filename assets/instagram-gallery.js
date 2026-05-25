// instagram-gallery.js
//
// Cliente que puxa o feed Instagram da unidade e renderiza:
//  - Hero video: primeiro VIDEO encontrado, autoplay muted loop
//  - Galeria dinâmica com filtros (tudo/eventos/alunos/equipe/rotina)
//  - Lightbox com navegação por teclado e link "ver no IG"
//
// XSS safety: TODA string vinda do Graph API (caption, permalink, media_url, thumb)
// passa por escapeHtml() ou escapeAttr() antes de entrar em innerHTML. Estrutura
// HTML é estática. Não use innerHTML com nenhuma string remota crua.
//
// Falha graciosa: se API vazia ou erro, esconde seção (fallback estático fica visível).

(function () {
  'use strict';

  const DEFAULT_CONFIG = {
    endpoint: '/api/instagram-feed',
    unit: 'caxias',
    cacheKey: 'mb_ig_feed_v1',
    cacheTtlMs: 3600 * 1000,
    galleryContainer: '#ig-gallery',
    heroVideoContainer: '#ig-hero-video',
    statsContainer: '#ig-stats',
    igHandleUrl: 'https://www.instagram.com/'
  };
  const CFG = Object.assign({}, DEFAULT_CONFIG, window.MB_INSTAGRAM_CONFIG || {});

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function escapeAttr(s) {
    return String(s == null ? '' : s).replace(/[<>"']/g, c => ({'<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function timeAgo(d) {
    const diff = (Date.now() - d.getTime()) / 1000;
    if (diff < 60) return 'há instantes';
    if (diff < 3600) return `há ${Math.floor(diff/60)} min`;
    if (diff < 86400) return `há ${Math.floor(diff/3600)}h`;
    if (diff < 86400 * 7) return `há ${Math.floor(diff/86400)} dias`;
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  }

  function loadCache() {
    try {
      const raw = localStorage.getItem(CFG.cacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || !parsed.ts || !Array.isArray(parsed.items)) return null;
      if (Date.now() - parsed.ts > CFG.cacheTtlMs) return null;
      return parsed;
    } catch (e) { return null; }
  }
  function saveCache(data) {
    try {
      localStorage.setItem(CFG.cacheKey, JSON.stringify({
        ts: Date.now(), items: data.items, unit: data.unit
      }));
    } catch (e) { /* quota cheia, ignora */ }
  }

  async function loadFeed() {
    const cached = loadCache();
    if (cached) {
      render(cached.items);
      refresh().catch(() => {});
      return;
    }
    return refresh();
  }
  async function refresh() {
    try {
      const url = `${CFG.endpoint}?unit=${encodeURIComponent(CFG.unit)}`;
      const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const data = await r.json();
      if (data.fallback || !data.items || data.items.length === 0) {
        hideAll('no_data');
        return;
      }
      saveCache(data);
      render(data.items);
    } catch (e) {
      console.warn('[ig-gallery] fetch falhou', e);
      hideAll('error');
    }
  }

  let allItems = [];
  let activeFilter = 'all';

  function render(items) {
    allItems = items.slice();
    renderHeroVideo();
    renderGallery();
    renderStats();
    revealSections();
  }

  function renderHeroVideo() {
    const host = document.querySelector(CFG.heroVideoContainer);
    if (!host) return;
    const video = allItems.find(i => i.type === 'video');
    if (!video) { host.style.display = 'none'; return; }

    const frame = document.createElement('div');
    frame.className = 'ig-hero-video__frame';

    const v = document.createElement('video');
    v.className = 'ig-hero-video__media';
    v.autoplay = true; v.muted = true; v.loop = true; v.playsInline = true;
    v.preload = 'metadata';
    v.poster = video.thumb;
    v.setAttribute('aria-label', 'Vídeo do Instagram da Maple Bear');
    const src = document.createElement('source');
    src.src = video.cover; src.type = 'video/mp4';
    v.appendChild(src);

    const soundBtn = document.createElement('button');
    soundBtn.type = 'button';
    soundBtn.className = 'ig-hero-video__sound';
    soundBtn.setAttribute('aria-label', 'Ativar som');
    soundBtn.setAttribute('aria-pressed', 'false');
    soundBtn.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3z"/></svg>';
    soundBtn.addEventListener('click', () => {
      v.muted = !v.muted;
      soundBtn.setAttribute('aria-pressed', String(!v.muted));
      soundBtn.setAttribute('aria-label', v.muted ? 'Ativar som' : 'Silenciar');
    });

    const link = document.createElement('a');
    link.href = video.permalink;
    link.target = '_blank';
    link.rel = 'noopener';
    link.className = 'ig-hero-video__link';
    link.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.43.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.43.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9a3.7 3.7 0 0 1-.9-1.38c-.16-.43-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.43-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07M12 0C8.74 0 8.33.01 7.05.07 5.78.13 4.9.33 4.14.63a5.91 5.91 0 0 0-2.13 1.39A5.91 5.91 0 0 0 .63 4.14c-.3.77-.5 1.64-.56 2.91C.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.06 1.27.26 2.14.56 2.91.32.79.74 1.46 1.39 2.13a5.91 5.91 0 0 0 2.13 1.39c.77.3 1.64.5 2.91.56C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c1.27-.06 2.14-.26 2.91-.56a5.91 5.91 0 0 0 2.13-1.39 5.91 5.91 0 0 0 1.39-2.13c.3-.77.5-1.64.56-2.91.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.06-1.27-.26-2.14-.56-2.91a5.91 5.91 0 0 0-1.39-2.13A5.91 5.91 0 0 0 19.86.63c-.77-.3-1.64-.5-2.91-.56C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z"/></svg><span>Ver no Instagram</span>';

    frame.appendChild(v);
    frame.appendChild(soundBtn);
    frame.appendChild(link);
    host.replaceChildren(frame);
  }

  function renderGallery() {
    const host = document.querySelector(CFG.galleryContainer);
    if (!host) return;
    host.replaceChildren();

    const filtered = activeFilter === 'all'
      ? allItems
      : allItems.filter(i => i.category === activeFilter);

    const filters = [
      ['all', 'Tudo'], ['eventos', 'Eventos'], ['alunos', 'Crianças'],
      ['equipe', 'Equipe'], ['rotina', 'Rotina']
    ];

    const filterBar = document.createElement('div');
    filterBar.className = 'ig-filters';
    filterBar.setAttribute('role', 'tablist');
    filterBar.setAttribute('aria-label', 'Filtrar galeria');
    filters.forEach(([key, label]) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ig-filter' + (activeFilter === key ? ' ig-filter--active' : '');
      btn.dataset.filter = key;
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(activeFilter === key));
      btn.textContent = label;
      btn.addEventListener('click', () => {
        activeFilter = key;
        renderGallery();
      });
      filterBar.appendChild(btn);
    });

    const grid = document.createElement('ul');
    grid.className = 'ig-grid';
    grid.setAttribute('role', 'list');

    filtered.forEach((item, idx) => {
      const li = document.createElement('li');
      li.className = `ig-item ig-item--${item.type}`;
      li.dataset.cat = item.category;

      const a = document.createElement('a');
      a.href = item.permalink;
      a.className = 'ig-item__link';
      a.dataset.igIdx = String(idx);
      a.setAttribute('aria-label', 'Abrir post do Instagram');

      const img = document.createElement('img');
      img.src = item.thumb;
      img.alt = (item.caption || 'Post Maple Bear no Instagram').slice(0, 120);
      img.loading = 'lazy';
      img.decoding = 'async';
      img.referrerPolicy = 'no-referrer';
      a.appendChild(img);

      if (item.type === 'video') {
        const b = document.createElement('span');
        b.className = 'ig-item__badge';
        b.setAttribute('aria-label', 'Vídeo');
        b.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M8 5v14l11-7z"/></svg>';
        a.appendChild(b);
      } else if (item.type === 'carousel') {
        const b = document.createElement('span');
        b.className = 'ig-item__badge ig-item__badge--multi';
        b.setAttribute('aria-label', 'Carrossel');
        b.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M19 3H8c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM3 16V5H1v11c0 1.1.9 2 2 2h11v-2H3z"/></svg>';
        a.appendChild(b);
      }

      if (item.caption) {
        const cap = document.createElement('figcaption');
        cap.className = 'ig-item__cap';
        cap.textContent = item.caption.split('\n')[0].slice(0, 80);
        a.appendChild(cap);
      }

      a.addEventListener('click', (e) => {
        e.preventDefault();
        openLightbox(filtered, idx);
      });

      li.appendChild(a);
      grid.appendChild(li);
    });

    const foot = document.createElement('p');
    foot.className = 'ig-foot';
    const igLink = document.createElement('a');
    igLink.href = CFG.igHandleUrl;
    igLink.target = '_blank';
    igLink.rel = 'noopener';
    igLink.innerHTML = 'Ver tudo no Instagram <span aria-hidden="true">→</span>';
    foot.appendChild(igLink);

    host.appendChild(filterBar);
    host.appendChild(grid);
    host.appendChild(foot);
  }

  function renderStats() {
    const host = document.querySelector(CFG.statsContainer);
    if (!host || allItems.length === 0) return;
    const newest = allItems[0]?.timestamp;
    const ago = newest ? timeAgo(new Date(newest)) : null;
    host.replaceChildren();
    const txt = document.createElement('span');
    txt.textContent = 'Direto do nosso Instagram · ';
    const num = document.createElement('strong');
    num.textContent = String(allItems.length);
    const rest = document.createElement('span');
    rest.textContent = ' publicações' + (ago ? ` · última ${ago}` : '');
    host.appendChild(txt);
    host.appendChild(num);
    host.appendChild(rest);
  }

  function revealSections() {
    [CFG.heroVideoContainer, CFG.galleryContainer, CFG.statsContainer].forEach(sel => {
      document.querySelectorAll(sel + ', [data-ig-section]').forEach(el => el.classList.add('ig-ready'));
    });
  }

  function hideAll(reason) {
    [CFG.heroVideoContainer, CFG.galleryContainer, CFG.statsContainer].forEach(sel => {
      const el = document.querySelector(sel);
      if (el) el.classList.add('ig-empty');
    });
    document.querySelectorAll('[data-ig-section]').forEach(el => el.classList.add('ig-empty'));
    console.info('[ig-gallery] vazio:', reason);
  }

  let lbItems = [];
  let lbIdx = 0;
  let lbHost = null;

  function openLightbox(items, idx) {
    lbItems = items;
    lbIdx = idx;
    if (!lbHost) {
      lbHost = document.createElement('div');
      lbHost.className = 'ig-lightbox';
      lbHost.setAttribute('role', 'dialog');
      lbHost.setAttribute('aria-modal', 'true');
      lbHost.setAttribute('aria-label', 'Visualizar publicação do Instagram');
      document.body.appendChild(lbHost);
    }
    renderLightbox();
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onLightboxKey);
  }

  function closeLightbox() {
    if (lbHost) lbHost.replaceChildren();
    document.body.style.overflow = '';
    document.removeEventListener('keydown', onLightboxKey);
  }

  function onLightboxKey(e) {
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowRight') navLightbox(1);
    if (e.key === 'ArrowLeft') navLightbox(-1);
  }

  function navLightbox(delta) {
    lbIdx = (lbIdx + delta + lbItems.length) % lbItems.length;
    renderLightbox();
  }

  function renderLightbox() {
    const item = lbItems[lbIdx];
    if (!item || !lbHost) { closeLightbox(); return; }
    lbHost.replaceChildren();

    const backdrop = document.createElement('div');
    backdrop.className = 'ig-lb__backdrop';
    backdrop.addEventListener('click', closeLightbox);

    const shell = document.createElement('div');
    shell.className = 'ig-lb__shell';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'ig-lb__close';
    closeBtn.setAttribute('aria-label', 'Fechar');
    closeBtn.innerHTML = '<svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M19 6.4L17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg>';
    closeBtn.addEventListener('click', closeLightbox);

    const prev = document.createElement('button');
    prev.type = 'button';
    prev.className = 'ig-lb__nav ig-lb__nav--prev';
    prev.setAttribute('aria-label', 'Anterior');
    prev.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path fill="currentColor" d="M15.4 7.4L14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg>';
    prev.addEventListener('click', () => navLightbox(-1));

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'ig-lb__nav ig-lb__nav--next';
    next.setAttribute('aria-label', 'Próximo');
    next.innerHTML = '<svg viewBox="0 0 24 24" width="28" height="28" aria-hidden="true"><path fill="currentColor" d="M8.6 16.6L10 18l6-6-6-6-1.4 1.4L13.2 12z"/></svg>';
    next.addEventListener('click', () => navLightbox(1));

    const figure = document.createElement('figure');
    figure.className = 'ig-lb__figure';

    let media;
    if (item.type === 'video') {
      media = document.createElement('video');
      media.className = 'ig-lb__media';
      media.src = item.cover;
      media.controls = true; media.autoplay = true; media.playsInline = true;
      media.poster = item.thumb;
    } else {
      media = document.createElement('img');
      media.className = 'ig-lb__media';
      media.src = item.cover;
      media.alt = item.caption || 'Post Maple Bear';
      media.referrerPolicy = 'no-referrer';
    }
    figure.appendChild(media);

    if (item.caption) {
      const cap = document.createElement('figcaption');
      cap.className = 'ig-lb__cap';
      cap.textContent = item.caption;
      figure.appendChild(cap);
    }

    if (item.extras && item.extras.length > 0) {
      const extras = document.createElement('div');
      extras.className = 'ig-lb__extras';
      extras.setAttribute('role', 'list');
      item.extras.forEach(ex => {
        const wrap = document.createElement('div');
        wrap.setAttribute('role', 'listitem');
        wrap.className = 'ig-lb__extra';
        const im = document.createElement('img');
        im.src = ex.thumb || ex.url;
        im.alt = '';
        im.loading = 'lazy';
        im.referrerPolicy = 'no-referrer';
        wrap.appendChild(im);
        extras.appendChild(wrap);
      });
      figure.appendChild(extras);
    }

    const permalink = document.createElement('a');
    permalink.href = item.permalink;
    permalink.target = '_blank';
    permalink.rel = 'noopener';
    permalink.className = 'ig-lb__permalink';
    permalink.textContent = 'Abrir no Instagram ↗';
    figure.appendChild(permalink);

    shell.appendChild(closeBtn);
    shell.appendChild(prev);
    shell.appendChild(next);
    shell.appendChild(figure);

    lbHost.appendChild(backdrop);
    lbHost.appendChild(shell);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadFeed);
  } else {
    loadFeed();
  }
})();
