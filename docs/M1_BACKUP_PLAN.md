# 三年数据导出、备份与恢复方案（M1 设计，不自动执行）

覆盖 2026–2029 的真实日志、目标、里程碑与私人成就。当前 M1 不增加备份页面、后台定时任务、付费服务或 M2 功能；**目前没有已执行的生产备份或恢复演练**。投产前必须选择实际保管方式并在独立 DEV 演练。导出、数据库备份与已验证恢复是三个不同状态。

## 两层格式

1. **可迁移的本人数据档案**：UTF-8 JSON 为权威格式，含 schemaVersion、应用 commit、迁移版本列表、导出 UTC 时间、项目来源 ref、原 owner UUID、时区 Asia/Hong_Kong、逐表数量及 SHA-256 校验清单；`data` 包括当前所有业务表 goals / milestones / projects / activity_logs / achievements 的完整列，含 ID、关系、created_at/updated_at、metrics_json、project_id、related_project_id、sort_order 和 null。即使 projects 尚无 UI 也必须导出，避免关系断裂。没有行也写空数组。
2. **数据库逻辑备份**：管理员使用与服务端版本兼容的 PostgreSQL `pg_dump` custom 格式备份 public schema 的结构与业务数据，保留约束、索引、触发器、RLS。迁移源码另存。只导数据 JSON 不能恢复 RLS，只有数据库备份也不能代替可读可迁移档案。

JSON 容器约定（以下仅格式示意，绝无虚构成长记录）：

```json
{
  "format": "six-pillars-private",
  "schemaVersion": 1,
  "exportedAt": "<ISO-8601 UTC>",
  "source": { "projectRef": "<ref>", "ownerId": "<uuid>", "commit": "<sha>" },
  "timezone": "Asia/Hong_Kong",
  "migrations": ["20261015063209", "20261015063307"],
  "counts": { "goals": 0, "milestones": 0, "projects": 0, "activity_logs": 0, "achievements": 0 },
  "data": { "goals": [], "milestones": [], "projects": [], "activity_logs": [], "achievements": [] }
}
```

SHA-256 清单是单独文件，针对最终 UTF-8 JSON 与 dump 原始字节计算，避免自引用。它用于发现损坏，不提供真实性或保密性；需要防恶意篡改时另用签名/可信存储。

CSV 仅供阅读：每表一个文件、稳定英文列名、RFC4180 引号转义、日期保留 `YYYY-MM-DD`、时间保留 UTC、JSON 列用完整 JSON 字符串；导出给表格软件时对 `= + - @` 开头文本进行公式注入防护。CSV 不能准确区分所有 null/空字符串，**不能作为权威恢复来源**。

不得导出 auth.users 密码/哈希、JWT、session、一次性链接、SMTP secret、数据库密码。app_owners 不作为可自动恢复的账户授权；管理员在新项目重新核准本人。M1 没有图片上传，暂无 Storage 物件；将来引入图片需另备份私有文件原件与 manifest，数据库备份不含 Storage 文件本体。

## 导出一致性与分页

未来本人导出仍须 getUser 验证 + app_owners + RLS；每张表按唯一 ID 游标分批读取（本次 `all()` 已修复 UI 的 1,000 行截断），完整读完才生成文件。任意分页错误、中止、身份改变、重复 ID、关系断裂都不能提供“成功”下载。不要把访问 token 写进导出文件。

多次 API 查询不是跨表数据库快照，另一设备同时编辑会导致不一致；简单方案是在导出窗口停止所有设备写入，并在前后核对逐表数量、ID 集合和 updated_at。迁移/正式备份使用管理员 pg_dump 的一致性快照，不能把 UI 分页结果宣称为原子快照。若未来需要不停写导出，另设计受控服务器快照，当前不添加 RPC。

## 备份操作与保管

建议目标（尚未启用、须本人确认）：RPO ≤24 小时，RTO ≤1 个工作日。每日一份加密备份保留 14 天、每周保留 12 周、每月保留至少 36 个月；每次迁移、批量删除、正式发布前额外备份。涉及长期健康/生活数据，删除与保留周期由本人决定。

