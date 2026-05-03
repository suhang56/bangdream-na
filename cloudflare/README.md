# R-Phase Cloudflare 基础设施配置清单

R1 阶段手动操作步骤。完成所有步骤后，R2 Worker 脚手架 PR 才能部署。

---

## 前置条件

- 已登录 Cloudflare Dashboard（bangdream.org 所在账号）
- 本地安装 wrangler CLI（`npm install -g wrangler`）
- 已通过 `wrangler login` 认证

---

## Section 1：R2 Bucket 创建

### 1.1 创建 Bucket

Dashboard 路径：**R2 Object Storage → Create bucket**

- Bucket name: `bangdream-na-images`
- Location: Auto（默认）
- 点击 **Create bucket**

### 1.2 关闭公开访问（r2.dev URL）

进入 bucket → **Settings** → **Public Access**

确保 "Allow Access" 开关为 **OFF**（禁用 `*.r2.dev` 公开 URL）。公开读取仅通过自定义域名 `cdn.bangdream.org` 进行。

### 1.3 绑定自定义域名 cdn.bangdream.org

Dashboard 路径：**R2 → bangdream-na-images → Settings → Custom Domains → Connect Domain**

1. 输入 `cdn.bangdream.org`，点击 **Continue**
2. Cloudflare 自动创建 DNS 记录（CNAME 到 R2 endpoint）+ 颁发 TLS 证书
3. 等待状态变为 **Active**（通常 1-2 分钟）

> 不要手动添加 DNS CNAME 记录，让 Cloudflare 自动处理。

验证：

```bash
dig cdn.bangdream.org
# 应解析到 Cloudflare R2 的 CNAME 地址（如 *.r2.cloudflarestorage.com）
```

---

## Section 2：D1 数据库创建

### 2.1 创建数据库

本地运行：

```bash
wrangler d1 create bangdream-na-content
```

输出示例：

```
✅ Successfully created DB 'bangdream-na-content' in region APAC
Created your new D1 database.

[[d1_databases]]
binding = "DB"
database_name = "bangdream-na-content"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
```

### 2.2 记录 database_id

将上面输出的 `database_id` 填入 `worker/wrangler.toml` 中的占位符：

```toml
[[d1_databases]]
binding = "DB"
database_name = "bangdream-na-content"
database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"   # ← 替换这里
```

---

## Section 3：Worker 创建与自定义域名

### 3.1 创建 Worker（R2 PR 会部署代码，此步仅做资源注册）

本地（在 `worker/` 目录）部署时会自动创建 Worker。名称在 `wrangler.toml` 中已配置为 `bangdream-na-api`。

可先通过 Dashboard 手动创建空 Worker：**Workers & Pages → Create → Worker** → 名称填 `bangdream-na-api`，部署默认 "Hello World"，后续 R2 PR 会覆盖。

### 3.2 绑定自定义域名 api.bangdream.org

Dashboard 路径：**Workers & Pages → bangdream-na-api → Settings → Triggers → Custom Domains → Add Custom Domain**

1. 输入 `api.bangdream.org`，点击 **Add Custom Domain**
2. Cloudflare 自动创建 DNS 记录 + TLS 证书
3. 等待状态变为 **Active**

> 不要手动在 DNS 面板添加 CNAME 指向 IP 地址。Custom Domains 功能会完全自动处理 DNS + 证书。

验证（R2 PR 部署后可运行）：

```bash
curl -I https://api.bangdream.org/api/healthz
# 应返回 200
```

---

## Section 4：GitHub OAuth App 注册

### 4.1 注册 OAuth App

GitHub 路径：**Settings → Developer settings → OAuth Apps → New OAuth App**

| 字段 | 值 |
|------|-----|
| Application name | BangDream NA Admin |
| Homepage URL | `https://bangdream.org` |
| Authorization callback URL | `https://api.bangdream.org/api/auth/github/callback` |

点击 **Register application**。

### 4.2 获取 Client ID 和 Client Secret

