import { createClient } from "@supabase/supabase-js";
export function validClientConfig(url: string, key: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === "https:" &&
      !parsed.username &&
      !parsed.password &&
      parsed.pathname === "/" &&
      !parsed.search &&
      !parsed.hash &&
      /^sb_publishable_[A-Za-z0-9_-]+$/.test(key)
    );
  } catch {
    return false;
  }
}
const url = (import.meta.env.VITE_SUPABASE_URL ?? "").trim().replace(/\/$/, "");
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "").trim();
export const configured = validClientConfig(url, key);
// Storage can be disabled by browser policy. Keep sessions in memory in that case.
const volatile = new Map<string, string>();
const storage = {
  getItem(key: string) {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return volatile.get(key) ?? null;
    }
  },
  setItem(key: string, value: string) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      volatile.set(key, value);
    }
  },
  removeItem(key: string) {
    volatile.delete(key);
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* unavailable */
    }
  },
};
export const supabase = configured
  ? createClient(url, key, {
      auth: {
        storage: storage,
        storageKey: "six-pillars-auth-v1",
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    })
  : null;
