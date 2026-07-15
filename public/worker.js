// Cloudflare Workers - 三国杀投票系统后端 API
// 部署到 Cloudflare Workers，绑定 KV Namespace: VOTES_KV

const RESET_PASSWORD = 'jinwandalaohu';

// 从 HTML 中提取武将数据的正则（首次部署时自动初始化）
const GENERALS_HTML_REGEX = /const GENERALS = (\[.*?\]);/s;

async function loadGenerals(env) {
  try {
    const cached = await env.VOTES_KV.get('generals', 'json');
    if (cached && cached.length > 0) return cached;
  } catch (e) { /* ignore */ }

  // 首次加载：从 references 目录的 HTML 提取
  try {
    const htmlUrl = 'https://raw.githubusercontent.com/qwerty21122/sanguosha-voting/main/references/%E4%B8%89%E5%9B%BD%E6%9D%80%E6%AD%A6%E5%B0%86%E5%BC%BA%E5%BA%A6%E6%8A%95%E7%A5%A8%E7%AE%B1.html';
    const resp = await fetch(htmlUrl);
    if (!resp.ok) throw new Error('fetch failed');
    const html = await resp.text();
    const match = html.match(GENERALS_HTML_REGEX);
    if (match) {
      const generals = JSON.parse(match[1]);
      await env.VOTES_KV.put('generals', JSON.stringify(generals));
      return generals;
    }
  } catch (e) { console.error('loadGenerals error:', e); }

  return [];
}

async function loadVotes(env) {
  try {
    const data = await env.VOTES_KV.get('votes', 'json');
    return data || [];
  } catch (e) { return []; }
}

async function saveVotes(env, votes) {
  await env.VOTES_KV.put('votes', JSON.stringify(votes));
}

// 双人榜单统计
function calcPairStats(votes) {
  const pairStats = {};
  votes.forEach(v => {
    const pairA = [...v.teamA].sort().join('+');
    const pairB = [...v.teamB].sort().join('+');
    if (!pairStats[pairA]) pairStats[pairA] = { pair: pairA, games: 0, win: 0, score: 0 };
    if (!pairStats[pairB]) pairStats[pairB] = { pair: pairB, games: 0, win: 0, score: 0 };
    pairStats[pairA].games++;
    pairStats[pairB].games++;
    if (v.winnerTeam === 'A') {
      pairStats[pairA].win++;
      pairStats[pairA].score++;
      pairStats[pairB].score--;
    } else {
      pairStats[pairB].win++;
      pairStats[pairB].score++;
      pairStats[pairA].score--;
    }
  });
  return Object.values(pairStats)
    .filter(r => r.games > 0)
    .map(r => ({ ...r, rate: r.win / r.games }))
    .sort((a, b) => b.rate - a.rate || b.score - a.score);
}

// 单人榜单统计
function calcSoloStats(votes, generals) {
  const soloStats = {};
  generals.forEach(g => {
    soloStats[g[0]] = { name: g[0], faction: g[1], mvpCount: 0, appearances: 0 };
  });
  votes.forEach(v => {
    [...v.teamA, ...v.teamB].forEach(name => {
      if (soloStats[name]) soloStats[name].appearances++;
    });
    if (soloStats[v.mvp]) soloStats[v.mvp].mvpCount++;
  });
  return Object.values(soloStats)
    .filter(r => r.appearances > 0)
    .map(r => ({ ...r, mvpRate: r.mvpCount / r.appearances }))
    .sort((a, b) => b.mvpRate - a.mvpRate || b.mvpCount - a.mvpCount);
}

// CSV 导出
function generateCSV(tab, votes, generals) {
  let csv = '';
  if (tab === 'pair') {
    const results = calcPairStats(votes);
    csv = '\uFEFF排名,组合,出场次数,得票次数,胜率,得分\n';
    results.forEach((r, i) => {
      const rate = r.games > 0 ? ((r.win / r.games) * 100).toFixed(1) + '%' : '0%';
      csv += `${i + 1},"${r.pair}",${r.games},${r.win},${rate},${r.score}\n`;
    });
  } else {
    const results = calcSoloStats(votes, generals);
    csv = '\uFEFF排名,武将,势力,MVP次数,出场次数,MVP率\n';
    results.forEach((r, i) => {
      const rate = r.appearances > 0 ? ((r.mvpCount / r.appearances) * 100).toFixed(1) + '%' : '0%';
      csv += `${i + 1},"${r.name}",${r.faction},${r.mvpCount},${r.appearances},${rate}\n`;
    });
  }
  return csv;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const method = request.method;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // POST /api/vote - 提交投票
      if (pathname === '/api/vote' && method === 'POST') {
        const body = await request.json();
        const { teamA, teamB, winnerTeam, mvp } = body;
        if (!teamA || !teamB || !winnerTeam || !mvp) {
          return new Response(JSON.stringify({ error: '缺少必要参数' }), {
            status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        const votes = await loadVotes(env);
        votes.push({
          teamA, teamB, winnerTeam, mvp,
          timestamp: new Date().toISOString()
        });
        await saveVotes(env, votes);
        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // GET /api/results?tab=pair|solo - 获取投票结果
      if (pathname === '/api/results' && method === 'GET') {
        const tab = url.searchParams.get('tab') || 'pair';
        const votes = await loadVotes(env);
        const generals = await loadGenerals(env);
        const results = tab === 'pair' ? calcPairStats(votes) : calcSoloStats(votes, generals);
        return new Response(JSON.stringify(results), {
          status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // GET /api/stats - 获取统计数据
      if (pathname === '/api/stats' && method === 'GET') {
        const votes = await loadVotes(env);
        return new Response(JSON.stringify({ total_votes: votes.length }), {
          status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // GET /api/generals - 获取所有武将数据
      if (pathname === '/api/generals' && method === 'GET') {
        const generals = await loadGenerals(env);
        return new Response(JSON.stringify(generals), {
          status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // POST /api/reset - 重置数据
      if (pathname === '/api/reset' && method === 'POST') {
        const body = await request.json();
        if (body.password !== RESET_PASSWORD) {
          return new Response(JSON.stringify({ error: '密码错误' }), {
            status: 403, headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        await saveVotes(env, []);
        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // GET /api/export?tab=pair|solo - 导出 CSV
      if (pathname === '/api/export' && method === 'GET') {
        const tab = url.searchParams.get('tab') || 'pair';
        const votes = await loadVotes(env);
        const generals = await loadGenerals(env);
        const csv = generateCSV(tab, votes, generals);
        return new Response(csv, {
          status: 200,
          headers: {
            'Content-Type': 'text/csv;charset=utf-8',
            'Content-Disposition': `attachment; filename="武将强度投票数据_${tab}.csv"`,
            ...corsHeaders
          }
        });
      }

      // POST /api/init-generals - 初始化武将数据
      if (pathname === '/api/init-generals' && method === 'POST') {
        const body = await request.json();
        if (!body.generals || !Array.isArray(body.generals)) {
          return new Response(JSON.stringify({ error: '数据格式错误' }), {
            status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders }
          });
        }
        await env.VOTES_KV.put('generals', JSON.stringify(body.generals));
        return new Response(JSON.stringify({ success: true, count: body.generals.length }), {
          status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }

      // 404 fallback
      return new Response(JSON.stringify({ error: 'Not Found' }), {
        status: 404, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });

    } catch (e) {
      console.error('Worker error:', e);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
        status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
  }
};
