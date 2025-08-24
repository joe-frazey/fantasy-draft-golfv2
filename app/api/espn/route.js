export const runtime = 'edge';
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const kind = searchParams.get('kind');
  let url = searchParams.get('url');
  if (!url) {
    url = kind === 'scoreboard'
      ? 'https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard'
      : 'https://site.web.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga';
  }
  const res = await fetch(url, { headers: { 'Accept': 'application/json' }, next: { revalidate: 0 } });
  return new Response(await res.text(), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' }
  });
}
