# M1 合并前：生产配置与独立设备验收

最新本人决定优先：复用已验证项目 `rplgwjhnptappdbwqygj`，取消第二生产项目、强制 SMTP 及复杂设备验收前置要求。GitHub 变量已配置，本人已确认正式回调保存；沿用 main 手动部署，仍须本人单独批准合并与发布。下方原独立项目方案保留为历史，不再作为当前阻断条件。最新执行状态与最小线上流程见 [QA 报告开头](M1_QA_20261015.md)。

状态：方案与构建防护已提交到 Draft PR #1；没有创建生产项目、设置生产变量、发送生产登录邮件、触发部署或修改 Auth 账户。只有本人批准后才能执行本文的生产步骤。

## 最终准备轮：实际配置与剩余限制

- 已通过 GitHub API 创建 `six-pillars-production` 并读回：custom branch policy 仅 `main`；required reviewer 是 Namjuryman，`prevent_self_review=false`，本人可以审批自己的手动发布。环境变量当前 0 个，尚无生产配置。仓库为 public，现有计划支持这些规则。`github-pages` 也已确认仅允许 main；main 保护继续要求 `build`，管理员也受主分支保护。
- `can_admins_bypass=true` 是实际读回值，不声称管理员绝对不能绕过。发布操作规程是本人显式批准、main 手动触发、本人 Review deployments 审批；不使用管理员 bypass。本轮没有通过触发部署来实测审批阻断，不能把配置读回写成运行级发布验收。
- Supabase 组织 API 确认 Free，当前只发现东京 DEV 项目。本人已批准在确认免费后新建东京 `six-pillars-prod`。但必需 get_cost 工具返回 UNAVAILABLE、浏览器控制启动失败，尚未创建生产项目；未伪造成本确认 ID 或用开发项目代替。生产迁移、Auth/回调、三身份 API、Advisor 和环境变量均待实际项目。
- 已按本人授权开放临时 Cloudflare HTTPS 到仅监听回环的静态预览，开发 publishable key 仅进入该预览（不上传 Pages）。实测 HTTPS 登录表单正常、无 pageerror、源码和 `.env` 返回 404，具备 CSP、no-referrer、no-store。没有代理 Vite 开发服务器、数据库或本地 API。临时域名可能失效，具体地址只在本次对话提供。
- HTTPS 登录还需要 DEV Auth 添加精确的临时回调 URL；当前工具没有 Auth 配置接口且浏览器不可用，本轮未修改。没有完整 Magic Link 或真机同步结果；不得开始使用私人数据。预览脚本最长运行两小时，结束后可停止隧道，不使用生产配置。

### 单人邮件服务评估（2026-10-15）

默认服务允许组织成员邮箱，官方目前为 **2 封/小时**，无送达 SLA；单人偶尔登录可能够用，但手机、电脑独立登录及失败验收容易耗尽限额，不承诺可靠生产使用。本轮未自动发送新邮件、未配置第三方或购买域名。

