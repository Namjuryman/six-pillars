# Achievements · 成就系统设计 v1.0

更新：2026-10-15。正式产品模块；当前仅实施 M0。后端 SQL 是设计提案，未部署、未执行 RLS 测试。

## 定位与信息架构

收藏值得纪念的个人成果，允许自由定义名称与图标，不强制预设模板、连续打卡、积分或等级。六能力固定不变，综合成就用空 `pillar_key` 表示。AI 仍为独立第二专业。

公开：`/#/achievements`，导航名称“成就”。徽章墙与时间线可切换；彩色表示已点亮、灰色表示未点亮，同时有可读状态文字，避免只依赖颜色。卡片用可键盘展开的详情展示描述、日期、感想、公开成果。时间线按实际达成日期降序；未点亮无年份，置于“尚未点亮”区域；排序相同以稳定 ID 决定。置顶区域可独立于时间线展示，不能篡改真实日期顺序。

私人：`/#/admin/achievements`（M1），自由创建/编辑/删除、点亮/撤销、排序与置顶。筛选支持六能力、综合、年份和状态；无达成日期的未点亮记录通过“无达成日期”过滤，而不是伪造年份。

M0 当前公开集合为空；没有任何真实成就或占位的个人记录。两种徽章仅在“状态图例”中展示，不是假记录。没有新增、点亮或发布按钮。M0 暂不做无内容的筛选工具；M1 私人筛选和 M2 公开筛选随真实数据实现。

## 状态与编辑

| 操作 | 结果 |
| --- | --- |
| 新建未点亮 | `status = locked`, `unlocked_at = null` |
| 直接新建已点亮 | `status = unlocked`，必须填写实际达成日期 |
| 手动点亮 | 写入已点亮状态与日期，二者同一事务提交 |
| 更正日期/说明 | 保持已点亮，允许填写历史达成日期 |
| 撤销点亮 | 改回未点亮，并清空达成日期 |
| 删除私人记录 | 私人数据删除；已发布快照独立存在，须提示是否另行撤回 |

日期采用 PostgreSQL `date`，前端用 `YYYY-MM-DD` 原样显示，不转换为 UTC 时间戳；界面按本人设置时区判断“今天”，数据库触发器按 Asia/Hong_Kong 做最终的未来日期校验。达成日期可早于记录创建日期；不能晚于今天。未来若支持时区偏好，需一并修改数据库校验。

## 数据模型（提案）

| 字段 | 类型 / 规则 |
| --- | --- |
| id / owner_id | UUID；owner 关联 auth.users，且受 app_owners 白名单约束 |
| pillar_key | 固定六项之一或 NULL；NULL 表示综合 |
| title | 必填自由文本，trim 后 1–160 字符 |
| description / notes | 文本；描述与私人感想，绝不自动发布 |
| icon | 自定义短文本/emoji（1–32 字符），不接收 HTML 或脚本 |
| status | `locked` / `unlocked`；默认 locked |
| unlocked_at | date；locked 必须 NULL，unlocked 必须有日期且不为未来 |
| related_project_id | 可为空；与 owner_id 组合外键，禁止跨账户关联 |
| related_url | 可选 http(s) 成果链接；协议、URL 与公开内容另行审核 |
| is_highlight / sort_order | 私人置顶标记 / 整数手动排序值；默认 false / 0 |
| image_paths | 私有 bucket 对象路径数组，默认空；不是公开 URL 或永久签名 URL |
| created_at / updated_at | timestamptz；updated_at 由触发器维护 |

`related_project_id` 删除关联项目时只清空关联，不删除成就。照片数量/格式/大小及对象路径所有权须在附件实现时校验；仅有数组字段不等于已实现上传。

## 安全与公开快照

1. 私人 achievements 启用 RLS，显式撤销 anon 权限；authenticated 仅在 `owner_id = auth.uid()` 且为 app_owners 中的 owner 时读写。没有 is_public 开关，也没有公开私人成就的视图。
2. M2 发布流程：选择私人记录 → **单独编辑公开内容**（不得默认复制 notes、私人项目 ID 或图片）→ 检查隐私 → 预览 → 明确确认 → 保存独立 `public_entries` 快照。仅 `published` 且发布时间已到才可查询。
3. `public_entries.kind` 增加 `achievement`；`achievement_snapshot` JSON 存公开的状态、达成日期、icon 与 sort_order。标题/描述/公开感想使用 title、summary、body_md；公开置顶使用 featured。不要把私人 owner/project 对象展开到快照。
4. 私人记录修改、撤销点亮和删除均不自动改变公开快照；需要提示快照仍存在，可单独编辑重发或撤回。撤回把 public_entries.status 改为 withdrawn，公开 API 不再返回；前端使缓存失效。已被他人保存的内容无法保证召回。
5. 原图在私人 Storage bucket 中，路径以 owner UUID 分隔；对象级 RLS 验证 owner。M0/M1 本轮不实施上传。将来明确批准公开的图片须另建经过审核的公开副本，不能把私人原图 URL 或短期签名链接写入公开快照；公开媒体的读取/撤回策略另行设计，完成前成就发布限文字/图标。

安全设计依据：[Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security)、[Storage 访问控制](https://supabase.com/docs/guides/storage/security/access-control)。策略未执行前不能声称安全验证通过。

## 分阶段计划与验收

- M0：静态公开页、徽章组件、墙/时间线及空状态、导航与响应式测试；零虚构个人成就，零后台或数据库连接。
- M1：自由创建（含直接已点亮）、编辑、点亮/撤销、删除、排序、私人置顶、三维筛选与持久化。三身份 API 测试覆盖所有 CRUD；跨 owner 项目 FK、日期/状态非法组合应拒绝；刷新及跨设备数据一致。
- M2：公开快照、独立编辑与预览、发布、公开置顶/排序、撤回、公开筛选。匿名无法读取 achievements 或 public_entries 草稿；撤回后直调 API 与页面均不可见；发布不泄露未点亮私人记录与 notes；JSON/CSV 导出包含成就。
- 图片：保留模型与明确安全约束，实际上传按附件里程碑独立实施；不要因图标字段提前创建 Storage 或上传端点。

最终成就验收需覆盖所有六能力与综合成就、合法日期、点亮/撤销、直接创建已达成、自由文本命名、排序/置顶、三身份授权与发布撤回。此清单不是 M0 的已完成功能。
