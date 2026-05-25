// GET /api/instagram-feed?unit=caxias|bg
//
// Puxa as últimas 50 mídias do Instagram Business de uma unidade Maple Bear.
// Hospeda o feed para AMBAS as unidades (Caxias está em Vercel; BG em GitHub Pages
// sem serverless). BG faz fetch cross-origin via CORS *.
//
// Cache CDN Vercel: 6h fresh + 24h stale-while-revalidate ≈ 4 hits/dia no Graph.
//
// Env vars (configurar em vercel env para o projeto maplebearcaxiasdosul):
//   IG_USER_ID_CAXIAS    — IG Business Account ID da Maple Bear Caxias
//   IG_USER_ID_BG        — IG Business Account ID da Maple Bear Bento Gonçalves
//   IG_ACCESS_TOKEN      — Long-lived System User token (compartilhado entre unidades)
//
// Sem env → { items: [], fallback: true } com HTTP 200. Client renderiza estático.

export const config = { runtime: 'edge' };

const GRAPH = 'https://graph.facebook.com/v21.0';
const FIELDS = [
  'id',
  'caption',
  'media_type',
  'media_url',
  'thumbnail_url',
  'permalink',
  'timestamp',
  'username',
  'children{id,media_type,media_url,thumbnail_url}'
].join(',');

const LIMIT = 50;

const UNIT_ENV = {
  caxias: 'IG_USER_ID_CAXIAS',
  bg: 'IG_USER_ID_BG'
};

function categorize(caption) {
  const c = (caption || '').toLowerCase();
  if (/open\s*day|matr[ií]cula|visita|conhe[çc]a|venha|portas\s*abertas/i.test(c)) return 'eventos';
  if (/aluno|crian[çc]a|bear care|toddler|nursery|kindergarten|year\s*\d/i.test(c)) return 'alunos';
  if (/professor|teacher|equipe|coordena|forma[çc][aã]o|head\s*teacher/i.test(c)) return 'equipe';
  if (/festa|comemora|anivers[áa]rio|halloween|p[áa]scoa|natal|festival|day/i.test(c)) return 'eventos';
  if (/card[áa]pio|lanche|alimenta[çc][aã]o|pickup|seguran[çc]a|rotina/i.test(c)) return 'rotina';
  return 'rotina';
}

function cleanCaption(raw) {
  if (!raw) return '';
  return String(raw)
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 220);
}

function normalizeItem(item) {
  const isVideo = item.media_type === 'VIDEO';
  const isCarousel = item.media_type === 'CAROUSEL_ALBUM';

  let coverUrl = item.media_url;
  let coverThumb = item.thumbnail_url;
  let extras = [];

  if (isCarousel && Array.isArray(item.children?.data)) {
    const children = item.children.data;
    const first = children[0];
    if (first) {
      coverUrl = first.media_url;
      coverThumb = first.thumbnail_url;
    }
    extras = children.slice(1).map(ch => ({
      id: ch.id,
      type: ch.media_type === 'VIDEO' ? 'video' : 'image',
      url: ch.media_url,
      thumb: ch.thumbnail_url || ch.media_url
    }));
  }

  const thumb = isVideo ? (item.thumbnail_url || coverUrl) : (coverThumb || coverUrl);

  return {
    id: item.id,
    type: isVideo ? 'video' : (isCarousel ? 'carousel' : 'image'),
    permalink: item.permalink,
    timestamp: item.timestamp,
    caption: cleanCaption(item.caption),
    cover: coverUrl,
    thumb,
    category: categorize(item.caption),
    extras
  };
}

export default async function handler(req) {
  const url = new URL(req.url);
  const unit = (url.searchParams.get('unit') || 'caxias').toLowerCase();

  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Vary': 'Origin'
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers });
  }

  const envKey = UNIT_ENV[unit];
  if (!envKey) {
    return new Response(JSON.stringify({
      items: [], count: 0, fallback: true, reason: 'unknown_unit'
    }), { status: 400, headers });
  }

  const igUserId = process.env[envKey];
  const igToken = process.env.IG_ACCESS_TOKEN;

  if (!igUserId || !igToken) {
    return new Response(JSON.stringify({
      items: [], count: 0, fallback: true, reason: 'env_missing', unit
    }), { status: 200, headers });
  }

  const graphUrl = `${GRAPH}/${igUserId}/media?fields=${encodeURIComponent(FIELDS)}&limit=${LIMIT}&access_token=${encodeURIComponent(igToken)}`;

  try {
    const r = await fetch(graphUrl, {
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (!r.ok) {
      const text = await r.text().catch(() => '');
      console.error('IG Graph fail', unit, r.status, text.slice(0, 300));
      return new Response(JSON.stringify({
        items: [], count: 0, fallback: true, reason: 'graph_error', status: r.status, unit
      }), { status: 200, headers });
    }

    const data = await r.json();
    const items = Array.isArray(data.data) ? data.data.map(normalizeItem) : [];

    return new Response(JSON.stringify({
      items,
      count: items.length,
      fetched_at: new Date().toISOString(),
      fallback: false,
      unit
    }), { status: 200, headers });

  } catch (err) {
    console.error('IG fetch threw', unit, err);
    return new Response(JSON.stringify({
      items: [], count: 0, fallback: true, reason: 'fetch_threw', detail: String(err).slice(0, 200), unit
    }), { status: 200, headers });
  }
}
