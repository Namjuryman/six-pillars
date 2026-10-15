import { useEffect, useState, type FormEvent } from "react";
import type { PillarKey } from "../../types/content";
import { add, all, erase, save, type ActivityLog } from "./data";
import {
  blankLog,
  PillarOptions,
  ErrorMessage,
  Loading,
  Empty,
  errorText,
  pillarName,
} from "./shared";
export function LogsAdmin() {
  const [items, setItems] = useState<ActivityLog[]>([]);
  const [draft, setDraft] = useState(blankLog);
  const [editing, setEditing] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  async function reload() {
    setItems(await all<ActivityLog>("activity_logs"));
  }
  useEffect(() => {
    let live = true;
    all<ActivityLog>("activity_logs")
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
    setBusy(true);
    setError("");
    try {
      const data = {
        ...draft,
        duration_minutes:
          draft.duration_minutes === null
            ? null
            : Number(draft.duration_minutes),
      };
      if (editing) await save("activity_logs", editing, data);
      else await add("activity_logs", data);
      setDraft(blankLog());
      setEditing(null);
      await reload();
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  async function remove(id: string) {
    if (!window.confirm("删除这条活动记录？")) return;
    setError("");
    try {
      await erase("activity_logs", id);
      await reload();
    } catch (e) {
      setError(errorText(e));
    }
  }
  return (
    <section>
      <h2>活动日志</h2>
      <p>不需要每天六项都打卡，只记录值得保留的真实实践。</p>
      <ErrorMessage message={error} />
      <form onSubmit={submit} className="private-panel private-form">
        <h3>{editing ? "编辑日志" : "添加一条记录"}</h3>
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
            发生日期
            <input
              type="date"
              required
              value={draft.activity_on}
              onChange={(e) =>
                setDraft({ ...draft, activity_on: e.target.value })
              }
            />
          </label>
        </div>
        <label>
          标题
          <input
            required
            maxLength={160}
            value={draft.title}
            onChange={(e) => setDraft({ ...draft, title: e.target.value })}
          />
        </label>
        <label>
          投入时间（分钟，可空）
          <input
            type="number"
            min="0"
            step="1"
            value={draft.duration_minutes ?? ""}
            onChange={(e) =>
              setDraft({
                ...draft,
                duration_minutes:
                  e.target.value === "" ? null : Number(e.target.value),
              })
            }
          />
        </label>
        <label>
          过程与感想
          <textarea
            rows={4}
            value={draft.note}
            onChange={(e) => setDraft({ ...draft, note: e.target.value })}
          />
        </label>
        <div className="private-actions">
          <button type="submit" disabled={busy} className="private-primary">
            {editing ? "保存修改" : "保存记录"}
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setDraft(blankLog());
              }}
            >
              取消编辑
            </button>
          )}
        </div>
      </form>
      <div className="private-list-head">
        <h3>最近记录</h3>
        <label>
          能力筛选
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            <option value="all">全部能力</option>
            <PillarOptions />
          </select>
        </label>
        <label>
          指定日期
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </label>
      </div>
      {loading ? (
        <Loading />
      ) : items.filter(
          (x) =>
            (filter === "all" || x.pillar_key === filter) &&
            (!dateFilter || x.activity_on === dateFilter),
        ).length === 0 ? (
        <Empty label="还没有符合条件的活动记录。" />
      ) : (
        <div className="private-list">
          {[...items]
            .filter(
              (x) =>
                (filter === "all" || x.pillar_key === filter) &&
                (!dateFilter || x.activity_on === dateFilter),
            )
            .sort((a, b) => b.activity_on.localeCompare(a.activity_on))
            .map((x) => (
              <article key={x.id} className="private-item">
                <div className="private-item-head">
                  <h4>{x.title}</h4>
                  <span>
                    {pillarName(x.pillar_key)} · {x.activity_on}
                  </span>
                </div>
                <p>{x.note}</p>
                {x.duration_minutes !== null && (
                  <small>记录时长：{x.duration_minutes} 分钟</small>
                )}
                <div className="private-actions">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(x.id);
                      setDraft({
                        pillar_key: x.pillar_key,
                        activity_on: x.activity_on,
                        title: x.title,
                        duration_minutes: x.duration_minutes,
                        note: x.note,
                      });
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                  >
                    编辑
                  </button>
                  <button type="button" onClick={() => void remove(x.id)}>
                    删除
                  </button>
                </div>
              </article>
            ))}
        </div>
      )}
    </section>
  );
}
