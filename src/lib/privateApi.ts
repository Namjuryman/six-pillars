import { signInRedirectURL } from "./authURL";
import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";
export { configured } from "./supabase";
export function client() {
  if (!supabase) throw new Error("尚未配置 Supabase 开发环境");
  return supabase;
}
export async function sendSignInLink(email: string): Promise<void> {
  const { error } = await client().auth.signInWithOtp({
    email: email.trim(),
    options: {
      shouldCreateUser: false,
      emailRedirectTo: signInRedirectURL(
        window.location.origin,
        import.meta.env.BASE_URL,
      ),
    },
  });
  // Do not reveal whether an address is registered.
  if (error && error.status !== 400 && error.status !== 422)
    throw new Error(
      error.status === 429
        ? "发送过于频繁，请稍后再试"
        : "邮件服务暂不可用，请稍后重试",
    );
}
export async function restore(): Promise<{
  id: string;
  email?: string;
} | null> {
  if (!supabase) return null;
  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession();
  if (sessionError) throw new Error("无法恢复登录，请重新登录");
  if (!session) return null;
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user || user.id !== session.user.id)
    throw new Error("登录验证失败，请检查网络或重新登录");
  return user;
}
export async function ownerAllowed(id: string): Promise<boolean> {
  const { data, error } = await client()
    .from("app_owners")
    .select("user_id")
    .eq("user_id", id)
    .limit(1);
  if (error) throw new Error("无法验证后台权限，请稍后重试");
  return data.length === 1 && data[0].user_id === id;
}
export async function currentUserId(): Promise<string> {
  const {
    data: { session },
    error,
  } = await client().auth.getSession();
  if (error || !session?.user.id) throw new Error("登录已失效，请重新登录");
  return session.user.id;
}
export function watchAuth(
  callback: (event: AuthChangeEvent, session: Session | null) => void,
) {
  const subscription =
    supabase?.auth.onAuthStateChange(callback).data.subscription;
  return () => subscription?.unsubscribe();
}
export async function logout(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) throw new Error("本地会话已退出，服务端注销暂不可用");
}
