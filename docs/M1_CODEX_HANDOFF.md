> 此文件保留原始开发包交接要求。本轮本人已明确选择官方邮箱链接登录，替代六位 OTP；以下 OTP 描述为原始方案。当前实现已用官方 Supabase SDK 替换草案认证/REST；实际状态与阻断项见 M1_SETUP.md，原始草案中的“未部署”不再代表当前开发库状态。

# M1 开发包交接给 Codex

## 状态

本压缩包基于已经通过在线验收的 M0 QA 源码。它加入了 M1 的**原型实现**，包括路由、登录、Goals/Milestones/Logs/Achievements 私人界面，以及开发用 SQL 迁移。**不是已完成或已上线的 M1；不要直接合入 main。**

当前检查环境无法访问 npm 软件包仓库，也没有 Supabase 项目或测试账户，故只能完成 TypeScript 语法级检查，尚未完成 `npm ci` / `npm run typecheck` / Playwright 交互测试 / 真实 RLS 测试。

由于本次 GitHub 连接创建分支被 403 拒绝，需由 Codex 在你本地有权限的仓库创建 `feature/m1-private-workspace` 并提交 PR。勿直接向 main 推送。

## 本批代码已经写入

- `src/features/auth/Auth.tsx`：OTP 登录表单、授权检查、路由守卫；未配置时显示明确提示
- `src/lib/privateApi.ts`：只接收 Supabase publishable key 的基础 REST / Auth API 访问，sessionStorage 会话、刷新与登出
- `src/features/admin/Admin.tsx`：后台总览、目标 + 里程碑、活动日志、成就管理
- `src/features/admin/data.ts`：有 owner ID 限制的 PostgREST CRUD 辅助
- `src/styles.private.css`：私人区域响应式样式，与已发布 M0 样式隔离
- `supabase/migrations/20261015063209_private_m1.sql`：**仅供新开发项目**的版本化 SQL
- `docs/M1_SETUP.md`、`docs/M1_SECURITY_TEST.md`：部署、安全验收和三身份测试指导

## Codex 下一轮必须做的事情

1. 检查本包与 GitHub main 最新提交的 diff，在新分支应用；不允许修改 M0 公开文案或创建虚假个人记录。
2. 对全部新增 TS/TSX 文件执行格式化、代码审查和严格类型检查，修复缺陷。特别审查身份验证、刷新令牌生命周期和失败状态；如果改用官方 Supabase JS SDK，更新 `package.json` 与锁文件并补测试，不能在锁文件不一致时提交。
3. 运行 `npm ci && npm run typecheck && npm test && npm run build && npm run check:styles && npm run test:e2e`。M0 的公开站点测试必须继续通过；新增 M1 浏览器测试至少覆盖匿名重定向、OTP 错误态、登录后创建/编辑/删除目标与日志、成就点亮/撤销及日期校验。若没有数据库，使用明确隔离的 UI mock；不得假装 mock 就是 RLS 验证。
4. 在一个**全新 Supabase 开发项目**迁移 SQL；不要使用生产账号、真实健康或金融数据试验。本人自行创建 owner、non-owner 两个测试账号，并在 SQL Editor 用管理员身份加入 `app_owners` 白名单；验证码模板必须支持 `{{ .Token }}`。
5. 按 `docs/M1_SECURITY_TEST.md` 做三种身份**直接 API**验证：匿名、白名单 owner、已登录 non-owner。验证 SELECT/INSERT/UPDATE/DELETE、非法成就日期、跨账户 FK，并保留脱敏证据。任何一项不通过都不应合并。
6. 仍不得接入 M2 发布、图片上传、真实个人数据、AI Agent 或金融同步。没有生产 Supabase 环境变量时，Pages 上后台应处于不可登录的提示状态。
7. 只在 PR 中汇报真实测试与截图，PR CI 通过也不等于 RLS 检查已经通过。等待本人同意合并和上线。

## 特别注意

`src/lib/privateApi.ts` 是为不增加依赖而提供的轻量原型，并不是官方 SDK。对于计划使用多年的个人管理系统，更推荐由 Codex 使用**官方 `@supabase/supabase-js`** 完成 Auth 与 PostgREST，统一 token refresh/error handling，并将依赖及 lockfile 一同提交。安全验证和功能正确性优先于保留本实现。

不要在 `VITE_` 变量、GitHub Pages 仓库、PR 评论、截图或 Actions logs 中暴露 `service_role`、`sb_secret_*`、JWT 或 OTP。前端 publishable key 并非私钥；安全完全依赖 Auth、白名单和数据库 RLS。
