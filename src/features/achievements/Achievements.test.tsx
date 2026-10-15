import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { AchievementBadge } from "../../components/AchievementBadge";
import {
  AchievementCard,
  Achievements,
  publicAchievements,
} from "./Achievements";
import type { AchievementPresentation } from "../../types/achievements";

describe("M0 achievement display", () => {
  it("has no fabricated or private achievements in the public collection", () => {
    expect(publicAchievements).toEqual([]);
    const html = renderToStaticMarkup(
      <MemoryRouter>
        <Achievements />
      </MemoryRouter>,
    );
    expect(html).toContain("目前还没有公开成就");
    expect(html).not.toContain("<details");
    expect(html).not.toContain("创建成就");
  });

  it.each(["locked", "unlocked"] as const)(
    "labels %s without relying on color",
    (status) => {
      const html = renderToStaticMarkup(
        <AchievementBadge status={status} icon="☆" />,
      );
      expect(html).toContain(status === "unlocked" ? "已点亮" : "未点亮");
      expect(html).toContain(`achievement-badge--${status}`);
      expect(html).toContain('aria-hidden="true"');
    },
  );

  it("renders free-text names and calendar dates in a native keyboard disclosure", () => {
    const fixture: AchievementPresentation = {
      id: "component-fixture-only",
      title: "<script>test</script>",
      icon: "☆",
      description: "组件测试专用，不是公开个人成就",
      pillar: "ai",
      status: "unlocked",
      unlockedAt: "2026-10-01",
    };
    const html = renderToStaticMarkup(
      <AchievementCard achievement={fixture} />,
    );
    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    expect(html).toContain("AI 第二专业");
    expect(html).toContain('dateTime="2026-10-01"');
    expect(html).toContain("&lt;script&gt;test&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("supports comprehensive locked achievements without inventing a date", () => {
    const html = renderToStaticMarkup(
      <AchievementCard
        achievement={{
          id: "locked-test-only",
          title: "自由定义测试",
          icon: "✦",
          description: "测试用例",
          pillar: null,
          status: "locked",
          unlockedAt: null,
        }}
      />,
    );
    expect(html).toContain("综合成就");
    expect(html).toContain("暂无达成日期");
    expect(html).not.toContain("<time");
  });
});
