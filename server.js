const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 数据文件路径
const DATA_FILE = path.join(__dirname, 'votes.json');
const GENERALS_FILE = path.join(__dirname, 'generals.json');

// 初始化数据
let votes = [];
let generals = [];

// 加载数据
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      votes = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
    
    // 尝试从 generals.json 加载
    if (fs.existsSync(GENERALS_FILE)) {
      generals = JSON.parse(fs.readFileSync(GENERALS_FILE, 'utf-8'));
    } else {
      // 如果没有 generals.json,尝试从 HTML 文件提取
      const htmlPath = path.join(__dirname, 'references', '三国杀武将强度投票箱.html');
      if (fs.existsSync(htmlPath)) {
        const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
        const match = htmlContent.match(/const GENERALS = (\[.*?\]);/s);
        if (match) {
          generals = eval(match[1]);
          // 保存到 generals.json
          fs.writeFileSync(GENERALS_FILE, JSON.stringify(generals, null, 2));
          console.log(`已从 HTML 提取并保存 ${generals.length} 个武将`);
        }
      }
    }
    
    console.log(`已加载 ${votes.length} 条投票记录, ${generals.length} 个武将`);
  } catch (e) {
    console.error('加载数据失败:', e.message);
  }
}

// 保存数据
function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(votes, null, 2));
    fs.writeFileSync(GENERALS_FILE, JSON.stringify(generals, null, 2));
  } catch (e) {
    console.error('保存数据失败:', e.message);
  }
}

// API: 提交投票
app.post('/api/vote', (req, res) => {
  const { winner, loser } = req.body;
  
  if (!winner || !loser) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  votes.push({
    winner,
    loser,
    timestamp: new Date().toISOString()
  });
  
  saveData();
  res.json({ success: true });
});

// API: 获取投票结果
app.get('/api/results', (req, res) => {
  const stats = {};
  
  // 初始化所有武将的统计
  generals.forEach(g => {
    stats[g[0]] = { name: g[0], faction: g[1], games: 0, win: 0, score: 0 };
  });
  
  // 统计投票
  votes.forEach(v => {
    if (stats[v.winner]) {
      stats[v.winner].win += 1;
      stats[v.winner].games += 1;
      stats[v.winner].score += 1;
    }
    if (stats[v.loser]) {
      stats[v.loser].games += 1;
      stats[v.loser].score -= 1;
    }
  });
  
  // 转换为数组并排序
  const results = Object.values(stats)
    .filter(r => r.games > 0)
    .map(r => ({
      ...r,
      rate: r.games > 0 ? r.win / r.games : 0
    }))
    .sort((a, b) => b.rate - a.rate || b.score - a.score);
  
  res.json(results);
});

// API: 获取统计数据
app.get('/api/stats', (req, res) => {
  res.json({ total_votes: votes.length });
});

// API: 获取所有武将数据
app.get('/api/generals', (req, res) => {
  res.json(generals);
});

// API: 重置数据
app.post('/api/reset', (req, res) => {
  votes = [];
  saveData();
  res.json({ success: true });
});

// API: 导出 CSV
app.get('/api/export', (req, res) => {
  const stats = {};
  
  generals.forEach(g => {
    stats[g[0]] = { name: g[0], faction: g[1], games: 0, win: 0, score: 0 };
  });
  
  votes.forEach(v => {
    if (stats[v.winner]) {
      stats[v.winner].win += 1;
      stats[v.winner].games += 1;
      stats[v.winner].score += 1;
    }
    if (stats[v.loser]) {
      stats[v.loser].games += 1;
      stats[v.loser].score -= 1;
    }
  });
  
  const results = Object.values(stats)
    .filter(r => r.games > 0)
    .sort((a, b) => (b.win / b.games) - (a.win / a.games) || b.score - a.score);
  
  let csv = '\uFEFF排名,武将,势力,出场次数,得票次数,胜率,得分\n';
  results.forEach((r, index) => {
    const rate = r.games > 0 ? ((r.win / r.games) * 100).toFixed(1) + '%' : '0%';
    csv += `${index + 1},"${r.name}",${r.faction},${r.games},${r.win},${rate},${r.score}\n`;
  });
  
  res.setHeader('Content-Type', 'text/csv;charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="武将强度投票数据.csv"');
  res.send(csv);
});

// API: 初始化武将数据
app.post('/api/init-generals', (req, res) => {
  const newGenerals = req.body.generals;
  
  if (!newGenerals || !Array.isArray(newGenerals)) {
    return res.status(400).json({ error: '数据格式错误' });
  }
  
  generals = newGenerals;
  saveData();
  res.json({ success: true, count: generals.length });
});

// 启动服务器
loadData();
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
