import { achievementOrder, moveAchievement } from "./achievementOrder";
import { useEffect, useState, type FormEvent } from "react";
import type { PillarKey } from "../../types/content";
import { AchievementBadge } from "../../components/AchievementBadge";
import { add, all, erase, save, today, type Achievement } from "./data";
import {
  blankAchievement,
  PillarOptions,
  ErrorMessage,
  Loading,
  Empty,
  errorText,
  pillarName,
} from "./shared";
export function AchievementsAdmin() {
  const [items, setItems] = useState<Achievement[]>([]);
  const [draft, setDraft] = useState(blankAchievement);
  const [editing, setEditing] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  async function reload() {
    setItems(await all<Achievement>("achievements"));
  }
  useEffect(() => {
    let live = true;
    all<Achievement>("achievements")
      .then((x) => {
        if (live) {
          setItems(x);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (live) {
          setError(errorText(e));
          setLoading(false);
        }
      });
    return () => {
      live = false;
    };
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (draft.status === "unlocked" && !draft.unlocked_at) {
      setError("已点亮成就必须填写达成日期");
      return;
    }
    if (
      draft.status === "unlocked" &&
      draft.unlocked_at !== null &&
      draft.unlocked_at > today()
    ) {
      setError("达成日期不能在未来");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const data = {
        ...draft,
        unlocked_at: draft.status === "locked" ? null : draft.unlocked_at,
        related_url: draft.related_url || null,
        icon: draft.icon.trim() || "✦",
      };
      if (editing) await save("achievements", editing, data);
      else await add("achievements", data);
      setEditing(null);
      setDraft(blankAchievement());
      await reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function toggle(a: Achievement) {
    if (a.status === "locked") {
      setEditing(a.id);
      setDraft({
        pillar_key: a.pillar_key,
        title: a.title,
        description: a.description,
        icon: a.icon,
        status: "unlocked",
        unlocked_at: today(),
        notes: a.notes,
        is_highlight: a.is_highlight,
        sort_order: a.sort_order,
        related_url: a.related_url,
      });
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setError("");
    try {
      await save("achievements", a.id, { status: "locked", unlocked_at: null });
      await reload();
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function update(a: Achievement, changes: Record<string, unknown>) {
    setError("");
    try {
      await save("achievements", a.id, changes);
      await reload();
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function remove(id: string) {
    if (!window.confirm("永久删除这项私人成就？")) return;
    setError("");
    try {
      await erase("achievements", id);
      await reload();
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function move(a: Achievement, direction: -1 | 1) {
    const changes = moveAchievement(items, a.id, direction);
    if (!changes.length) return;
    setBusy(true);
    setError("");
    try {
      // Separate private-row updates; on a failed write reload the actual server order.
      for (const change of changes)
        await save("achievements", change.id, {
          sort_order: change.sort_order,
        });
    } catch (e) {
      setError(errorText(e));
    } finally {
      try {
        await reload();
      } catch (e) {
        setError(errorText(e));
      }
      setBusy(false);
    }
  }
  const years = [
    ...new Set(
      items.filter((x) => x.unlocked_at).map((x) => x.unlocked_at!.slice(0, 4)),
    ),
  ]
    .sort()
    .reverse();
  const shown = [...items]
    .filter(
      (x) =>
        (filter === "all" ||
          (filter === "composite"
            ? x.pillar_key === null
            : x.pillar_key === filter)) &&
        (statusFilter === "all" || x.status === statusFilter) &&
        (yearFilter === "all" ||
          (yearFilter === "none"
            ? x.unlocked_at === null
            : x.unlocked_at?.startsWith(yearFilter))),
    )
    .sort(achievementOrder);
  return (
    <section>
      <h2>我的成就</h2>
      <p>自由收藏值得纪念的瞬间。所有记录默认私密，M1 不支持公开发布。</p>
      <ErrorMessage message={error} />
      <form className="private-panel private-form" onSubmit={submit}>
        <h3>{editing ? "编辑成就" : "创造一枚成就"}</h3>
        <div className="private-form-grid">
          <label>
            归属能力
            <select
              value={draft.pillar_key ?? ""}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  pillar_key:
                    e.target.value === ""
                      ? null
                      : (e.target.value as PillarKey),
                })
              }
            >
              <PillarOptions composite />
            </select>
          </label>
          <label>
            徽章图标
            <input
              maxLength={32}
              value={draft.icon}
              onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
            />
          </label>
        </div>
        <label>
          成就名称
          <input
            required
            maxLength={160}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>
        <label>
          简介
          <textarea
            rows={2}
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
          />
        </label>
        <div className="private-form-grid">
          <label>
            点亮状态
            <select
              value={draft.status}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  status: e.target.value as Achievement["status"],
                  unlocked_at:
                    e.target.value === "locked"
                      ? null
                      : (draft.unlocked_at ?? today()),
                })
              }
            >
              <option value="locked">未点亮</option>
              <option value="unlocked">已点亮</option>
            </select>
          </label>
          {draft.status === "unlocked" && (
            <label>
              达成日期
              <input
                type="date"
                required
                max={today()}
                value={draft.unlocked_at ?? ""}
                onChange={(e) =>
                  setDraft({ ...draft, unlocked_at: e.target.value })
                }
              />
            </label>
          )}
        </div>
        <label>
          私人感想
          <textarea
            rows={3}
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
          />
        </label>
        <label>
          成果链接（可选）
          <input
            type="url"
            value={draft.related_url ?? ""}
            onChange={(e) =>
              setDraft({ ...draft, related_url: e.target.value || null })
            }
          />
        </label>
        <div className="private-form-grid">
          <label>
            自定义顺序
            <input
              type="number"
              step="1"
              value={draft.sort_order}
              onChange={(e) =>
                setDraft({ ...draft, sort_order: Number(e.target.value) })
              }
            />
          </label>
          <label className="private-check">
            <input
              type="checkbox"
              checked={draft.is_highlight}
              onChange={(e) =>
                setDraft({ ...draft, is_highlight: e.target.checked })
              }
            />{" "}
            私人置顶
          </label>
        </div>
        <div className="private-actions">
          <button type="submit" className="private-primary" disabled={busy}>
            {editing ? "保存成就" : "添加成就"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setDraft(blankAchievement());
              }}
            >
              取消编辑
            </button>
          )}
        </div>
      </form>
      <div className="private-list-head">
        <h3>成就收藏</h3>
        <div className="private-filters">
          <label>
            能力
            <select value={filter} onChange={(e) => setFilter(e.target.value)}>
              <option value="all">全部</option>
              <option value="composite">综合</option>
              <PillarOptions />
            </select>
          </label>
          <label>
            状态
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">全部</option>
              <option value="locked">未点亮</option>
              <option value="unlocked">已点亮</option>
            </select>
          </label>
          <label>
            达成年份
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
            >
              <option value="all">全部</option>
              <option value="none">无达成日期</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : shown.length === 0 ? (
        <Empty label="没有符合条件的成就。" />
      ) : (
        <div className="private-list">
          {shown.map((a) => (
            <article className="private-item private-achievement" key={a.id}>
              <AchievementBadge status={a.status} icon={a.icon} />
              <div>
                <div className="private-item-head">
                  <h4>{a.title}</h4>
                  <span>
                    {pillarName(a.pillar_key)}
                    {a.is_highlight ? " · 置顶" : ""}
                  </span>
                </div>
                <p>{a.description}</p>
                <small>
                  {a.unlocked_at ? `点亮于 ${a.unlocked_at}` : "等待点亮"} ·
                  顺序 {a.sort_order}
                </small>
                <div className="private-actions">
                  <button type="button" onClick={() => void toggle(a)}>
                    {a.status === "locked" ? "点亮" : "撤销点亮"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      void update(a, { is_highlight: !a.is_highlight })
                    }
                  >
                    {a.is_highlight ? "取消置顶" : "置顶"}
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void move(a, -1)}
                  >
                    上移
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void move(a, 1)}
                  >
                    下移
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(a.id);
                      setDraft({
                        pillar_key: a.pillar_key,
                        title: a.title,
                        description: a.description,
                        icon: a.icon,
                        status: a.status,
                        unlocked_at: a.unlocked_at,
                        notes: a.notes,
                        is_highlight: a.is_highlight,
                        sort_order: a.sort_order,
                        related_url: a.related_url,
                      });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    编辑
                  </button>
                  <button type="button" onClick={() => void remove(a.id)}>
                    删除
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
