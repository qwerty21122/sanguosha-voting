# 部署到 Railway(免费永久在线)

## 前置要求
- GitHub 账号(如果没有,先注册: https://github.com)
- Railway 账号(用 GitHub 登录即可: https://railway.app)

## 步骤 1: 推送代码到 GitHub

### 1.1 在 GitHub 创建新仓库
1. 访问 https://github.com/new
2. 仓库名填: `sanguosha-voting`
3. 设为 **Public**(公开)
4. **不要**勾选 "Add README"、".gitignore"、"license"
5. 点击 "Create repository"

### 1.2 推送代码
复制以下命令并在终端运行:

```bash
cd "C:\Users\zhujiahong\.real\users\user-dbfadf0b4b39ebaf7f1fcc736bc3a286\workspace\projects\default"
git remote add origin https://github.com/你的GitHub用户名/sanguosha-voting.git
git branch -M main
git push -u origin main
```

**注意**: 把 `你的GitHub用户名` 替换成你真实的 GitHub 用户名

## 步骤 2: 部署到 Railway

### 2.1 导入项目
1. 访问 https://railway.app/dashboard
2. 点击 **"New Project"**
3. 选择 **"Deploy from GitHub repo"**
4. 授权 Railway 访问你的 GitHub
5. 选择刚才创建的 `sanguosha-voting` 仓库
6. 点击 **"Deploy"**

### 2.2 等待部署
Railway 会自动:
- 检测 Node.js 项目
- 安装依赖(`npm install`)
- 启动服务器(`node server.js`)

大约需要 2-5 分钟。

### 2.3 获取域名
部署完成后:
1. 点击项目卡片进入详情页
2. 点击顶部的 **"Settings"** 标签
3. 找到 **"Domains"** 部分
4. 点击 **"Generate Domain"**
5. 会生成类似 `xxx.up.railway.app` 的域名

**这就是你的投票系统公网地址!**

## 步骤 3: 初始化武将数据

首次部署后,需要调用一次初始化 API:

### 方法 A: 浏览器访问
打开浏览器访问:
```
https://你的域名.up.railway.app/api/init-generals
```
(需要用 POST 请求,推荐用方法 B)

### 方法 B: 使用在线 API 测试工具
1. 访问 https://hoppscotch.io
2. 设置:
   - Method: **POST**
   - URL: `https://你的域名.up.railway.app/api/init-generals`
   - Body (JSON):
     ```json
     {"generals": []}
     ```
3. 点击 **Send**

或者更简单:**直接访问你的网站**,前端会自动从 HTML 提取武将数据并保存到服务器。

## 步骤 4: 测试访问

浏览器访问你的 Railway 域名,应该能看到投票页面!

## 注意事项

### 数据存储
- Railway 提供 **500MB 免费存储**
- 投票数据保存在 `votes.json` 和 `generals.json`
- **重启不会丢失数据**(Railway 有持久化存储)

### 免费额度
- 每月 **$5 免费额度**
- 这个小项目每月花费约 $1-2,完全够用
- 如果额度用完,可以绑定信用卡继续使用(按量付费)

### 休眠策略
- Railway 免费版项目如果 14 天无访问会休眠
- 首次访问需要 30-60 秒唤醒
- 想避免休眠:用 UptimeRobot(https://uptimerobot.com) 每 5 分钟 ping 一次

### 自定义域名(可选)
如果想用自己的域名:
1. 在 Railway Settings → Domains 添加自定义域名
2. 在你的域名服务商处配置 CNAME 记录指向 Railway 提供的地址

## 常见问题

**Q: 部署失败怎么办?**
A: 查看 Railway 的 Logs 标签,看错误信息。常见原因:
- Node.js 版本不兼容(已在 package.json 指定)
- 端口问题(Railway 自动分配 PORT 环境变量)

**Q: 数据会丢失吗?**
A: 不会。Railway 有持久化存储,除非你手动删除项目。

**Q: 能支持多少人同时投票?**
A: 理论上无限,实际取决于 Railway 的资源限制。小范围分享(几十人)完全没问题。

**Q: 如何备份数据?**
A: 定期下载 `votes.json` 文件,或导出 CSV。
