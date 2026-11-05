import type { UserScriptMetadata } from "./types.ts";

const MULTI_KEYS: Record<string, keyof UserScriptMetadata> = {
  match: "matches",
  include: "includes",
  exclude: "excludes",
  grant: "grants",
  connect: "connects",
  require: "requires",
};

/**
 * Parse the `// ==UserScript== ... // ==/UserScript==` metadata block.
 * Returns null when no block exists. Tolerant of Windows line endings,
 * extra whitespace, and both `GM_*` / `GM.*` grant spellings.
 */
export function parseMetadata(source: string): UserScriptMetadata | null {
  const blockMatch = source.match(/\/\/\s*==UserScript==([\s\S]*?)\/\/\s*==\/UserScript==/);
  if (!blockMatch) return null;
  const meta: UserScriptMetadata = {
    name: "Unnamed script",
    namespace: "",
    version: "0.0.0",
    description: "",
    matches: [],
    includes: [],
    excludes: [],
    grants: [],
    connects: [],
    requires: [],
    resources: [],
    runAt: "document-idle",
    noframes: false,
    extra: {},
  };
  for (const rawLine of blockMatch[1].split(/\r?\n/)) {
    const m = rawLine.match(/^\/\/\s*@([\w-]+)\s*(.*)$/);
    if (!m) continue;
    const key = m[1].toLowerCase();
    const value = m[2].trim();
    if (key in MULTI_KEYS) {
      (meta[MULTI_KEYS[key]] as string[]).push(value);
    } else if (key === "resource") {
      const parts = value.split(/\s+/);
      if (parts.length >= 2) meta.resources.push({ name: parts[0], url: parts.slice(1).join(" ") });
      else if (parts.length === 1) meta.resources.push({ name: "", url: parts[0] });
    } else if (key === "noframes") {
      meta.noframes = true;
    } else if (key === "name") {
      meta.name = value || meta.name;
    } else if (key === "namespace") {
      meta.namespace = value;
    } else if (key === "version") {
      meta.version = value || meta.version;
    } else if (key === "description") {
      meta.description = value;
    } else if (key === "run-at") {
      meta.runAt = value || meta.runAt;
    } else if (!(key in meta.extra)) {
      meta.extra[key] = value;
    }
  }
  return meta;
}

/** True when the source contains a userscript metadata block at all. */
export function hasMetadataBlock(source: string): boolean {
  return /\/\/\s*==UserScript==/.test(source);
}

/** Stable script id derived from namespace + name. */
export function scriptId(meta: UserScriptMetadata): string {
  const raw = `${meta.namespace}/${meta.name}`.toLowerCase();
  return raw.replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "unnamed-script";
}

/** Extract the host from a @match pattern like `*://*.example.com/*`. */
export function matchHost(pattern: string): string {
  const m = pattern.match(/^(?:\*|[a-z*]+):\/\/([^/]+)/i);
  return m ? m[1] : pattern;
}

/** Domains a @match/@include pattern set can run on ("*" means everywhere). */
export function matchDomains(meta: UserScriptMetadata): string[] {
  const hosts = new Set<string>();
  for (const p of [...meta.matches, ...meta.includes]) {
    if (p === "<all_urls>" || /\*:\/\/\*(\/|$)/.test(p) || p === "*") hosts.add("*");
    else hosts.add(matchHost(p));
  }
  return [...hosts];
}
