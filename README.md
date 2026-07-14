# 三国杀武将强度投票系统 - 后端版

## 项目结构

```
├── server.js              # Node.js + Express 后端服务器
├── package.json           # 项目配置和依赖
├── public/
│   └── index.html         # 前端页面(已修改为调用后端 API)
└── tmp/
    ├── init_generals.js   # 武将数据初始化脚本
    └── extract_generals.py # 数据提取工具
```

## 快速启动

### 1. 安装依赖
```bash
npm install
```

### 2. 启动服务器
```bash
node server.js
```
服务器将在 `http://localhost:3000` 运行

### 3. 初始化武将数据(首次运行)
在另一个终端窗口运行:
```bash
node tmp/init_generals.js
```

这将导入 143 个武将及其技能描述到数据库。

### 4. 访问应用
打开浏览器访问: `http://localhost:3000`

## API 接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/vote` | POST | 提交投票 `{winner, loser}` |
| `/api/results` | GET | 获取投票结果排行榜 |
| `/api/stats` | GET | 获取总投票数统计 |
| `/api/generals` | GET | 获取所有武将数据 |
| `/api/export` | GET | 导出 CSV 文件 |
| `/api/reset` | POST | 清空所有投票数据 |
| `/api/init-generals` | POST | 初始化武将数据 |

## 主要改动

### 前端改动 (public/index.html)
- ✅ 移除 localStorage 本地存储
- ✅ 改为调用后端 API (`fetch`)
- ✅ 从服务器加载武将数据
- ✅ 实时同步所有玩家的投票数据

### 后端新增 (server.js)
- ✅ Express HTTP 服务器
- ✅ SQLite 数据库持久化存储
- ✅ RESTful API 接口
- ✅ 支持多用户同时投票
- ✅ 实时数据统计和排行榜

## 部署到公网

### 方案 A: Vercel (推荐,免费)
1. 将代码推送到 GitHub
2. 在 Vercel 导入项目
3. 自动部署,获得 HTTPS 域名

### 方案 B: 云服务器
1. 购买阿里云/腾讯云轻量服务器
2. 安装 Node.js
3. 上传代码
4. 使用 PM2 保持运行: `pm2 start server.js`
5. 配置 Nginx 反向代理和 HTTPS

### 方案 C: 内网穿透(临时测试)
```bash
ngrok http 3000
```
获得临时公网 URL,适合快速分享给朋友测试

## 注意事项

1. **数据库**: 首次运行会自动创建 `votes.db`,无需手动配置
2. **端口**: 默认 3000,可通过环境变量 `PORT` 修改
3. **数据备份**: 定期备份 `votes.db` 文件
4. **防刷票**: 当前版本无防刷机制,生产环境建议添加 IP 限制或验证码

## 技术栈

- **后端**: Node.js + Express
- **数据库**: SQLite3
- **前端**: 原生 HTML/CSS/JavaScript
- **API**: RESTful JSON
