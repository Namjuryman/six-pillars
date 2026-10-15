import { pillars } from "../../config/pillars";
import type { PillarKey } from "../../types/content";
import { today, type Goal, type ActivityLog, type Achievement } from "./data";
export const pillarName = (key: PillarKey | null) =>
  pillars.find((p) => p.key === key)?.name ?? "综合";
export const errorText = (error: unknown) =>
  error instanceof Error ? error.message : "操作失败，请稍后重试";
export const blankGoal = (): Omit<Goal, "id"> => ({
  pillar_key: "analog_ic",
  scope: "year",
  title: "",
  description: "",
  success_criteria: "",
  start_on: today(),
  due_on: "2027-09-30",
  status: "planned",
});
export const blankLog = (): Omit<ActivityLog, "id"> => ({
  pillar_key: "ai",
  activity_on: today(),
  title: "",
  duration_minutes: null,
  note: "",
});
export const blankAchievement = (): Omit<Achievement, "id"> => ({
  pillar_key: null,
  title: "",
  description: "",
  icon: "✦",
  status: "locked",
  unlocked_at: null,
  notes: "",
  is_highlight: false,
  sort_order: 0,
  related_url: null,
});
export const scopes = {
  three_year: "三年",
  year: "年度",
  quarter: "季度",
} as const;
export const goalStatuses = {
  planned: "计划中",
  active: "进行中",
  completed: "已完成",
  paused: "暂停",
  archived: "归档",
} as const;
export function PillarOptions({ composite = false }: { composite?: boolean }) {
  return (
    <>
      {composite && <option value="">综合成就</option>}
      {pillars.map((p) => (
        <option key={p.key} value={p.key}>
          {p.name}
        </option>
      ))}
    </>
  );
}
export function ErrorMessage({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="private-error">
      {message}
    </p>
  ) : null;
}
export function Loading() {
  return <p role="status">正在读取私密记录…</p>;
}
export function Empty({ label }: { label: string }) {
  return <p className="private-empty">{label}</p>;
}
