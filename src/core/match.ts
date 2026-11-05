/**
 * Minimal Chrome-style @match pattern matcher (scheme://host/path),
 * used by the popup to show which scripts run on the current tab.
 * Supports "*" scheme/host/path wildcards and "*.domain" host suffixes.
 */
export function matchPatternToRegExp(pattern: string): RegExp | null {
  if (pattern === "<all_urls>") return /^https?:\/\/.*$/;
  const m = pattern.match(/^([*a-z]+):\/\/([^/]+)(\/.*)$/i);
  if (!m) return null;
  const [, scheme, host, path] = m;
  const esc = (s: string) => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const schemeRe = scheme === "*" ? "https?" : esc(scheme);
  let hostRe: string;
  if (host === "*") hostRe = "[^/]+";
  else if (host.startsWith("*.")) hostRe = `(?:[^/]+\\.)?${esc(host.slice(2))}`;
  else hostRe = esc(host);
  return new RegExp(`^${schemeRe}:\\/\\/${hostRe}${esc(path)}$`, "i");
}

export function urlMatchesPattern(url: string, pattern: string): boolean {
  const re = matchPatternToRegExp(pattern);
  return re ? re.test(url) : false;
}

export function scriptMatchesUrl(matches: string[], includes: string[], excludes: string[], url: string): boolean {
  const included = [...matches, ...includes].some((p) => urlMatchesPattern(url, p));
  if (!included) return false;
  return !excludes.some((p) => urlMatchesPattern(url, p));
}
