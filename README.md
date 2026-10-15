# Six Pillars · 六大核心能力

当前交付为 **M0 静态公开站点**。React + TypeScript strict + Vite + Tailwind CSS + HashRouter。内容全部在本地配置编辑，无登录、数据库、私人数据写入或 LLM 连接。

**验收状态：M0 已于 2026-10-15 正式完成。** 已验证本地构建、GitHub Actions 部署及实际 Pages 站点的公开交互与三种宽度布局。M1 尚未启动，须本人明确批准。

- 正式站点：[Six Pillars](https://namjuryman.github.io/six-pillars/)
- 源码仓库：[Namjuryman/six-pillars](https://github.com/Namjuryman/six-pillars)，默认分支 `main`。
- 首次正式验收：[Actions 运行 38684725258](https://github.com/Namjuryman/six-pillars/actions/runs/38684725258)，`build`、`deploy`、`verify-deployment` 全部 success。
- 实际线上测试：CI Chromium 21/21、本机 Edge 21/21，覆盖 375×812、768×1024、1440×1000；无页面控制台错误或横向溢出。Actions artifacts 保存线上 JSON 与截图。

## 本地运行

需要 Node.js 22.12+ 和 npm。

```powershell
cd 'E:\理论\six-pillars'
npm ci
npm run dev
```

打开终端打印的地址，默认 `http://127.0.0.1:5173/six-pillars/`。

```powershell
npm run typecheck
npm test
npm run build
npm run preview
```

构建产物在 `dist/`。预览默认 `http://127.0.0.1:4173/six-pillars/`。请通过 HTTP 服务打开，不要双击 `dist/index.html`。

### 自动化浏览器测试

```powershell
npx playwright install chromium
npm run build
npm run test:e2e
```

测试自动启动构建产物预览服务器并结束后关闭。覆盖 375×812、768×1024、1440×1000 三种尺寸；本机如已安装 Edge，也可先设置 `$env:PLAYWRIGHT_CHANNEL='msedge'` 使用真实 Edge。本轮使用 Playwright + Edge；Browser plugin not available。

结果默认为忽略的 `test-results/`（JSON 汇总与失败证据）。设置 `E2E_OUTPUT_DIR` 可改输出目录；设置 `E2E_SCREENSHOT_DIR` 可保存三个尺寸的首页、六能力、路线和成就页完整截图。截图前会等待页底缩略图加载。

验证真实 GitHub Pages（不会启动本地服务）：

```powershell
$env:E2E_BASE_URL='https://USERNAME.github.io/six-pillars/'
npm run test:e2e
Remove-Item Env:E2E_BASE_URL
```

必须提供 `/six-pillars/` 基路径与末尾斜杠。纯静态 GitHub Pages 不支持无 hash 的 SPA 深链接；公开路由应为 `.../six-pillars/#/pillars/ai`，而不是 `.../six-pillars/pillars/ai`。

样式维护：`npm run format:styles` 格式化，`npm run check:styles` 验证。`src/styles.css` 按基础、导航、首页、公开内容、成就和响应式覆盖分区，保留米白/深绿设计语言与原有断点。

## 已实现

- 首页、六大能力概览及六个独立详情页。
- 2026.10.01—2029.09.30 三年公开路线，年度选择与十二季度验收方向。
- 作品与文章领域筛选、空状态、详情和安全 Markdown 渲染。
- 关于页、404、移动端导航、键盘焦点与跳至正文。
- 成就页 `/#/achievements`：徽章墙/时间线空状态、彩色/灰色状态图例及可复用徽章与详情组件。公开成就集合为空，没有虚构的个人成就，也没有管理按钮。
- 公开内容全为明确标注的示例；没有虚构个人身份、能力百分比或完成数据。
- GitHub Actions：PR 检查；main 构建通过后部署 GitHub Pages。
- 自动化测试：内容边界和徽章组件单元测试；七组公开交互 × 三种宽度的 Playwright 测试。测试源不会打进生产包。

## 修改内容

| 文件 | 用途 |
| --- | --- |
| `src/config/pillars.ts` | 固定六个 key、愿景、培养方法、成果口径 |
| `src/config/roadmap.ts` | 独立的公开年度与季度规划示例 |
| `src/features/public/content.ts` | 公开作品与 Markdown 文章示例 |
| `src/features/public/UtilityPages.tsx` | 关于、本人简介与联系渠道 |
| `src/features/achievements/` | 公开成就空状态与测试，不导入私人记录 |
| `src/components/AchievementBadge.tsx` | 可复用已点亮/未点亮徽章 |
| `tests/e2e/public.spec.ts` | 导航、刷新、过滤、详情、404、成就与资源基路径测试 |
| `src/styles.css` | 米白 / 深绿主题与响应式布局 |

替换示例时，请同步调整模型、示例标签及测试；不要把私人日志导入静态配置。生成的两张缩略图仅用于示例装饰，不作为项目证据。新增真实来源外链应经过审核。

## GitHub Pages

1. 将此目录作为仓库根目录上传到你的 GitHub 仓库，默认仓库名 `six-pillars`、分支 `main`。
2. 仓库 Settings → Pages → Build and deployment → Source 选择 **GitHub Actions**。
3. 推送 main 后查看 `Validate and deploy Pages` workflow 的 `build` → `deploy` → `verify-deployment` 三个作业；最后一个作业直接测试真实 Pages 地址，保存浏览器结果与截图。三个作业全部通过才有线上验收证据。
4. 建议对 main 设置保护规则，要求 `build` 检查通过后合并。

默认 `vite.config.ts` 的 base 为 `/six-pillars/`。其他仓库名改为 `/<仓库名>/`；根仓库或自定义域名改为 `/`。HashRouter 支持刷新嵌套详情页。

当前仓库已推送至 `Namjuryman/six-pillars`，Pages 的 `build_type` 为 `workflow` 且强制 HTTPS。首次部署与线上验收均已实际运行通过。浏览器本地预览、手工检查工作流、API 权限配置或模拟路径均不能替代真实部署验证；后续每次 main 更新仍需检查三作业结果。

工作流固定 Ubuntu 24.04，并将证据上传 action 固定为 v7.0.2 commit，避免使用即将迁移的 runner 标签与已弃用 Node 20 的上传版本。测试代码与 M0 应用功能保持一致。

部署依据：[Vite 静态部署](https://vite.dev/guide/static-deploy.html)、[GitHub Pages 发布源](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site)。

## 隐私与下一阶段

M0 不使用 Supabase 环境变量，不接入分析跟踪、不持久化用户输入。浏览器只有公开静态内容。Markdown 禁用原始 HTML，危险 URL 使用库默认过滤，外链配置 `noopener noreferrer`。

[更新后的 PRD v1.1](docs/PRD.md)、[Achievements 产品与数据设计](docs/achievements.md) 与 [SQL 提案 v1.1](docs/schema.proposal.sql) 保留供未来参考。SQL 尚未部署或验证，不属于当前可执行迁移；没有声称其 RLS 安全。下一阶段是 **M1 单人安全后台（含私人成就 CRUD 与点亮）**，需明确授权后启动，使用独立 Supabase 开发项目验证匿名、owner 与 non-owner 三种 API 权限。M2 才实现成就独立公开快照、预览、置顶与撤回。图片模型保留私有对象路径，实际上传仍按附件里程碑另行实施。

[项目工作要求](AGENTS.md) · [M0 设计说明](docs/design.md)
