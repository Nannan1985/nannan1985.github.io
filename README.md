# Nannan Vis · Visual Experiments

个人创意与交互可视化作品集，包含中文与英文首页和独立创作手记。
首件作品 [影色星图 / Cinechroma Atlas](https://nannan1985.github.io/cinechroma-atlas/) 独立部署，本仓库仅提供介绍与链接。

## 本地开发

需要 Node.js 24（本地验证版本 24.19.0），无第三方运行或构建依赖。进入本仓库目录，在 PowerShell 运行：

```powershell
node scripts/serve.mjs --dev --port 4173
# 单独构建时先停止监听服务，避免同时写入 dist
node --test tests/site.test.mjs
node scripts/build.mjs
node scripts/serve.mjs --port 4173
```

本地中文首页：http://127.0.0.1:4173/；英文首页：http://127.0.0.1:4173/en/。

## 内容维护

- 网名、作品链接、简介、可选联系入口：`config/site.mjs`。没有联系配置时入口隐藏。
- 中文作品与六个视角：`content/projects.mjs`、`content/scenes.mjs`；英文内容与独立图片前缀：`content/en.mjs`。
- 中文手记：`content/notes/cinechroma-atlas.mjs`；英文完整手记：`content/en.mjs`。
- 新增作品：向 projects 数组追加条目并填写英文 en 字段；保留精选作品首项及其 scenes。新文章需在模板登记静态路由。
- 图解：`src/process-figures.mjs`；英文图解标签：`content/diagram-translations.mjs`。
- 样式与交互：`public/assets/site.css`、`public/assets/site.js`。
- 图片：`public/images/`。中文 atlas-hd、英文 atlas-en-hd，各有 640/960/1600/2400/3200px 版本，保持 8:5 比例。更新图片时同步维护 alt、图注、尺寸和拍摄版本，分享图分别为 share-preview.jpg 与 share-preview-en.jpg。

截图来自独立作品的真实线上界面，中文采集于 2026-10-26、英文于 2026-10-27（Asia/Shanghai），保留原貌。网站不包含电影库、影片或独立作品程序；电影画面用于作品展示。

## GitHub Pages

工作流只允许手动运行；在仓库 Settings → Pages 选择 GitHub Actions 后，于 Actions 运行 Publish Nannan Vis to GitHub Pages。
工作流先测试，再读取 Pages 的真实 origin 与 base_path 构建，最后只上传 dist。入口为 dist/index.html；文章和英文页均为独立静态 HTML。
本地配置不填写虚构线上地址；发布时按 Pages 配置生成 canonical、OG URL、hreflang 与 sitemap。

验证包含 10 项静态/HTTP 检查。本地另以桌面 Chrome 模拟五种宽度完成 216 项双语检查；尚未进行实体手机测试。
回退应使用 revert 保留历史，并重新手动运行工作流，不强推；不会影响独立影色星图仓库。
