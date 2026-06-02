# Spec: Multiclass dropdowns + Spellcasting

**Date:** 2026-06-02
**Project:** `character_sheet` — Thrain Ironhammerson's interactive D&D sheet.
**Builds on:** the multiclass class/subclass-feature system and battle tracker added earlier.

## Context

Two gaps surfaced while the user explored a Cleric multiclass:
1. Selecting a multiclass is free-text + datalist — easy to mistype a subclass.
2. There is **no spellcasting support at all** — no way to pick spells, no slot tracking,
   nothing in the battle tracker. The sheet was built for a martial Fighter.

Delivered in **phases** (each deployed independently). **This spec covers Phases 1 & 2.**
Phase 3 (cast from battle tracker) is a later effort.

## Phase 1 — Multiclass dropdowns

Replace each row's single free-text class box with two dependent dropdowns that still
produce the existing `"Class (Subclass)"` value, so **all downstream logic is unchanged**
(feature sync, battle tracker, persistence all read `data-mc-key="mc_class_N"`).

- **Class select**: the 12 classes, plus "— class —" (blank) and "Custom…".
- **Subclass select**: repopulates from a `SUBCLASS_BY_CLASS` display map covering the
  subclasses we have data for (SRD + homebrew), e.g. `cleric → [Life Domain (life),
  Twilight Domain (twilight-domain)]`, `fighter → [Champion, Rune Knight]`,
  `wizard → [Evocation, War Magic]`. Plus "— none —".
- The two selects write a hidden `<input class="mc-class-name" data-mc-key="mc_class_N">`
  with `"Class (Subclass)"`; `onchange` → `recalcAll(); saveSheet(true)`.
- **Custom…** reveals the old free-text input for homebrew not in the lists (no capability lost).
- Friendly subclass display names slugify back to the right key via existing forgiving match
  (e.g. "Oath of Devotion" → contains "devotion"; "War Magic" → "war-magic").
- `loadSheet` restore + `addMCRow` updated to build the dropdown row and pre-select from the
  saved combined string.

## Phase 2 — Spells

### Data — `scripts/fetch-spells.mjs` (new) → `class-spells.js` (new, generated)
- For each caster class (`bard, cleric, druid, paladin, ranger, sorcerer, warlock, wizard`),
  fetch `/api/2014/classes/{c}/spells`, then each spell's `/api/2014/spells/{index}` detail.
- Output `SPELLS`: unique spells by index, each `{ index, name, level, school, casting_time,
  range, components, duration, concentration, ritual, classes:[], desc }`.
- Included in `index.html` before `script.js`.

### Spellcasting helpers (`script.js`)
- `SPELL_ABILITY = { cleric:'wis', druid:'wis', wizard:'int', bard:'cha', sorcerer:'cha',
  warlock:'cha', paladin:'cha', ranger:'wis' }`.
- Caster level for slots: full casters (bard/cleric/druid/sorcerer/wizard) count full;
  half casters (paladin/ranger) count `floor(level/2)`; Fighter/others 0. Sum → standard
  **multiclass spellcaster slot table** (levels 1–9). `getSpellSlotMax(level)` returns the
  computed max; a per-level manual override (persisted) wins when set.

### "✨ Spells" section (`index.html` + `script.js`)
Full-width section, shown only when a caster class is present in the multiclass rows.
- **Stats row** per caster class: ability, **Spell Save DC** `8 + prof + mod`,
  **Spell Attack** `+prof + mod`.
- **Slot tracker**: levels 1–9, each `max` (auto, editable override) + used counter with
  +/– (or checkboxes); "Long Rest" resets used (hook into existing rest if present, else local).
- **Spell picker**: "✨ Browse spells" toggle → search + level-grouped list filtered to the
  caster class(es) present; click to add to the character's spell list. Each listed spell:
  name, level, school, casting time, concentration/ritual tags, expandable description, and a
  **Prepared** checkbox (cantrips always prepared). Duplicate-prevented by index.
- **Domain spells**: optional `domainSpells: [indexes]` on homebrew subclass entries
  (seed Twilight Domain) → auto-added to the list and flagged "always prepared".
- Persistence: `_spells` (chosen list with prepared flags) and `_spell_slot_overrides` /
  `_spell_slots_used` via the existing `collectData`/`applySheetData` path.

## Files
- `index.html` — dropdown row markup + `class-spells.js` include + Spells section.
- `script.js` — dropdown build/restore, `SUBCLASS_BY_CLASS`, spell stats/slots/picker render,
  persistence hooks.
- `scripts/fetch-spells.mjs`, `class-spells.js` — new.
- `homebrew-content.js` — add `domainSpells` to `twilight-domain`.
- `style.css` — dropdown + Spells section styling.

## Out of scope (Phase 3+)
- Casting spells from the battle tracker (next phase).
- Pact Magic (Warlock) slot model; ritual-only casting nuance; spell-by-spell upcasting math.

## Verification
1. `node scripts/fetch-spells.mjs` → `class-spells.js` defines `SPELLS` with cleric entries
   (spot-check Cure Wounds level 1, Guidance cantrip, classes includes "cleric").
2. Dropdown: pick Cleric → Twilight Domain; hidden field = "Cleric (Twilight Domain)";
   Class Features still populate; Custom… still allows free text; persists across reload.
3. Spells: with `Cleric (Twilight Domain)` level N, Spells section shows WIS DC/attack,
   auto slots for caster level N (overridable), picker lists cleric spells, prepared toggles
   persist across reload; Twilight domain spells auto-added.
4. No console errors; nothing changes for a pure-martial (no caster) configuration.
