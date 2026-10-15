import { readFile } from "node:fs/promises";
// Anonymous HTTP checks against a real development project, no JWT/password needed.
const config = Object.fromEntries(
  (await readFile(".env.development.local", "utf8"))
    .split(/\r?\n/)
    .filter((line) => line.includes("="))
    .map((line) => {
      const n = line.indexOf("=");
      return [line.slice(0, n), line.slice(n + 1)];
    }),
);
const url = config.VITE_SUPABASE_URL,
  key = config.VITE_SUPABASE_PUBLISHABLE_KEY;
if (!url?.startsWith("https://") || !key?.startsWith("sb_publishable_"))
  throw Error("Missing development publishable configuration");
const tables = [
  "app_owners",
  "goals",
  "milestones",
  "projects",
  "activity_logs",
  "achievements",
];
let passed = 0;
for (const table of tables)
  for (const method of ["GET", "POST", "PATCH", "DELETE"]) {
    const target = new URL(`${url}/rest/v1/${table}`);
    target.searchParams.set("select", "*");
    if (["PATCH", "DELETE"].includes(method))
      target.searchParams.set(
        table === "app_owners" ? "user_id" : "id",
        "eq.00000000-0000-4000-8000-000000000099",
      );
    const response = await fetch(target, {
      method,
      headers: {
        apikey: key,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: ["POST", "PATCH"].includes(method)
        ? JSON.stringify(
            table === "app_owners"
              ? { user_id: "00000000-0000-4000-8000-000000000099" }
              : { title: "ANON-SECURITY-PROBE" },
          )
        : undefined,
      signal: AbortSignal.timeout(20000),
    });
    const value = await response.json();
    if (![401, 403].includes(response.status))
      throw Error(
        `${table} ${method}: expected authorization rejection, received ${response.status}`,
      );
    // A successful empty response would not establish privilege revocation. Require explicit denial here.
    if (!["42501", "PGRST301", "PGRST302"].includes(value.code))
      throw Error(`${table} ${method}: unexpected authorization error code`);
    console.log(`PASS anonymous ${method} ${table}: ${response.status}`);
    passed++;
  }
const settings = await fetch(`${url}/auth/v1/settings`, {
  headers: { apikey: key },
  signal: AbortSignal.timeout(20000),
});
if (settings.ok) {
  const value = await settings.json();
  console.log(
    JSON.stringify({
      emailEnabled: value.external?.email,
      signupDisabled: value.disable_signup,
    }),
  );
}
console.log(
  `${passed}/24 anonymous direct HTTP checks passed. Owner/non-owner and email OTP checks are separate and still required.`,
);
