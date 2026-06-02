# Spec: Subclasses + Feat Library (Tasha's/Xanathar's-ready)

**Date:** 2026-05-29
**Project:** `character_sheet` — Thrain Ironhammerson's interactive D&D sheet (vanilla HTML/CSS/JS + localStorage)
**Builds on:** the multiclass auto-feature system added in the prior task (`CLASS_FEATURES`, `syncMulticlassFeatures()`, the "Class Features" section).

## Context

The multiclass system now auto-populates **base-class** features when you enter a class + level.
Two gaps remain:

1. **Subclasses** — picking a subclass (e.g. "Fighter (Rune Knight)") adds no subclass-specific features.
2. **Feats** — feats are added via a free-text prompt; there's no accurate, searchable library.

The user also wants Tasha's Cauldron and Xanathar's Guide content.

### Data-source reality (investigated)

- **dnd5eapi.co**: 12 **SRD subclasses** (one per class), structured by level — usable. Only **1 feat** (Grappler).
- **open5e.com**: ~74 feats, but from *Level Up A5e* / *Tome of Heroes*, not D&D PHB/Tasha's/Xanathar's.
- **github.com/nick-aschenbach/dnd-data** (user-suggested, MIT): only backgrounds/classes/items/monsters/species/spells JSON. **No feats file, no subclass entries.** `classes.json` is ~10k-char prose per class — not parseable into discrete features.
- **Tasha's/Xanathar's subclasses & most feats are WotC-copyrighted and not in any free/legal API.**

**Conclusion:** auto-fetch the SRD; hand-author the premium-book content the user actually uses (legal as personal hand-entry from owned books). The sheet already hand-authors Rune Knight + 6 PHB feats, confirming this pattern.

## Approach — Hybrid

### 1. Data layer
- **Extend `scripts/fetch-class-features.mjs`**: also fetch the 12 SRD subclasses via
  `dnd5eapi.co/api/2014/subclasses/{index}/levels`, writing a new `SUBCLASS_FEATURES`
  map into the generated `class-features.js`. Same shape as `CLASS_FEATURES`:
  `{ "berserker": [ { id, level, name, desc }, ... ], ... }`, keyed by subclass slug.
- **New `homebrew-content.js`** (hand-authored, never overwritten by the generator),
  included in `index.html` before `script.js`. Defines two globals:
  - `EXTRA_SUBCLASS_FEATURES` — slug → `[{ id, level, name, desc }]` (e.g. `"rune-knight"`).
  - `FEAT_LIBRARY` — `[{ id, name, source, prerequisite, desc }]`.

### 2. Subclass features (parse the parenthetical)
- In `syncMulticlassFeatures()`, parse a row's class name: text before `(` → base class;
  text inside `( )` → subclass, slugified (lowercase, spaces→hyphens, strip punctuation).
- Resolve subclass features by slug: check `EXTRA_SUBCLASS_FEATURES` first, then `SUBCLASS_FEATURES`.
- Append level-gated subclass features (`feature.level <= rowLevel`) into that class's group
  in the existing **Class Features** section. Same dismiss/restore keys (`classKey:featureId`,
  using a `sub:<slug>` class key so they don't collide with base-class feature ids).
- **Unknown subclass** → silently render base-class features only (no error).
- **Rune Knight de-duplication:** the dedicated "⚒ Rune Knight Features" section (with its
  use-trackers) remains the single source of truth. `rune-knight` is excluded from the
  auto Class Features section via a small skip-list constant (`SUBCLASS_RENDER_SKIP = ['rune-knight']`).
  `EXTRA_SUBCLASS_FEATURES['rune-knight']` is still authored (for completeness / future reuse)
  but not rendered there.

### 3. Feat library — searchable picker
- Add a "🔍 Browse feats" button beside "+ Add Feat" in the Feats section header.
- Clicking toggles an inline panel: a search input + a scrollable filtered list of
  `FEAT_LIBRARY` entries (name + source + prerequisite). Filter matches name/source substring.
- Clicking a feat adds `{ id, name, desc }` to `featItems` (reusing the existing render/save
  path), then re-renders and saves. **Duplicate prevention:** if a feat with the same library
  id (or identical name) is already present, it's marked "added" / not re-added.
- The free-text "+ Add Feat" remains for custom/homebrew feats.

### 4. Seed content for `homebrew-content.js`
- `EXTRA_SUBCLASS_FEATURES['rune-knight']`: summaries of Thrain's existing Rune Knight
  features (authored but not rendered in Class Features per the skip-list above).
- `FEAT_LIBRARY` seeded with:
  - The 6 feats already in the sheet: Sentinel, Polearm Master, Great Weapon Master,
    Sharpshooter, Resilient, Tough (with sources).
  - A starter pack of ~12 popular feats across PHB/Tasha's/Xanathar's
    (e.g. Alert, Lucky, War Caster, Mobile, Magic Initiate, Fey Touched, Telekinetic,
    Skill Expert, Crusher, Piercer, Slasher, Eldritch Adept).

## Files touched
- `scripts/fetch-class-features.mjs` — add SRD subclass fetch; regenerate `class-features.js`.
- `class-features.js` — regenerated (now also defines `SUBCLASS_FEATURES`).
- `homebrew-content.js` — **new**, hand-authored; included in `index.html`.
- `script.js` — parenthetical parsing + subclass lookup in `syncMulticlassFeatures()`;
  feat-picker functions (`toggleFeatBrowser`, `renderFeatLibrary`, `addFeatFromLibrary`).
- `index.html` — `<script>` include for `homebrew-content.js`; Browse-feats button + panel markup.
- `style.css` — feat-picker panel styling.

## Out of scope
- Comprehensive feat/subclass coverage (only seeded content + SRD subclasses).
- Subclass dropdowns (parenthetical parsing only, per user choice).
- Feature usage-tracker automation for arbitrary subclasses (Rune Knight keeps its bespoke trackers).

## Verification
1. Run `node scripts/fetch-class-features.mjs`; confirm `class-features.js` now defines
   `SUBCLASS_FEATURES` with 12 subclasses (spot-check `berserker`, `champion`).
2. Serve over HTTP, open in browser, no console errors.
3. Multiclass row `Barbarian (Berserker)` level 3 → Class Features shows base Barbarian
   features **plus** Berserker's Frenzy (level 3). Change subclass to gibberish → only base features.
4. `Fighter (Rune Knight)` → Rune Knight features do **not** duplicate into Class Features;
   dedicated Rune Knight section unchanged.
5. Feats: click "Browse feats", search "sharp" → Sharpshooter listed; click it → added to Feats
   section with description; clicking again does not duplicate. Custom "+ Add Feat" still works.
6. Reload → subclass features, added feats, and dismiss state all persist.
