import { client, currentUserId } from "../../lib/privateApi";
import type { PillarKey } from "../../types/content";
export type Goal = {
  id: string;
  pillar_key: PillarKey;
  scope: "three_year" | "year" | "quarter";
  title: string;
  description: string;
  success_criteria: string;
  start_on: string;
  due_on: string;
  status: "planned" | "active" | "completed" | "paused" | "archived";
};
export type Milestone = {
  id: string;
  goal_id: string;
  title: string;
  detail: string;
  due_on: string | null;
  completed_on: string | null;
  status: "todo" | "doing" | "done" | "cancelled";
  evidence_url: string | null;
};
export type ActivityLog = {
  id: string;
  pillar_key: PillarKey;
  activity_on: string;
  title: string;
  duration_minutes: number | null;
  note: string;
};
export type Achievement = {
  id: string;
  pillar_key: PillarKey | null;
  title: string;
  description: string;
  icon: string;
  status: "locked" | "unlocked";
  unlocked_at: string | null;
  notes: string;
  is_highlight: boolean;
  sort_order: number;
  related_url: string | null;
};
export type Table = "goals" | "milestones" | "activity_logs" | "achievements";
// UI owner filters are defense in depth; PostgreSQL RLS is the authorization boundary.
function writable(record: Record<string, unknown>) {
  const copy = { ...record };
  for (const key of ["id", "owner_id", "created_at", "updated_at"])
    delete copy[key];
  return copy;
}
function fail(error: unknown) {
  if (error) throw new Error("数据操作失败，请检查权限、输入或网络后重试");
}
export async function all<T>(table: Table): Promise<T[]> {
  const owner = await currentUserId();
  type Row = { id: string; created_at: string };
  const rows: Row[] = [];
  let cursor: string | undefined;
  // UUID keyset pagination avoids offset shifts when other tabs delete rows.
  // Continue until EMPTY, even if the server caps pages below our requested 500.
  for (;;) {
    let query = client()
      .from(table)
      .select("*")
      .eq("owner_id", owner)
      .order("id", { ascending: true })
      .limit(500);
    if (cursor) query = query.gt("id", cursor);
    const { data, error } = await query;
    fail(error);
    if (!data) throw new Error("读取未返回记录");
    if (data.length === 0) break;
    const page = data as Row[];
    let previous = cursor;
    for (const row of page) {
      if (!row.id || (previous !== undefined && row.id <= previous))
        throw new Error("分页读取顺序异常，请刷新重试");
      previous = row.id;
    }
    rows.push(...page);
    cursor = previous;
  }
  // Preserve the existing newest-first UI; UUID is the deterministic tie breaker.
  rows.sort(
    (a, b) =>
      b.created_at.localeCompare(a.created_at) || b.id.localeCompare(a.id),
  );
  return rows as T[];
}
export async function add<T>(
  table: Table,
  record: Record<string, unknown>,
): Promise<T> {
  const owner = await currentUserId();
  const { data, error } = await client()
    .from(table)
    .insert({ ...writable(record), owner_id: owner })
    .select()
    .single();
  fail(error);
  if (!data) throw new Error("写入未返回记录");
  return data as T;
}
export async function save<T>(
  table: Table,
  id: string,
  record: Record<string, unknown>,
): Promise<T> {
  const owner = await currentUserId();
  const { data, error } = await client()
    .from(table)
    .update(writable(record))
    .eq("id", id)
    .eq("owner_id", owner)
    .select()
    .single();
  fail(error);
  if (!data) throw new Error("记录不存在或无权修改");
  return data as T;
}
export async function erase(table: Table, id: string): Promise<void> {
  const owner = await currentUserId();
  const { data, error } = await client()
    .from(table)
    .delete()
    .eq("id", id)
    .eq("owner_id", owner)
    .select("id");
  fail(error);
  if (data?.length !== 1) throw new Error("记录不存在或无权删除");
}
export function today(): string {
  // Match the database date constraint's Asia/Hong_Kong timezone.
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Hong_Kong",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = (part: string) =>
    parts.find((p) => p.type === part)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}