| 可选方案 | 当前费用依据 | 配置与限制 |
| --- | --- | --- |
| 暂用 Supabase 默认 SMTP | 现有服务，无新增购买 | 仅组织成员、2 封/小时、无 SLA；需本人接受风险，无法冒充已通过生产邮件验收 |
| Resend Free SMTP | [官方 Free](https://resend.com/pricing)，每日 100 封；域名费用另计 | 需本人账户、验证可控发件域名、DNS 认证；SMTP secret 仅填 Supabase，不能入前端；不开 overage 或升级 |
| Amazon SES | [官方 à la carte](https://aws.amazon.com/ses/pricing/)发送 $0.10/千封，可能有其他费用；新账户默认套餐可能不同 | 须明确选择计费模式、AWS 账户和域名验证、sandbox/地区限制；不适合作为本次零配置默认项，未经批准不开户或消费 |

默认服务限制见 [Supabase 官方说明](https://supabase.com/docs/guides/auth/auth-smtp)。最终选项待本人决定；先完成 DEV 精确回调和本人的实际收件/设备结果。勿为测试限流反复请求邮件。

## 生产构建与 PR 隔离

现有问题：原工作流仅 `npm run build`，不会读取 `.env.development.local`，因此正式包会显示登录未配置。不能把开发库直接接到公开正式站解决。

修复后的构建契约：

| 命令 / 作业 | 输入 | 产物 | 是否连接数据 |
| --- | --- | --- | --- |
| `npm run dev` | 忽略的 `.env.development.local` | 本地开发 | 仅本人选择的开发库 |
| `npm run build` / PR `build` | 强制空 URL/key，忽略 env 文件和继承的 VITE_ | `dist/` | 无 Supabase 客户端 |
| `npm run test:e2e:private` | 固定 `.invalid` 主机与假 key | `.m1-ui-dist/` | 仅内存 mock |
| `npm run build:pages -- public` | 强制空 URL/key | `pages-dist/` | 公开静态页，登录未配置 |
| `npm run build:pages -- private` | 显式生产 URL/ref/publishable key | `pages-dist/` | 构建只注入，运行后才请求生产 |

`build-site.mjs` 使用 Vite `envDir:false` 和显式 `define`，防止本地 `.env.production.local` 或继承 VITE_ 悄悄污染测试包。三个生产变量只在 `pages-build` 出现，PR `build` 不声明生产 environment。所有浏览器测试限制外部网络；mock 使用保留域名且禁止对线上站运行。

工作流的 push / PR 只验证；部署须手动从 **main** 运行 workflow_dispatch，显式勾选 `deploy_pages` 并选择 `public` 或 `private`。`pages-build` 等待 `build`，在独立 `six-pillars-production` environment 编译，随后 `deploy` 和 `verify-deployment`。feature 分支即使手动勾选也不能部署。默认不勾选。这是合并后的行为变更，不能再假定 push main 自动发布。

### 本人批准之后的配置清单（本轮未执行）

1. 确认专用生产 Supabase 项目及预算；开发项目 `rplgwjhnptappdbwqygj` 被构建器明确拒绝，不能当作正式项目。
2. `six-pillars-production` 已按单人维护要求创建：限制 main、required reviewer 为本人、允许本人审批。配置已读回；实际审批运行还待获准发布时验证。管理员 bypass 仍可用，操作时不使用 bypass。不要启用 prevent_self_review 使唯一维护者无法审批。`github-pages` 已复核 main 分支限制。
3. 在该 environment 的 **Variables** 配置 `PRODUCTION_SUPABASE_PROJECT_REF`、`PRODUCTION_SUPABASE_URL`（精确为 `https://<ref>.supabase.co`，无尾斜杠）、`PRODUCTION_SUPABASE_PUBLISHABLE_KEY`（现代 `sb_publishable_...`）。这些是公开客户端标识，会写入 JS；数据库密码、service_role、sb_secret 和 SMTP 密钥不得填入。
4. 在生产库审查迁移、最小授权、RLS、唯一 owner 白名单与账号安全选择；从生产 API 验证 anon / owner / non-owner。不能复用开发库的 107 项历史结果代替生产结果。
5. Auth 自助注册关闭；生产 Site URL 和精确 Redirect URL 为 `https://namjuryman.github.io/six-pillars/`。开发回调只留在开发项目，不用广泛通配符。
6. 完成生产 SMTP、账户安全及下述验收准备，再由本人批准发布；确认 `pages-build`、`deploy`、`verify-deployment` 全过，以及真实登录和跨设备抽验后才能标记 M1 正式完成。

构建器只校验 ref/URL 格式与一致性，无法证明 key 属于正确项目；发布审批还须核对 Supabase Dashboard 并在待发布环境做真实认证。默认静态构建成功不等于私有生产配置通过。

回滚：先停止新写入并保存数据库备份；用手动 `public` 构建恢复公开静态模式，确认 Pages 生效。不要删除生产库或误以为回滚静态包会撤销旧 JWT；必要时另行批准会话撤销及后端访问限制。后端迁移的回滚必须单独审查。

## 真实手机与另一台电脑

测试流：登录页 → 本设备申请新链接 → 同设备打开邮件 → 私人工作台 → 写入 → 另一独立设备登录并读取 → 注销。先在 DEV 完成；生产需批准启用后再做，不能把浏览器改 viewport 当作真机。

| 步骤 | 手机（本人实际机型/系统/浏览器） | 另一台电脑（独立系统与浏览器） | 通过条件 |
| --- | --- | --- | --- |
| 链接登录 | 在系统浏览器申请与打开新邮件链接；另测邮件内置浏览器 | 自己申请另一封，不共用手机的一次性链接 | 正确 origin/base、一次性使用、回调令牌立即清除 |
| 输入与布局 | 竖屏、横屏、软键盘、日期控件、缩放 | 375/768/1440px 与键盘操作 | 无横向溢出、按钮可点、保存/错误可读 |
| 六项与综合成就 | 新建、直接点亮、编辑实际日期、撤销 | 六项筛选、年份、状态、置顶/排序 | 状态日期同步，不出现公开发布功能 |
| 跨设备一致性 | 建一个目标/里程碑/日志/成就 | 刷新后可读同一 ID；修改后手机刷新复核 | 日期、空值、正文、关系一致 |
| 会话 | 刷新恢复，关闭标签页后重新登录 | 独立登录/注销；后退不能看到私人内容 | sessionStorage 策略符合说明；本地退出不会承诺退出所有设备 |
| 拒绝与失败 | 旧/重复/过期链接，断网后重试 | non-owner、匿名直调 API | 无私人数据泄露，不返回假成功 |

生产使用本人明确同意的非敏感验收记录，测试后只按其确切 ID 删除，避免影响真实日记。记录本人操作日期、设备/系统/浏览器版本、commit、URL、通过/失败、脱敏截图；不录制一次性 URL、JWT、邮箱正文、密码或私人文本。

## 生产邮件投递

默认发信服务仅适合开发，不能作为可靠生产投递方案。配置自定义 SMTP 涉及提供商、发件域名、费用、DNS 与秘密，由本人确认后再执行；**本轮没有配置**。

1. 确认发件域名所有权、From/Reply-To、SPF/DKIM/DMARC、TLS、发送限额、退信监控；SMTP 密钥只保存于 Supabase 配置，不进前端或 GitHub 变量。
2. 用本人授权的真实收件邮箱测试常用邮箱服务与垃圾箱，记录发送/到达时间（建议 2 分钟目标，超时须调查而非继续点发送）、邮件头认证结果和 SMTP 日志错误码；默认模板可能受邮件扫描器提前消费链接影响。
3. 同设备打开、复制到完整浏览器、邮件内置浏览器、跨设备打开分别验证；每次新申请链接，不复用一次性链接。验证最终回到 Pages 的 `/six-pillars/`，没有丢 hash 路由。
4. 验证链接过期、重复使用、新链接/旧链接、发送限流与未知地址提示；界面不枚举邮箱、不暴露原始 Auth 错误。除人工申请的验收邮件外不群发。
5. 确认手机号/电脑都能恢复会话、保存记录，再验证注销和历史页面；记录供应商限制及重试规则。不以开发 Gmail 的历史收件代替生产测试。

签字表（尚待本人填写）：生产项目 ___；安全取舍 ___；SMTP/预算 ___；手机结果 ___；另一电脑结果 ___；恢复演练 ___；批准部署时间 ___；线上验证 ___。

参考：[GitHub environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)、[Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)、[Redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls)。
