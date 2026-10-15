import { afterEach, describe, expect, test, vi } from "vitest";
import { createClient } from "@supabase/supabase-js";
const state = vi.hoisted(() => ({ client: null as any }));
vi.mock("../../lib/privateApi", () => ({
  client: () => state.client,
  currentUserId: async () => "00000000-0000-4000-8000-000000000001",
}));
import { all, type Table } from "./data";

afterEach(() => vi.restoreAllMocks());
// Real SDK query serialization, in-memory HTTP response. No database/production calls.
function server(total: number, cap = 1000, failPage = 0, repeat = false) {
  const rows = Array.from({ length: total }, (_, i) => ({
    id: `00000000-0000-4000-8000-${String(i + 1).padStart(12, "0")}`,
    created_at: `2026-10-${String(1 + (i % 14)).padStart(2, "0")}T00:00:00Z`,
  }));
  const requests: URL[] = [];
  const fetcher = vi.fn(async (input: RequestInfo | URL) => {
    const url = new URL(
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url,
    );
    expect(url.origin).toBe("https://pagination.supabase.invalid");
    expect(url.searchParams.get("owner_id")).toBe(
      "eq.00000000-0000-4000-8000-000000000001",
    );
    expect(url.searchParams.get("order")).toBe("id.asc");
    requests.push(url);
    if (requests.length === failPage)
      return new Response(
        JSON.stringify({ message: "sensitive backend detail" }),
        { status: 403 },
      );
    const cursor = repeat ? "" : (url.searchParams.get("id")?.slice(3) ?? "");
    const result = rows
      .filter((r) => r.id > cursor)
      .slice(0, Math.min(cap, Number(url.searchParams.get("limit"))));
    return new Response(JSON.stringify(result), {
      headers: { "Content-Type": "application/json" },
    });
  });
  state.client = createClient(
    "https://pagination.supabase.invalid",
    "sb_publishable_test",
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
      global: { fetch: fetcher },
    },
  );
  return { rows, requests };
}
describe("complete owner reads across server caps", () => {
  test.each<Table>(["goals", "milestones", "activity_logs", "achievements"])(
    "%s reads all 1505 rows, deterministic newest-first ties",
    async (table) => {
      const { rows, requests } = server(1505);
      const result = await all<{ id: string; created_at: string }>(table);
      expect(result).toEqual(
        [...rows].sort(
          (a, b) =>
            b.created_at.localeCompare(a.created_at) ||
            b.id.localeCompare(a.id),
        ),
      );
      expect(new Set(result.map((r) => r.id)).size).toBe(1505);
      expect(requests).toHaveLength(5); // 500/500/500/5/empty
      expect(requests[1].searchParams.get("id")).toBe(`gt.${rows[499].id}`);
    },
  );
  test("a lower server cap does not look like end of data", async () => {
    const { requests } = server(1101, 173);
    expect(await all("activity_logs")).toHaveLength(1101);
    expect(requests).toHaveLength(8);
  });
  test.each([0, 500, 1000])("boundary length %i", async (total) => {
    server(total);
    expect(await all("goals")).toHaveLength(total);
  });
  test("middle-page error rejects the entire read instead of returning partial success", async () => {
    server(1505, 1000, 2);
    await expect(all("activity_logs")).rejects.toThrow("数据操作失败");
  });
  test("non-advancing server response fails instead of looping or duplicating", async () => {
    server(2, 1000, 0, true);
    await expect(all("achievements")).rejects.toThrow("分页读取顺序异常");
  });
});
