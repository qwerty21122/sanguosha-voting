# 部署到腾讯云函数(完全免费,国内访问)

## 前置要求
- 腾讯云账号(https://cloud.tencent.com)
- 实名认证(免费额度需要)

## 费用说明
- **云函数**: 每月 100万次调用免费
- **云数据库**: 50GB 存储免费
- **CDN/流量**: 前 6个月免费
- **你的项目预计**: 每月花费 ¥0(远低于免费额度)

## 步骤 1: 创建云开发环境

### 1.1 开通云开发
1. 访问 https://console.cloud.tencent.com/tcb
2. 点击 **"新建环境"**
3. 环境名称填: `sanguosha-vote`
4. 计费模式选: **按量付费**(有免费额度)
5. 点击确定,等待环境创建完成(约 2-3 分钟)

### 1.2 创建数据库集合
1. 进入刚创建的环境
2. 点击左侧 **"数据库"**
3. 点击 **"添加集合"**
4. 创建两个集合:
   - `generals` (武将数据)
   - `votes` (投票记录)

## 步骤 2: 上传云函数

### 2.1 准备代码包
在终端运行:

```bash
cd "C:\Users\zhujiahong\.real\users\user-dbfadf0b4b39ebaf7f1fcc736bc3a286\workspace\projects\default"

# 安装依赖
npm install wx-server-sdk

# 打包(排除不必要文件)
zip -r cloud-function.zip index.js package.json node_modules/
```

**注意**: Windows 如果没有 zip 命令,可以用 PowerShell:
```powershell
Compress-Archive -Path index.js,package.json,node_modules -DestinationPath cloud-function.zip
```

### 2.2 创建云函数
1. 访问 https://console.cloud.tencent.com/scf/list
2. 选择你的地域(建议选 **广州** 或 **上海**)
3. 点击 **"新建"**
4. 填写:
   - 函数名称: `vote-api`
   - 运行环境: **Nodejs 16.13**
   - 提交方法: **本地上传zip包**
   - 上传刚才打包的 `cloud-function.zip`
   - 执行方法: `index.main_handler`(先随便填,后面改)
5. 点击完成

### 2.3 配置多个函数入口
由于我们需要多个 API,有两种方案:

**方案 A(推荐): 使用 API 网关统一路由**
1. 创建一个主函数,根据 event.path 路由到不同逻辑
2. 配置 API 网关触发器

**方案 B(简单): 创建多个云函数**
- `init-generals` - 初始化武将
- `vote` - 提交投票  
- `get-results` - 获取结果
- `get-stats` - 获取统计
- `get-generals` - 获取武将列表
- `reset` - 重置数据

我建议你用**方案 B**,虽然要创建 6 个函数,但配置简单。

## 步骤 3: 配置 API 网关

### 3.1 创建 API 服务
1. 访问 https://console.cloud.tencent.com/apigateway/service
2. 点击 **"创建服务"**
3. 服务名称: `sanguosha-vote-api`
4. 点击确定

### 3.2 创建 API
为每个云函数创建一个 API:

以 `vote` 为例:
1. 在服务详情页点击 **"创建API"**
2. 填写:
   - API名称: `submit-vote`
   - 请求路径: `/api/vote`
   - 请求方法: `POST`
   - 集成类型: **云函数**
   - 选择刚才创建的 `vote` 函数
3. 点击发布

重复以上步骤,创建所有 API:
- `POST /api/vote` → vote 函数
- `GET /api/results` → get-results 函数
- `GET /api/stats` → get-stats 函数
- `GET /api/generals` → get-generals 函数
- `POST /api/reset` → reset 函数
- `POST /api/init-generals` → init-generals 函数

### 3.3 发布 API
1. 点击 **"发布服务"**
2. 选择 **发布到线上环境**
3. 获得访问域名,类似: `service-xxx.gz.apigw.tencentcs.com`

## 步骤 4: 修改前端

修改 `public/index.html`,把所有 API 地址改为:
```javascript
const API_BASE = 'https://service-xxx.gz.apigw.tencentcs.com';
```

然后替换所有 fetch 调用:
- `/api/vote` → `${API_BASE}/api/vote`
- `/api/results` → `${API_BASE}/api/results`
- 等等...

## 步骤 5: 初始化武将数据

访问:
```
https://service-xxx.gz.apigw.tencentcs.com/api/init-generals
```

用 POST 请求,body 为:
```json
{
  "generals": [[...], [...]] // 从原 HTML 提取的 143 个武将
}
```

## 步骤 6: 测试访问

浏览器访问你的前端页面(可以托管在腾讯云 COS),应该能正常投票!

## 注意事项

### 跨域问题
API 网关默认不允许跨域,需要在每个 API 的配置中:
1. 开启 **CORS**
2. 允许来源: `*`
3. 允许方法: `GET,POST,OPTIONS`
4. 允许头部: `Content-Type`

### 前端托管
前端 HTML 文件可以托管在:
- **腾讯云 COS**(对象存储) - 免费 50GB
- 或者直接用 GitHub Pages

### 域名绑定(可选)
如果想用自己的域名:
1. 在 API 网关绑定自定义域名
2. 在你的域名服务商处配置 CNAME

## 简化方案:使用云开发 Webify

如果觉得上面太复杂,可以用腾讯云的 **Webify**(一键部署静态网站 + 云函数):

1. 访问 https://webify.cloudbase.net
2. 关联 GitHub 仓库
3. 自动部署,自动生成域名
4. 内置云函数支持

这个更简单,推荐优先尝试!
