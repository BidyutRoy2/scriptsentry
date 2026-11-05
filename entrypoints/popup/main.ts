import { scanScript } from "../../src/core/scanner.ts";
import { scriptMatchesUrl } from "../../src/core/match.ts";
import type { StoredScript } from "../../src/extension/register.ts";

declare const chrome: any;
const KEY = "scriptsentry.library.v1";

async function load(): Promise<{ scripts: StoredScript[] }> {
  try {
    const data = await chrome.storage.local.get(KEY);
    return data[KEY] ?? { scripts: [] };
  } catch { return { scripts: [] }; }
}

async function save(lib: { scripts: StoredScript[] }): Promise<void> {
  await chrome.storage.local.set({ [KEY]: lib });
  try { await chrome.runtime.sendMessage({ type: "scriptsentry:register" }); } catch { /* bg asleep is fine */ }
}

async function main(): Promise<void> {
  const urlEl = document.getElementById("url")!;
  const listEl = document.getElementById("list")!;
  if (typeof chrome === "undefined" || !chrome.userScripts) document.getElementById("warn")!.style.display = "block";

  let tabUrl = "";
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    tabUrl = tab?.url ?? "";
  } catch { /* no tabs permission context */ }
  urlEl.textContent = tabUrl || "Current tab (URL unavailable)";

  const lib = await load();
  const here = lib.scripts.filter((s) => tabUrl && scriptMatchesUrl(s.metadata.matches, s.metadata.includes, s.metadata.excludes, tabUrl));
  if (!here.length) {
    listEl.innerHTML = `<div class="empty">No scripts run on this page. Import scripts in the dashboard — each one arrives with a Security Report.</div>`;
  }
  for (const s of here) {
    const report = scanScript(s.source);
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `<div><div class="name"></div><div class="score ${report.grade.toLowerCase()}">Trust ${report.score}/100 · Grade ${report.grade}</div></div>`;
    row.querySelector(".name")!.textContent = s.name;
    const btn = document.createElement("button");
    btn.textContent = s.enabled ? "On" : "Off";
    btn.className = s.enabled ? "on" : "";
    btn.addEventListener("click", async () => {
      s.enabled = !s.enabled;
      await save(lib);
      btn.textContent = s.enabled ? "On" : "Off";
      btn.className = s.enabled ? "on" : "";
    });
    row.appendChild(btn);
    listEl.appendChild(row);
  }

  document.getElementById("dash")!.addEventListener("click", () => {
    const url = chrome.runtime.getURL("/dashboard.html");
    void chrome.tabs.create({ url });
  });
}

void main();
