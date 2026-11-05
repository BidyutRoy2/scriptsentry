// ==UserScript==
// @name         Example: Gentle Dark Mode
// @namespace    https://scriptsentry.example
// @version      1.0.0
// @description  A benign example: adds a soft dark theme to example.com only.
// @match        https://example.com/*
// @grant        GM_addStyle
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";
  GM_addStyle(`
    body { background: #16181d !important; color: #e8e9eb !important; }
    a { color: #8ab4f8 !important; }
  `);
})();
