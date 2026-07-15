/*
 * gaetano.js — the sacred generation engine.
 *
 * Shared by the popup and the options page. Defines a global `Gaetano`
 * object. No build step, no dependencies. All randomness comes from the
 * Web Crypto CSPRNG (crypto.getRandomValues), never Math.random().
 */
(function (global) {
  "use strict";

  // Leetspeak substitution table — only the letters that spell "gaetano"
  // (n has no ASCII leet form, so it isn't substitutable). Each letter maps
  // to a string of plausible swaps; one char is chosen at random when it fires.
  const LEET = {
    g: "9",
    a: "@4",
    e: "3",
    t: "7",
    o: "0",
  };

  // Personas — the pool of "sacred words" a password is built from. Gaetano is
  // the original; Michael swaps in the Michelin-Man family of names. Each has a
  // `words` pool (drawn from at random) and a `pad` string used to spell out the
  // length padding in random mode.
  const PERSONAS = {
    gaetano: {
      label: "Gaetano",
      tagline: "Every password is just Gaetano",
      words: ["Gaetano"],
      pad: "gaetano",
    },
    michael: {
      label: "Michael",
      tagline: "Every password is just the Michelin Man",
      words: ["Michelin Man", "Big Wheeler", "Michelle", "Michael"],
      pad: "michael",
    },
  };

  // The default settings object. This is the single source of truth for the
  // settings schema — the UI renders from it, storage merges onto it.
  const DEFAULTS = {
    persona: "gaetano",       // which word pool to build from ("gaetano" | "michael")

    includeGaytano: false,    // mix in "Gaytano" ~50/50 with "Gaetano" (gaetano only)

    leetProb: 0.45,           // chance each letter leet-swaps
    caseProb: 0.35,           // chance each letter flips case
    minLength: 14,            // pad the result out to at least this many chars

    symbols: "!@#$%^&*_-+=?", // symbol pool for the memorable "numsym" separator

    // ---- password type ----
    mode: "random",           // "random" | "memorable"

    // memorable-mode settings (word-style passphrases, e.g. Gaetano-Gaetano-…)
    memWords: 4,              // how many words (1-10)
    memCapitalize: true,      // Capitalize the first letter of each word
    memSeparator: "hyphen",   // hyphen|space|period|comma|underscore|number|numsym
    memTrailingNumber: false, // append a digit after each word (Gaetano9)

    leetLetters: {            // which substitutions are allowed to fire
      g: true, a: true, e: true, t: true, o: true,
    },
  };

  // ---- CSPRNG helpers ------------------------------------------------------

  /** Uniform random integer in [0, max) using rejection sampling. */
  function randInt(max) {
    if (max <= 0) return 0;
    const limit = Math.floor(0xffffffff / max) * max;
    const buf = new Uint32Array(1);
    let x;
    do {
      crypto.getRandomValues(buf);
      x = buf[0];
    } while (x >= limit);
    return x % max;
  }

  /** Fair coin flip that lands true with probability p (0..1). */
  function chance(p) {
    if (p <= 0) return false;
    if (p >= 1) return true;
    return randInt(10000) < Math.round(p * 10000);
  }

  /** Random element of an array or random character of a string. */
  function pick(seq) {
    return seq[randInt(seq.length)];
  }

  // ---- Core generation -----------------------------------------------------

  /** Resolve a settings object over the defaults, with sanity clamps. */
  function resolve(settings) {
    const s = Object.assign({}, DEFAULTS, settings || {});
    s.leetLetters = Object.assign({}, DEFAULTS.leetLetters, settings && settings.leetLetters);
    s.memWords = Math.max(1, Math.min((s.memWords | 0) || 1, 10));
    if (!PERSONAS[s.persona]) s.persona = DEFAULTS.persona;
    return s;
  }

  /** Apply leetspeak + case flips to a word. */
  function mutate(word, s) {
    let out = "";
    for (const ch of word) {
      const low = ch.toLowerCase();
      if (LEET[low] && s.leetLetters[low] && chance(s.leetProb)) {
        out += pick(LEET[low]);
      } else if (chance(s.caseProb)) {
        out += ch === low ? ch.toUpperCase() : ch.toLowerCase();
      } else {
        out += ch;
      }
    }
    return out;
  }

  /**
   * Padding is also Gaetano: spell out `count` letters of "gaetano" (cycled),
   * then run them through the same mutation as the core so leet/case chaos
   * applies. mutate() is 1-char-in / 1-char-out, so the length is preserved.
   */
  function spellPad(s, count) {
    if (count <= 0) return "";
    const persona = PERSONAS[s.persona] || PERSONAS[DEFAULTS.persona];
    // Use only the letters of the pad word (no spaces) so padding stays compact.
    const word = persona.pad.replace(/\s+/g, "") || "gaetano";
    let raw = "";
    for (let i = 0; i < count; i++) raw += word[i % word.length];
    return mutate(raw, s);
  }

  /**
   * The sacred word — a random pick from the active persona's word pool. For
   * Gaetano, a coin-flip swaps in "Gaytano" when includeGaytano is on. Casing
   * is normalized by callers (random via mutate, memorable via memCapitalize).
   */
  function pickBase(s) {
    if (s.persona === "gaetano" || !PERSONAS[s.persona]) {
      return s.includeGaytano && chance(0.5) ? "Gaytano" : "Gaetano";
    }
    return pick(PERSONAS[s.persona].words);
  }

  /**
   * Generate a single password: a mutated Gaetano, padded out with more
   * (mutated) Gaetano until it reaches the requested length.
   */
  function one(s) {
    let result = mutate(pickBase(s), s);
    if (result.length < s.minLength) {
      result += spellPad(s, s.minLength - result.length);
    }
    return result;
  }

  // ---- memorable generation -----------------------------------------------

  // Fixed word separators. "number" / "numsym" are handled specially below.
  const FIXED_SEP = { hyphen: "-", space: " ", period: ".", comma: ",", underscore: "_" };

  /** One separator token for the given kind (random for number/numsym). */
  function separatorFor(kind, s) {
    if (kind === "number") return String(randInt(10));
    if (kind === "numsym") return pick("0123456789" + (s.symbols || "!@#$%^&*"));
    return FIXED_SEP[kind] != null ? FIXED_SEP[kind] : "-";
  }

  /** Generate one memorable passphrase — every word is Gaetano (or Gaytano). */
  function oneMemorable(s) {
    const n = Math.max(1, Math.min((s.memWords | 0) || 1, 10));
    const parts = [];
    for (let i = 0; i < n; i++) {
      let w = pickBase(s);
      // Title-case each whitespace token so multi-word names ("Michelin Man")
      // stay properly cased; lower-case everything when capitalize is off.
      w = s.memCapitalize
        ? w.replace(/\S+/g, (t) => t.charAt(0).toUpperCase() + t.slice(1).toLowerCase())
        : w.toLowerCase();
      if (s.memTrailingNumber) w += String(randInt(10));
      parts.push(w);
    }
    // A fresh separator is drawn per gap, so number/numsym vary between words.
    let out = parts[0] || "";
    for (let i = 1; i < parts.length; i++) {
      out += separatorFor(s.memSeparator, s) + parts[i];
    }
    return out;
  }

  /** Generate a single password, dispatching on the selected mode. */
  function generate(settings) {
    const s = resolve(settings);
    return (s.mode === "memorable" ? oneMemorable : one)(s);
  }

  /** Rough strength label for display. */
  function strength(pw) {
    const classes =
      (/[a-z]/.test(pw) ? 1 : 0) +
      (/[A-Z]/.test(pw) ? 1 : 0) +
      (/[0-9]/.test(pw) ? 1 : 0) +
      (/[^A-Za-z0-9]/.test(pw) ? 1 : 0);
    if (pw.length >= 14 && classes === 4) return "strong";
    if (pw.length >= 10 && classes >= 3) return "decent";
    return "weak-ish";
  }

  global.Gaetano = {
    DEFAULTS, LEET, PERSONAS,
    generate, strength, resolve,
    _internals: { randInt, chance, pick, mutate, one, oneMemorable, separatorFor, pickBase },
  };
})(typeof window !== "undefined" ? window : globalThis);
