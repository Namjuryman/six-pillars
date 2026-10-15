# M1 认证安全审阅（只读，2026-10-15）

## 已确认的状态

开发项目只读查询仅返回布尔值和数量，没有读取密码哈希、JWT、MFA secret 或邮箱正文：本人已确认邮箱、`encrypted_password` 非空、白名单授权，**verified MFA factor 为 0**。两个临时测试 Auth 账户也保留密码凭据，均无白名单。安全 Advisor 仍有 `auth_leaked_password_protection` WARN；未调整计划、密码、账户、MFA、Hook、会话或 RLS。

产品只展示 Magic Link；官方 `signInWithOtp` + `shouldCreateUser:false` 只决定此次登录请求与是否创建用户，**不会禁用 Auth 的密码认证**。关闭新用户注册也不会删除已有密码。之前真实 QA 使用过测试账户的密码认证；本轮因临时凭据已清理、本人密码未知，**没有再次尝试密码登录**，不能把“有凭据”报告为本轮密码登录成功。按当前证据必须视密码途径仍可能使用，不能宣传后端已是 passwordless-only。

官方 `signInWithPassword` 能直接调用 Auth，无需页面有密码框。owner 密码若可用，得到的 JWT 与 Magic Link 同样受 owner 白名单 + 行所有权 RLS 约束；RLS 不区分它们的登录方法，当前没有 `aal2` 限制。因此 owner 密码泄露仍可能访问全部本人数据；非 owner 即使有密码也不获得后台权限。`getUser()` 验真和删除前端密码入口不能消除此风险。

## 上线前建议与须本人决定的事项

| 选择 | 效果与限制 | 当前执行状态 |
| --- | --- | --- |
| 保留 Magic Link 为日常入口，加强邮箱账户自身 MFA | 邮箱即登录入口，需本人保护邮箱和恢复渠道；不等于 Supabase 数据层 MFA | 待本人确认和操作 |
| 若保留密码，单独随机强密码 + 密码管理器，启用可用的强度/限流/泄露密码保护 | 建议 20 位以上随机独立密码；提高强度要求并不撤销现有密码或会话。泄露密码保护官方目前需 Pro+ | 待批准；不重置本人密码、不付费升级 |
| 要求 Supabase TOTP MFA | 需要 enroll/challenge/verify/恢复流程，**并对所有私人表加入 restrictive AAL2 RLS（含写入校验）**；只在 Auth 开启开关或只在 UI 提示不能保护直调 API | 本轮仅设计，不实施，以免锁住本人 |
| 要求服务端严格只准邮箱链接 | 须核实当前项目支持的服务端密码限制/Hook 与计划，再在 DEV 验证 password grant 被拒绝、合法邮箱链接仍可用；检查登录后自行设置密码和恢复流程，避免绕过 | 未确认该项目可用开关，不声称已有此策略，不直接改 auth.users |

推荐在存入健康、长期个人日志前确认安全基线：邮箱 MFA、唯一强密码策略，并优先评估 TOTP + 数据层 AAL2。若选择暂不实施 Supabase MFA，必须明确接受单因素与保留密码入口的剩余风险；这不是自动批准上线。

批准修改密码/禁用途径/移除测试账户时，还需单独确认撤销范围。删除用户或注销刷新会话不保证已签发的 access token 立即失效；白名单撤销的数据库检查与 JWT 生命周期应分别验证。不要直接更新 `auth.users.encrypted_password`，也不要把数据库密码当作 Auth 用户密码。

## 若后续批准安全加固，验证矩阵

在专用 DEV 身份先测试：Magic Link 成功 / owner 密码 grant 的预期结果 / non-owner 仍被拒 / aal1 对所有私人表读写被拒 / 完成 MFA 的 aal2 owner 正常 CRUD / 未验证或被撤销 factor 的行为 / 手机换机、丢失因子恢复 / 并发旧会话与刷新。验证成功后再批准生产，保存脱敏状态与 HTTP 结果，不保存凭据。

默认发信、生产项目与设备验收见 [发布计划](M1_RELEASE_PLAN.md)。本文件是风险评估，不是修改用户认证账户的授权。

依据（2026-10-15 核查）：[signInWithPassword](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)、[密码安全与已有用户影响](https://supabase.com/docs/guides/auth/password-security)、[MFA 与 restrictive AAL2 RLS](https://supabase.com/docs/guides/auth/auth-mfa)、[密码验证 Hook](https://supabase.com/docs/guides/auth/auth-hooks/password-verification-hook)。
