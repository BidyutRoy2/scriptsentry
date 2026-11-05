import { parseMetadata, matchDomains } from "./metadata.ts";
import type { Finding, SecurityReport, Severity, UserScriptMetadata } from "./types.ts";

/**
 * ScriptSentry security scanner — the product's #1 feature.
 *
 * Pure static analysis over the source + metadata. No code is executed.
 * Score starts at 100 and loses points per finding:
 *   critical -35 · high -20 · medium -10 · low -4 · info 0
 * Grades: A >= 90, B >= 75, C >= 60, D >= 40, F < 40.
 */

const DEDUCTION: Record<Severity, number> = { critical: 35, high: 20, medium: 10, low: 4, info: 0 };

function domainOf(url: string): string {
  const m = url.match(/^[a-z]+:\/\/([^/:?#]+)/i);
  return m ? m[1].toLowerCase() : url;
}

function entropy(s: string): number {
  const freq = new Map<string, number>();
  for (const c of s) freq.set(c, (freq.get(c) ?? 0) + 1);
  let h = 0;
  for (const n of freq.values()) { const p = n / s.length; h -= p * Math.log2(p); }
  return h;
}

function has(source: string, re: RegExp): boolean { return re.test(source); }

export function scanScript(source: string): SecurityReport {
  const meta: UserScriptMetadata | null = parseMetadata(source);
  const findings: Finding[] = [];
  const capabilities: string[] = [];
  const add = (rule: string, severity: Severity, title: string, detail: string, evidence?: string) =>
    findings.push({ rule, severity, title, detail, evidence });

  if (!meta) {
    add("no-metadata", "medium", "No metadata block",
      "This file has no ==UserScript== block, so its name, sites and permissions cannot be verified.");
    return finish(100, findings, capabilities, [], []);
  }

  // --- Where does it run? -------------------------------------------------
  const domains = matchDomains(meta);
  const broad = domains.includes("*") || meta.matches.includes("<all_urls>");
  if (broad) {
    add("broad-match", "high", "Runs on every website",
      "A @match of *://*/* (or <all_urls>) means this script executes on your bank, email and every other site you visit.",
      meta.matches.find((p) => p.includes("*")) ?? "<all_urls>");
    capabilities.push("Runs on EVERY website you visit");
  } else if (domains.length > 0) {
    capabilities.push(`Runs only on: ${domains.join(", ")}`);
  } else {
    capabilities.push("Runs on no sites by default (no @match)");
  }

  const grants = new Set(meta.grants.map((g) => g.toLowerCase()));
  const grant = (...names: string[]) => names.some((n) => grants.has(n.toLowerCase()));

  // --- Dangerous code constructs -----------------------------------------
  if (has(source, /\beval\s*\(/) || has(source, /new\s+Function\s*\(/)) {
    add("eval", "critical", "Executes code from strings (eval / new Function)",
      "eval-style execution can turn any string the script receives into running code — the classic way a benign script becomes a loader for remote malware.",
      (source.match(/.{0,30}\beval\s*\(.{0,30}/) ?? [])[0]);
    capabilities.push("Can execute arbitrary code strings (eval)");
  }
  if (has(source, /coinhive|cryptonight|cryptoloot|minero|coinimp|omine|xmrig|stratum\+tcp|webminer/i)) {
    add("crypto-mining", "critical", "Crypto-mining indicators",
      "The source references known browser-mining libraries or mining-pool protocols.",
      (source.match(/.{0,20}(coinhive|cryptonight|xmrig|minero).{0,20}/i) ?? [])[0]);
    capabilities.push("May mine cryptocurrency using your CPU");
  }

  // --- Network ------------------------------------------------------------
  const usesXhr = grant("GM_xmlhttpRequest", "GM.xmlHttpRequest") ||
    has(source, /GM_xmlhttpRequest|GM\.xmlHttpRequest/);
  const connectDomains = meta.connects.map((d) => d.toLowerCase());
  if (usesXhr) {
    capabilities.push(connectDomains.length
      ? `Can send network requests to: ${connectDomains.join(", ")}`
      : "Can send cross-site network requests (no @connect list declared)");
    add("gm-xhr", "medium", "Cross-site requests via GM_xmlhttpRequest",
      "This API bypasses the page's same-origin limits. It is legitimate for APIs, but also the main channel for sending your data off-site.");
  }
  if (connectDomains.includes("*")) {
    add("connect-star", "high", "@connect * — can talk to any domain",
      "The script declares it may contact every domain on the internet. There is no way to audit where your data goes.");
  }
  const fetchTargets = new Set<string>();
  for (const m of source.matchAll(/(?:fetch|\.open\s*\(\s*['"][A-Z]+['"]\s*,)\s*\(?\s*['"`](https?:\/\/[^'"`]+)['"`]/g)) {
    fetchTargets.add(domainOf(m[1]));
  }
  const unknownFetch = [...fetchTargets].filter((d) => !connectDomains.includes(d) && !domains.includes(d));
  if (unknownFetch.length) {
    add("remote-fetch", "medium", "Fetches data from undeclared domains",
      `Code fetches from ${unknownFetch.join(", ")}, which are not listed in @connect. Undeclared endpoints deserve a second look.`,
      unknownFetch.join(", "));
    capabilities.push(`Fetches data from: ${[...fetchTargets].join(", ")}`);
  }

  // --- Sensitive data access ----------------------------------------------
  if (grant("GM_cookie", "GM.cookie") || has(source, /GM_cookie|GM\.cookie/)) {
    add("cookie-api", "high", "Can read and modify your cookies (GM_cookie)",
      "Cookies carry login sessions. A script with cookie access can impersonate you on sites it can reach.");
    capabilities.push("Can read/modify cookies (including, on some sites, session cookies)");
  }
  if (has(source, /document\.cookie/)) {
    add("document-cookie", "high", "Reads document.cookie",
      "Direct cookie access can expose session tokens for the sites this script runs on.");
    capabilities.push("Can read the page's cookies");
  }
  if (grant("GM_setClipboard", "GM.setClipboard") || has(source, /GM_setClipboard|navigator\.clipboard\.writeText/)) {
    add("clipboard", "medium", "Can change what you copy (clipboard write)",
      "Clipboard access is a known trick for swapping copied wallet addresses and links.");
    capabilities.push("Can overwrite your clipboard");
  }
  if (grant("GM_download", "GM.download") || has(source, /GM_download|GM\.download/)) {
    add("download", "medium", "Can download files to your computer (GM_download)",
      "Downloads should only happen when you expect them; silent downloads are a malware delivery route.");
    capabilities.push("Can start file downloads");
  }
  if (has(source, /(querySelector|querySelectorAll|getElementById|getElementsBy[^)]*)\([^)]*(password|passwd|pwd)|type\s*=\s*['"]password['"]|input\[[^\]]*password|\.forms\b/i)) {
    add("form-reading", "high", "Appears to read form / password fields",
      "Code that touches password inputs or form structures can capture credentials as you type them.");
    capabilities.push("May read what you type into forms, possibly including passwords");
  } else if (has(source, /(addEventListener\(\s*['"]submit['"]|querySelectorAll\(\s*['"][^'"]*input|getElementsByTagName\(\s*['"]input['"])/)) {
    add("form-reading", "medium", "Interacts with page forms / inputs",
      "Reading form values is normal for autofill helpers, but it means the script can see what you type on matched sites.");
    capabilities.push("Can read values from page forms");
  }
  if (has(source, /\blocalStorage\b|\bsessionStorage\b/)) {
    add("web-storage", "low", "Uses localStorage / sessionStorage",
      "Many sites store tokens and personal data in web storage; this script can access it on matched sites.");
    capabilities.push("Can read the site's local/session storage");
  }

  // --- External code (@require) -------------------------------------------
  const requireDomains: string[] = [];
  for (const req of meta.requires) {
    const url = req.split("#")[0];
    if (/^https?:\/\//i.test(url)) requireDomains.push(domainOf(url));
    if (!/#(sha256|sha384|sha512|md5)=/i.test(req)) {
      add("require-no-sri", "medium", "@require without an integrity hash",
        `External library ${url} is loaded without a #sha256= integrity pin, so its content can change silently at any time.`,
        req);
    }
  }
  if (requireDomains.length) {
    capabilities.push(`Loads external libraries from: ${[...new Set(requireDomains)].join(", ")}`);
  }

  // --- Obfuscation heuristics ---------------------------------------------
  const lines = source.split(/\r?\n/);
  const longLines = lines.filter((l) => l.length > 1000).length;
  const hexIds = (source.match(/\b_0x[0-9a-fA-F]{4,}\b/g) ?? []).length;
  let hiEntropy = 0;
  for (const m of source.matchAll(/['"`]([A-Za-z0-9+/=]{48,})['"`]/g)) {
    if (entropy(m[1]) > 4.4) hiEntropy++;
  }
  const packedArray = /\[\s*(['"][^'"]{1,12}['"]\s*,\s*){12,}['"][^'"]{1,12}['"]\s*\]/.test(source);
  if (longLines > 0 || hexIds >= 3 || hiEntropy >= 2 || packedArray) {
    const bits = [
      longLines ? `${longLines} line(s) over 1000 characters` : "",
      hexIds >= 3 ? `${hexIds} obfuscator-style _0x identifiers` : "",
      hiEntropy >= 2 ? `${hiEntropy} high-entropy strings` : "",
      packedArray ? "a packed string-array (typical obfuscator output)" : "",
    ].filter(Boolean).join("; ");
    add("obfuscation", "high", "Code looks obfuscated",
      `Heuristics found ${bits}. Obfuscated code cannot be meaningfully reviewed by humans or by this scanner — treat its other scores with suspicion.`);
    capabilities.push("Ships obfuscated code that is hard to audit");
  }

  // --- Benign capabilities worth surfacing ---------------------------------
  if (grant("GM_addStyle", "GM.addStyle") || has(source, /GM_addStyle|GM\.addStyle/)) {
    capabilities.push("Can restyle pages (add CSS)");
  }
  if (grant("GM_setValue", "GM.setValue", "GM_setvalue")) {
    capabilities.push("Stores its own settings/data between visits");
  }

  let score = 100;
  for (const f of findings) score -= DEDUCTION[f.severity];
  return finish(Math.max(0, score), findings, [...new Set(capabilities)], connectDomains, [...new Set(requireDomains)]);
}

function finish(score: number, findings: Finding[], capabilities: string[],
                connectDomains: string[], requireDomains: string[]): SecurityReport {
  const grade = score >= 90 ? "A" : score >= 75 ? "B" : score >= 60 ? "C" : score >= 40 ? "D" : "F";
  return { score, grade, capabilities, findings, connectDomains, requireDomains };
}
