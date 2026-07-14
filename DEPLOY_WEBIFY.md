# 部署到腾讯云 Webify(最简单,推荐!)

## 什么是 Webify?
腾讯云的一站式应用托管平台,支持:
- 静态网站托管(前端 HTML/CSS/JS)
- 云函数(后端 API)
- 自动 HTTPS
- 自定义域名

**完全免费额度**:
- 静态托管: 50GB 存储 + 500GB 流量/月
- 云函数: 100万次调用/月
- 足够你的投票系统使用!

## 步骤 1: 准备代码

### 1.1 修改前端 API 地址
打开 `public/index.html`,找到所有 fetch 调用,改为:

```javascript
// 在文件顶部添加
const API_BASE = window.location.origin; // 自动使用当前域名

// 然后替换所有 fetch 调用
fetch(`${API_BASE}/api/vote`, ...)
fetch(`${API_BASE}/api/results`, ...)
// 等等...
```

### 1.2 创建云函数
我已经帮你创建了 `index.js`,但需要稍微修改以适配 Webify。

## 步骤 2: 推送代码到 GitHub

如果还没推送到 GitHub:

```bash
cd "C:\Users\zhujiahong\.real\users\user-dbfadf0b4b39ebaf7f1fcc736bc3a286\workspace\projects\default"
git remote add origin https://github.com/你的用户名/sanguosha-voting.git
git branch -M main
git push -u origin main
```

## 步骤 3: 部署到 Webify

### 3.1 开通 Webify
1. 访问 https://webify.cloudbase.net
2. 用微信扫码登录(需要腾讯云账号)
3. 点击 **"新建应用"**

### 3.2 关联 GitHub
1. 选择 **"从 Git 仓库导入"**
2. 授权访问你的 GitHub
3. 选择 `sanguosha-voting` 仓库
4. 分支选 `main`

### 3.3 配置构建
1. 框架类型: **自定义**
2. 构建命令: 留空(不需要构建)
3. 输出目录: `public`
4. 点击 **"创建并部署"**

### 3.4 配置云函数
部署完成后:
1. 进入应用详情页
2. 点击左侧 **"云函数"**
3. 点击 **"新建云函数"**
4. 函数名称: `api`
5. 运行环境: **Nodejs 16**
6. 上传方式: **从本地上传**
7. 上传 `index.js` 和 `package.json`
8. 执行方法: `index.main_handler`

### 3.5 配置路由规则
在 Webify 控制台:
1. 点击 **"路由规则"**
2. 添加规则:
   - 路径: `/api/*`
   - 目标: 云函数 `api`
   - 方法: `ALL`

这样所有 `/api/xxx` 的请求都会转发到云函数。

## 步骤 4: 初始化武将数据

部署完成后,访问:
```
https://你的应用ID.tcloudbaseapp.com/api/init-generals
```

用 POST 请求,body 为包含 143 个武将的 JSON。

或者更简单:修改前端,首次加载时自动调用初始化 API。

## 步骤 5: 获取域名

Webify 会自动生成一个域名:
```
https://应用ID.tcloudbaseapp.com
```

**这就是你的投票系统公网地址!**

可以直接分享给玩家。

## 优点总结

✅ **完全免费**(在额度内)  
✅ **国内访问速度快**  
✅ **自动 HTTPS**  
✅ **无需手动配置 API 网关**  
✅ **一键部署**,10分钟搞定  
✅ **数据永久保存**  

## 注意事项

1. **跨域问题**: Webify 自动处理,无需配置
2. **冷启动**: 云函数首次访问需要 1-2 秒唤醒
3. **免费额度**: 
   - 每月 100万次云函数调用
   - 你的项目每天几百次调用,完全够用
4. **域名绑定**: 如果想用自己的域名,可以在 Webify 控制台绑定

## 如果遇到问题

1. **云函数报错**: 查看云函数日志
2. **前端无法访问 API**: 检查路由规则是否配置正确
3. **初始化失败**: 确保数据库集合已创建

---

**这个方案比纯云函数简单多了,强烈推荐!**
