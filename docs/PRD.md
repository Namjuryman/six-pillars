# Six Pillars｜六大核心能力三年成长系统

> 版本：v1.1 产品与技术需求草案（2026-10-15，新增 Achievements）  
> 规划周期：2026-10-01—2029-09-30  
> 方案：公开个人主页 + 私人管理后台  
> 源代码管理：GitHub；前端部署：GitHub Pages；身份与数据：Supabase

## 0. 一页摘要

这是一个服务于个人长期成长的工具，不是强制六项打卡的游戏。它有两个清晰分离的表面：公开展示经过本人审核的介绍、项目及文章；私人空间维护六项能力目标、学习日志、阶段复盘与证据。六大能力保留独立定位：健身运动、英语（含有意识的表达训练）、模拟/混合信号 IC 主专业、做饭烹饪、AI 独立第二专业、金融投资与财务管理。其他能力可在实际活动中发展，不强制列为第七项。

**最高优先级：隐私保护、数据可迁移、易维护、长期可用。** 第一版不接入 LLM、不做自动评分、不存金融账户认证信息、不做银行同步。

## 1. 目标、用户与边界

### 1.1 核心用户

- **访客（anonymous）**：浏览公开个人主页、六项理念、经筛选的项目、公开文章和联系方式。
- **本人（owner）**：通过认证进入后台，维护完整成长数据、设置公开内容、执行导出和复盘。
- **非本人但已登录用户**：无权查看或修改任何私人数据，也无权发布公开内容。V1 原则上不开放注册。

### 1.2 必须支持

1. 六项能力概览、2026–2029 三年规划分年/季度展示。
2. 各能力拥有独立目标、里程碑、项目、学习日志和可验证成果。
3. 同期用“集中突破、持续提升、实践维持、阶段暂缓”描述投入状态，而不是虚假的百分制能力分数。
4. 私人记录默认为私密；人工创建和发布公开作品，不直接把私人记录变成公开记录。
5. 电脑与手机可用；本人可以登录、录入和查看跨设备数据。
6. 每月/每季度/每年复盘；支持导出全部本人数据并保留备份。
7. 自由定义值得纪念的成就，支持点亮、撤销点亮与独立公开发布；成就不是第七项能力，也不用于强制打卡。

### 1.3 不在 V1 范围

AI Agent、自动分析与推荐、银行数据同步、健康设备同步、多用户注册、原生手机应用、复杂权限角色、多维 BI 仪表盘、富文本协同编辑、自动全网抓取论文。上述能力可按实际需求进入 V2/V3。

## 2. 信息架构、页面清单

**统一 React SPA**；在 GitHub Pages 仓库子路径下初期采用 `HashRouter`，避免刷新子路由 404。外部网址例：`https://USERNAME.github.io/six-pillars/#/projects`。如果迁移到支持 SPA 回退的托管，可再使用常规路径。

### 2.1 公开端

| 路由 | 页面 | 内容 | 数据来源 |
| --- | --- | --- | --- |
| `/#/` | 首页 | 品牌介绍、六能力卡片、当前公开焦点、精选成果 | 静态配置 + 已发布内容 |
| `/#/pillars` | 六大能力 | 六能力的愿景和培养方法 | 静态配置 |
| `/#/pillars/:key` | 单项能力 | 面向公众的简介与经审核的精选成果 | 静态配置 + 已发布内容 |
| `/#/roadmap` | 公开三年计划 | 年度主题与精选的目标，不展示隐私 | **单独编辑的公开内容** |
| `/#/projects` | 作品集 | IC、AI、交叉项目与其他公开作品 | 已发布内容 |
| `/#/writing` | 文章 | 公开的技术文章、读书报告、复盘 | 已发布内容 |
| `/#/writing/:slug` | 文章详情 | Markdown 正文及来源链接 | 已发布内容 |
| `/#/achievements` | 成就 | 徽章墙、时间线和卡片详情；M0 无真实成就时显示空状态 | M0 空静态配置；M2 仅已发布的独立快照 |
| `/#/about` | 关于 | 简历摘要、公开联系渠道 | 静态配置 + 已发布内容 |

