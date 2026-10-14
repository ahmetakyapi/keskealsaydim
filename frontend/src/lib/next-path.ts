/**
 * Where to send a visitor after signing in: the `next` path a private page
 * stored on the way to /login, or the dashboard.
 *
 * Internal paths only; `//host` and absolute URLs would turn the login form
 * into an open redirect.
 */
export function safeNextPath(raw: string | null | undefined): string {
  if (!raw || !raw.startsWith('/') || raw.startsWith('//') || raw.startsWith('/\\')) {
    return '/dashboard';
  }
  return raw;
}
