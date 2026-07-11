/*
 * popup.js — the whole extension in one tabbed popup.
 *
 * Two tabs, each self-contained:
 *   • Random   — a live random password + all the random-mode settings.
 *   • Memorable — a live passphrase + all the memorable-mode settings.
 * The password shown is a live preview of the active tab: any setting change
 * re-generates it, so you see the effect immediately. Everything persists via
 * GXStore (storage.sync where available, else storage.local).
 */
(function () {
  "use strict";

  const $ = (id) => document.getElementById(id);
  const D = Gaetano.DEFAULTS;
  const SLIDER_IDS = ["leetProb", "caseProb"];

  let settings = Object.assign({}, D);

  const listEl = $("list");
  const tabsEl = $("tabs");
  const toastEl = $("toast");

  // ---- storage ----
  function loadSettings() {
    return new Promise((resolve) => {
      GXStore.get(D, (stored) => {
        settings = Object.assign({}, D, stored);
        settings.leetLetters = Object.assign({}, D.leetLetters, stored.leetLetters);
        settings.minLength = Math.max(7, settings.minLength | 0);
        resolve();
      });
    });
  }

  let saveTimer;
  function save() {
    GXStore.set(settings, () => {
      const f = $("savedFlag");
      f.classList.add("show");
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => f.classList.remove("show"), 1000);
    });
  }

  // Persist and refresh the live password. Called after every settings edit.
  function commit() {
    save();
    render();
  }

  // ---- the live password ----
  function render() {
    const pw = Gaetano.generate(settings);
    listEl.innerHTML = "";

    const li = document.createElement("li");
    li.className = "pw";
    li.title = "Click to copy";

    const code = document.createElement("code");
    code.textContent = pw;

    const strength = Gaetano.strength(pw);
    const tag = document.createElement("span");
    tag.className = "tag " + strength;
    tag.textContent = strength;

    const hint = document.createElement("span");
    hint.className = "copy-hint";
    hint.textContent = "⧉";

    li.append(code, tag, hint);
    li.addEventListener("click", () => copy(pw));
    listEl.appendChild(li);
  }

  // ---- clipboard + toast ----
  async function copy(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (e) {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    toast("copied ✓");
  }

  let toastTimer;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 1400);
  }

  // ---- tab switching ----
  function syncTabs() {
    const mem = settings.mode === "memorable";
    for (const t of tabsEl.querySelectorAll(".tab")) {
      t.classList.toggle("active", t.dataset.mode === settings.mode);
    }
    $("randomPanel").classList.toggle("hidden", mem);
    $("memorablePanel").classList.toggle("hidden", !mem);
  }

  // ---- shared: gaytano checkboxes (one per tab, kept in sync) ----
  function syncGaytano() {
    for (const cb of document.querySelectorAll(".gaytano-cb")) cb.checked = settings.includeGaytano;
  }

  // ---- random-mode settings UI ----
  function setSlider(id, value, label) {
    $(id).value = value;
    $(id + "Val").textContent = label;
  }

  function syncSliders() {
    setSlider("leetProb", Math.round(settings.leetProb * 100), Math.round(settings.leetProb * 100) + "%");
    setSlider("caseProb", Math.round(settings.caseProb * 100), Math.round(settings.caseProb * 100) + "%");
    setSlider("minLength", settings.minLength, settings.minLength);
  }

  function renderLeetGrid() {
    const grid = $("leetLetters");
    grid.innerHTML = "";
    for (const letter of Object.keys(Gaetano.LEET)) {
      const cell = document.createElement("label");
      cell.className = "leet-cell";
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = settings.leetLetters[letter] !== false;
      cb.addEventListener("change", () => {
        settings.leetLetters[letter] = cb.checked;
        commit();
      });
      const maps = document.createElement("span");
      const arrow = document.createElement("span");
      arrow.className = "maps";
      arrow.textContent = "→" + Gaetano.LEET[letter];
      maps.append(document.createTextNode(letter), arrow);
      cell.append(cb, maps);
      grid.appendChild(cell);
    }
  }

  // Populate the non-slider controls from the current settings object.
  function bindSettings() {
    syncGaytano();
    setSlider("memWords", settings.memWords, settings.memWords);
    $("memSeparator").value = settings.memSeparator;
    $("memCapitalize").checked = settings.memCapitalize;
    $("memTrailingNumber").checked = settings.memTrailingNumber;
  }

  // leetProb / caseProb sliders (0-100 -> 0..1).
  function onSliderInput(id) {
    settings[id] = Number($(id).value) / 100;
    syncSliders();
    commit();
  }

  // ---- events ----
  function attach() {
    // tabs
    tabsEl.addEventListener("click", (e) => {
      const t = e.target.closest(".tab");
      if (!t) return;
      settings.mode = t.dataset.mode;
      syncTabs();
      commit();
    });

    $("regen").addEventListener("click", render);

    // shared: gaytano (both tabs' checkboxes)
    for (const cb of document.querySelectorAll(".gaytano-cb")) {
      cb.addEventListener("change", () => {
        settings.includeGaytano = cb.checked;
        syncGaytano();
        commit();
      });
    }

    // leet / case sliders
    for (const id of SLIDER_IDS) {
      $(id).addEventListener("input", () => onSliderInput(id));
    }

    // length
    $("minLength").addEventListener("input", () => {
      settings.minLength = Number($("minLength").value);
      setSlider("minLength", settings.minLength, settings.minLength);
      commit();
    });

    // memorable
    $("memWords").addEventListener("input", () => {
      settings.memWords = Number($("memWords").value);
      setSlider("memWords", settings.memWords, settings.memWords);
      commit();
    });
    $("memSeparator").addEventListener("change", () => { settings.memSeparator = $("memSeparator").value; commit(); });
    $("memCapitalize").addEventListener("change", () => { settings.memCapitalize = $("memCapitalize").checked; commit(); });
    $("memTrailingNumber").addEventListener("change", () => { settings.memTrailingNumber = $("memTrailingNumber").checked; commit(); });

    // reset
    $("reset").addEventListener("click", () => {
      settings = JSON.parse(JSON.stringify(D));
      GXStore.set(settings, () => renderAll());
    });
  }

  // Refresh the entire UI from the settings object.
  function renderAll() {
    renderLeetGrid();
    bindSettings();
    syncSliders();
    syncTabs();
    render();
  }

  // ---- boot ----
  loadSettings().then(() => {
    attach();
    renderAll();
  });
})();
