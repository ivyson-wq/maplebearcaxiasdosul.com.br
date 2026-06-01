// GET /api/instagram-feed?unit=caxias|bg
//
// Feed do Instagram das unidades Maple Bear via **Business Discovery**.
// A conta conectada (lumi.ed, no InstaPublisher) consulta os dados públicos
// das contas Business @maplebearcaxiasdosul e @maplebear.bentogoncalves.
// Assim não é preciso a conta da escola autorizar nada — e o token usado é
// o da lumi.ed, renovado automaticamente pelo InstaPublisher.
//
// O token é lido em runtime via RPC `public.insta_feed_token()` (SECURITY
// DEFINER, só service_role) — então nunca fica defasado. Cache CDN 6h.
//
// Env vars (projeto Vercel maplebearcaxiasdosul):
//   SUPABASE_REST_URL    — ex.: https://brgorknbrjlfwvrrlwxj.supabase.co
//   SUPABASE_SERVICE_KEY — service_role key (server-side, nunca vai ao browser)
//   IG_ACCESS_TOKEN      — (opcional) fallback estático se a RPC falhar
//
// Sem token → { items: [], fallback: true } com HTTP 200; o site esconde as seções.

export const config = { runtime: 'edge' };

const GRAPH = 'https://graph.facebook.com/v21.0';
const SELF_IG = '17841436678488566'; // lumi.ed — conta que faz a Business Discovery

const UNIT_HANDLE = {
  caxias: 'maplebearcaxiasdosul',
  bg: 'maplebear.bentogoncalves'
};

const MEDIA_FIELDS = 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count';
const LIMIT = 50;

function categorize(caption) {
  const c = (caption || '').toLowerCase();
  if (/open\s*day|matr[ií]cula|visita|conhe[çc]a|venha|portas\s*abertas/i.test(c)) return 'eventos';
  if (/aluno|crian[çc]a|bear care|toddler|nursery|kindergarten|year\s*\d/i.test(c)) return 'alunos';
  if (/professor|teacher|equipe|coordena|forma[çc][aã]o|head\s*teacher/i.test(c)) return 'equipe';
  if (/festa|comemora|anivers[áa]rio|halloween|p[áa]scoa|natal|festival|junina|day/i.test(c)) return 'eventos';
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
  const cover = item.media_url || item.thumbnail_url || '';
  const thumb = isVideo ? (item.thumbnail_url || cover) : cover;

  return {
    id: item.id,
    type: isVideo ? 'video' : (isCarousel ? 'carousel' : 'image'),
    permalink: item.permalink,
    timestamp: item.timestamp,
    caption: cleanCaption(item.caption),
    cover,
    thumb,
    category: categorize(item.caption),
    extras: [] // Business Discovery não expõe os filhos do carrossel
  };
}

async function getToken() {
  const base = process.env.SUPABASE_REST_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  const fallback = (process.env.IG_ACCESS_TOKEN || '').replace(/\s+/g, '') || null;

  if (!base || !key) return fallback;

  try {
    const r = await fetch(`${base}/rest/v1/rpc/insta_feed_token`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json'
      },
      body: '{}',
      cache: 'no-store'
    });
    if (!r.ok) return fallback;
    const val = await r.json();
    const tok = (typeof val === 'string' ? val : '').replace(/\s+/g, '');
    return tok || fallback;
  } catch {
    return fallback;
  }
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

  const handle = UNIT_HANDLE[unit];
  if (!handle) {
    return new Response(JSON.stringify({
      items: [], count: 0, fallback: true, reason: 'unknown_unit'
    }), { status: 400, headers });
  }

  const token = await getToken();
  if (!token) {
    return new Response(JSON.stringify({
      items: [], count: 0, fallback: true, reason: 'no_token', unit
    }), { status: 200, headers });
  }

  const fields = `business_discovery.username(${handle}){media_count,media.limit(${LIMIT}){${MEDIA_FIELDS}}}`;
  const graphUrl = `${GRAPH}/${SELF_IG}?fields=${encodeURIComponent(fields)}&access_token=${encodeURIComponent(token)}`;

  try {
    const r = await fetch(graphUrl, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    const data = await r.json();

    if (!r.ok || data.error) {
      const msg = data.error ? data.error.message : ('http_' + r.status);
      console.error('IG discovery fail', unit, handle, msg);
      return new Response(JSON.stringify({
        items: [], count: 0, fallback: true, reason: 'graph_error', detail: String(msg).slice(0, 160), unit
      }), { status: 200, headers });
    }

    const raw = data.business_discovery && data.business_discovery.media && Array.isArray(data.business_discovery.media.data)
      ? data.business_discovery.media.data
      : [];

    const items = raw.map(normalizeItem).filter(i => i.thumb);

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
      items: [], count: 0, fallback: true, reason: 'fetch_threw', detail: String(err).slice(0, 160), unit
    }), { status: 200, headers });
  }
}