### 2.2 私人后台

| 路由 | 页面 | MVP 核心操作 |
| --- | --- | --- |
| `/#/login` | 登录 | 专属邮箱 OTP，验证码登录 |
| `/#/admin` | 控制台 | 当前季度、各项投入状态、近期记录与待办里程碑 |
| `/#/admin/roadmap` | 三年规划 | 按三年/年/季筛选与编辑目标 |
| `/#/admin/goals` | 目标管理 | 创建/修改/归档目标，添加里程碑和验收依据 |
| `/#/admin/logs` | 活动日志 | 日期、领域、活动、时长（可选）、正文、标签 |
| `/#/admin/projects` | 项目 | 研究/工程/学习项目、状态、仓库/证据链接 |
| `/#/admin/achievements` | 成就管理（M1） | 自由创建、编辑、点亮、撤销、筛选、删除与排序；不在 M0 开发 |
| `/#/admin/reviews` | 复盘 | 月度、季度、年度复盘与下阶段决策 |
| `/#/admin/publishing` | 内容发布 | 单独撰写公开版本、预览、发布和撤回 |
| `/#/admin/settings` | 设置与备份 | 导出 JSON/CSV，偏好设置与注销 |

### 2.3 推荐导航

公开：`Home / Six Pillars / Roadmap / Projects / Writing / Achievements / About`。后台：`Overview / Roadmap / Goals / Logs / Projects / Achievements / Reviews / Publish / Settings`。

## 3. 六项能力各自的记录与成果口径

| 领域 | 目标与日志例子 | 更可靠的验收证据 | 私密性提示 |
| --- | --- | --- | --- |
| 运动 | 运动习惯、力量/有氧训练、身体功能 | 持续性、训练计划、阶段体能评估 | 身体和健康数据一律私人 |
| 英语 | 听说练习、技术汇报、团队沟通 | 录音前后对比、真实问答与他人反馈 | 私人录音不自动公开 |
| 模拟 IC | 电路设计、仿真、版图、验证 | 带规格的设计报告、测试与失败分析、公开成果 | PDK、未公开项目、工艺保密资料不得发布 |
| 烹饪 | 食谱、技法、食材处理、营养 | 可复现食谱、菜品改进记录、个人作品 | 生活地点、购买订单等不宜公开 |
| AI | 软件工程、训练实验、Agent、研究 | GitHub 项目、基准测试、复现报告、模型评估 | API Key、私人数据集不入公开仓库 |
| 金融 | 理论学习、预算、配置原则、决策复盘 | 能解释风险和费用、个人预算制度 | 金额、资产、账户、交易严格私人 |

**明确不做**：把“AI 学到了 43%”当作客观事实；把活动次数等同于能力增长；把全部能力用一个跨领域分数排名。

## 4. 核心用户旅程

### 4.1 首次启动

1. 本人打开公开站点，查看六项与三年主线。
2. 登录后台（本人通过管理端预置的用户账号）。
3. 系统读取默认六项配置，确认规划周期。
4. 创建年度目标，填写“为何重要、完成标准、截止时间”，再拆解里程碑。
5. 当天录入一条日志；后台显示该项的最近记录。

### 4.2 每周与每季度

- **随手记录**：最少字段仅需领域 + 标题 + 日期，避免负担。
- **每周回看**：本周做了什么、何处卡住，不强制完成六项任务。
- **季度复盘**：完成证据、未完成原因、继续/降速/暂缓决定、下季度 1–2 个突破重点。

### 4.3 公开发布

