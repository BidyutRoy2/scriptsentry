/**
 * Shared types for ScriptSentry core.
 * All core modules are framework-free, pure TypeScript: no DOM, no chrome.*,
 * no Node APIs. They run identically in the extension, in tests, and in the CLI.
 */

export interface UserScriptMetadata {
  name: string;
  namespace: string;
  version: string;
  description: string;
  /** Values of @match */
  matches: string[];
  /** Values of @include */
  includes: string[];
  /** Values of @exclude */
  excludes: string[];
  /** Every @grant value, in source order (both `GM_*` and `GM.*` forms kept verbatim). */
  grants: string[];
  /** Values of @connect (domains the script may talk to via GM_xmlhttpRequest). */
  connects: string[];
  /** Values of @require (external JS libraries), verbatim incl. any #hash fragment. */
  requires: string[];
  /** Values of @resource as { name, url }. */
  resources: { name: string; url: string }[];
  /** Value of @run-at, default "document-idle". */
  runAt: string;
  /** True when @noframes is present. */
  noframes: boolean;
  /** Any other @keys, first value wins. */
  extra: Record<string, string>;
}

export type Severity = "critical" | "high" | "medium" | "low" | "info";

export interface Finding {
  rule: string;
  severity: Severity;
  title: string;
  detail: string;
  evidence?: string;
}

export interface SecurityReport {
  score: number; // 0-100, higher is safer
  grade: "A" | "B" | "C" | "D" | "F";
  /** Plain-English capability lines, e.g. "Runs on every website". */
  capabilities: string[];
  findings: Finding[];
  connectDomains: string[];
  requireDomains: string[];
}

export interface StoredVersion {
  /** 1-based, monotonically increasing per script. */
  revision: number;
  /** The @version string from the metadata block, if any. */
  version: string;
  source: string;
  /** ISO timestamp of when this version was saved. */
  savedAt: string;
  /** Short content hash (FNV-1a hex) for quick identity checks. */
  hash: string;
  /** Why this version exists: "install" | "update" | "rollback" | "edit" | "import". */
  origin: string;
}

export interface ScriptRecord {
  /** Stable id: slug of namespace + name. */
  id: string;
  name: string;
  namespace: string;
  version: string;
  source: string;
  metadata: UserScriptMetadata;
}

export interface CompatReport {
  scriptId: string;
  gmApisUsed: string[];
  unsupported: { api: string; reason: string }[];
  ok: boolean;
}
