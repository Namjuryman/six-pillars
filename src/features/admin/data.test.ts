import { beforeEach, describe, expect, test, vi } from "vitest";
const mock = vi.hoisted(() => ({ from: vi.fn(), owner: vi.fn() }));
vi.mock("../../lib/privateApi", () => ({
  client: () => ({ from: mock.from }),
  currentUserId: mock.owner,
}));
import { add, all, save, erase, today } from "./data";
beforeEach(() => {
  vi.resetAllMocks();
  mock.owner.mockResolvedValue("owner");
});
function query(result: unknown) {
  const q: any = {};
  for (const name of [
    "select",
    "eq",
    "order",
    "insert",
    "update",
    "delete",
    "single",
    "limit",
    "gt",
  ])
    q[name] = vi.fn().mockReturnValue(q);
  q.then = (resolve: Function) =>
    Promise.resolve(result).then((value) => resolve(value));
  mock.from.mockReturnValue(q);
  return q;
}
describe("private SDK data boundary", () => {
  test("reads scoped to session identity", async () => {
    const q = query({ data: [], error: null });
    expect(await all("goals")).toEqual([]);
    expect(q.eq).toHaveBeenCalledWith("owner_id", "owner");
    expect(q.order).toHaveBeenCalledWith("id", { ascending: true });
    expect(q.limit).toHaveBeenCalledWith(500);
  });
  test("inserts cannot spoof ownership or server metadata", async () => {
    const q = query({ data: { id: "row" }, error: null });
    await add("goals", {
      id: "forged",
      owner_id: "other",
      created_at: "forged",
      title: "test",
    });
    expect(q.insert).toHaveBeenCalledWith({ owner_id: "owner", title: "test" });
  });
  test("updates cannot transfer ownership", async () => {
    const q = query({ data: { id: "row" }, error: null });
    await save("goals", "row", {
      owner_id: "other",
      updated_at: "forged",
      title: "changed",
    });
    expect(q.update).toHaveBeenCalledWith({ title: "changed" });
    expect(q.eq).toHaveBeenCalledWith("id", "row");
    expect(q.eq).toHaveBeenCalledWith("owner_id", "owner");
  });
  test("zero-row delete is not silently treated as success", async () => {
    query({ data: [], error: null });
    await expect(erase("achievements", "missing")).rejects.toThrow(
      "记录不存在或无权删除",
    );
  });
  test("does not expose server error contents", async () => {
    query({ data: null, error: { message: "private row contents" } });
    await expect(all("activity_logs")).rejects.toThrow("数据操作失败");
  });
  test("missing session prevents network access", async () => {
    mock.owner.mockRejectedValue(new Error("expired"));
    await expect(add("goals", {})).rejects.toThrow("expired");
    expect(mock.from).not.toHaveBeenCalled();
  });
  test("date helper uses Hong Kong calendar at UTC day boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-14T17:00:00Z"));
    try {
      expect(today()).toBe("2026-10-15");
    } finally {
      vi.useRealTimers();
    }
  });
});
