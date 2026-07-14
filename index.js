const cloud = require('wx-server-sdk');
cloud.init();

// 云数据库引用(使用云开发数据库)
const db = cloud.database();
const _ = db.command;

// 初始化武将数据(首次部署时调用)
exports.initGenerals = async (event, context) => {
  try {
    const { generals } = event;
    
    if (!generals || !Array.isArray(generals)) {
      return { code: 400, message: '数据格式错误' };
    }
    
    // 清空旧数据
    await db.collection('generals').where({}).remove();
    
    // 批量插入
    const batch = [];
    for (let i = 0; i < generals.length; i++) {
      batch.push(db.collection('generals').add({
        data: {
          name: generals[i][0],
          faction: generals[i][1],
          skills: generals[i][2] || ''
        }
      }));
    }
    
    await Promise.all(batch);
    
    return {
      code: 200,
      message: '成功',
      data: { count: generals.length }
    };
  } catch (e) {
    return { code: 500, message: e.message };
  }
};

// 提交投票
exports.vote = async (event, context) => {
  try {
    const { winner, loser } = event;
    
    if (!winner || !loser) {
      return { code: 400, message: '缺少必要参数' };
    }
    
    // 记录投票
    await db.collection('votes').add({
      data: {
        winner,
        loser,
        timestamp: new Date()
      }
    });
    
    return { code: 200, message: '成功' };
  } catch (e) {
    return { code: 500, message: e.message };
  }
};

// 获取投票结果
exports.getResults = async (event, context) => {
  try {
    // 获取所有武将
    const generalsRes = await db.collection('generals').get();
    const generals = generalsRes.data;
    
    // 获取所有投票记录
    const votesRes = await db.collection('votes').get();
    const votes = votesRes.data;
    
    // 统计
    const stats = {};
    generals.forEach(g => {
      stats[g.name] = { 
        name: g.name, 
        faction: g.faction, 
        games: 0, 
        win: 0, 
        score: 0 
      };
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
    
    // 排序
    const results = Object.values(stats)
      .filter(r => r.games > 0)
      .map(r => ({
        ...r,
        rate: r.games > 0 ? r.win / r.games : 0
      }))
      .sort((a, b) => b.rate - a.rate || b.score - a.score);
    
    return { code: 200, data: results };
  } catch (e) {
    return { code: 500, message: e.message };
  }
};

// 获取统计数据
exports.getStats = async (event, context) => {
  try {
    const res = await db.collection('votes').count();
    return { code: 200, data: { total_votes: res.total } };
  } catch (e) {
    return { code: 500, message: e.message };
  }
};

// 获取武将列表
exports.getGenerals = async (event, context) => {
  try {
    const res = await db.collection('generals').get();
    const generals = res.data.map(g => [g.name, g.faction, g.skills]);
    return { code: 200, data: generals };
  } catch (e) {
    return { code: 500, message: e.message };
  }
};

// 重置数据
exports.reset = async (event, context) => {
  try {
    await db.collection('votes').where({}).remove();
    return { code: 200, message: '成功' };
  } catch (e) {
    return { code: 500, message: e.message };
  }
};
