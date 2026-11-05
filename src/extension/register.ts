import type { ScriptRecord } from "../core/types.ts";

/**
 * Glue between stored scripts and chrome.userScripts.
 *
 * MV3 realities handled here (see docs/architecture.md):
 *  - chrome.userScripts is UNDEFINED until the user enables
 *    "Allow User Scripts" (Chrome 138+) / Developer Mode. We detect that and
 *    report "unavailable" instead of throwing or silently doing nothing —
 *    the exact failure that made Tampermonkey look broken (issue #2607).
 *  - Registrations are cleared on every extension update, so the background
 *    worker re-registers everything on runtime.onInstalled.
 */

export interface UserScriptsApi {
  register: (scripts: object[]) => Promise<void>;
  unregister: (filter?: object) => Promise<void>;
  getScripts: () => Promise<{ id: string }[]>;
}

export interface StoredScript extends ScriptRecord { enabled: boolean }

export function buildRegistrations(scripts: StoredScript[]): object[] {
  return scripts.filter((s) => s.enabled).map((s) => ({
    id: s.id,
    matches: s.metadata.matches.length ? s.metadata.matches : s.metadata.includes,
    js: [{ code: s.source }],
    world: "USER_SCRIPT",
    runAt: s.metadata.runAt.replace("-", "_"),
  }));
}

export type RegisterResult =
  | { status: "unavailable"; reason: string }
  | { status: "registered"; count: number };

export async function registerAll(api: UserScriptsApi | undefined, scripts: StoredScript[]): Promise<RegisterResult> {
  if (!api) {
    return {
      status: "unavailable",
      reason: "chrome.userScripts is not available. Enable 'Allow User Scripts' for ScriptSentry in chrome://extensions (or Developer Mode), then reopen ScriptSentry.",
    };
  }
  const registrations = buildRegistrations(scripts);
  const existing = await api.getScripts();
  if (existing.length) await api.unregister({ ids: existing.map((s) => s.id) });
  if (registrations.length) await api.register(registrations);
  return { status: "registered", count: registrations.length };
}
