# M1 开发环境与安全验收手册（开发验证中）

## 当前状态

M1 代码位于独立开发分支。**独立东京开发项目已创建并应用迁移，6 张表均启用 RLS；真实匿名 API 的 24 项读写拒绝检查通过。owner / non-owner 与真实邮箱登录尚未完成，不能视为完整 RLS 验收。**不能把本地页面出现视为私人数据已安全上线。正式 GitHub Pages `main` 应维持 M0 状态直到验收。

## 环境配置与验收步骤

1. 已在本人批准的组织中创建独立东京开发项目；后续重建环境时仍不得与生产数据共用。
2. Auth → Sign In / Providers 启用 Email；**关闭允许新用户自行注册**。在 Auth → Users 管理端由本人手动新增两个用户：本人 owner 和仅用于测试的 non-owner。
3. **本人已于本轮明确选择改用官方邮箱登录链接**，替代草案中的六位验证码，不再要求编辑模板或配置自定义 SMTP。在 Auth → URL Configuration，将开发 Site URL 和 Redirect URL 设为 `http://127.0.0.1:5173/six-pillars/`。默认 SMTP 的收件人限制见 [官方说明](https://supabase.com/docs/guides/auth/auth-smtp)；先用 Supabase 组织成员邮箱测试。用户必须点击邮件中的 Sign in 完成真实认证。
4. 两份迁移已应用到本次开发库；重建环境时使用 Supabase CLI 按顺序部署 `supabase/migrations/` 中全部迁移（也可先在开发项目 SQL Editor 审查后执行一次）。注意此脚本仅适用于全新数据库，**不要直接在已有数据的生产数据库重复执行**。
5. 在开发项目 SQL Editor 中，以数据库管理员身份执行：
   ```sql
   insert into public.app_owners(user_id) values ('本人 Auth 用户 UUID');
   ```
   **绝对不要**通过前端、普通登录用户或公开 GitHub 工作流执行这条 SQL。
6. 本地复制 `.env.example` 为 `.env.development.local`，只填写 `VITE_SUPABASE_URL`、`VITE_SUPABASE_PUBLISHABLE_KEY`。publishable key 属于公开客户端标识，不是后台 secret；`sb_secret_*` 和 service_role **绝不填入 VITE_ 变量**。
7. 本地测试 `/#/login`，本人登录后可以新增目标和点亮成就。non-owner 无法访问后台。
8. 按 `docs/M1_SECURITY_TEST.md` 用**真实直调 REST API**测试三种身份，记录证据但不要记录或提交 JWT、OTP、邮箱或个人数据。全部通过后才可以考虑将 M1 合入 main。

## 使用说明

- 私人登录：`/#/login`。后台：`/#/admin`、`/#/admin/goals`、`/#/admin/logs`、`/#/admin/achievements`。
- 代码不含个人记录；示例记录请只在开发库创建非敏感虚构测试数据。
- 官方 SDK 管理会话续期和状态通知；浏览器会话写入 sessionStorage（浏览器禁止存储时退回内存），关闭标签页之后需要重新登录；不保存到 git、URL 或部署包。
- 私人表的真实保护措施是 PostgreSQL RLS；React 路由保护只提供用户体验，不构成权限边界。
- 成就的私人创建/点亮/撤销已设计；**公开发布、图片上传、项目管理和复盘中心属于 M2，本次不实施**。

## 手动验收

- 过期/错误登录链接、未登记邮箱、non-owner 邮箱均不能进入私人后台。
- 本人写入一条目标、里程碑、日志和成就；刷新页面数据仍在。
- 本人点亮成就后保存日期，撤销后日期归零；未来日期被数据库拒绝。
- 验证非本人和匿名 REST SELECT/POST/PATCH/DELETE 权限；特别注意匿名读取必须为拒绝或空集合。
- 查看部署包确认不存在 `sb_secret_*`、JWT、个人记录或未公开科研数据。
- 在 375px、768px、1440px 完成页面和输入表单测试。
- 使用手机和另外一台电脑登录本人账户以验证跨设备同步。

请保留 M0 的完整 UI 自动化测试，并为 M1 的真实表单及 RLS 检查另建用例。


## 当前验证边界

- 现代 publishable key 只写入被 Git 忽略的 `.env.development.local`；数据库密码、Auth JWT、邮箱验证码不进入源代码、构建或 Actions。
- 服务器实际设置已确认 Email 启用、自助注册关闭。本人已确认保存开发回调 URL；邮件送达、链接登录与两个真实 Auth 测试账户仍待验证。
- 安全 Advisor 无告警；外键索引缺失已用第二份迁移修复。新空库的 unused_index 信息不代表应删除外键/查询索引。
- 匿名检查直接调用真实 HTTP API，没有 JWT，六表 GET/POST/PATCH/DELETE 均被拒绝；此结果只覆盖 anon，尚不覆盖本人及其他已登录用户。
- 不合并 main，不配置生产数据库，不标记 M1 完成。


## 邮箱链接回调实现

调用官方 `signInWithOtp`（方法名称沿用 SDK），传 `shouldCreateUser:false` 与基于当前 origin / Vite base 的 `emailRedirectTo`。在 React / HashRouter 挂载前，立即用 history.replaceState 清除 fragment 中的令牌及错误参数；仅将两个会话令牌交给官方 auth.setSession 验证和保存，成功后再检查白名单。前端不自行解码或验证 JWT。粘贴链接到已打开的 SPA 标签页时也会重新进入同一回调流程。失败时只显示固定提示，不反射服务端错误文字。前端不自行解码或刷新 JWT。

原始交接文档保留六位 OTP 方案作为历史要求；此次本人选择的邮箱链接方案优先。测试已相应改为链接错误态、令牌清理、恢复、续期、注销及 owner / non-owner 页面保护。
