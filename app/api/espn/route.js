export const runtime = 'edge';

// Map simple names to ESPN endpoints.
const MAP = {
  leaderboard: 'https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga',
  scoreboard:  'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard',
};

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('target');
  const url = MAP[target];
  if (!url) {
    return new Response(JSON.stringify({ error: 'bad target' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const resp = await fetch(url, { headers: { 'accept': 'application/json' }, cache: 'no-store' });
  if (!resp.ok) {
    return new Response(JSON.stringify({ error: 'upstream' }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }
  const data = await resp.json();

  // Edge-friendly caching (tweak during tournaments)
  return new Response(JSON.stringify(data), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 's-maxage=15, stale-while-revalidate=45',
    },
  });
}
