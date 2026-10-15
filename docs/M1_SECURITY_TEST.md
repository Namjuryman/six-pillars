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

**当前进度**：真实匿名 HTTP 子集已执行，6 表 × 4 操作共 24 项均返回 401/授权拒绝；Email 启用，自助注册关闭。owner / non-owner、日期/FK 校验及真实邮箱登录尚未执行，完整矩阵未通过。

可重跑匿名子集：`node scripts/verify-anonymous.mjs`（从忽略的 `.env.development.local` 读取公开项目 URL / publishable key，无 JWT 或数据库密码）。脚本不输出身份数据。

Supabase 安全 Advisor 无告警；索引顺序问题已修复。新库未使用索引的提示见 [官方说明](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)。保留必要索引，后续随真实查询观察。
