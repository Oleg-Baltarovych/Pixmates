# Third-party assets — licences

> Everything drawn (characters, FX, icons) is original and made by code (ADR 004, ADR 005). This file lists the third-party assets that ship in builds, or are planned to. Add a row in the same commit that adds an asset. Every shipped asset also ships its licence text (see UI-GUIDE §5).

## Fonts (D-26, `docs/design/UI-GUIDE.md` §5) — planned, not bundled yet
Checked 2026-11-28 against `github.com/google/fonts` (`ofl/<family>/OFL.txt`, `METADATA.pb`) and the npm registry.

| Font | Role | Licence | Copyright line (verbatim) | RFN | Cyrillic | Planned source |
|---|---|---|---|---|---|---|
| Tiny5 (Stefan Schmidt) | headings, labels, buttons | SIL OFL 1.1 | Copyright 2022-2024 The Tiny5 Project Authors (https://github.com/Gissio/font_tiny5) | none | `cyrillic`, `cyrillic-ext` | `@fontsource/tiny5` 5.3.0 (OFL-1.1) |
| Press Start 2P (CodeMan38) | 8-px tags, `kbd`, step numbers | SIL OFL 1.1 | Copyright 2012 The Press Start 2P Project Authors (cody@zone38.net), with Reserved Font Name "Press Start 2P". | **"Press Start 2P"** | `cyrillic`, `cyrillic-ext` | unmodified `PressStart2P-Regular.ttf` from `google/fonts` (pinned commit). No subsetting or conversion, because that would make a Modified Version that may not use the RFN. Or drop the font (UI-GUIDE Q-1) |
| Rubik (Hubert & Fischer, Meir Sadan, Cyreal, Daniel Grumer, Omaima Dajani) | body, chat, settings text | SIL OFL 1.1 | Copyright 2015 The Rubik Project Authors (https://github.com/googlefonts/rubik) | none | `cyrillic`, `cyrillic-ext` | `@fontsource-variable/rubik` 5.3.0 (OFL-1.1), `wght` 300–900, upright only |

OFL 1.1 obligations that apply to us:
- the fonts may be bundled and redistributed with the app, including commercially, as long as they are not sold on their own;
- the copyright notice and the licence text go with every copy (in the installer/app, not only in this repo);
- a Modified Version (subset, converted, edited) must not use a Reserved Font Name;
- the fonts stay under OFL; the app's own licence is unaffected.

Monospace `Cascadia Mono` / `Consolas` are system fonts on Windows 11. They are not bundled.
