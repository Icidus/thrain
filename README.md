# ⚒ Thrain Ironhammerson — D&D Beyond-Level-20 Character Sheet

A custom HTML character sheet for **Thrain (Kreb-Smasher) Ironhammerson**, a Rockman (Dwarf) Fighter (Rune Knight) — designed to track characters beyond the standard D&D 5e level 20 cap, with multiclass support and a built-in XP tracker.

---

## Features

- **Fully editable** — click any field to edit inline
- **Auto-calculated** stats: modifiers, saves, skills, passive perception, proficiency bonus, Rune Save DC, attack bonuses, weapon damage
- **Belt of Giant Strength toggle** — checkbox updates STR modifier and weapon attack bonuses automatically
- **Beyond-level-20 XP tracker** — XP thresholds doubling from 355K (Lv 20) to 710K (Lv 21), 1.42M (Lv 22), etc.
- **Proficiency bonus auto-scales** past level 20 (+7 at Lv 21–24, +8 at Lv 25–28…)
- **Multiclass support** — add/remove class rows, total level recalculates everything
- **Level Up Log** — record what you gained at each new level
- **Giant's Might tracker** — use/restore button with automatic tracking
- **localStorage persistence** — all changes auto-save in the browser; no server needed
- **Print to PDF** — clean print layout via `Ctrl/Cmd + P` → Save as PDF
- **Export PDF button** — one-click PDF via html2pdf.js (CDN)
- **GitHub Pages ready** — just push and enable Pages in repo settings

---

## Usage

### Local
Open `index.html` directly in any modern browser — no server required.

```bash
open index.html          # macOS
start index.html         # Windows
xdg-open index.html      # Linux
```

### GitHub Pages
1. Push this repo to GitHub
2. Go to **Settings → Pages**
3. Under **Source**, select `Deploy from a branch` → `main` → `/ (root)`
4. Save — your sheet will be live at `https://<username>.github.io/character_sheet/`

### Export to PDF
- **Quick print:** `Ctrl/Cmd + P` → choose "Save as PDF"
- **Export button:** Click `📄 Export PDF` in the toolbar — generates a multi-page letter-size PDF

---

## XP Thresholds (Beyond Level 20)

| Level | XP Required  | Prof Bonus |
|-------|-------------|------------|
| 20    | 355,000     | +6         |
| 21    | 710,000     | +7         |
| 22    | 1,420,000   | +7         |
| 23    | 2,840,000   | +7         |
| 24    | 5,680,000   | +7         |
| 25    | 11,360,000  | +8         |
| 26    | 22,720,000  | +8         |
| 27    | 45,440,000  | +8         |
| 28    | 90,880,000  | +8         |

---

## Character Summary

| Property | Value |
|----------|-------|
| Name | Thrain (Kreb-Smasher) Ironhammerson |
| Race | Rockman (Dwarf) |
| Class | Fighter (Rune Knight) 20 |
| Background | Fisherman |
| Alignment | Lawful Good |
| HP | 304 |
| AC | 18 (Plate Armor) |

### Stats
| STR | DEX | CON | INT | WIS | CHA |
|-----|-----|-----|-----|-----|-----|
| 18 (23 w/ Belt) | 10 | 22 | 8 | 14 | 12 |

### Runes
Fire · Stone · Hill · Cloud · Storm · Runic Shield

---

## Recommended Multiclass: Barbarian

If going beyond level 20 with multiclassing, **Barbarian** synergizes strongly:
- **Reckless Attack (Barb 2)** — at-will advantage on attacks, devastating with Great Weapon Master
- **Rage** — bonus damage on every hit, Rage resistance stacks with existing non-magical piercing/slashing resistance
- **Danger Sense (Barb 2)** — advantage on DEX saves you can see (shores up weakest save)
- Your **CON 22** maximizes Rage rounds and concentration saves

---

## Files

```
character_sheet/
├── index.html    — Main character sheet (open this in browser)
├── style.css     — Layout, print styles, responsive design
├── script.js     — Auto-calculation, localStorage, PDF export
└── README.md     — This file
```
