import type { Achievement } from "./data";
export const achievementOrder = (a: Achievement, b: Achievement) =>
  Number(b.is_highlight) - Number(a.is_highlight) ||
  a.sort_order - b.sort_order ||
  a.title.localeCompare(b.title) ||
  a.id.localeCompare(b.id);
export function moveAchievement(
  items: Achievement[],
  id: string,
  direction: -1 | 1,
) {
  const item = items.find((x) => x.id === id);
  if (!item) return [];
  const group = items
    .filter((x) => x.is_highlight === item.is_highlight)
    .sort(achievementOrder);
  const index = group.findIndex((x) => x.id === id),
    next = index + direction;
  if (next < 0 || next >= group.length) return [];
  [group[index], group[next]] = [group[next], group[index]];
  return group
    .map((row, i) => ({ id: row.id, sort_order: i * 10 }))
    .filter(
      (change) =>
        items.find((row) => row.id === change.id)!.sort_order !==
        change.sort_order,
    );
}