- 注册后页面显示 **Client ID**，复制保存到 `worker/wrangler.toml` 的 `GITHUB_CLIENT_ID` 字段
- 点击 **Generate a new client secret**，生成后**立即复制**（只显示一次）

### 4.3 设置 Client Secret（不要粘贴到聊天或文件）

```bash
cd worker/
wrangler secret put GITHUB_CLIENT_SECRET --name bangdream-na-api
# 提示 Enter a secret value: 粘贴 client secret，回车确认
```

---

## Section 5：Worker 环境变量与 Secrets 配置

### 5.1 Plain 环境变量（明文，写入 wrangler.toml）

编辑 `worker/wrangler.toml` 的 `[vars]` 块：

```toml
[vars]
GITHUB_CLIENT_ID = "Ov23li..."          # 填入 Section 4.2 的 Client ID
R2_BUCKET_NAME = "bangdream-na-images"
CDN_ORIGIN = "https://cdn.bangdream.org"
ADMIN_GITHUB_LOGINS = "suhang56"
```

### 5.2 Secrets（通过 wrangler secret put，不写入任何文件）

**GITHUB_CLIENT_SECRET**（已在 Section 4.3 完成）

**JWT_SECRET**（32 字节随机 hex，用于签发会话 JWT）：

生成随机值：

```bash
openssl rand -hex 32
# 输出示例：a3f8c1d2e4b5a6f7...（64 个十六进制字符）
```

设置 secret：

```bash
cd worker/
wrangler secret put JWT_SECRET --name bangdream-na-api
# 提示 Enter a secret value: 粘贴上面生成的随机值
```

> JWT_SECRET 只需本地生成一次，不要存入任何文件或聊天记录。

### 5.3 验证 Secrets 已配置

```bash
wrangler secret list --name bangdream-na-api
# 应显示 GITHUB_CLIENT_SECRET 和 JWT_SECRET（不显示值，只显示名称）
```

---

## Section 6：DNS 验证

所有 DNS 记录由 Cloudflare 自动创建（Section 1.3 和 Section 3.2）。完成后验证：

```bash
# R2 自定义域名
dig cdn.bangdream.org
# 期望：解析到 Cloudflare R2 的 CNAME（类似 bangdream-na-images.<accounthash>.r2.cloudflarestorage.com）

# Worker 自定义域名
dig api.bangdream.org
# 期望：解析到 Cloudflare edge（A 记录，Cloudflare IP 段）
```

HTTPS 证书验证：

```bash
curl -sv https://cdn.bangdream.org/ 2>&1 | grep -E "SSL|certificate|issuer"
curl -sv https://api.bangdream.org/ 2>&1 | grep -E "SSL|certificate|issuer"
```

---

## Section 7：R2 PR 前置检查清单

在合并 R2 Worker 脚手架 PR 之前，确认以下全部完成：

- [ ] R2 bucket `bangdream-na-images` 已创建，r2.dev 公开访问已关闭
- [ ] `cdn.bangdream.org` 自定义域名绑定状态为 **Active**
- [ ] `dig cdn.bangdream.org` 解析正常
- [ ] D1 数据库 `bangdream-na-content` 已通过 `wrangler d1 create` 创建
- [ ] `worker/wrangler.toml` 中的 `database_id` 已替换为真实 ID
- [ ] Worker `bangdream-na-api` 已存在于 Dashboard
- [ ] `api.bangdream.org` 自定义域名绑定状态为 **Active**
- [ ] GitHub OAuth App 已注册，callback URL 为 `https://api.bangdream.org/api/auth/github/callback`
- [ ] `worker/wrangler.toml` 中的 `GITHUB_CLIENT_ID` 已填入
- [ ] `wrangler secret put GITHUB_CLIENT_SECRET` 已执行
- [ ] `wrangler secret put JWT_SECRET` 已执行
- [ ] `wrangler secret list --name bangdream-na-api` 显示两个 secret

全部打勾后，通知 R2 phase 可以开始合并。
