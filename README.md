# Gaetanerator 🔒

A cross-browser extension (Manifest V3) that generates passwords, for both
**Chromium** browsers and **Firefox / LibreWolf**. Every password is a mutated
variation of **Gaetano**.

## Load it — Firefox / LibreWolf

Temporary load (gone on restart, no signing needed — best for tinkering):

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select the **`manifest.json`** file inside `gaetano-extension/`
4. Pin the green padlock-G and click it.

To keep it permanently you need a signed build. Either submit
`dist/gaetanerator-1.0.0.zip` to [addons.mozilla.org](https://addons.mozilla.org)
for signing, or — in LibreWolf/Developer/ESR builds — set
`xpinstall.signatures.required` to `false` in `about:config` and install the zip.

## Load it — Chromium (Chrome / Brave / Edge / etc.)

1. Open `chrome://extensions` (or `brave://extensions`, `edge://extensions`, …)
2. Toggle **Developer mode** on (top-right)
3. Click **Load unpacked**
4. Select this folder: `gaetano-extension/`
5. Pin the green padlock-G to your toolbar and click it.

> Chromium will show a harmless warning about the `browser_specific_settings`
> key — that key is for Firefox and Chrome just ignores it.

## Two password types

Switch between them with the toggle at the top of the popup (or in Settings):

- **🎲 Random** — a mangled single word: `9@37@No&4&9-#=`
- **📖 Memorable** — a passphrase where every word is Gaetano:
  `Gaetano-Gaetano-Gaetano-Gaetano`, `gaetano7,gaetano8,gaetano3`, etc.

## Using it

Everything lives in the popup — there's no separate settings page.

- **Generate** — click the toolbar icon for one password. Click it to copy.
  Toggle **Random / Memorable**; in random mode the chips
  (mild / medium / spicy / max) set chaos on the fly. Hit **↻ Regenerate**
  for a new one.
- **Settings** — click the ⚙ gear to slide into the inline settings panel;
  the **‹** back button returns to the generator. Changes save instantly.

## What you can customize (⚙ settings panel)

| Setting | What it does |
|---|---|
| **Include gaytano** | Mixes `Gaytano` in for ~50% of the Gaetanos. |
| **Password type** | Switch between Random and Memorable. |

### Random mode
Three sliders and a set of per-letter toggles:

| Setting | What it does |
|---|---|
| **Leetspeak chance** | How often letters morph (`g→9`, `a→@`, `e→3`, `t→7`, `o→0`). |
| **Case-flip chance** | How often letters flip case (`GaEtAnO`). |
| **Length** | Total length (7–40). The core is Gaetano; it pads out to this length with *more* Gaetano — so a longer password is just more Gaetano (`Gaetanogaetanoga…`). |
| **Leetspeak substitutions** | Toggle morphing per letter. Only Gaetano's letters appear — `g a e t o` (`n` has no ASCII leet form, so it never substitutes). |

### Memorable mode
| Setting | What it does |
|---|---|
| **Number of words** | 1–10 words per passphrase. |
| **Separator** | hyphens, spaces, periods, commas, underscores, numbers, or numbers **AND** symbols between words. |
| **Capitalize each word** | `Gaetano-Gaetano` vs. `gaetano-gaetano`. |
| **Number after each word** | `Gaetano9` on/off. |

Settings save automatically. They use `storage.sync` where available (syncing
across your browser profile) and fall back to `storage.local` on privacy-hardened
builds like LibreWolf where sync storage is turned off.

## How it works

All randomness comes from the Web Crypto CSPRNG (`crypto.getRandomValues`) with
rejection sampling for unbiased picks — never `Math.random()`. Pure vanilla JS,
no build step, no dependencies, no network access.

## ⚠ A word on security

These are fun, and cryptographically *random*, but they're built on a
dictionary name — which is a real weakness against a targeted attacker who
knows the theme. Great for low-stakes logins and laughs. For anything that
matters, crank **Min length** up, enable all character classes, and use several
base words — or, honestly, use a real password manager. Long live Gaetano. 🇮🇹
