import { defineConfig } from "wxt";

// WXT (Vite + TypeScript) — one codebase for Chrome / Edge / Firefox.
// See docs/architecture.md for how the pieces fit together, and
// docs/store-submission.md before submitting anywhere: the manifest below
// deliberately requests the MINIMUM permissions, each justified there.
export default defineConfig({
  manifest: {
    name: "ScriptSentry — trust-first userscript manager",
    description: "See what a script does, before it does it. Open-source userscript manager with a pre-install Security Report, update diffs and rollback.",
    permissions: ["storage", "userScripts", "alarms"],
    optional_permissions: ["downloads"],
    host_permissions: [],
    optional_host_permissions: ["*://*/*"],
    action: { default_title: "ScriptSentry" },
  },
});