- 在私人空间挑选可以公开的成果，**单独编写公开版本**，检查图文/链接是否包含私人信息、敏感工艺文件或 API Key。
- 预览页面 → 本人确认 → 发布。访客只能访问 `published` 且已到发布时间的记录。
- 撤回后，数据库 API 不再返回内容；但已被他人保存、搜索引擎缓存或归档的内容无法保证彻底收回。

## 5. 数据模型与关系

主要表（未部署 SQL 草案见 [schema.proposal.sql](schema.proposal.sql)）：

| 表名 | 作用 | 关键字段 | 访问级别 |
| --- | --- | --- | --- |
| `app_owners` | 本人用户 ID 白名单 | `user_id` | 只有本人可查，管理员初始写入 |
| `goals` | 三年/年度/季度目标 | `owner_id, pillar_key, scope, title, success_criteria, start_on, due_on, status` | 本人 |
| `milestones` | 目标可验证里程碑 | `owner_id, goal_id, title, status, due_on, evidence_url` | 本人 |
| `projects` | 真实学习/工程项目 | `owner_id, pillar_key, title, summary, repo_url, status` | 本人 |
| `activity_logs` | 低阻力日常记录 | `owner_id, pillar_key, activity_on, title, duration_minutes, note, metrics_json` | 本人 |
| `measurements` | 可选量化记录（项目可延后做 UI） | `owner_id, pillar_key, metric_code, value, unit, measured_on` | 本人 |
| `reviews` | 定期复盘与决策 | `owner_id, period_type, period_start, period_end, wins, issues, next_actions` | 本人 |
| `achievements` | 私人自定义成就 | `owner_id, pillar_key?, title, description, icon, status, unlocked_at, notes, related_project_id?, is_highlight, sort_order, image_paths, created_at, updated_at` | 仅本人，默认私有，不提供匿名查询 |
| `public_entries` | **单独编辑**的公开文章与作品 | `owner_id, kind, pillar_key, slug, title, summary, body_md, status, published_at` | 仅已发布记录公众可读，本人管理全部 |

- 六个 `pillar_key` 固定为 `fitness / english / analog_ic / cooking / ai / finance`，标签和图标放在前端配置，不引入额外可编辑分类。
- 私人数据表统一有 `owner_id`，启用 RLS。匿名用户和非本人账户无法查询。
- `milestones(goal_id, owner_id)` 对应 `goals(id, owner_id)` 组合外键，避免跨账户误关联。
- 所有涉及个人日记、训练数据和财务数据的字段只存在私人表；公开内容不依赖“直接读取私人行+is_public 开关”。
- `metrics_json` 为灵活扩展字段，但常用指标应有稳定的 `metric_code` 和单位，不能随意把不同口径数据放在一条曲线上。
- 成就数据模型与状态约束见 [Achievements 设计](achievements.md)；SQL 仅为 [未部署提案](schema.proposal.sql)，M0 不执行任何数据库迁移。

## 6. 访问控制与隐私要求（阻断上线项）

1. GitHub Pages 只发布前端构建产物；不在静态文件、Git 历史、前端环境变量中存任何真实密码、财务数据、个人日记、未公开研究成果或后端密钥。
2. Supabase Auth 只允许本人进入；初次账户由管理员创建，客户端 `signInWithOtp` 使用 `shouldCreateUser: false`，并设置管理员白名单 `app_owners`。
3. 每张浏览器可访问的表必须启用 RLS；所有私人表仅本人 `SELECT/INSERT/UPDATE/DELETE`；公开内容仅已发布状态允许匿名读取。
4. **不能只在 React 中判断 `user` 后隐藏按钮**；必须以数据库 RLS 决定真正访问权限。
5. 前端只能持有 Supabase URL 与 `sb_publishable_...` 等公开客户端密钥；严禁前端存放 `sb_secret_...`、`service_role` 或任何 LLM API Secret。
6. 首版不接收附件；第二版接入附件时应设私有 Storage bucket，并配合 Storage 对象级 RLS / 有效期受限访问链接。
7. Markdown 渲染需禁用危险 HTML 或进行严格清洗；外链设置安全属性，禁止任意脚本注入。
8. 公开内容发布前须有提示：不得包含具体住址、身份证件、完整财务明细、身体健康隐私、保密科研文件或服务密钥。
9. 数据导出仅本人可操作。导出的 JSON/CSV 是明文敏感文件，下载后的存储安全由本人控制。
10. 必须通过匿名访问、其他登录用户、本人账户三种身份的读/写权限测试，且测试直接调用 API，不只检查 UI。

