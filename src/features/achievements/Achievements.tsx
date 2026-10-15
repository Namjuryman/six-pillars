import { useState } from "react";
import { Link } from "react-router-dom";
import { AchievementBadge } from "../../components/AchievementBadge";
import { PageIntro } from "../../components/PublicUI";
import { getPillar } from "../../config/pillars";
import type { AchievementPresentation } from "../../types/achievements";

// M0 has no published achievements. Never import private achievement data here.
export const publicAchievements: readonly AchievementPresentation[] = [];

export function AchievementCard({
  achievement,
}: {
  achievement: AchievementPresentation;
}) {
  return (
    <details className="achievement-card">
      <summary>
        <AchievementBadge status={achievement.status} icon={achievement.icon} />
        <span className="achievement-card__heading">
          <span>
            {achievement.pillar
              ? getPillar(achievement.pillar)?.name
              : "综合成就"}
          </span>
          <strong>{achievement.title}</strong>
          <span>
            查看详情 <span aria-hidden="true">＋</span>
          </span>
        </span>
      </summary>
      <div className="achievement-card__detail">
        <p>{achievement.description}</p>
        <p className="muted">
          {achievement.status === "unlocked" ? (
            <>
              达成日期：
              <time dateTime={achievement.unlockedAt}>
                {achievement.unlockedAt}
              </time>
            </>
          ) : (
            "尚未点亮 · 暂无达成日期"
          )}
        </p>
      </div>
    </details>
  );
}

export function Achievements() {
  const [view, setView] = useState<"wall" | "timeline">("wall");

  return (
    <>
      <PageIntro
        title="值得纪念的，都有自己的光。"
        description="收藏六项能力与生活中的珍贵成果。每一枚成就都由自己定义，让值得记住的时刻，留下位置。"
      />
      <div className="achievement-toolbar">
        <div
          className="filters achievement-view-switch"
          role="group"
          aria-label="成就展示方式"
        >
          <button
            aria-pressed={view === "wall"}
            onClick={() => setView("wall")}
          >
            徽章墙
          </button>
          <button
            aria-pressed={view === "timeline"}
            onClick={() => setView("timeline")}
          >
            时间线
          </button>
        </div>
        <div className="achievement-legend" aria-label="徽章状态图例">
          <span>状态图例</span>
          <AchievementBadge status="unlocked" />
          <AchievementBadge status="locked" />
        </div>
      </div>
      <section
        aria-label={view === "wall" ? "公开成就徽章墙" : "公开成就时间线"}
      >
        {publicAchievements.length === 0 ? (
          <div className={`achievement-empty achievement-empty--${view}`}>
            <span className="achievement-empty__mark" aria-hidden="true">
              ✧
            </span>
            <h2>
              {view === "wall"
                ? "成就墙，静候值得纪念的时刻。"
                : "时间线，等待第一个公开的时刻。"}
            </h2>
            <p>目前还没有公开成就。这里仅展示明确发布的内容。</p>
            <Link className="text-link" to="/pillars">
              认识六大能力 <span aria-hidden="true">→</span>
            </Link>
          </div>
        ) : (
          <div
            className={`achievement-collection achievement-collection--${view}`}
          >
            {publicAchievements.map((achievement) => (
              <AchievementCard key={achievement.id} achievement={achievement} />
            ))}
          </div>
        )}
      </section>
      <aside className="principle-block">
        <h2>为自己纪念，按自己的节奏。</h2>
        <p>
          成就可以属于任何一项能力，也可以来自生活本身。它不是第七项能力，不要求连续打卡，也不把成长换算成积分。
        </p>
      </aside>
    </>
  );
}