采用 3-2-1：工作库 + 本人加密磁盘副本 + 独立加密异地副本；加密密钥保存于密码管理器，恢复密钥另有本人可取的离线副本。不要放 Git、Pages、公开云盘或 Actions artifacts；`backups/` 已加入忽略，但实际保管应在仓库外。

管理员操作模板（不含连接信息；须在批准的本机终端手动运行，先 `pg_dump --help` 核对版本）：

```text
pg_dump --format=custom --schema=public --no-owner --no-privileges --file=<私人目录>/six-pillars-<UTC>.dump --dbname=<已安全配置的连接服务名>
pg_restore --list <私人目录>/six-pillars-<UTC>.dump
```

连接采用本机受控 PostgreSQL service / pgpass 或密码管理器，不把密码放命令行、Git 或截图。`--no-privileges` 的 dump 必须配套迁移中显式的 revoke/grant；不能在恢复后漏掉权限配置。此 public-only dump 不包含 Auth、托管平台配置、角色密码和 Storage 物件；新项目须单独重建认证配置，不能直接当成完整 Supabase 项目克隆。

当前 Free 项目不能被假定有可恢复的每日平台备份；[官方备份说明](https://supabase.com/docs/guides/platform/backups)建议 Free 定期导出并保留异地备份。Pro+ 每日保留、PITR、存储费用均需本人审批。若选择日常人工备份，必须明确“每日目标尚无自动保障”；若批准调度，采用私人受控环境并监控成功时间/校验和，不将生产秘密放公开仓库作业。

## 恢复与迁移演练（阻断上线的待验证项）

1. 在全新、隔离的 DEV 项目恢复，不覆盖原库。核对备份校验和、来源和格式版本；先只列内容，不执行未知来源 SQL。保留原备份只读副本。
2. 建立本人 Auth 身份，独立审核白名单；按版本顺序应用仓库迁移。若从 dump 恢复结构，不重复应用相同 CREATE，而应核对迁移版本并重新明确 revoke/grant、RLS/策略；不能用公共 schema 的数据备份恢复 Auth 密码。
3. 将 JSON / dump 数据装入隔离 staging，先验证数量、每行 ID 唯一、六种 pillar + 综合 null、日期/状态、排序、FK 与原 owner。未知 schemaVersion 先停止，转换需单独审查。不要关闭约束后直接灌入公共表。
4. 建立 `old_owner → new_owner` 映射。保留业务 UUID 与父子关系，仅将旧 owner_id 显式映射到新 Auth UUID；不可沿用来源 app_owners 自动授权。多 owner 数据须分开批准和导入，不能混入唯一本人档案。
5. 在事务中按 goals、projects → milestones、activity_logs、achievements 顺序导入；使用严格 insert，目标非空时先给冲突清单并停止，禁止不经确认 upsert/覆盖。成功前检查组合 FK、锁定日期为空、已点亮日期有效、排序/置顶、created_at/updated_at。必要的格式升级通过版本化转换完成，不静默丢列。
6. 比对各表 count、ID 集合、关键列/正文校验和及抽样关联；至少 1,505 条日志和 >1,000 条目标/成就的合成集合都应完整恢复。只需非敏感合成数据，不向公共站添加记录。
7. 运行真实 anon / owner / non-owner 直调 API 矩阵、登录与刷新、六项和综合成就的实际日期检查；非 owner 和匿名必须仍无私人行访问权。仅 count 正确不足以判定安全恢复。
8. 记录耗时、缺失/冲突、核对结果、RLS 结果、应用与迁移版本；失败回滚事务，保留原库和备份，修复后重演。本人确认全部通过后才切换生产 URL/key，保留旧库只读回退窗口；切换本身需要另行批准。

本轮新增的是设计与分页防护，**未实现一键导出/导入 UI，未执行数据库 dump / 迁移恢复，未建立调度**；不能在 QA 报告中将恢复标记通过。下一步只需按批准的最小备份方式演练，不涉及 M2 公开发布。