## 7. 技术方案

### 7.1 前端

- React + TypeScript + Vite
- Tailwind CSS，配合简单、语义化的组件库；无需引入大而复杂的系统。
- React Router 的 `HashRouter`；TanStack Query 用于缓存异步数据（可在数据量上来以后引入）。
- React Hook Form + Zod 用于表单与输入校验（必要时引入）。
- 图表优先使用清楚的时间序列和里程碑，不强制六领域互相量化。

### 7.2 托管与持续部署

- GitHub `main` 分支受保护（至少通过构建后再合并），PR 用于主要改动。
- GitHub Actions 执行 `npm ci`、类型检查、测试、`npm run build`，然后部署 `dist/` 至 GitHub Pages。
- 在 Vite 中设置 `base: '/six-pillars/'`（假设仓库名是 `six-pillars`）；若使用 `USERNAME.github.io` 根仓库或绑定自定义域名，再改为 `/`。
- 对于 Pages，初期 `HashRouter` 可避免刷新嵌套路由找不到文件。
- 环境变量 `.env.example` 提供 `VITE_SUPABASE_URL` 和 `VITE_SUPABASE_PUBLISHABLE_KEY` 的占位符。真正服务端密钥不通过 Vite 的 `VITE_` 前缀公开。

### 7.3 Supabase

- Auth：单人账户、邮箱 OTP（必要时配置自有 SMTP 以稳定送达）。
- PostgreSQL：迁移 SQL 纳入 Git；使用 Supabase CLI 管理 schema 变更。
- RLS：`app_owners` 白名单 + 各行 `owner_id = auth.uid()`；`public_entries` 例外允许读取已发布行。
- Storage：V1 无上传，V2 使用私有 bucket 和严格的对象权限。
- Edge Functions：V1 无需；未来 AI Agent 和外部 API 都通过服务端函数，并要求认证、授权和调用额度控制。

### 7.4 数据所有权

- V1 至少提供一键导出私人数据 JSON、主要列表 CSV，且时间、单位、字段名稳定。
- 定期备份数据库；计划迁移时使用标准 Postgres/JSON 格式，而不是只依赖浏览器 localStorage。
- 禁止将隐私数据自动发布到 GitHub Issues、Actions 日志、公开仓库或 AI 服务商。

## 8. V1 最小可用功能（MVP）

**必须实现（P0）**

- [ ] 公开首页及六项能力页面，桌面和手机可用
- [ ] 公开三年路线概览与至少一个示例作品（内容可编辑）
- [ ] 管理员邮箱 OTP 登录与退出，非本人不能进入数据层
- [ ] 六项能力目标 CRUD（含三年/年度/季度）、里程碑 CRUD
- [ ] 日常日志新增/列表/编辑/删除，可按日期和领域筛选
- [ ] 项目 CRUD，可记录代码仓库/成果链接
- [ ] 月度/季度复盘录入与查看
- [ ] 自定义成就 CRUD、点亮/撤销、实际日期、关联六项能力或综合、筛选与排序（M1）
- [ ] 成就独立公开快照、预览、置顶与撤回（M2）
- [ ] 发布中心：单独创建公开文章/成果、预览、发布、撤回
- [ ] 导出 JSON（完整私人数据）和 CSV（核心列表）
- [ ] RLS 测试、项目构建测试和 GitHub Pages 自动部署

