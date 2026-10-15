# M1 RLS 直接 API 验收矩阵

只使用**独立开发项目与非敏感测试数据**。下面的测试必须通过真实 Supabase PostgREST/API 完成，不能仅测试 React 登录页或模拟 RLS。

| 操作 | 匿名 anon | 已登录 non-owner | 白名单 owner |
| --- | --- | --- | --- |
| GET `goals`, `milestones`, `activity_logs`, `achievements`, `projects` | 无私人行/403 | 无私人行 | 能看本人行 |
| POST 创建目标或成就 | 401/403 | 401/403 | 成功 |
| PATCH/DELETE 修改 owner 的行 | 401/403 或 0 affected | 0 affected | 成功 |
| app_owners SELECT | 403 / 无记录 | 不应出现 owner | 只返回自己 |
| app_owners INSERT | 拒绝 | 拒绝 | 拒绝（只允许 DB admin bootstrap） |
| achievements unlocked + null date | 拒绝 | 拒绝 | 数据库校验拒绝 |
| achievements locked + 有日期 | 拒绝 | 拒绝 | 数据库校验拒绝 |
| achievements date 在未来 | 拒绝 | 拒绝 | 触发器拒绝 |
| 为他人 goal 创建 milestone | 拒绝 | 拒绝 | FK + RLS 拒绝 |

示例 HTTP 请求（请在本机安全终端使用临时变量，不要粘贴到聊天或 GitHub）：

```bash
curl -sS -i "$SUPABASE_URL/rest/v1/goals?select=*" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $OWNER_ACCESS_TOKEN"
```

验证 anon 时不附带用户 JWT；如兼容性要求，可使用项目公开匿名 JWT（不是 secret key），但不可把 owner token 误作匿名访问。直接 POST 应确认返回的行所有者是预期用户，且错误状态不泄漏具体私密记录内容。对 PATCH/DELETE 使用事先创建的测试行，使用 `Prefer: return=representation` 来核对影响行数；最后由 owner 清理测试数据。测试完及时丢弃所有临时 token。

另外校验：
- 关闭自助注册不等于 RLS；必须同时配置白名单。
- 通过网络面板检查每一次私人读写都带 owner JWT 而不是 service-role。
- 不要把 Supabase Auth JWT、访问邮箱和截图中的敏感值写到公开仓库、Actions 日志和截图工件。
- RLS 通过后再部署生产项目，且生产项目重新进行抽样权限验收。

**当前结果（2026-10-15）**：

- 真实匿名 HTTP：6 表 × 4 操作，24 项均被授权层拒绝。
- 真实 owner / non-owner HTTP：107 项通过，包含本人行 CRUD、无 owner 条件的读取隔离、越权写入/删除、伪造 owner、白名单修改权限、六项/综合成就、状态/日期/时长校验、跨账户组合 FK 和清理。
- 本人真实邮箱链接登录已验证。最终完整写入/注销复验使用本人批准的临时 QA owner；结束后立即撤销，未把 non-owner 加入白名单。
- 后端真实浏览器：会话恢复、375px 独立上下文、非本人拒绝、成就创建/刷新/撤销/删除、退出后 SDK 会话清理均通过。
- 私人 UI 的 15 项 mock 测试另外记录，不计入上述真实 API 结果。
- 测试数据全部清理，当前五张业务表均为 0 行，白名单仅有本人。两个测试 Auth 身份保留但均无后台权限。

可重跑匿名子集：`node scripts/verify-anonymous.mjs`。后端矩阵入口为 `scripts/verify-rls.mjs`，由本机真实认证验收脚本调用；只使用公开客户端 key 和真实用户 JWT，不使用 service-role。

最终 Advisor：无 RLS / 性能告警；安全有 1 项 WARN：`auth_leaked_password_protection` 未开启。当前 Free 计划不能启用该项，[官方说明与修复入口](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)列明 Pro 及以上可用。本次没有变更套餐或声称此提示已修复。正式上线前需确认此配置取舍。

详情见 [验收报告](M1_QA_20261015.md)。
