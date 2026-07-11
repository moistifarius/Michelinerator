/*
 * store.js — cross-browser storage + API shim.
 *
 * - Normalizes the `chrome` (Chromium) and `browser` (Firefox) globals.
 * - Prefers storage.sync, but falls back to storage.local when sync is
 *   unavailable — e.g. privacy-hardened Firefox/LibreWolf builds where
 *   `webextensions.storage.sync.enabled` is off (there, `storage.sync`
 *   is undefined). Both areas share the same get/set signature.
 * - Exposes GXStore.get / .set / .onChanged and GXStore.api for callers.
 */
(function (global) {
  "use strict";

  const api = global.chrome || global.browser;
  const hasSync = !!(api && api.storage && api.storage.sync);
  const area = hasSync ? api.storage.sync : api.storage.local;
  const areaName = hasSync ? "sync" : "local";

  global.GXStore = {
    api,
    areaName,
    get(defaults, cb) {
      area.get(defaults, cb);
    },
    set(obj, cb) {
      area.set(obj, cb || function () {});
    },
    onChanged(cb) {
      if (!api.storage || !api.storage.onChanged) return;
      api.storage.onChanged.addListener(function (changes, a) {
        if (a === areaName) cb(changes);
      });
    },
  };
})(typeof window !== "undefined" ? window : globalThis);
