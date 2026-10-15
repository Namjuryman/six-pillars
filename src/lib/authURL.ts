export function hasAuthFragment(hash: string): boolean {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return [
    "access_token",
    "refresh_token",
    "provider_token",
    "provider_refresh_token",
    "error",
    "error_code",
    "error_description",
  ].some((key) => params.has(key));
}
export function signInRedirectURL(origin: string, base: string): string {
  return new URL(base, origin).href;
}
export function cleanCallbackURL(origin: string, base: string): string {
  const url = new URL(base, origin);
  url.hash = "/login";
  return url.href;
}