**后续优先级（P1）**

- [ ] 可选数值指标与趋势图（仅真实可比较的指标）
- [ ] Markdown 编辑体验提升、标签筛选、搜索
- [ ] 私人附件存储、图像与录音上传
- [ ] 数据导入和冲突预览
- [ ] 周复盘提醒（站内）

**远期（P2）**

- [ ] AI 自动复盘草稿（必须本人确认）
- [ ] AI 文献检索与归档、项目知识库
- [ ] 学习计划 Agent 和多源数据连接器
- [ ] 精细权限或独立后端、移动端 PWA

## 9. 第一版开发分阶段计划

建议按**4 个里程碑**进行，而非承诺固定几天完成；兼顾本科课程、科研与其他训练。

### M0｜产品与静态前端（预计 4–7 天）

- 初始化 Vite + React + TypeScript + Tailwind；路由、主题、导航。
- 定义六项领域的 TypeScript 常量和静态公开文案。
- 完成首页、六项页、三年规划页、作品集静态样例。
- 新增 `/achievements` 静态公开页、可复用彩色/灰色徽章、徽章墙与时间线空状态。不得伪造成就，不实现管理操作或持久化。
- GitHub Actions 成功部署到 GitHub Pages，手机页面可读。

**验收**：构建、公开交互、375/768/1440px 布局与 GitHub Pages 实际部署均验证通过；无个人隐私数据被打包。只有本地验收时不得标记 M0 正式通过。

### M1｜单人安全后台（预计 5–8 天）

- 创建 Supabase 项目；部署 SQL migration；手动加入唯一管理员用户 ID。
- 配置邮箱 OTP；完成登录、注销、认证状态和错误提示。
- 实现 Goals / Milestones / Logs 基础 CRUD。
- 实现私人 Achievements 自由创建/编辑/删除/排序、可直接创建已点亮成就、点亮及撤销、能力/年份/状态筛选与持久化。M1 不公开发布。
- 完成三类身份与直接 API 的 RLS 读写测试。

**验收**：匿名与非管理员无法读写私人表；本人跨设备登录后可继续记录。

### M2｜项目、复盘、公开发布（预计 5–8 天）

- Projects / Reviews CRUD。
- `public_entries` 发布与撤回，Markdown 安全渲染。
- 公开作品与文章动态读取已发布记录。
- 全部私人数据的 JSON/CSV 导出。
- 成就公开版本的编辑、预览、显式发布、公开置顶与撤回；`public_entries.kind = 'achievement'` 的独立快照。导出纳入成就。

**验收**：一条私人记录只有经本人编辑成独立公开文章并主动发布后才会出现在公开站点；撤回后公开 API 不再返回。

### M3｜质量与上线检查（预计 3–5 天）

- 空状态、表单出错、网络失败、加载状态、移动端响应式。
- 端到端测试关键路径；检查浏览器控制台、部署构建日志。
- 做一次恢复演练：从导出/备份验证关键数据完整性。
- 撰写 README、环境部署说明、运行手册。

**验收**：可持续使用、可维护、有恢复途径，而不是只完成 Demo。

## 10. 上线验收清单

1. 匿名访问前台正常，但直接访问 `goals`、`activity_logs`、`reviews` API 返回零条或拒绝。
2. 模拟其他已登录用户，无法读写本人任何私有记录，也无法发布公开记录。
3. 本人新增目标、里程碑、日志和复盘，刷新页面与另一台设备登录后数据一致。
4. 在后台新增未发布文章，访客不可见；发布后可见；撤回后 API 不返回。
5. 查看 GitHub 仓库、打包文件和网络响应，确认无敏感数据或 secret key。
6. 手机端录入一条记录不需横向滚动，键盘操作与基本无障碍可用。
7. 主要列表可过滤，错误状态和空状态有明确提示。
8. 导出包含关联键、日期和核心字段，能在本地核对条数。
9. GitHub Actions 可以从干净环境安装依赖、构建、部署。
10. 第一版至少能稳定使用一周，再扩展新功能。

