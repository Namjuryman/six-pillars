import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { all, type Goal, type ActivityLog, type Achievement } from "./data";
import { ErrorMessage, Loading, errorText } from "./shared";
export function AdminOverview() {
  const [counts, setCounts] = useState<[number, number, number] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    Promise.all([
      all<Goal>("goals"),
      all<ActivityLog>("activity_logs"),
      all<Achievement>("achievements"),
    ])
      .then(([g, l, a]) => {
        if (live)
          setCounts([
            g.length,
            l.length,
            a.filter((x) => x.status === "unlocked").length,
          ]);
      })
      .catch((e) => {
        if (live) setError(errorText(e));
      });
    return () => {
      live = false;
    };
  }, []);
  return (
    <section>
      <h2>我的工作台</h2>
      <p>计划、实践、成就——记录真实发生的事，不用统一分数衡量成长。</p>
      <ErrorMessage message={error} />
      {!counts && !error ? (
        <Loading />
      ) : (
        counts && (
          <div className="private-stats">
            <Link to="/admin/goals">
              <strong>{counts[0]}</strong>
              <span>已创建目标</span>
            </Link>
            <Link to="/admin/logs">
              <strong>{counts[1]}</strong>
              <span>活动记录</span>
            </Link>
            <Link to="/admin/achievements">
              <strong>{counts[2]}</strong>
              <span>已点亮成就</span>
            </Link>
          </div>
        )
      )}
      <div className="private-panel">
        <h3>第一步建议</h3>
        <p>
          从六项中先录入一个年度目标，再为它添加可验证的里程碑；成就既可以预先设定，也可以直接记录过去已经完成的事情。
        </p>
      </div>
    </section>
  );
}
