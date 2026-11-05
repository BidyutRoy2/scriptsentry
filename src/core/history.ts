import { parseMetadata } from "./metadata.ts";
import type { StoredVersion } from "./types.ts";

/**
 * Version history + rollback.
 *
 * Storage-agnostic: HistoryStore keeps versions in memory and can be
 * serialised with toJSON() / restored with fromJSON(), so the extension can
 * persist it in chrome.storage.local or IndexedDB and tests can use it raw.
 *
 * Invariant: a save NEVER overwrites. Every install, update, edit and
 * rollback appends a new revision, so any earlier state can be restored.
 * This is the direct fix for Tampermonkey's "an update ate my script" —
 * the #5/#6 pain points in our research.
 */

export function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) { h ^= input.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export class HistoryStore {
  private data = new Map<string, StoredVersion[]>();
  private clock: () => string;

  /** @param clock injectable for deterministic tests. */
  constructor(clock: () => string = () => new Date().toISOString()) { this.clock = clock; }

  save(scriptId: string, source: string, origin = "update"): StoredVersion {
    const list = this.data.get(scriptId) ?? [];
    const entry: StoredVersion = {
      revision: list.length + 1,
      version: parseMetadata(source)?.version ?? "0.0.0",
      source,
      savedAt: this.clock(),
      hash: fnv1a(source),
      origin,
    };
    list.push(entry);
    this.data.set(scriptId, list);
    return entry;
  }

  /** All versions, oldest first. Returns copies of the metadata (source included). */
  list(scriptId: string): StoredVersion[] {
    return [...(this.data.get(scriptId) ?? [])];
  }

  latest(scriptId: string): StoredVersion | null {
    const list = this.data.get(scriptId) ?? [];
    return list.length ? list[list.length - 1] : null;
  }

  get(scriptId: string, revision: number): StoredVersion | null {
    return (this.data.get(scriptId) ?? []).find((v) => v.revision === revision) ?? null;
  }

  count(scriptId: string): number { return (this.data.get(scriptId) ?? []).length; }

  /**
   * Roll back to the previous revision. The restored source is appended as a
   * NEW revision (origin "rollback") — history itself is never rewritten —
   * and its source is returned. Returns null when there is nothing to roll
   * back to.
   */
  rollback(scriptId: string): string | null {
    const list = this.data.get(scriptId) ?? [];
    if (list.length < 2) return null;
    const target = list[list.length - 2];
    this.save(scriptId, target.source, "rollback");
    return target.source;
  }

  /** Roll back to a specific revision (same append-only semantics). */
  rollbackTo(scriptId: string, revision: number): string | null {
    const target = this.get(scriptId, revision);
    if (!target) return null;
    this.save(scriptId, target.source, "rollback");
    return target.source;
  }

  toJSON(): Record<string, StoredVersion[]> {
    return Object.fromEntries(this.data);
  }

  static fromJSON(json: Record<string, StoredVersion[]>, clock?: () => string): HistoryStore {
    const store = new HistoryStore(clock);
    for (const [id, versions] of Object.entries(json)) store.data.set(id, [...versions]);
    return store;
  }
}
