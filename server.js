const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DATA_FILE = path.join(__dirname, 'votes.json');
const GENERALS_FILE = path.join(__dirname, 'generals.json');

let votes = [];
let generals = [];

function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      votes = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    }
    if (fs.existsSync(GENERALS_FILE)) {
      generals = JSON.parse(fs.readFileSync(GENERALS_FILE, 'utf-8'));
    } else {
      const htmlPath = path.join(__dirname, 'references', '三国杀武将强度投票箱.html');
      if (fs.existsSync(htmlPath)) {
        const htmlContent = fs.readFileSync(htmlPath, 'utf-8');
        const match = htmlContent.match(/const GENERALS = (\[.*?\]);/s);
        if (match) {
          generals = eval(match[1]);
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

function saveData() {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(votes, null, 2));
    fs.writeFileSync(GENERALS_FILE, JSON.stringify(generals, null, 2));
  } catch (e) {
    console.error('保存数据失败:', e.message);
  }
}

// API: 提交投票（双人对双人 + MVP）
app.post('/api/vote', (req, res) => {
  const { teamA, teamB, winnerTeam, mvp } = req.body;
  if (!teamA || !teamB || !winnerTeam || !mvp) {
    return res.status(400).json({ error: '缺少必要参数' });
  }
  
  votes.push({
    teamA,       // [武将名, 武将名]
    teamB,       // [武将名, 武将名]
    winnerTeam,  // 'A' | 'B'
    mvp,         // MVP武将名
    timestamp: new Date().toISOString()
  });
  
  saveData();
  res.json({ success: true });
});

// API: 获取投票结果
app.get('/api/results', (req, res) => {
  const tab = req.query.tab || 'pair';
  
  if (tab === 'pair') {
    // 双人榜单：按组合胜率排
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
    
    const results = Object.values(pairStats)
      .filter(r => r.games > 0)
      .map(r => ({ ...r, rate: r.win / r.games }))
      .sort((a, b) => b.rate - a.rate || b.score - a.score);
    
    res.json(results);
  } else {
    // 单人榜单：按MVP次数/比例排
    const soloStats = {};
    
    generals.forEach(g => {
      soloStats[g[0]] = { name: g[0], faction: g[1], mvpCount: 0, appearances: 0 };
    });
    
    votes.forEach(v => {
      // 统计所有出场武将
      [...v.teamA, ...v.teamB].forEach(name => {
        if (soloStats[name]) soloStats[name].appearances++;
      });
      // 统计MVP
      if (soloStats[v.mvp]) soloStats[v.mvp].mvpCount++;
    });
    
    const results = Object.values(soloStats)
      .filter(r => r.appearances > 0)
      .map(r => ({ ...r, mvpRate: r.mvpCount / r.appearances }))
      .sort((a, b) => b.mvpRate - a.mvpRate || b.mvpCount - a.mvpCount);
    
    res.json(results);
  }
});

// API: 获取统计数据
app.get('/api/stats', (req, res) => {
  res.json({ total_votes: votes.length });
});

// API: 获取所有武将数据
app.get('/api/generals', (req, res) => {
  res.json(generals);
});

// API: 重置数据（需密码）
app.post('/api/reset', (req, res) => {
  const { password } = req.body;
  if (password !== 'jinwandalaohu') {
    return res.status(403).json({ error: '密码错误' });
  }
  votes = [];
  saveData();
  res.json({ success: true });
});

// API: 导出 CSV
app.get('/api/export', (req, res) => {
  const tab = req.query.tab || 'pair';
  let csv;
  
  if (tab === 'pair') {
    const pairStats = {};
    votes.forEach(v => {
      const pairA = [...v.teamA].sort().join('+');
      const pairB = [...v.teamB].sort().join('+');
      if (!pairStats[pairA]) pairStats[pairA] = { pair: pairA, games: 0, win: 0, score: 0 };
      if (!pairStats[pairB]) pairStats[pairB] = { pair: pairB, games: 0, win: 0, score: 0 };
      pairStats[pairA].games++;
      pairStats[pairB].games++;
      if (v.winnerTeam === 'A') { pairStats[pairA].win++; pairStats[pairA].score++; pairStats[pairB].score--; }
      else { pairStats[pairB].win++; pairStats[pairB].score++; pairStats[pairA].score--; }
    });
    
    const results = Object.values(pairStats).filter(r => r.games > 0)
      .sort((a, b) => (b.win/b.games) - (a.win/a.games) || b.score - a.score);
    
    csv = '\uFEFF排名,组合,出场次数,得票次数,胜率,得分\n';
    results.forEach((r, i) => {
      const rate = r.games > 0 ? ((r.win/r.games)*100).toFixed(1)+'%' : '0%';
      csv += `${i+1},"${r.pair}",${r.games},${r.win},${rate},${r.score}\n`;
    });
  } else {
    const soloStats = {};
    generals.forEach(g => { soloStats[g[0]] = { name: g[0], faction: g[1], mvpCount: 0, appearances: 0 }; });
    votes.forEach(v => {
      [...v.teamA, ...v.teamB].forEach(n => { if (soloStats[n]) soloStats[n].appearances++; });
      if (soloStats[v.mvp]) soloStats[v.mvp].mvpCount++;
    });
    
    const results = Object.values(soloStats).filter(r => r.appearances > 0)
      .sort((a, b) => (b.mvpCount/b.appearances) - (a.mvpCount/a.appearances) || b.mvpCount - a.mvpCount);
    
    csv = '\uFEFF排名,武将,势力,MVP次数,出场次数,MVP率\n';
    results.forEach((r, i) => {
      const rate = r.appearances > 0 ? ((r.mvpCount/r.appearances)*100).toFixed(1)+'%' : '0%';
      csv += `${i+1},"${r.name}",${r.faction},${r.mvpCount},${r.appearances},${rate}\n`;
    });
  }
  
  res.setHeader('Content-Type', 'text/csv;charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="武将强度投票数据_${tab}.csv"`);
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

loadData();
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
