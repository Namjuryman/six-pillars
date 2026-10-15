import { expect, test } from "vitest";
import { achievementOrder, moveAchievement } from "./achievementOrder";
import type { Achievement } from "./data";
test("one step reordering handles tied ranks and preserves private pin groups", () => {
  const rows = ["a", "b", "c"].map(
    (id) =>
      ({ id, title: id, sort_order: 0, is_highlight: false }) as Achievement,
  );
  rows.push({
    id: "pin",
    title: "pin",
    sort_order: 0,
    is_highlight: true,
  } as Achievement);
  for (const change of moveAchievement(rows, "c", -1))
    Object.assign(rows.find((x) => x.id === change.id)!, change);
  expect(rows.sort(achievementOrder).map((x) => x.id)).toEqual([
    "pin",
    "a",
    "c",
    "b",
  ]);
  expect(moveAchievement(rows, "pin", 1)).toEqual([]);
  expect(moveAchievement(rows, "a", -1)).toEqual([]);
});
