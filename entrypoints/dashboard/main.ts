import { scanScript } from "../../src/core/scanner.ts";
import type { SecurityReport } from "../../src/core/types.ts";
import { diffScripts } from "../../src/core/diff.ts";
import { HistoryStore } from "../../src/core/history.ts";
import { importBackup } from "../../src/core/migrator.ts";
import type { StoredScript } from "../../src/extension/register.ts";

declare const chrome: any;
const KEY = "scriptsentry.library.v1";

interface Library { scripts: StoredScript[]; history: Record<string, unknown>; }
let lib: Library = { scripts: [], history: {} };
let selectedId: string | null = null;

function historyStore(): HistoryStore {
  return HistoryStore.fromJSON(lib.history as never);
}
async function persist(store?: HistoryStore): Promise<void> {
  if (store) lib.history = store.toJSON() as Record<string, unknown>;
  try {
    await chrome.storage.local.set({ [KEY]: lib });
    await chrome.runtime.sendMessage({ type: "scriptsentry:register" });
  } catch {
    // Running outside the extension (e.g. preview): keep state in localStorage.
    localStorage.setItem(KEY, JSON.stringify(lib));
  }
}
async function load(): Promise<void> {
  try {
    const data = await chrome.storage.local.get(KEY);
    if (data[KEY]) { lib = data[KEY]; return; }
  } catch { /* fall through */ }
  const raw = localStorage.getItem(KEY);
  if (raw) lib = JSON.parse(raw);
}