## 11. 目录设计

```text
six-pillars/
├── .github/workflows/deploy.yml
├── public/
├── src/
│   ├── app/                 # Router、Providers、布局
│   ├── components/          # 通用组件
│   ├── config/pillars.ts    # 六个固定领域
│   ├── features/
│   │   ├── public/          # 公开主页、文章与作品
│   │   ├── auth/            # 登录、权限边界
│   │   ├── goals/           # 目标和里程碑
│   │   ├── logs/            # 活动日志
│   │   ├── projects/        # 项目
│   │   ├── reviews/         # 复盘
│   │   └── publishing/      # 公开版本的人工发布
│   ├── lib/supabase.ts
│   ├── types/
│   └── main.tsx
├── supabase/
│   ├── migrations/
│   └── tests/
├── docs/PRD.md
├── .env.example
├── .gitignore
├── package.json
├── vite.config.ts
└── README.md
```

## 12. 未来扩展标准

新功能必须回答：**能解决什么真实痛点、增加多少维护成本、是否触及隐私/权限、是否可导出、完成后如何判断有用？**

Agent 只有在手动记录与复盘已经稳定、存在真实重复工作时再加入；外部 LLM 请求通过服务端 Edge Functions，并明确选择允许传输的最小必要数据。财务与健康原始数据默认不得发往模型服务。

### 12.1 Achievements 正式模块

成就收藏六项能力与个人生活中已经取得、值得纪念的成果，也允许先记下尚未点亮的心愿。用户自由命名与描述，不受预设模板限制。`pillar_key = null` 表示综合成就，不增加能力类别。

支持名称、描述、图标/图片、个人感想、相关项目链接与成果照片；状态为 `locked`（未点亮）和 `unlocked`（已点亮）。新建可直接选择已点亮；点亮时填写实际达成日期；编辑已点亮成就可更正说明与日期；撤销点亮同时清空达成日期。支持删除、排序、置顶，以及按六能力/综合、年份、状态筛选。

公开页面采用徽章墙和时间线：已点亮彩色、未点亮灰色，并辅以文字标记。点击卡片展示详情、实际日期和公开成果。无公开成就时显示空状态。未点亮成就只有经过独立编辑并明确发布才可展示，私人未点亮记录及所有草稿均不得泄露。完整状态、发布/撤回、照片边界与分阶段验收见 [专项设计](achievements.md)。

明确不开发积分、排行榜、复杂经验等级与自动识别。M0 只做公开静态展示；M1 的数据库和后台、M2 的发布功能均需后续授权。

## 13. 给 Codex 的首轮开发指令

> 请根据 `docs/PRD.md` 与 `supabase/migrations/` 内 SQL 开始开发 **M0 静态前端**，不要提前实现 M1–M3。使用 React + TypeScript + Vite + Tailwind + HashRouter，完成公开主页、六项能力页面、公开三年规划、作品集静态示例和 GitHub Pages 自动部署。六大领域要作为固定配置，未来可与数据库目标关联。暂时不存任何私人敏感数据，不加入任何 LLM API，不编造真实进度百分比。提供可执行的 README、命令和基本测试，并确保移动端体验。每次只实现一个里程碑，完成后报告已实现功能、验收方式、遗留问题与下一步建议。

---

### 关键官方资料

- GitHub Pages: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site
- Vite GitHub Pages: https://vite.dev/guide/static-deploy.html
- Supabase RLS: https://supabase.com/docs/guides/database/postgres/row-level-security
- Supabase publishable vs secret: https://supabase.com/docs/guides/getting-started/api-keys
- Supabase Email OTP: https://supabase.com/docs/guides/auth/auth-email-passwordless
- Supabase Storage: https://supabase.com/docs/guides/storage/buckets/fundamentals
