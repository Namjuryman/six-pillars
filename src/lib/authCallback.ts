import { supabase } from "./supabase";
import { cleanCallbackURL, hasAuthFragment } from "./authURL";
// Run before mounting HashRouter. Only the official SDK validates/stores tokens.
export async function completeAuthCallback(): Promise<boolean> {
  if (!hasAuthFragment(window.location.hash)) return false;
  const params = new URLSearchParams(window.location.hash.slice(1));
  // Remove credentials from this history entry before any asynchronous work.
  window.history.replaceState(
    null,
    "",
    cleanCallbackURL(window.location.origin, import.meta.env.BASE_URL),
  );
  const access_token = params.get("access_token"),
    refresh_token = params.get("refresh_token");
  if (!access_token || !refresh_token || params.has("error") || !supabase)
    return true;
  try {
    const { data, error } = await supabase.auth.setSession({
      access_token,
      refresh_token,
    });
    return !!error || !data.session;
  } catch {
    return true;
  }
}