const $ = (id: string) => document.getElementById(id)!;
const ESC_MAP: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
const esc = (s: string): string => s.replace(/[&<>"]/g, (c: string) => ESC_MAP[c] ?? c);

function gradeClass(g: string): string { return "grade grade-" + g.toLowerCase(); }

function renderList(): void {
  const el = $("list");
  if (!lib.scripts.length) return; // keep the empty-state hint
  el.innerHTML = "";
  for (const s of lib.scripts) {
    const r = scanScript(s.source);
    const row = document.createElement("div");
    row.className = "srow" + (s.id === selectedId ? " sel" : "");
    row.innerHTML = `<div><div class="sname">${esc(s.name)}</div><div class="smeta">v${esc(s.version)} · ${s.enabled ? "enabled" : "disabled"} · ${esc(s.metadata.matches.join(", ") || "no @match")}</div></div><div class="${gradeClass(r.grade)}">${r.score} ${r.grade}</div>`;
    row.addEventListener("click", () => { selectedId = s.id; renderList(); renderDetail(); });
    el.appendChild(row);
  }
}

function renderReport(r: SecurityReport): void {
  $("dScore").innerHTML = `<span class="${gradeClass(r.grade)} big">${r.score}/100 · ${r.grade}</span>`;
  $("dCaps").innerHTML = r.capabilities.map((c) => `<li>${esc(c)}</li>`).join("") || "<li>No capabilities detected.</li>";
  $("dFindings").innerHTML = r.findings.length
    ? r.findings.map((f) => `<div class="finding sev-${f.severity}"><b>${f.severity.toUpperCase()}</b> · ${esc(f.title)}<div>${esc(f.detail)}</div>${f.evidence ? `<code>${esc(f.evidence)}</code>` : ""}</div>`).join("")
    : `<div class="finding sev-ok">No findings. This script looks clean to static analysis.</div>`;
}

function renderDetail(): void {
  const s = lib.scripts.find((x) => x.id === selectedId);
  if (!s) { $("detail").hidden = true; return; }
  $("detail").hidden = false;
  $("dName").textContent = s.name;
  $("dToggle").textContent = s.enabled ? "Disable" : "Enable";
  renderReport(scanScript(s.source));
  $("dSource").textContent = s.source;
  const store = historyStore();
  const versions = store.list(s.id);
  $("dHistory").innerHTML = versions.length
    ? versions.slice().reverse().map((v) => `<div class="hrow"><span>r${v.revision} · v${esc(v.version)} · ${esc(v.origin)} · ${esc(v.savedAt.slice(0, 19).replace("T", " "))} · #${v.hash}</span><button data-rev="${v.revision}">Restore</button></div>`).join("")
    : "<div class='empty'>No saved versions yet.</div>";
  $("dHistory").querySelectorAll("button[data-rev]").forEach((b) => b.addEventListener("click", async () => {
    const rev = Number((b as HTMLButtonElement).dataset.rev);
    const restored = store.rollbackTo(s.id, rev);
    if (restored) { s.source = restored; s.version = store.latest(s.id)!.version; await persist(store); renderList(); renderDetail(); }
  }));
}

async function doImport(text: string): Promise<void> {
  const result = importBackup(text);
  const store = historyStore();
  const lines: string[] = [];
  for (const rec of result.scripts) {
    const existing = lib.scripts.find((x) => x.id === rec.id);
    if (existing) {
      const d = diffScripts(existing.source, rec.source);
      store.save(rec.id, rec.source, "import-update");
      existing.source = rec.source; existing.version = rec.version; existing.metadata = rec.metadata;
      lines.push(`Updated "${rec.name}" — Diff Guardian verdict: ${d.verdict.toUpperCase()} (${d.reasons.join(" ")})`);
    } else {
      store.save(rec.id, rec.source, "import");
      lib.scripts.push({ ...rec, enabled: true });
      const r = scanScript(rec.source);
      lines.push(`Imported "${rec.name}" — Security Report: ${r.score}/100 (${r.grade}).`);
    }
  }
  for (const rep of result.reports) {
    if (!rep.ok) lines.push(`Compat: ${rep.scriptId} uses unsupported API(s): ${rep.unsupported.map((u) => u.api).join(", ")} — see the report in docs/security-model.md.`);
  }
  for (const e of result.errors) lines.push(`Error: ${e}`);
  await persist(store);
  $("importResult").innerHTML = lines.map(esc).join("<br>") || "Nothing to import.";
  renderList();
}

async function main(): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.userScripts) $("warn").hidden = false;
  await load();
  renderList();

  $("importBtn").addEventListener("click", () => void doImport(($("importText") as HTMLTextAreaElement).value));
  $("importFile").addEventListener("change", async () => {
    const f = ($("importFile") as HTMLInputElement).files?.[0];
    if (f) void doImport(await f.text());
  });
  $("dToggle").addEventListener("click", async () => {
    const s = lib.scripts.find((x) => x.id === selectedId); if (!s) return;
    s.enabled = !s.enabled; await persist(); renderList(); renderDetail();
  });
  $("dDelete").addEventListener("click", async () => {
    lib.scripts = lib.scripts.filter((x) => x.id !== selectedId);
    selectedId = null; await persist(); renderList(); renderDetail();
    if (!lib.scripts.length) location.reload();
  });
  $("dRollback").addEventListener("click", async () => {
    const s = lib.scripts.find((x) => x.id === selectedId); if (!s) return;
    const store = historyStore();
    const restored = store.rollback(s.id);
    if (restored) { s.source = restored; await persist(store); renderList(); renderDetail(); }
    else $("diffResult").textContent = "Nothing to roll back to yet — only one version saved.";
  });
  $("diffBtn").addEventListener("click", () => {
    const s = lib.scripts.find((x) => x.id === selectedId); if (!s) return;
    const next = ($("updateText") as HTMLTextAreaElement).value;
    if (!next.trim()) { $("diffResult").textContent = "Paste an updated script first."; return; }
    const d = diffScripts(s.source, next);
    $("diffResult").innerHTML = `<b>Verdict: ${d.verdict.toUpperCase()}</b> · risk ${d.oldRiskScore} → ${d.newRiskScore} · size ${d.sizeDeltaBytes >= 0 ? "+" : ""}${d.sizeDeltaBytes} bytes · +${d.linesAdded}/-${d.linesRemoved} lines<br>` + d.reasons.map(esc).join("<br>");
  });
  $("applyBtn").addEventListener("click", async () => {
    const s = lib.scripts.find((x) => x.id === selectedId); if (!s) return;
    const next = ($("updateText") as HTMLTextAreaElement).value;
    if (!next.trim()) return;
    const { parseMetadata } = await import("../../src/core/metadata.ts");
    const meta = parseMetadata(next); if (!meta) { $("diffResult").textContent = "That doesn't look like a userscript (no metadata block)."; return; }
    const store = historyStore();
    store.save(s.id, next, "update");
    s.source = next; s.version = meta.version; s.metadata = meta;
    await persist(store);
    $("diffResult").textContent = "Update accepted. Previous version is kept in history — roll back any time.";
    renderList(); renderDetail();
  });
}

void main();
