import { useEffect, useState, type FormEvent } from "react";
import type { PillarKey } from "../../types/content";
import {
  add,
  all,
  erase,
  save,
  today,
  type Goal,
  type Milestone,
} from "./data";
import {
  blankGoal,
  scopes,
  goalStatuses,
  PillarOptions,
  ErrorMessage,
  Loading,
  Empty,
  errorText,
  pillarName,
} from "./shared";
export function GoalsAdmin() {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [draft, setDraft] = useState(blankGoal);
  const [editing, setEditing] = useState<string | null>(null);
  const [mileGoal, setMileGoal] = useState("");
  const [mileTitle, setMileTitle] = useState("");
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  async function reload() {
    const [g, m] = await Promise.all([
      all<Goal>("goals"),
      all<Milestone>("milestones"),
    ]);
    setGoals(g);
    setMilestones(m);
  }
  useEffect(() => {
    let live = true;
    Promise.all([all<Goal>("goals"), all<Milestone>("milestones")])
      .then(([g, m]) => {
        if (live) {
          setGoals(g);
          setMilestones(m);
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
    if (draft.start_on > draft.due_on) {
      setError("开始日期不能晚于截止日期");
      return;
    }
    setBusy(true);
    setError("");
    try {
      if (editing) await save("goals", editing, draft);
      else await add("goals", draft);
      setDraft(blankGoal());
      setEditing(null);
      await reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (!window.confirm("删除目标会同时删除关联的里程碑。确定删除？")) return;
    setError("");
    try {
      await erase("goals", id);
      await reload();
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function createMilestone(event: FormEvent) {
    event.preventDefault();
    if (!mileGoal || !mileTitle.trim()) return;
    setError("");
    try {
      await add("milestones", { goal_id: mileGoal, title: mileTitle.trim() });
      setMileTitle("");
      await reload();
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function renameMilestone(m: Milestone) {
    const title = window.prompt("修改里程碑名称", m.title);
    if (!title?.trim()) return;
    setError("");
    try {
      await save("milestones", m.id, { title: title.trim() });
      await reload();
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function switchMilestone(m: Milestone) {
    setError("");
    try {
      await save("milestones", m.id, {
        status: m.status === "done" ? "todo" : "done",
        completed_on: m.status === "done" ? null : today(),
      });
      await reload();
    } catch (e) {
      setError(errorText(e));
    }
  }
  async function removeMilestone(id: string) {
    if (!window.confirm("确定删除这个里程碑？")) return;
    setError("");
    try {
      await erase("milestones", id);
      await reload();
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <section>
      <h2>目标与里程碑</h2>
      <p>保留六项独立目标；阶段性只需重点突破一到两个方向。</p>
      <ErrorMessage message={error} />
      <form className="private-panel private-form" onSubmit={submit}>
        <h3>{editing ? "编辑目标" : "创建目标"}</h3>
        <div className="private-form-grid">
          <label>
            所属能力
            <select
              value={draft.pillar_key}
              onChange={(e) =>
                setDraft({ ...draft, pillar_key: e.target.value as PillarKey })
              }
            >
              <PillarOptions />
            </select>
          </label>
          <label>
            规划层级
            <select
              value={draft.scope}
              onChange={(e) =>
                setDraft({ ...draft, scope: e.target.value as Goal["scope"] })
              }
            >
              {Object.entries(scopes).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          <label>
            开始日期
            <input
              type="date"
              required
              value={draft.start_on}
              onChange={(e) => setDraft({ ...draft, start_on: e.target.value })}
            />
          </label>
          <label>
            截止日期
            <input
              type="date"
              required
              value={draft.due_on}
              onChange={(e) => setDraft({ ...draft, due_on: e.target.value })}
            />
          </label>
        </div>
        <label>
          目标名称
          <input
            required
            maxLength={160}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>
        <label>
          为什么要做
          <textarea
            rows={2}
            value={draft.description}
            onChange={(e) =>
              setDraft({ ...draft, description: e.target.value })
            }
          />
        </label>
        <label>
          怎样证明完成
          <textarea
            rows={2}
            value={draft.success_criteria}
            onChange={(e) =>
              setDraft({ ...draft, success_criteria: e.target.value })
            }
          />
        </label>
        <label>
          状态
          <select
            value={draft.status}
            onChange={(e) =>
              setDraft({ ...draft, status: e.target.value as Goal["status"] })
            }
          >
            {Object.entries(goalStatuses).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <div className="private-actions">
          <button type="submit" disabled={busy} className="private-primary">
            {editing ? "保存修改" : "添加目标"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setDraft(blankGoal());
              }}
            >
              取消编辑
            </button>
          )}
        </div>
      </form>
      <div className="private-list-head">
        <h3>已有目标</h3>
        <label>
          能力筛选
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">全部能力</option>
            <PillarOptions />
          </select>
        </label>
      </div>
      {loading ? (
        <Loading />
      ) : goals.filter((g) => filter === "all" || g.pillar_key === filter)
          .length === 0 ? (
        <Empty label="尚无符合条件的目标。" />
      ) : (
        <div className="private-list">
          {goals
            .filter((g) => filter === "all" || g.pillar_key === filter)
            .map((g) => (
              <article className="private-item" key={g.id}>
                <div className="private-item-head">
                  <h4>{g.title}</h4>
                  <span>
                    {pillarName(g.pillar_key)} · {scopes[g.scope]} ·{" "}
                    {goalStatuses[g.status]}
                  </span>
                </div>
                <p>{g.success_criteria || "尚未填写完成标准"}</p>
                <small>
                  {g.start_on} — {g.due_on}
                </small>
                <div className="private-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setDraft({
                        pillar_key: g.pillar_key,
                        scope: g.scope,
                        title: g.title,
                        description: g.description,
                        success_criteria: g.success_criteria,
                        start_on: g.start_on,
                        due_on: g.due_on,
                        status: g.status,
                      });
                      setEditing(g.id);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    编辑
                  </button>
                  <button type="button" onClick={() => void remove(g.id)}>
                    删除
                  </button>
                </div>
                <ul className="private-milestones">
                  {milestones
                    .filter((m) => m.goal_id === g.id)
                    .map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          aria-label={`${m.status === "done" ? "撤销完成" : "标记完成"}：${m.title}`}
                          onClick={() => void switchMilestone(m)}
                        >
                          {m.status === "done" ? "✓" : "○"}
                        </button>
                        <span>{m.title}</span>
                        <button
                          type="button"
                          onClick={() => void renameMilestone(m)}
                          aria-label={`编辑里程碑：${m.title}`}
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => void removeMilestone(m.id)}
                          aria-label={`删除里程碑：${m.title}`}
                        >
                          ×
                        </button>
                      </li>
                    ))}
                </ul>
              </article>
            ))}
        </div>
      )}
      {goals.length > 0 && (
        <form onSubmit={createMilestone} className="private-panel private-form">
          <h3>添加里程碑</h3>
          <label>
            归属目标
            <select
              required
              value={mileGoal}
              onChange={(e) => setMileGoal(e.target.value)}
            >
              <option value="">请选择目标</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          </label>
          <label>
            里程碑名称
            <input
              required
              maxLength={160}
              value={mileTitle}
              onChange={(e) => setMileTitle(e.target.value)}
            />
          </label>
          <button type="submit" className="private-primary">
            添加里程碑
          </button>
        </form>
      )}
    </section>
  );
}
