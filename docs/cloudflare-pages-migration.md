# Cloudflare Pages 迁移指南

Vercel 免费 tier 撞每日构建上限（24h 才恢复），切到 Cloudflare Pages —— 免费、无每日构建上限、和现有 Cloudflare DNS 在一个 dashboard 里。

## 仓库已就绪

- `public/_redirects` — SPA fallback (`/* → /index.html 200`) + IDN 域名 301 到 bangdream.org
- `public/_headers` — `/assets/*` 长缓存 + `index.html` 不缓存

## Cloudflare Dashboard 步骤（你来跑）

### 1. 创建 Pages 项目

1. 打开 https://dash.cloudflare.com/ → 左边 **Workers & Pages** → **Create application** → **Pages** → **Connect to Git**
2. **Authorize Cloudflare** for GitHub（如果首次）
3. **Select repository**: `suhang56/bangdream-na`
4. **Set up build**:
   - Production branch: `main`
   - Framework preset: **Vite** （Cloudflare 自动识别会有这个选项）
   - Build command: `npm run build`
   - Build output directory: `dist`
   - Root directory: 留空
   - Environment variables: 没有需要的
5. **Save and Deploy** → 等 ~2 分钟首次构建

### 2. 配置自定义域名

1. 项目部署完成 → 项目页 **Custom domains** 标签 → **Set up a custom domain**
2. 输入 `bangdream.org` → Cloudflare 自动识别（DNS 已经在 Cloudflare 上）→ Activate
3. 同样加 `www.bangdream.org`、`xn--6oqz0h9uah3nn8uf8kujz.com`、`xn--6oqz0h9uah3nn8uf8kujz.org`、www 版本（如果之前有指向 Vercel 的）
4. Cloudflare 自动签 SSL（~30 秒）

### 3. 从 Vercel 摘掉域名

`bangdream.org` 同时挂在 Vercel 和 Cloudflare 上会冲突。Vercel 那边需要解绑：

1. https://vercel.com/suhang56/bangdream-na/settings/domains
2. 每个域名右边 **...** → **Remove**
3. 解绑顺序：先 Cloudflare 加好 + 验证可用，再去 Vercel 移除（避免空窗）

### 4. 验证

```
curl -sLI https://bangdream.org/
# 看 Server: cloudflare（不再是 Vercel）
# 看 cf-ray header

curl -sL https://bangdream.org/assets/index-*.css | grep news-card--compact
# 应该 ≥ 1 hit
```

## 后续部署流程

跟 Vercel 一样 —— push 到 main，Cloudflare Pages 自动构建+部署，1-2 分钟生效。
预览部署：每个 PR 自动得 `<commit-sha>.bangdream-na.pages.dev` 临时 URL。

## Vercel 项目处理

不用删，留着备用。Cloudflare 出问题可以快速切回。
24 小时后 Vercel rate limit 重置就能用了。

## 没迁移的功能

Cloudflare Pages 默认就够，**不需要**：
- Vercel Analytics（用 Cloudflare Web Analytics 免费替代）
- Vercel Edge Functions（我们没用）
- Vercel ISR（我们是纯 SPA，不需要）

## 如果失败回滚

1. Cloudflare Pages 项目 → **Settings** → **Pause builds**
2. Vercel 等 24h rate limit 恢复后正常用
3. 仓库的 `_redirects` 和 `_headers` 文件 Vercel 会忽略（`vercel.json` 还在生效），不冲突
