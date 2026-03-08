/* ═══════════════════════════════════════════════════════════
   Thrain Ironhammerson — Beyond-20 D&D Character Sheet
   script.js — Calculations, localStorage, PDF export
   ═══════════════════════════════════════════════════════════ */

'use strict';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY = 'thrain_character_sheet_v1';

/** XP thresholds for levels 20–30 (doubling from 355k at 20) */
const XP_THRESHOLDS = {
  20: 355_000,
  21: 710_000,
  22: 1_420_000,
  23: 2_840_000,
  24: 5_680_000,
  25: 11_360_000,
  26: 22_720_000,
  27: 45_440_000,
  28: 90_880_000,
  29: 181_760_000,
  30: 363_520_000,
};

/** Equipment / special defaults */
const BELT_STR = 23;
const DWARVEN_THROWER_BONUS = 3;
const ARCHERY_STYLE_BONUS = 2;

/** Double-proficiency skill keys — these use 2× prof instead of 1× */
const DOUBLE_PROF_SKILLS = new Set(['sleight', 'deception', 'insight', 'arcana']);

/** Proficient save keys */
const PROF_SAVES = new Set(['con', 'wis']);

/** Proficient skill keys */
const PROF_SKILLS_MAP = {
  athletics:  'str',
  perception: 'wis',
  survival:   'wis',
  sleight:    'dex',  // double prof
  deception:  'cha',  // double prof
  insight:    'wis',  // double prof
  arcana:     'int',  // double prof
};

const SKILL_KEYS = [
  'athletics', 'acrobatics', 'sleight', 'stealth',
  'arcana', 'history', 'investigation', 'nature', 'religion',
  'animal', 'insight', 'medicine', 'perception', 'survival',
  'deception', 'intimidation', 'performance', 'persuasion',
];

const DEFAULT_SKILL_BONUSES = {
  athletics: 0,
  acrobatics: 0,
  sleight: 0,
  stealth: 0,
  arcana: 0,
  history: 0,
  investigation: 0,
  nature: 0,
  religion: 0,
  animal: 0,
  insight: 0,
  medicine: 0,
  perception: 1,
  survival: 0,
  deception: 0,
  intimidation: 0,
  performance: 0,
  persuasion: 0,
};

// Multiclass counter for dynamic rows
let mcRowCount = 1;

// ─────────────────────────────────────────────────────────────
// DEFAULT EQUIPMENT
// ─────────────────────────────────────────────────────────────

const DEFAULT_EQUIPMENT = [
  { id: 'e1',  cat: 'armor',     name: 'Plate Armor',                    desc: 'AC 18' },
  { id: 'e2',  cat: 'armor',     name: 'Shield',                         desc: '+2 AC (if equipped)' },
  { id: 'e3',  cat: 'magic',     name: 'Belt of Giant Strength (Frost Giant)', desc: 'STR becomes 23' },
  { id: 'e4',  cat: 'weapon',    name: 'Dwarven Thrower (+3)',            desc: 'Magic warhammer; thrown (20/60 ft); returns end of turn; +2d8 bludg (dwarf); +4d8 vs giants' },
  { id: 'e5',  cat: 'weapon',    name: 'Halberd',                        desc: 'Polearm, 1d10 slashing, reach 10 ft' },
  { id: 'e6',  cat: 'weapon',    name: 'Battle Axe',                     desc: '1d8 slashing, versatile 1d10' },
  { id: 'e7',  cat: 'magic',     name: 'Magical Horn',                   desc: 'Calls a Valkyrie to fight alongside you. After battle you must immediately fight the Valkyrie.' },
  { id: 'e8',  cat: 'tool',      name: "Brewer's Kit",                   desc: "Full brewer's supplies — proficient" },
  { id: 'e9',  cat: 'tool',      name: "Smith's Tools",                  desc: 'Double proficiency (Rune Knight feature)' },
];

/** In-memory equipment list — populated from localStorage or defaults */
let equipmentItems = [];

// ─────────────────────────────────────────────────────────────
// DEFAULT LANGUAGES, TOOLS, FEATS
// ─────────────────────────────────────────────────────────────

const DEFAULT_LANGUAGES = [
  { id: 'la1', name: 'Common',          note: '' },
  { id: 'la2', name: 'Nidavellrian',    note: 'Dwarven tongue' },
  { id: 'la3', name: 'Yotun (Giant)',   note: 'Rune Knight study' },
];

const DEFAULT_TOOLS = [
  { id: 'to1', name: "Brewer's Supplies", note: 'Proficient', subitems: [
    { id: 'to1s1', name: 'Large Kettle',        have: true,  note: '' },
    { id: 'to1s2', name: 'Mash Tun',            have: true,  note: '' },
    { id: 'to1s3', name: 'Fermentation Vessel', have: true,  note: '' },
    { id: 'to1s4', name: 'Hops',                have: false, note: 'ingredient' },
    { id: 'to1s5', name: 'Malt',                have: false, note: 'ingredient' },
    { id: 'to1s6', name: 'Yeast',               have: false, note: 'ingredient' },
  ]},
  { id: 'to2', name: "Smith's Tools", note: '×2 Proficiency (Rune Knight)', subitems: [
    { id: 'to2s1', name: 'Hammer',       have: true, note: '' },
    { id: 'to2s2', name: 'Tongs',        have: true, note: '' },
    { id: 'to2s3', name: 'Bellows',      have: true, note: '' },
    { id: 'to2s4', name: 'Anvil',        have: true, note: '' },
    { id: 'to2s5', name: 'Quench Bucket',have: true, note: '' },
  ]},
];

const DEFAULT_FEATS = [
  { id: 'fe1', name: 'Sentinel',            desc: 'Opportunity attacks stop movement. Can attack creatures that attack others. Creatures can\'t disengage past you.' },
  { id: 'fe2', name: 'Polearm Master',      desc: 'Bonus action attack (1d4+STR) with butt end. Opportunity attacks when creatures enter reach.' },
  { id: 'fe3', name: 'Great Weapon Master', desc: 'On crit or kill, bonus action attack. Choose −5 to hit for +10 damage.' },
  { id: 'fe4', name: 'Sharpshooter',        desc: 'No disadv at long range. Ignore half/3/4 cover. −5 to hit for +10 damage (ranged).' },
  { id: 'fe5', name: 'Resilient',           desc: '+1 to chosen ability. Gain proficiency in that ability\'s saving throw.' },
  { id: 'fe6', name: 'Tough',               desc: 'HP max increases by 2 per level (+40 at Lv 20). Stacks with Rockman Toughness.' },
];

let languageItems = [];
let toolItems = [];
let featItems = [];

// ─────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadSheet(); // also calls renderEquipment + renderLanguages + renderTools + renderFeats internally
  recalcAll();
  updateXP();
  setFooterDate();
  hookAutoSave();

  // Fallbacks if loadSheet found no saved data
  if (equipmentItems.length === 0) {
    equipmentItems = DEFAULT_EQUIPMENT.map(e => normalizeEquipmentItem(e));
    renderEquipment();
  }
  if (languageItems.length === 0) {
    languageItems = DEFAULT_LANGUAGES.map(l => ({ ...l }));
    renderLanguages();
  }
  if (toolItems.length === 0) {
    toolItems = DEFAULT_TOOLS.map(t => ({ ...t }));
    renderTools();
  }
  if (featItems.length === 0) {
    featItems = DEFAULT_FEATS.map(f => ({ ...f }));
    renderFeats();
  }
});

/** Set the footer date stamp */
function setFooterDate() {
  const el = document.getElementById('footer-date');
  if (el) el.textContent = 'Updated: ' + new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// ─────────────────────────────────────────────────────────────
// CALCULATIONS
// ─────────────────────────────────────────────────────────────

/** Returns the stat modifier for a given score (standard D&D formula). */
function mod(score) {
  return Math.floor((parseInt(score, 10) - 10) / 2);
}

/** Formats a modifier with + or − sign. */
function fmtMod(n) {
  return (n >= 0 ? '+' : '') + n;
}

/** Proficiency bonus for a given total character level.
 *  Follows the standard 5e curve extended naturally: ceil(level/4)+1
 *  Lv 1-4→+2, 5-8→+3, 9-12→+4, 13-16→+5, 17-20→+6, 21-24→+7, 25-28→+8 …
 */
function profBonusForLevel(level) {
  return Math.ceil(level / 4) + 1;
}

/** Get integer value from an input[data-key] */
function getNum(key, fallback) {
  const el = document.querySelector(`[data-key="${key}"]`);
  if (!el) return fallback !== undefined ? fallback : 0;
  const v = parseInt(el.value ?? el.textContent, 10);
  return isNaN(v) ? (fallback !== undefined ? fallback : 0) : v;
}

function getSkillBonus(skillKey) {
  const el = document.querySelector(`.skill-bonus-input[data-skill="${skillKey}"]`);
  const fallback = DEFAULT_SKILL_BONUSES[skillKey] ?? 0;
  if (!el) return fallback;
  const v = parseInt(el.value, 10);
  return isNaN(v) ? fallback : v;
}

function getGiantsMightSize(totalLevel = calcTotalLevel()) {
  const sizeSelect = document.getElementById('bt-rune-size');
  return totalLevel >= 18 && sizeSelect?.value === 'huge' ? 'Huge' : 'Large';
}

/** Main recalculation — runs on any stat change. */
function recalcAll() {
  const beltActive = document.getElementById('belt-active')?.checked ?? false;

  // Raw stat values
  const rawStr = getNum('stat_str', 18);
  const rawDex = getNum('stat_dex', 10);
  const rawCon = getNum('stat_con', 22);
  const rawInt = getNum('stat_int', 8);
  const rawWis = getNum('stat_wis', 14);
  const rawCha = getNum('stat_cha', 12);

  // Effective STR (belt override if active)
  const effStr = beltActive ? Math.max(rawStr, BELT_STR) : rawStr;

  // Modifiers
  const mStr = mod(effStr);
  const mDex = mod(rawDex);
  const mCon = mod(rawCon);
  const mInt = mod(rawInt);
  const mWis = mod(rawWis);
  const mCha = mod(rawCha);

  // Show/hide belt indicator
  const beltIndicator = document.getElementById('belt-indicator');
  if (beltIndicator) beltIndicator.style.display = beltActive ? 'block' : 'none';

  // Update modifier displays
  setModDisplay('mod-str', mStr, beltActive ? `(base: ${fmtMod(mod(rawStr))})` : null);
  setModDisplay('mod-dex', mDex);
  setModDisplay('mod-con', mCon);
  setModDisplay('mod-int', mInt);
  setModDisplay('mod-wis', mWis);
  setModDisplay('mod-cha', mCha);

  // Total level (from multiclass rows)
  const totalLevel = calcTotalLevel();
  const prof = profBonusForLevel(totalLevel);

  // Update prof/level displays
  setText('prof-bonus-display', fmtMod(prof));
  setText('total-level-display', totalLevel);
  setText('mc-total', totalLevel);
  setText('mc-prof', fmtMod(prof));

  // Saving throws
  setText('save-str', fmtMod(mStr));
  setText('save-dex', fmtMod(mDex));
  setText('save-con', fmtMod(mCon + prof));  // proficient
  setText('save-int', fmtMod(mInt));
  setText('save-wis', fmtMod(mWis + prof));  // proficient
  setText('save-cha', fmtMod(mCha));

  // Skills
  const dpProf = prof * 2;
  const athleticsBonus = getSkillBonus('athletics');
  const acrobaticsBonus = getSkillBonus('acrobatics');
  const sleightBonus = getSkillBonus('sleight');
  const stealthBonus = getSkillBonus('stealth');
  const arcanaBonus = getSkillBonus('arcana');
  const historyBonus = getSkillBonus('history');
  const investigationBonus = getSkillBonus('investigation');
  const natureBonus = getSkillBonus('nature');
  const religionBonus = getSkillBonus('religion');
  const animalBonus = getSkillBonus('animal');
  const insightBonus = getSkillBonus('insight');
  const medicineBonus = getSkillBonus('medicine');
  const perceptionBonus = getSkillBonus('perception');
  const survivalBonus = getSkillBonus('survival');
  const deceptionBonus = getSkillBonus('deception');
  const intimidationBonus = getSkillBonus('intimidation');
  const performanceBonus = getSkillBonus('performance');
  const persuasionBonus = getSkillBonus('persuasion');

  setText('sk-athletics',   fmtMod(mStr + prof + athleticsBonus));
  setText('sk-acrobatics',  fmtMod(mDex + acrobaticsBonus));
  setText('sk-sleight',     fmtMod(mDex + dpProf + sleightBonus));
  setText('sk-stealth',     fmtMod(mDex + stealthBonus));
  setText('sk-arcana',      fmtMod(mInt + dpProf + arcanaBonus));
  setText('sk-history',     fmtMod(mInt + historyBonus));
  setText('sk-investigation',fmtMod(mInt + investigationBonus));
  setText('sk-nature',      fmtMod(mInt + natureBonus));
  setText('sk-religion',    fmtMod(mInt + religionBonus));
  setText('sk-animal',      fmtMod(mWis + animalBonus));
  setText('sk-insight',     fmtMod(mWis + dpProf + insightBonus));
  setText('sk-medicine',    fmtMod(mWis + medicineBonus));
  setText('sk-perception',  fmtMod(mWis + prof + perceptionBonus));
  setText('sk-survival',    fmtMod(mWis + prof + survivalBonus));
  setText('sk-deception',   fmtMod(mCha + dpProf + deceptionBonus));
  setText('sk-intimidation',fmtMod(mCha + intimidationBonus));
  setText('sk-performance', fmtMod(mCha + performanceBonus));
  setText('sk-persuasion',  fmtMod(mCha + persuasionBonus));

  // Passive scores (10 + modifier)
  const passivePerc = 10 + mWis + prof + perceptionBonus;
  const passiveInsight = 10 + mWis + dpProf + insightBonus;
  setText('passive-perception', passivePerc);
  setText('passive-insight', passiveInsight);
  setText('senses-perception', passivePerc);
  setText('senses-insight', passiveInsight);

  // Initiative
  setText('initiative-display', fmtMod(mDex));

  // AC — Plate (18) + optional shield (+2)
  const shieldActive = document.getElementById('shield-active')?.checked ?? false;
  const acVal = 18 + (shieldActive ? 2 : 0);
  setText('ac-display', acVal);
  const acNote = document.getElementById('ac-note');
  if (acNote) acNote.textContent = shieldActive ? 'Plate + Shield' : 'Plate Armor';

  // ── Quick Reference Bar ──
  setText('qr-initiative',   fmtMod(mDex));
  setText('qr-passive-perc', passivePerc);
  setText('qr-wis-save',     fmtMod(mWis + prof));
  setText('qr-ac',           acVal);
  const qrHPEl = document.querySelector('[data-key="max_hp"]');
  if (qrHPEl) setText('qr-hp', qrHPEl.value || 304);

  // Rune Save DC: 8 + prof + CON mod
  const runeDC = 8 + prof + mCon;
  setText('rune-dc-display', runeDC);
  // Update inline DC references inside rune cards
  document.querySelectorAll('.rune-dc-inline').forEach(el => { el.textContent = runeDC; });

  // Giant's Might: uses = prof bonus
  setText('giants-might-uses', prof);
  setText('gm-uses-text', prof);

  // Runic Shield: uses = prof bonus (per RAW, recharges LR)
  setText('runic-shield-max', prof);

  // Rockman Toughness: +1 per level
  setText('toughness-total', totalLevel);

  // Numa display from input
  const numaVal = getNum('numa_current', 20);
  setText('numa-display', numaVal);

  // Weapon attack bonus updates
  updateWeaponCalcs(mStr, mDex, prof, beltActive);

  // Update XP table highlights
  updateXPTableHighlights(getNum('current_xp', 355000));
}

/** Set text content of an element by id. */
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/** Update modifier display (with optional sub-note for belt) */
function setModDisplay(id, modVal, subNote) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = fmtMod(modVal);
  if (subNote) {
    el.title = subNote;
    el.style.borderBottom = '2px solid var(--gold)';
    el.style.cursor = 'help';
  } else {
    el.title = '';
    el.style.borderBottom = '';
    el.style.cursor = '';
  }
}

/** Calculate total character level from all multiclass rows. */
function calcTotalLevel() {
  let total = 0;
  document.querySelectorAll('[data-mc-key^="mc_level_"]').forEach(el => {
    const v = parseInt(el.value, 10);
    if (!isNaN(v)) total += v;
  });
  return total || 1;
}

/** Update weapon attack bonus displays. */
function updateWeaponCalcs(mStr, mDex, prof, beltActive) {
  const effStrMod = beltActive ? Math.max(mStr, mod(BELT_STR)) : mStr;
  const magicBonus = DWARVEN_THROWER_BONUS; // +3

  // ── Dwarven Thrower melee ──
  const meleeMod  = effStrMod + prof + magicBonus;     // e.g. +4+6+3 = +13 (no belt)
  const meleeDmg  = effStrMod + magicBonus;             // damage bonus only
  setText('thrower-melee-hit', fmtMod(meleeMod));
  setHtml('thrower-melee-dmg', `1d8${fmtMod(meleeDmg)} bludg<br/><em>Versatile: 1d10${fmtMod(meleeDmg)}</em>`);

  // ── Dwarven Thrower thrown (Archery +2) ──
  const thrownMod = effStrMod + prof + magicBonus + ARCHERY_STYLE_BONUS; // +15 no belt
  setText('thrower-thrown-hit', fmtMod(thrownMod));
  setHtml('thrower-thrown-dmg',
    `2d8${fmtMod(meleeDmg)} bludg<br/><em>vs Giant: 3d8${fmtMod(meleeDmg)}</em>`);

  // ── Dwarven Thrower GWM melee (–5/+10) ──
  const gwmMeleeMod = meleeMod - 5;
  const gwmMeleeDmg = meleeDmg + 10;
  setText('thrower-gwm-hit', fmtMod(gwmMeleeMod));
  setHtml('thrower-gwm-dmg', `1d8${fmtMod(gwmMeleeDmg)} bludg`);

  // ── Dwarven Thrower Sharpshooter thrown (–5/+10) ──
  const ssMod = thrownMod - 5;
  const ssDmg = meleeDmg + 10;
  setText('thrower-ss-hit', fmtMod(ssMod));
  setHtml('thrower-ss-dmg',
    `2d8${fmtMod(ssDmg)} bludg<br/><em>vs Giant: 3d8${fmtMod(ssDmg)}</em>`);

  // ── Halberd & Battle Axe ──
  const meleeBonus = effStrMod + prof;
  const meleeOnlyDmg = effStrMod;
  setText('halberd-hit', fmtMod(meleeBonus));
  setHtml('halberd-dmg',
    `1d10${fmtMod(meleeOnlyDmg)} slash<br/><em>Butt: 1d4${fmtMod(meleeOnlyDmg)}</em>`);
  setText('axe-hit', fmtMod(meleeBonus));
  setHtml('axe-dmg',
    `1d8${fmtMod(meleeOnlyDmg)} slash<br/><em>Versatile: 1d10${fmtMod(meleeOnlyDmg)}</em>`);

  // ── Second Wind display ──
  const totalLv = calcTotalLevel();
  setText('sw-level', totalLv);
}

/** Set innerHTML of an element by id */
function setHtml(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

// ─────────────────────────────────────────────────────────────
// XP TRACKER
// ─────────────────────────────────────────────────────────────

function updateXP() {
  // Sync both XP fields (header meta and section input)
  const headerXP = document.querySelector('[data-key="current_xp"]');
  const sectionXP = document.getElementById('xp-input');

  let currentXP = 0;
  if (document.activeElement === headerXP) {
    currentXP = parseInt(headerXP.textContent, 10) || 0;
    if (sectionXP) sectionXP.value = currentXP;
  } else if (document.activeElement === sectionXP) {
    currentXP = parseInt(sectionXP.value, 10) || 0;
    if (headerXP) headerXP.textContent = currentXP;
  } else {
    currentXP = parseInt(sectionXP?.value || '355000', 10) || 355000;
  }

  // Find current level from XP
  let currentLevel = 20;
  let nextLevel = 21;
  const levels = Object.keys(XP_THRESHOLDS).map(Number).sort((a, b) => a - b);
  for (const lv of levels) {
    if (currentXP >= XP_THRESHOLDS[lv]) currentLevel = lv;
  }
  nextLevel = currentLevel + 1;

  const currentThreshold = XP_THRESHOLDS[currentLevel] || XP_THRESHOLDS[20];
  const nextThreshold = XP_THRESHOLDS[nextLevel];

  const needed = document.getElementById('xp-needed');
  const bar = document.getElementById('xp-bar');
  const currentLabel = document.getElementById('xp-current-label');
  const levelLabel = document.getElementById('xp-level-label');
  const maxLabel = document.getElementById('xp-max-label');

  if (nextThreshold) {
    const xpIntoLevel = currentXP - currentThreshold;
    const xpNeeded = nextThreshold - currentXP;
    const rangeSize = nextThreshold - currentThreshold;
    const pct = Math.min(100, Math.max(0, (xpIntoLevel / rangeSize) * 100));

    if (needed) needed.textContent = `${xpNeeded.toLocaleString()} more (${nextThreshold.toLocaleString()} total needed)`;
    if (bar) bar.style.width = pct + '%';
    if (currentLabel) currentLabel.textContent = currentXP.toLocaleString();
    if (levelLabel) levelLabel.textContent = `Level ${currentLevel} → ${nextLevel}`;
    if (maxLabel) maxLabel.textContent = nextThreshold.toLocaleString();
  } else {
    if (needed) needed.textContent = 'Max tracked level reached!';
    if (bar) bar.style.width = '100%';
    if (levelLabel) levelLabel.textContent = `Level ${currentLevel} (MAX TRACKED)`;
  }

  updateXPTableHighlights(currentXP);
  recalcAll();
}

function updateXPTableHighlights(currentXP) {
  Object.keys(XP_THRESHOLDS).forEach(lv => {
    const cell = document.getElementById(`reached-${lv}`);
    const row = cell?.closest('tr');
    if (!cell) return;
    if (currentXP >= XP_THRESHOLDS[lv]) {
      cell.textContent = '✓';
      if (row) row.classList.add('reached');
    } else {
      cell.textContent = '—';
      if (row) row.classList.remove('reached');
    }
  });
}

// ─────────────────────────────────────────────────────────────
// GIANT'S MIGHT
// ─────────────────────────────────────────────────────────────

function spendGiantsMight() {
  const input = document.querySelector('[data-key="giants_might_remaining"]');
  if (!input) return;
  const cur = parseInt(input.value, 10) || 0;
  if (cur > 0) {
    input.value = cur - 1;
    saveSheet(true);
  }
}

function restoreGiantsMight() {
  const input = document.querySelector('[data-key="giants_might_remaining"]');
  if (!input) return;
  const prof = profBonusForLevel(calcTotalLevel());
  input.value = prof;
  saveSheet(true);
}

// ─────────────────────────────────────────────────────────────
// COMBAT RESOURCES
// ─────────────────────────────────────────────────────────────

/** Uncheck (restore) a list of checkbox data-keys — used for SR/LR buttons */
function restoreResource(keys) {
  keys.forEach(key => {
    const el = document.querySelector(`[data-key="${key}"]`);
    if (el && el.type === 'checkbox') el.checked = false;
  });
  saveSheet(true);
}

function restoreRunicShield() {
  const prof = profBonusForLevel(calcTotalLevel());
  const el = document.querySelector('[data-key="runic_shield_uses"]');
  if (el) el.value = prof;
  saveSheet(true);
}

/** Short Rest: restore Action Surge + Second Wind + all SR runes (2 uses each) */
function doShortRest() {
  if (!confirm('Take a Short Rest? This restores Action Surge, Second Wind, and all SR runes.')) return;
  restoreResource(['as1', 'as2', 'sw1']);
  restoreResource(['rune_fire_used',  'rune_fire_used2',
                   'rune_stone_used', 'rune_stone_used2',
                   'rune_hill_used',  'rune_hill_used2',
                   'rune_cloud_used', 'rune_cloud_used2',
                   'rune_storm_used', 'rune_storm_used2']);
  flashStatus('Short Rest taken — spend Hit Dice to heal if needed', 'success');
  saveSheet(true);
}

/** Long Rest: restore everything */
function doLongRest() {
  if (!confirm('Take a Long Rest? This restores all resources.')) return;
  // Action Surge, Indomitable, Second Wind
  restoreResource(['as1', 'as2', 'ind1', 'ind2', 'ind3', 'sw1']);
  // All runes (2 uses each)
  restoreResource(['rune_fire_used',  'rune_fire_used2',
                   'rune_stone_used', 'rune_stone_used2',
                   'rune_hill_used',  'rune_hill_used2',
                   'rune_cloud_used', 'rune_cloud_used2',
                   'rune_storm_used', 'rune_storm_used2']);
  // Runic Shield
  restoreRunicShield();
  // Giant's Might
  restoreGiantsMight();
  // Reset hit dice used
  const hdu = document.querySelector('[data-key="hit_dice_used"]');
  if (hdu) hdu.value = 0;
  flashStatus('Long Rest complete — all resources restored', 'success');
  saveSheet(true);
}

// ─────────────────────────────────────────────────────────────
// BATTLE TRACKER
// ─────────────────────────────────────────────────────────────

let btState = {
  active: false, round: 1,
  actionUsed: false, bonusUsed: false, reactionUsed: false, moveUsed: false,
  attacksThisTurn: 0, gmDiceUsed: false,
  log: [], currentRoundLog: [],
  undoStack: [],
  moveLeft: 25, maxMove: 25,
};

function btStartCombat() {
  // Read speed from sheet
  const speedEl = document.querySelector('[data-key="speed"]');
  const speed = speedEl ? (parseInt(speedEl.textContent) || 25) : 25;
  btState = {
    active: true, round: 1,
    actionUsed: false, bonusUsed: false, reactionUsed: false, moveUsed: false,
    attacksThisTurn: 0, gmDiceUsed: false,
    log: [], currentRoundLog: [],
    undoStack: [],
    moveLeft: speed, maxMove: speed,
  };
  // Sync belt-active checkbox → bt-belt-bt
  const beltMain = document.getElementById('belt-active');
  const beltBt   = document.getElementById('bt-belt-bt');
  if (beltMain && beltBt) beltBt.checked = beltMain.checked;
  const tracker = document.getElementById('battle-tracker');
  const startBtn = document.getElementById('btn-start-combat');
  if (tracker) tracker.style.display = 'block';
  if (startBtn) startBtn.textContent = '✕ Close Tracker';
  if (startBtn) startBtn.onclick = btEndCombat;
  btRender();
  btShowResult(null);
  tracker?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function btEndCombat() {
  btState.active = false;
  const tracker = document.getElementById('battle-tracker');
  const startBtn = document.getElementById('btn-start-combat');
  if (tracker) tracker.style.display = 'none';
  if (startBtn) { startBtn.textContent = '⚔ Start Combat'; startBtn.onclick = btStartCombat; }
}

function btNextRound() {
  if (btState.currentRoundLog.length > 0) {
    btState.log.push({ round: btState.round, entries: [...btState.currentRoundLog] });
  }
  btState.round++;
  btState.actionUsed = false;
  btState.bonusUsed = false;
  btState.reactionUsed = false;
  btState.moveUsed = false;
  btState.attacksThisTurn = 0;
  btState.gmDiceUsed = false;
  btState.currentRoundLog = [];
  btState.undoStack = [];
  btState.moveLeft = btState.maxMove;
  btRender();
  btShowResult(`<div class="bt-result-new-round">⚔ Round ${btState.round} — your turn begins!</div>`);
}

function btToggleSlot(slot) {
  if (slot === 'action')   btState.actionUsed   = !btState.actionUsed;
  if (slot === 'bonus')    btState.bonusUsed    = !btState.bonusUsed;
  if (slot === 'reaction') btState.reactionUsed = !btState.reactionUsed;
  if (slot === 'move')     btState.moveUsed     = !btState.moveUsed;
  btRender();
}

function btRender() {
  setText('bt-round-num', btState.round);
  setText('bt-atk-count', btState.attacksThisTurn);
  btUpdateSlot('bt-action-slot',   btState.actionUsed);
  btUpdateSlot('bt-bonus-slot',    btState.bonusUsed);
  btUpdateSlot('bt-reaction-slot', btState.reactionUsed);
  btUpdateSlot('bt-move-slot',     btState.moveLeft <= 0);
  // Update move slot label with remaining feet
  const moveLbl = document.querySelector('#bt-move-slot .bt-eco-label');
  if (moveLbl) moveLbl.textContent = `Move (${btState.moveLeft}/${btState.maxMove}ft)`;
  btRenderLog();
}

function btUpdateSlot(id, used) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.toggle('bt-slot-used', used);
  const lbl = el.querySelector('.bt-eco-label');
  if (lbl) {
    const name = lbl.textContent.split('\n')[0].split(' ')[0];
    // keep original label but show used state via CSS
  }
}

function btAddLog(text, type) {
  const idx = btState.currentRoundLog.length;
  btState.currentRoundLog.push({ text, type });
  btRenderLog();
  return idx;
}

function btRenderLog() {
  const container = document.getElementById('bt-round-log');
  if (!container) return;
  let html = '';
  btState.log.forEach(r => {
    const tags = r.entries.map(e =>
      `<span class="bt-log-tag bt-log-${e.type}">${e.text}</span>`).join(' ');
    html += `<div class="bt-log-round"><strong>Rd ${r.round}:</strong> ${tags}</div>`;
  });
  if (btState.currentRoundLog.length > 0) {
    const tags = btState.currentRoundLog.map(e =>
      `<span class="bt-log-tag bt-log-${e.type}">${e.text}</span>`).join(' ');
    html += `<div class="bt-log-round bt-log-current"><strong>Rd ${btState.round}:</strong> ${tags}</div>`;
  }
  container.innerHTML = html || '<em class="bt-empty-hint">Nothing logged yet.</em>';
  container.scrollTop = container.scrollHeight;
}

function btShowResult(html) {
  const el = document.getElementById('bt-result');
  if (el) el.innerHTML = html ?? '<em class="bt-empty-hint">Click an action to see roll details.</em>';
}

/** Collect live stats for battle tracker calculations */
function btGetStats() {
  const beltCheck = document.getElementById('bt-belt-bt')?.checked
                 || document.getElementById('belt-active')?.checked;
  const gmA  = document.getElementById('bt-gm-active')?.checked;
  const vsG  = document.getElementById('bt-vs-giant')?.checked;
  const gwm  = document.getElementById('bt-gwm')?.checked;
  const ss   = document.getElementById('bt-ss')?.checked;
  const rawStr = getNum('stat_str', 18);
  const rawWis = getNum('stat_wis', 14);
  const rawCon = getNum('stat_con', 22);
  const effStr = beltCheck ? Math.max(rawStr, BELT_STR) : rawStr;
  const mStr = mod(effStr);
  const mDex = mod(getNum('stat_dex', 10));
  const mWis = mod(rawWis);
  const mCon = mod(rawCon);
  const totalLevel = calcTotalLevel();
  const prof = profBonusForLevel(totalLevel);
  const runeDC = 8 + prof + mCon;
  const gmSize = getGiantsMightSize(totalLevel);
  return { mStr, mDex, mWis, mCon, totalLevel, prof, runeDC, gmA, gmSize, vsG, gwm, ss };
}

/** Roll N dice of given sides, returns {rolls, total} */
function btRollDice(n, sides) {
  const rolls = [];
  let total = 0;
  for (let i = 0; i < n; i++) {
    const r = Math.ceil(Math.random() * sides);
    rolls.push(r); total += r;
  }
  return { rolls, total };
}

/** Render an attack result card — rolls dice and shows HIT/MISS confirmation */
function btAttack(weapon) {
  const alreadyAttacking = btState.currentRoundLog.some(
    e => e.type === 'attack' || e.type === 'attack-hit' || e.type === 'attack-miss');
  if (btState.actionUsed && !alreadyAttacking) {
    btShowResult(`<div class="bt-result-warn">⚠ Action already used for something else this round.</div>`); return;
  }
  if (btState.attacksThisTurn >= 4) {
    btShowResult(`<div class="bt-result-warn">⚠ All 4 attacks used this turn.</div>`); return;
  }

  const s = btGetStats();
  const magic = DWARVEN_THROWER_BONUS;

  // ── Save undo snapshot BEFORE modifying state ──
  btState.undoStack.push({
    attacksThisTurn: btState.attacksThisTurn,
    actionUsed:      btState.actionUsed,
    gmDiceUsed:      btState.gmDiceUsed,
    logLen:          btState.currentRoundLog.length,
  });

  if (!btState.actionUsed) btState.actionUsed = true;
  btState.attacksThisTurn++;

  let hitBonus, damageDice, damageLabel, damageBonus, notes = [], weaponLabel, flatBonusLabel;

  if (weapon === 'thrown') {
    weaponLabel = 'DT Thrown';
    hitBonus = s.mStr + s.prof + magic + ARCHERY_STYLE_BONUS;
    damageBonus = s.mStr + magic;
    if (s.ss) { hitBonus -= 5; damageBonus += 10; notes.push('Sharpshooter −5 hit / +10 dmg'); }
    damageDice = s.vsG ? '3d8' : '2d8';
    damageLabel = s.vsG ? '1d8 + 2d8' : '1d8 + 1d8';
    flatBonusLabel = s.ss ? `${fmtMod(s.mStr + magic)} weapon, +10 SS` : `${fmtMod(s.mStr + magic)} weapon`;
    notes.push(s.vsG ? '1d8 weapon + 2d8 vs Giant' : '1d8 weapon + 1d8 thrown');
    notes.push('bludg · returns');
  } else if (weapon === 'melee') {
    weaponLabel = 'DT Melee';
    hitBonus = s.mStr + s.prof + magic;
    damageBonus = s.mStr + magic;
    if (s.gwm) { hitBonus -= 5; damageBonus += 10; notes.push('GWM −5 hit / +10 dmg'); }
    damageDice = '1d8';
    damageLabel = damageDice;
    flatBonusLabel = s.gwm ? `${fmtMod(s.mStr + magic)} weapon, +10 GWM` : `${fmtMod(s.mStr + magic)} weapon`;
    notes.push('bludg');
  } else if (weapon === 'halberd') {
    weaponLabel = 'Halberd';
    hitBonus = s.mStr + s.prof;
    damageBonus = s.mStr;
    if (s.gwm) { hitBonus -= 5; damageBonus += 10; notes.push('GWM −5 hit / +10 dmg'); }
    damageDice = '1d10';
    damageLabel = damageDice;
    flatBonusLabel = s.gwm ? `${fmtMod(s.mStr)} STR, +10 GWM` : `${fmtMod(s.mStr)} STR`;
    notes.push('slash · reach 10ft');
  } else {
    weaponLabel = 'Battle Axe';
    hitBonus = s.mStr + s.prof;
    damageBonus = s.mStr;
    if (s.gwm) { hitBonus -= 5; damageBonus += 10; notes.push('GWM −5 hit / +10 dmg'); }
    damageDice = '1d8';
    damageLabel = damageDice;
    flatBonusLabel = s.gwm ? `${fmtMod(s.mStr)} STR, +10 GWM` : `${fmtMod(s.mStr)} STR`;
    notes.push('slash');
  }

  // ── Roll d20 to hit ──
  const d20 = Math.ceil(Math.random() * 20);
  const isCrit = d20 === 20;
  const isFumble = d20 === 1;
  const totalHit = d20 + hitBonus;
  const hitColor = isCrit ? '#ffd700' : isFumble ? '#ff6060' : '#e8e0cc';
  const critBadge = isCrit ? ' <strong style="color:#ffd700">CRIT!</strong>' : isFumble ? ' <strong style="color:#ff6060">FUMBLE</strong>' : '';

  // ── Roll damage (double dice on crit) ──
  const [dCount, dSides] = damageDice.match(/(\d+)d(\d+)/).slice(1).map(Number);
  const rollCount = isCrit ? dCount * 2 : dCount;
  const dmg = btRollDice(rollCount, dSides);

  // ── Giant's Might 1d10 on first attack ──
  let gmRoll = 0, gmNote = '';
  if (s.gmA && !btState.gmDiceUsed) {
    btState.gmDiceUsed = true;
    gmRoll = Math.ceil(Math.random() * 10);
    gmNote = `Giant's Might: +${gmRoll} (1d10)`;
  }

  const totalDmg = dmg.total + gmRoll + damageBonus;
  const atkNum = btState.attacksThisTurn;
  const remaining = 4 - atkNum;

  // Add pending log entry — updated when HIT/MISS confirmed
  const logIdx = btAddLog(`Atk${atkNum}: ${weaponLabel}…`, 'attack');
  btRender();

  const rolledParts = [`[${dmg.rolls.join('+')}]${isCrit ? '×2' : ''}`];
  if (gmRoll > 0) rolledParts.push(`[${gmRoll}]`);
  const damageBonusText = damageBonus >= 0 ? `+${damageBonus}` : `${damageBonus}`;
  const damageFormula = `${damageLabel}${gmRoll > 0 ? ' + 1d10' : ''}`;
  const damageSummary = `${rolledParts.join(' + ')} ${damageBonusText} = <strong>${totalDmg}</strong>`;

  btShowResult(`
    <div class="bt-result-card">
      <div class="bt-result-head">⚔ Attack ${atkNum} of 4 &mdash; ${weaponLabel}</div>
      <div class="bt-result-dice-row">
        <div class="bt-dice-block bt-hit-block">
          <div class="bt-dice-label">To Hit &nbsp;(d20 ${fmtMod(hitBonus)})</div>
          <div class="bt-dice-value" style="color:${hitColor}">[${d20}]${fmtMod(hitBonus)} = <strong>${totalHit}</strong>${critBadge}</div>
        </div>
        <div class="bt-dice-arrow">&#10132;</div>
        <div class="bt-dice-block bt-dmg-block">
          <div class="bt-dice-label">Damage${isCrit ? ' (CRIT ×2 dice)' : ''}</div>
          <div class="bt-dice-value">Roll ${damageFormula}</div>
          <div class="bt-result-notes bt-result-notes-plain">${damageSummary}</div>
        </div>
      </div>
      <div class="bt-result-notes bt-result-notes-plain">Add ${damageBonusText} flat damage (${flatBonusLabel})</div>
      ${notes.length ? `<div class="bt-result-notes">${notes.join(' &middot; ')}</div>` : ''}
      ${gmNote ? `<div class="bt-result-notes bt-result-notes-plain" style="color:#ffd700">${gmNote}</div>` : ''}
      <div class="bt-confirm-row">
        <button class="bt-confirm-btn bt-hit-btn" onclick="btConfirmHit(${logIdx},'hit',${totalHit},${totalDmg},'${weapon}',${atkNum})">✓ HIT</button>
        <button class="bt-confirm-btn bt-miss-btn" onclick="btConfirmHit(${logIdx},'miss',${totalHit},0,'${weapon}',${atkNum})">✗ MISS</button>
        ${remaining > 0
          ? `<span class="bt-result-hint">${remaining} attack${remaining > 1 ? 's' : ''} remaining</span>`
          : `<span class="bt-result-hint bt-hint-done">⚡ All 4 attacks done!</span>`}
      </div>
    </div>
  `);
}

/** Record HIT or MISS for a pending attack log entry */
function btConfirmHit(logIdx, result, totalHit, totalDmg, weapon, atkNum) {
  const labels = { thrown: 'DT Thrown', melee: 'DT Melee', halberd: 'Halberd', axe: 'Battle Axe' };
  const label = labels[weapon] || weapon;
  const entry = btState.currentRoundLog[logIdx];
  if (entry) {
    if (result === 'hit') {
      entry.text = `Atk${atkNum}: ${label} → ${totalHit} HIT · ${totalDmg}dmg`;
      entry.type = 'attack-hit';
    } else {
      entry.text = `Atk${atkNum}: ${label} → ${totalHit} MISS`;
      entry.type = 'attack-miss';
    }
    btRenderLog();
  }
  const remaining = 4 - (btState.attacksThisTurn || atkNum);
  btShowResult(`<div class="bt-result-hint ${result === 'hit' ? 'bt-hint-done' : 'bt-result-miss'}">
    ${result === 'hit'
      ? `✓ HIT recorded — <strong>${totalDmg} damage</strong>`
      : `✗ MISS recorded`}
    ${remaining > 0 ? ` &mdash; ${remaining} attack${remaining > 1 ? 's' : ''} left this turn` : ''}
  </div>`);
}

/** Undo last attack */
function btUndo() {
  if (!btState.undoStack.length) {
    btShowResult(`<div class="bt-result-warn">⚠ Nothing to undo.</div>`); return;
  }
  const snap = btState.undoStack.pop();
  btState.attacksThisTurn = snap.attacksThisTurn;
  btState.actionUsed      = snap.actionUsed;
  btState.gmDiceUsed      = snap.gmDiceUsed;
  btState.currentRoundLog.splice(snap.logLen);
  btRender();
  btShowResult(`<div class="bt-result-hint">↩ Last attack undone &mdash; ${btState.attacksThisTurn} of 4 attacks used this turn.</div>`);
}

/** Switch weapon — costs half movement */
function btSwitchWeapon() {
  const cost = Math.floor(btState.maxMove / 2);
  if (btState.moveLeft <= 0) {
    btShowResult(`<div class="bt-result-warn">⚠ No movement remaining to switch weapons!</div>`); return;
  }
  btState.moveLeft = Math.max(0, btState.moveLeft - cost);
  btRender();
  btAddLog(`Switch wpn (−${cost}ft)`, 'bonus');
  btShowResult(`<div class="bt-result-hint">🔀 Weapon switched — costs <strong>${cost}ft</strong> of movement.<br>Movement remaining: <strong>${btState.moveLeft}ft</strong></div>`);
}

/** Handle bonus/reaction abilities */
function btUse(ability) {
  const s = btGetStats();
  let html = '';

  const needsBonus    = ['giants_might','second_wind','pam_bonus','gwm_bonus','hill_rune','storm_rune'];
  const needsReaction = ['fire_rune','cloud_rune','stone_rune','runic_shield','indomitable','sentinel_oa'];

  if (needsBonus.includes(ability) && btState.bonusUsed) {
    btShowResult('<div class="bt-result-warn">⚠ Bonus action already used this round.</div>'); return;
  }
  if (needsReaction.includes(ability) && btState.reactionUsed) {
    btShowResult('<div class="bt-result-warn">⚠ Reaction already used this round.</div>'); return;
  }

  if (needsBonus.includes(ability))    { btState.bonusUsed    = true; }
  if (needsReaction.includes(ability)) { btState.reactionUsed = true; }

  switch (ability) {
    case 'giants_might': {
      const uses = getNum('giants_might_remaining', 0);
      if (uses <= 0) { btShowResult('<div class="bt-result-warn">⚠ No Giant\'s Might uses remaining.</div>'); return; }
      const gmSize = getGiantsMightSize();
      document.getElementById('bt-gm-active').checked = true;
      btAddLog(`Giant's Might (BA · ${gmSize})`, 'bonus');
      html = `<div class="bt-result-card bt-card-bonus">
        <div class="bt-result-head">&#9889; Giant's Might (Bonus Action)</div>
        <ul class="bt-result-list">
          <li>Size becomes <strong>${gmSize}</strong> (if space allows)</li>
          <li><strong>Advantage</strong> on STR checks &amp; saves</li>
          <li>Add <strong>1d10</strong> to first attack damage this turn</li>
          <li>Reach increases +5 ft · Duration: 1 minute</li>
        </ul>
        <div class="bt-result-notes">&#9998; Mark one use in Giant's Might tracker &middot; ${uses - 1} remaining</div>
      </div>`;
      break;
    }
    case 'second_wind': {
      btAddLog('Second Wind (BA)', 'bonus');
      html = `<div class="bt-result-card bt-card-bonus">
        <div class="bt-result-head">&#128168; Second Wind (Bonus Action)</div>
        <div class="bt-result-dice-row">
          <div class="bt-dice-block bt-dmg-block">
            <div class="bt-dice-label">Heal:</div>
            <div class="bt-dice-value">1d10 <span class="bt-bonus">+${s.totalLevel}</span></div>
          </div>
        </div>
        <div class="bt-result-notes">&#9998; Check Second Wind box in Combat Resources</div>
      </div>`;
      break;
    }
    case 'pam_bonus': {
      const hit = s.mStr + s.prof;
      btAddLog('PAM Butt Attack (BA)', 'bonus');
      html = `<div class="bt-result-card bt-card-bonus">
        <div class="bt-result-head">&#9906; Polearm Master Butt Attack (Bonus Action)</div>
        <div class="bt-result-dice-row">
          <div class="bt-dice-block bt-hit-block"><div class="bt-dice-label">To Hit:</div><div class="bt-dice-value">1d20 <span class="bt-bonus">${fmtMod(hit)}</span></div></div>
          <div class="bt-dice-arrow">&#10132;</div>
          <div class="bt-dice-block bt-dmg-block"><div class="bt-dice-label">Damage:</div><div class="bt-dice-value">1d4 <span class="bt-bonus">${fmtMod(s.mStr)}</span> bludg</div></div>
        </div>
      </div>`;
      break;
    }
    case 'gwm_bonus': {
      const hit = s.mStr + s.prof + DWARVEN_THROWER_BONUS;
      const dmg = s.mStr + DWARVEN_THROWER_BONUS;
      btAddLog('GWM Bonus Atk (BA)', 'bonus');
      html = `<div class="bt-result-card bt-card-bonus">
        <div class="bt-result-head">&#128481; GWM Bonus Attack (Bonus Action — after crit or kill)</div>
        <div class="bt-result-dice-row">
          <div class="bt-dice-block bt-hit-block"><div class="bt-dice-label">To Hit:</div><div class="bt-dice-value">1d20 <span class="bt-bonus">${fmtMod(hit)}</span></div></div>
          <div class="bt-dice-arrow">&#10132;</div>
          <div class="bt-dice-block bt-dmg-block"><div class="bt-dice-label">Damage:</div><div class="bt-dice-value">1d8 <span class="bt-bonus">${fmtMod(dmg)}</span> bludg</div></div>
        </div>
      </div>`;
      break;
    }
    case 'hill_rune': {
      btAddLog('Hill Rune (BA)', 'bonus');
      html = `<div class="bt-result-card bt-card-bonus">
        <div class="bt-result-head">&#9968; Hill Rune (Bonus Action)</div>
        <ul class="bt-result-list">
          <li>Resistance to <strong>Bludgeoning, Piercing &amp; Slashing</strong></li>
          <li>Duration: 1 minute</li>
        </ul>
        <div class="bt-result-notes">&#9998; Mark Hill Rune use in Rune section</div>
      </div>`;
      break;
    }
    case 'storm_rune': {
      btAddLog('Storm Rune (BA)', 'bonus');
      html = `<div class="bt-result-card bt-card-bonus">
        <div class="bt-result-head">&#9889; Storm Rune (Bonus Action)</div>
        <ul class="bt-result-list">
          <li>Cannot be <strong>surprised</strong></li>
          <li>Treat any roll below 10 as a 10 (attacks, ability checks, saves)</li>
          <li>Duration: 1 minute</li>
        </ul>
        <div class="bt-result-notes">&#9998; Mark Storm Rune use in Rune section</div>
      </div>`;
      break;
    }
    case 'fire_rune': {
      btAddLog('Fire Rune (React)', 'reaction');
      html = `<div class="bt-result-card bt-card-reaction">
        <div class="bt-result-head">&#128293; Fire Rune (Reaction — triggers on a hit)</div>
        <ul class="bt-result-list">
          <li>Target: DC <strong>${s.runeDC}</strong> STR save or <strong>Restrained</strong></li>
          <li>Restrained: takes <strong>2d6 fire</strong> at start of each turn</li>
          <li>Repeats STR save each turn to escape</li>
        </ul>
        <div class="bt-result-notes">&#9998; Mark Fire Rune use in Rune section</div>
      </div>`;
      break;
    }
    case 'cloud_rune': {
      btAddLog('Cloud Rune (React)', 'reaction');
      html = `<div class="bt-result-card bt-card-reaction">
        <div class="bt-result-head">&#9729; Cloud Rune (Reaction)</div>
        <ul class="bt-result-list">
          <li>Redirect a hit targeting you or ally (within 30 ft)</li>
          <li>Pick another creature within 30 ft — attacker uses same roll vs new AC</li>
        </ul>
        <div class="bt-result-notes">&#9998; Mark Cloud Rune use in Rune section</div>
      </div>`;
      break;
    }
    case 'stone_rune': {
      btAddLog('Stone Rune (React)', 'reaction');
      html = `<div class="bt-result-card bt-card-reaction">
        <div class="bt-result-head">&#129704; Stone Rune (Reaction — 30 ft)</div>
        <ul class="bt-result-list">
          <li>Target: DC <strong>${s.runeDC}</strong> WIS save or <strong>Charmed</strong></li>
          <li>Charmed: incapacitated, speed 0</li>
          <li>Repeats WIS save each turn to escape</li>
        </ul>
        <div class="bt-result-notes">&#9998; Mark Stone Rune use in Rune section</div>
      </div>`;
      break;
    }
    case 'runic_shield': {
      const uses = getNum('runic_shield_uses', 0);
      if (uses <= 0) { btShowResult('<div class="bt-result-warn">⚠ No Runic Shield uses remaining.</div>'); return; }
      btAddLog('Runic Shield (React)', 'reaction');
      html = `<div class="bt-result-card bt-card-reaction">
        <div class="bt-result-head">&#128737; Runic Shield (Reaction — 60 ft)</div>
        <ul class="bt-result-list">
          <li>Force attacker to <strong>reroll</strong> their attack roll</li>
          <li>Attacker must use the <strong>lower</strong> of the two rolls</li>
        </ul>
        <div class="bt-result-notes">&#9998; Mark one Runic Shield use &middot; ${uses - 1} remaining</div>
      </div>`;
      break;
    }
    case 'indomitable': {
      btAddLog('Indomitable (React)', 'reaction');
      html = `<div class="bt-result-card bt-card-reaction">
        <div class="bt-result-head">&#128170; Indomitable (no-action — after failing a save)</div>
        <ul class="bt-result-list">
          <li>Reroll a failed saving throw</li>
          <li>You <strong>must</strong> use the new roll</li>
        </ul>
        <div class="bt-result-notes">&#9998; Mark Indomitable use in Combat Resources</div>
      </div>`;
      break;
    }
    case 'sentinel_oa': {
      const hit = s.mStr + s.prof + DWARVEN_THROWER_BONUS;
      const dmg = s.mStr + DWARVEN_THROWER_BONUS;
      btAddLog('Sentinel OA (React)', 'reaction');
      html = `<div class="bt-result-card bt-card-reaction">
        <div class="bt-result-head">&#128737; Sentinel Opportunity Attack (Reaction)</div>
        <div class="bt-result-dice-row">
          <div class="bt-dice-block bt-hit-block"><div class="bt-dice-label">To Hit:</div><div class="bt-dice-value">1d20 <span class="bt-bonus">${fmtMod(hit)}</span></div></div>
          <div class="bt-dice-arrow">&#10132;</div>
          <div class="bt-dice-block bt-dmg-block"><div class="bt-dice-label">Damage:</div><div class="bt-dice-value">1d8 <span class="bt-bonus">${fmtMod(dmg)}</span></div></div>
        </div>
        <div class="bt-result-notes">Target's speed becomes 0 until end of their turn (Sentinel)</div>
      </div>`;
      break;
    }
  }

  btRender();
  if (html) btShowResult(html);
}

// Explicitly expose battle-tracker functions to global scope for inline onclick handlers
window.btStartCombat  = btStartCombat;
window.btEndCombat    = btEndCombat;
window.btNextRound    = btNextRound;
window.btToggleSlot   = btToggleSlot;
window.btAttack       = btAttack;
window.btUse          = btUse;
window.btConfirmHit   = btConfirmHit;
window.btUndo         = btUndo;
window.btSwitchWeapon = btSwitchWeapon;


// ─────────────────────────────────────────────────────────────
// JOURNAL XP SYSTEM
// ─────────────────────────────────────────────────────────────

/** In-memory journal entries */
let journalEntries = [];

function journalId() {
  return 'j_' + Date.now() + '_' + Math.random().toString(36).slice(2, 5);
}

/** Calculate XP value for one journal entry (10% of XP needed for next level) */
function calcJournalXP(currentXP) {
  const levels = Object.keys(XP_THRESHOLDS).map(Number).sort((a, b) => a - b);
  let currentLevel = 20;
  for (const lv of levels) {
    if (currentXP >= XP_THRESHOLDS[lv]) currentLevel = lv;
  }
  const nextLevel = currentLevel + 1;
  const nextThreshold = XP_THRESHOLDS[nextLevel];
  if (!nextThreshold) return 0;
  return Math.floor(nextThreshold * 0.1);
}

function updateJournalPreview() {
  const currentXP = parseInt(document.getElementById('xp-input')?.value || '355000', 10);
  const jxp = calcJournalXP(currentXP);
  const el = document.getElementById('journal-xp-value');
  if (el) el.textContent = jxp.toLocaleString() + ' XP';
  // Show the correct gap description
  const levels = Object.keys(XP_THRESHOLDS).map(Number).sort((a, b) => a - b);
  let curLv = 20;
  for (const lv of levels) {
    if (currentXP >= XP_THRESHOLDS[lv]) curLv = lv;
  }
  const nxtLv = curLv + 1;
  const nxtThresh = XP_THRESHOLDS[nxtLv];
  const gapLabel = document.getElementById('journal-xp-gap-label');
  if (gapLabel) {
    if (nxtThresh) {
      gapLabel.textContent = `— 10% of ${nxtThresh.toLocaleString()} (Lv ${nxtLv} threshold)`;
    } else {
      gapLabel.textContent = '— max level reached';
    }
  }
}

function renderJournalEntries() {
  const container = document.getElementById('journal-entries');
  if (!container) return;
  container.innerHTML = '';
  let totalEarned = 0;

  journalEntries.forEach(entry => {
    if (entry.claimed) totalEarned += (entry.xpValue || 0);
    const div = document.createElement('div');
    div.className = 'journal-entry' + (entry.claimed ? ' journal-claimed' : '');
    div.dataset.id = entry.id;
    div.innerHTML = `
      <input type="checkbox" class="journal-check" ${entry.claimed ? 'checked disabled' : ''}
        onchange="claimJournalEntry('${entry.id}', this)" />
      <span class="journal-entry-title" contenteditable="${entry.claimed ? 'false' : 'true'}"
        data-jid="${entry.id}" onblur="updateJournalTitle('${entry.id}', this)">${escapeHtml(entry.title)}</span>
      <span class="journal-entry-xp">${entry.claimed ? '+' + (entry.xpValue||0).toLocaleString() + ' XP ✓' : (entry.xpValue||0).toLocaleString() + ' XP'}</span>
      ${entry.claimed ? '' : `<button class="equip-delete no-print" onclick="deleteJournalEntry('${entry.id}')">✕</button>`}
    `;
    container.appendChild(div);
  });

  setText('journal-total-xp', totalEarned.toLocaleString());
  updateJournalPreview();
}

function addJournalEntry() {
  const input = document.getElementById('journal-new-title');
  const title = input?.value.trim() || ('Session ' + (journalEntries.length + 1));
  const currentXP = parseInt(document.getElementById('xp-input')?.value || '355000', 10);
  const xpValue = calcJournalXP(currentXP);

  journalEntries.push({ id: journalId(), title, xpValue, claimed: false, date: new Date().toISOString() });
  if (input) input.value = '';
  renderJournalEntries();
  saveSheet(true);
}

function claimJournalEntry(id, checkbox) {
  const entry = journalEntries.find(e => e.id === id);
  if (!entry || entry.claimed) { if (checkbox) checkbox.checked = !!entry?.claimed; return; }

  if (!confirm(`Mark journal "${entry.title}" as submitted? This will add ${entry.xpValue.toLocaleString()} XP to your total.`)) {
    checkbox.checked = false;
    return;
  }

  entry.claimed = true;

  // Add XP to the sheet
  const xpInput = document.getElementById('xp-input');
  const headerXP = document.querySelector('[data-key="current_xp"]');
  const currentXP = parseInt(xpInput?.value || '0', 10);
  const newXP = currentXP + entry.xpValue;
  if (xpInput) xpInput.value = newXP;
  if (headerXP) headerXP.textContent = newXP;
  updateXP();

  renderJournalEntries();
  saveSheet(true);
  flashStatus(`+${entry.xpValue.toLocaleString()} XP from journal!`, 'success');
}

function updateJournalTitle(id, el) {
  const entry = journalEntries.find(e => e.id === id);
  if (entry) { entry.title = el.textContent.trim(); saveSheet(true); }
}

function deleteJournalEntry(id) {
  journalEntries = journalEntries.filter(e => e.id !== id);
  renderJournalEntries();
  saveSheet(true);
}

// ─────────────────────────────────────────────────────────────
// MULTICLASS ROWS
// ─────────────────────────────────────────────────────────────

function addMCRow() {
  const container = document.getElementById('multiclass-rows');
  if (!container) return;

  const idx = mcRowCount++;
  const row = document.createElement('div');
  row.className = 'mc-row';
  row.innerHTML = `
    <input class="mc-class-name" type="text" placeholder="Class name" value="" data-mc-key="mc_class_${idx}" oninput="recalcAll(); saveSheet(true);" />
    <input class="mc-level-num" type="number" value="1" min="0" max="40" data-mc-key="mc_level_${idx}" oninput="recalcAll(); saveSheet(true);" />
    <span class="mc-label">levels</span>
    <button class="mc-remove no-print" onclick="removeMCRow(this)">✕</button>
  `;
  container.appendChild(row);
  recalcAll();
}

function removeMCRow(btn) {
  const row = btn.closest('.mc-row');
  if (!row) return;
  // Don't remove the first row (Fighter)
  const allRows = document.querySelectorAll('#multiclass-rows .mc-row');
  if (allRows.length <= 1) return;
  row.remove();
  recalcAll();
  saveSheet(true);
}

// ─────────────────────────────────────────────────────────────
// LEVEL LOG
// ─────────────────────────────────────────────────────────────

function addLevelLogEntry() {
  const container = document.getElementById('levelup-entries');
  if (!container) return;

  // Figure out what the next level number should be
  const entries = container.querySelectorAll('.levelup-entry');
  const existingLevels = [...entries].map(e => {
    const num = e.querySelector('.levelup-num');
    return num ? parseInt(num.textContent.replace('Lv ', ''), 10) : 0;
  }).filter(n => !isNaN(n));
  const maxLv = existingLevels.length ? Math.max(...existingLevels) : 20;
  const nextLv = maxLv + 1;
  const key = `log_${nextLv}`;

  const entry = document.createElement('div');
  entry.className = 'levelup-entry';
  entry.innerHTML = `
    <span class="levelup-num">Lv ${nextLv}</span>
    <span class="levelup-text" contenteditable="true" data-key="${key}">Click to describe what you gained at level ${nextLv}…</span>
  `;
  container.appendChild(entry);

  // Hook auto-save on the new element
  const textEl = entry.querySelector('.levelup-text');
  if (textEl) {
    textEl.addEventListener('blur', () => saveSheet(true));
  }

  // Focus it immediately
  setTimeout(() => {
    const span = entry.querySelector('.levelup-text');
    if (span) {
      span.focus();
      const range = document.createRange();
      range.selectNodeContents(span);
      window.getSelection()?.removeAllRanges();
      window.getSelection()?.addRange(range);
    }
  }, 50);
}

// ─────────────────────────────────────────────────────────────
// LOCAL STORAGE — SAVE / LOAD
// ─────────────────────────────────────────────────────────────

/** Collect all data-key fields into a plain object. */
function collectData() {
  const data = {};

  // contenteditable fields
  document.querySelectorAll('[data-key][contenteditable]').forEach(el => {
    data[el.dataset.key] = el.textContent.trim();
  });

  // input fields
  document.querySelectorAll('[data-key]:not([contenteditable])').forEach(el => {
    if (el.type === 'checkbox') {
      data[el.dataset.key] = el.checked;
    } else {
      data[el.dataset.key] = el.value;
    }
  });

  // textarea
  document.querySelectorAll('textarea[data-key]').forEach(el => {
    data[el.dataset.key] = el.value;
  });

  // Belt checkbox
  const belt = document.getElementById('belt-active');
  if (belt) data['belt_active'] = belt.checked;

  // Multiclass rows (dynamic)
  const mcRows = [];
  document.querySelectorAll('[data-mc-key^="mc_class_"]').forEach((nameEl, idx) => {
    const levelEl = document.querySelector(`[data-mc-key="mc_level_${nameEl.dataset.mcKey.replace('mc_class_', '')}"]`);
    mcRows.push({
      name: nameEl.value,
      level: levelEl ? parseInt(levelEl.value, 10) : 0,
    });
  });
  data['_multiclass_rows'] = mcRows;

  // Level log entries
  const logEntries = [];
  document.querySelectorAll('.levelup-entry').forEach(entry => {
    const numEl = entry.querySelector('.levelup-num');
    const textEl = entry.querySelector('.levelup-text');
    if (numEl && textEl) {
      logEntries.push({ level: numEl.textContent, text: textEl.textContent });
    }
  });
  data['_level_log'] = logEntries;

  // Equipment
  data['_equipment'] = equipmentItems;

  // Languages, Tools, Feats
  data['_languages'] = languageItems;
  data['_tools']     = toolItems;
  data['_feats']     = featItems;

  // Journal entries
  data['_journal_entries'] = journalEntries;

  data['_skill_bonuses'] = SKILL_KEYS.reduce((acc, skillKey) => {
    acc[skillKey] = getSkillBonus(skillKey);
    return acc;
  }, {});

  return data;
}

/** Save sheet to localStorage. Pass silent=true to skip status flash. */
function saveSheet(silent = false) {
  try {
    const data = collectData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (!silent) flashStatus('✓ Saved!', 'success');
    // Also save to Firebase cloud if signed in
    if (window.scheduleSaveToCloud) window.scheduleSaveToCloud(data);
  } catch (e) {
    flashStatus('✗ Save failed', 'error');
    console.error('Save failed:', e);
  }
}

/** Apply a data object to the DOM — used by both loadSheet() and Firebase sync. */
function applySheetData(data) {
  if (!data) return;

  // Restore standard fields
  Object.entries(data).forEach(([key, val]) => {
    if (key.startsWith('_')) return; // handled separately

    // contenteditable
    const ceEl = document.querySelector(`[data-key="${key}"][contenteditable]`);
    if (ceEl) { ceEl.textContent = val; return; }

    // input
    const inputEl = document.querySelector(`[data-key="${key}"]:not([contenteditable])`);
    if (inputEl) {
      if (inputEl.type === 'checkbox') inputEl.checked = !!val;
      else inputEl.value = val;
    }

    // textarea
    const taEl = document.querySelector(`textarea[data-key="${key}"]`);
    if (taEl) taEl.value = val;
  });

  // Belt checkbox
  if (data['belt_active'] !== undefined) {
    const belt = document.getElementById('belt-active');
    if (belt) belt.checked = !!data['belt_active'];
  }

  // Restore multiclass rows
  if (Array.isArray(data['_multiclass_rows']) && data['_multiclass_rows'].length > 0) {
    const container = document.getElementById('multiclass-rows');
    if (container) {
      container.innerHTML = '';
      mcRowCount = 0;
      data['_multiclass_rows'].forEach((row, idx) => {
        const div = document.createElement('div');
        div.className = 'mc-row';
        div.innerHTML = `
          <input class="mc-class-name" type="text" placeholder="Class name" value="${escapeHtml(row.name || '')}" data-mc-key="mc_class_${idx}" oninput="recalcAll(); saveSheet(true);" />
          <input class="mc-level-num" type="number" value="${row.level || 0}" min="0" max="40" data-mc-key="mc_level_${idx}" oninput="recalcAll(); saveSheet(true);" />
          <span class="mc-label">levels</span>
          ${idx === 0 ? '' : `<button class="mc-remove no-print" onclick="removeMCRow(this)">✕</button>`}
        `;
        container.appendChild(div);
        mcRowCount++;
      });
    }
  }

  // Restore level log
  if (Array.isArray(data['_level_log']) && data['_level_log'].length > 0) {
    const container = document.getElementById('levelup-entries');
    if (container) {
      container.innerHTML = '';
      data['_level_log'].forEach(({ level, text }) => {
        const entry = document.createElement('div');
        entry.className = 'levelup-entry';
        const levelLv = parseInt(level.replace('Lv ', ''), 10) || 0;
        entry.innerHTML = `
          <span class="levelup-num">${escapeHtml(level)}</span>
          <span class="levelup-text" contenteditable="true" data-key="log_${levelLv}">${escapeHtml(text)}</span>
        `;
        const textEl = entry.querySelector('.levelup-text');
        if (textEl) textEl.addEventListener('blur', () => saveSheet(true));
        container.appendChild(entry);
      });
    }
  }

  // Sync XP input
  if (data['current_xp']) {
    const xpInput = document.getElementById('xp-input');
    if (xpInput) xpInput.value = data['current_xp'];
  }

  // Equipment
  if (Array.isArray(data['_equipment']) && data['_equipment'].length > 0) {
      equipmentItems = data['_equipment'].map(normalizeEquipmentItem);
  } else {
      equipmentItems = DEFAULT_EQUIPMENT.map(e => normalizeEquipmentItem(e));
  }
  renderEquipment();

  // Languages
  if (Array.isArray(data['_languages']) && data['_languages'].length > 0) {
    languageItems = data['_languages'];
  } else {
    languageItems = DEFAULT_LANGUAGES.map(l => ({ ...l }));
  }
  renderLanguages();

  // Tools
  if (Array.isArray(data['_tools']) && data['_tools'].length > 0) {
    toolItems = data['_tools'];
  } else {
    toolItems = DEFAULT_TOOLS.map(t => ({ ...t }));
  }
  renderTools();

  // Feats
  if (Array.isArray(data['_feats']) && data['_feats'].length > 0) {
    featItems = data['_feats'];
  } else {
    featItems = DEFAULT_FEATS.map(f => ({ ...f }));
  }
  renderFeats();

  // Journal entries
  if (Array.isArray(data['_journal_entries'])) {
    journalEntries = data['_journal_entries'];
    renderJournalEntries();
  }

  // Manual skill bonuses
  const savedSkillBonuses = data['_skill_bonuses'] || {};
  document.querySelectorAll('.skill-bonus-input').forEach(el => {
    const skillKey = el.dataset.skill;
    const fallback = DEFAULT_SKILL_BONUSES[skillKey] ?? 0;
    const value = savedSkillBonuses[skillKey];
    el.value = value !== undefined ? value : fallback;
  });

  // Recalculate all derived stats after applying new data
  recalcAll();
  updateXP();
}

// Expose applySheetData globally so firebase.js can call it after cloud load/sync
window.applySheetData = applySheetData;

/** Load sheet from localStorage. */
function loadSheet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // No local data — render default equipment at minimum
      equipmentItems = DEFAULT_EQUIPMENT.map(e => normalizeEquipmentItem(e));
      renderEquipment();
      return;
    }
    applySheetData(JSON.parse(raw));
  } catch (e) {
    console.error('Load failed:', e);
    equipmentItems = DEFAULT_EQUIPMENT.map(e => normalizeEquipmentItem(e));
    renderEquipment();
  }
}

/** Reset all saved data (with confirmation). */
function resetSheet() {
  if (!confirm('Reset all saved changes and return to defaults? This cannot be undone.')) return;
  localStorage.removeItem(STORAGE_KEY);
  location.reload();
}

/** Flash a status message in the toolbar. */
function flashStatus(msg, type) {
  const el = document.getElementById('save-status');
  if (!el) return;
  el.textContent = msg;
  el.style.color = type === 'success' ? '#90ee90' : '#ff6b6b';
  clearTimeout(el._timeout);
  el._timeout = setTimeout(() => { el.textContent = ''; }, 2500);
}

/** Auto-save on any input/change event. */
function hookAutoSave() {
  document.getElementById('character-sheet')?.addEventListener('input', () => saveSheet(true));
  document.getElementById('character-sheet')?.addEventListener('change', () => saveSheet(true));

  // Contenteditable blur saves
  document.querySelectorAll('[contenteditable]').forEach(el => {
    el.addEventListener('blur', () => saveSheet(true));
  });
}

/** Escape HTML for dynamic insertion. */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─────────────────────────────────────────────────────────────
// PRINT & PDF EXPORT
// ─────────────────────────────────────────────────────────────

function buildPrintSheet() {
  const by = id => document.getElementById(id)?.textContent?.trim() || '';
  const dk = key => {
    const el = document.querySelector(`[data-key="${key}"]`);
    if (!el) return '';
    return el.value !== undefined && el.tagName !== 'SPAN' && el.tagName !== 'DIV'
      ? el.value : el.textContent.trim();
  };

  // Character info
  const name    = dk('char_name')    || 'Thrain Ironhammerson';
  const classLv = dk('class_level')  || 'Fighter 20';
  const bg      = dk('background')   || '';
  const player  = dk('player')       || '';
  const race    = dk('race')         || '';
  const align   = dk('alignment')    || '';
  const xpRaw   = parseInt(dk('current_xp') || '355000', 10);

  // Stats
  const beltOn  = document.getElementById('belt-active')?.checked ?? false;
  const sc = s => { let v = parseInt(dk(`stat_${s}`) || '10', 10); if (s==='str' && beltOn) v = Math.max(v, 23); return v; };
  const sm = s => Math.floor((sc(s) - 10) / 2);
  const fm = n => (n >= 0 ? '+' : '') + n;
  const SNAMES = { str:'Strength', dex:'Dexterity', con:'Constitution', int:'Intelligence', wis:'Wisdom', cha:'Charisma' };

  // Prof bonus
  const profText   = by('prof-bonus-display') || '+7';
  const prof       = parseInt(profText.replace('+',''), 10);

  // Combat
  const ac         = by('ac-display')          || '20';
  const init       = by('initiative-display')  || '+0';
  const speed      = dk('speed')               || '25';
  const maxHP      = dk('max_hp')              || '304';
  const currHP     = dk('current_hp')          || '';
  const tempHP     = dk('temp_hp')             || '';
  const hd         = dk('hit_dice')            || '20d10';
  const hdUsed     = dk('hit_dice_used')       || '0';
  const insp       = document.querySelector('[data-key="inspiration"]')?.checked ? '✓' : '—';

  // Saves
  const SAVES = [
    { label:'Strength',     id:'save-str', prof:false },
    { label:'Dexterity',    id:'save-dex', prof:false },
    { label:'Constitution', id:'save-con', prof:true  },
    { label:'Intelligence', id:'save-int', prof:false },
    { label:'Wisdom',       id:'save-wis', prof:true  },
    { label:'Charisma',     id:'save-cha', prof:false },
  ];

  // Skills
  const PROFS_BY_KEY = new Set(Object.keys(PROF_SKILLS_MAP));
  const DBL   = DOUBLE_PROF_SKILLS;
  const SKILLS = [
    { id:'sk-athletics',    label:'Athletics',      abi:'STR', p:'athletics'   },
    { id:'sk-acrobatics',   label:'Acrobatics',     abi:'DEX', p:null          },
    { id:'sk-sleight',      label:'Sleight of Hand',abi:'DEX', p:'sleight'     },
    { id:'sk-stealth',      label:'Stealth',        abi:'DEX', p:null          },
    { id:'sk-arcana',       label:'Arcana',         abi:'INT', p:'arcana'      },
    { id:'sk-history',      label:'History',        abi:'INT', p:null          },
    { id:'sk-investigation',label:'Investigation',  abi:'INT', p:null          },
    { id:'sk-nature',       label:'Nature',         abi:'INT', p:null          },
    { id:'sk-religion',     label:'Religion',       abi:'INT', p:null          },
    { id:'sk-animal',       label:'Animal Handling',abi:'WIS', p:null          },
    { id:'sk-insight',      label:'Insight',        abi:'WIS', p:'insight'     },
    { id:'sk-medicine',     label:'Medicine',       abi:'WIS', p:null          },
    { id:'sk-perception',   label:'Perception',     abi:'WIS', p:'perception'  },
    { id:'sk-survival',     label:'Survival',       abi:'WIS', p:'survival'    },
    { id:'sk-deception',    label:'Deception',      abi:'CHA', p:'deception'   },
    { id:'sk-intimidation', label:'Intimidation',   abi:'CHA', p:null          },
    { id:'sk-performance',  label:'Performance',    abi:'CHA', p:null          },
    { id:'sk-persuasion',   label:'Persuasion',     abi:'CHA', p:null          },
  ];

  // Passive senses
  const passPerc = by('passive-perception') || '14';
  const passIns  = by('passive-insight')    || '16';

  // XP
  const xpNeeded    = by('xp-needed')       || '';
  const levelLabel  = by('xp-level-label')  || '';
  const journalAmt  = by('journal-xp-value')|| '';

  // Weapons (attack values from live DOM)
  const atk = id => document.getElementById(id)?.textContent?.trim() || '—';

  // ── HTML generators ─────────────────────────────────────────
  const abilityBox = s => `
    <div class="ps-abl">
      <div class="ps-abl-name">${SNAMES[s].toUpperCase().slice(0,3)}</div>
      <div class="ps-abl-mod">${fm(sm(s))}</div>
      <div class="ps-abl-score">${sc(s)}</div>
    </div>`;

  const saveRow = s => {
    const dot = s.prof ? '●' : '○';
    return `<div class="ps-prow">${dot}<span class="ps-prow-v">${by(s.id)}</span><span class="ps-prow-n">${s.label}</span></div>`;
  };

  const skillRow = sk => {
    const isProf = sk.p && PROFS_BY_KEY.has(sk.p);
    const isDbl  = sk.p && DBL.has(sk.p);
    const dot    = isDbl ? '◆' : (isProf ? '●' : '○');
    return `<div class="ps-prow">${dot}<span class="ps-prow-v">${by(sk.id)}</span><span class="ps-prow-n">${sk.label}</span><span class="ps-prow-a">${sk.abi}</span></div>`;
  };

  const equipRows = equipmentItems.map(e =>
    `<div class="ps-eq"><span class="ps-eq-n">${escapeHtml(e.name)}</span>${e.desc ? `<span class="ps-eq-d">${escapeHtml(e.desc)}</span>` : ''}</div>`
  ).join('');

  const langText = languageItems.map(l => escapeHtml(l.name) + (l.note ? ` (${escapeHtml(l.note)})` : '')).join(' · ');
  const toolText = toolItems.map(t => escapeHtml(t.name) + (t.note ? ` — ${escapeHtml(t.note)}` : '')).join(' · ');

  const featHTML = featItems.map(f =>
    `<div class="ps-feat"><div class="ps-feat-n">${escapeHtml(f.name)}</div><div class="ps-feat-d">${escapeHtml(f.desc)}</div></div>`
  ).join('');

  const notes = dk('notes') || '';

  // ── PAGE 1 ───────────────────────────────────────────────────
  const page1 = `
<div class="ps-page" id="ps-p1">
  <header class="ps-hdr">
    <div class="ps-hdr-name">${escapeHtml(name)}</div>
    <div class="ps-hdr-fields">
      ${[
        [escapeHtml(classLv), 'Class &amp; Level'],
        [escapeHtml(bg),      'Background'],
        [escapeHtml(player),  'Player Name'],
        [escapeHtml(race),    'Race'],
        [escapeHtml(align),   'Alignment'],
        [xpRaw.toLocaleString(), 'Experience Points'],
      ].map(([v,l]) => `<div class="ps-hf"><div class="ps-hf-v">${v || '&nbsp;'}</div><div class="ps-hf-l">${l}</div></div>`).join('')}
    </div>
  </header>
  <div class="ps-body">

    <!-- LEFT: Abilities + Saves + Skills (traditional layout) -->
    <div class="ps-left">
      <div class="ps-abl-grid">
        ${ ['str','dex','con','int','wis','cha'].map(abilityBox).join('') }
      </div>
      <div class="ps-pair-row">
        <div class="ps-sm-box"><div class="ps-sm-v">${insp}</div><div class="ps-sm-l">INSPIRATION</div></div>
        <div class="ps-sm-box"><div class="ps-sm-v">${profText}</div><div class="ps-sm-l">PROF BONUS</div></div>
      </div>
      <div class="ps-list-block">
        <div class="ps-list-title">SAVING THROWS</div>
        ${SAVES.map(saveRow).join('')}
      </div>
      <div class="ps-list-block ps-skills-list">
        <div class="ps-list-title">SKILLS &nbsp;<span style="font-size:5pt;font-weight:normal">● Prof &nbsp; ◆ Expertise</span></div>
        ${SKILLS.map(skillRow).join('')}
      </div>
      <div class="ps-list-block">
        <div class="ps-list-title">PASSIVE SENSES</div>
        <div class="ps-prow">●<span class="ps-prow-v">${passPerc}</span><span class="ps-prow-n">Passive Perception</span></div>
        <div class="ps-prow">●<span class="ps-prow-v">${passIns}</span><span class="ps-prow-n">Passive Insight</span></div>
        <div class="ps-prow">○<span class="ps-prow-v">${fm(sm('int'))}</span><span class="ps-prow-n">Passive Investigation</span></div>
        <div class="ps-senses-note">Darkvision 60 ft · Stonecunning</div>
      </div>
    </div>

    <!-- CENTER: Combat + HP + Attacks -->
    <div class="ps-center">
      <div class="ps-combat-row">
        <div class="ps-cbox"><div class="ps-cbox-v">${ac}</div><div class="ps-cbox-l">ARMOR CLASS</div></div>
        <div class="ps-cbox"><div class="ps-cbox-v">${init}</div><div class="ps-cbox-l">INITIATIVE</div></div>
        <div class="ps-cbox"><div class="ps-cbox-v">${speed} ft</div><div class="ps-cbox-l">SPEED</div></div>
      </div>
      <div class="ps-hp-block">
        <div class="ps-hp-max"><span class="ps-hp-max-lbl">HP MAXIMUM</span><span class="ps-hp-max-v">${escapeHtml(maxHP)}</span></div>
        <div class="ps-hp-curr"><span class="ps-hp-lbl">CURRENT HIT POINTS</span><div class="ps-hp-line">${escapeHtml(currHP)}</div></div>
        <div class="ps-hp-curr"><span class="ps-hp-lbl">TEMPORARY HIT POINTS</span><div class="ps-hp-line">${escapeHtml(tempHP)}</div></div>
      </div>
      <div class="ps-hd-ds-row">
        <div class="ps-hd-box">
          <div class="ps-hd-lbl">HIT DICE</div>
          <div class="ps-hd-v">${escapeHtml(hd)}</div>
          <div class="ps-hd-used">Used: ${escapeHtml(hdUsed)}</div>
        </div>
        <div class="ps-ds-box">
          <div class="ps-ds-lbl">DEATH SAVES</div>
          <div class="ps-ds-row">Successes ○ ○ ○</div>
          <div class="ps-ds-row">Failures &nbsp;&nbsp; ○ ○ ○</div>
        </div>
      </div>
      <div class="ps-section">
        <div class="ps-sec-title">ATTACKS &amp; SPELLCASTING</div>
        <table class="ps-atk">
          <thead><tr><th>Weapon / Attack</th><th>Hit</th><th>Damage &amp; Type</th></tr></thead>
          <tbody>
            <tr><td>Dwarven Thrower (melee)</td><td>${atk('thrower-melee-hit')}</td><td>${atk('thrower-melee-dmg')}</td></tr>
            <tr><td>Dwarven Thrower (thrown)</td><td>${atk('thrower-thrown-hit')}</td><td>${atk('thrower-thrown-dmg')}</td></tr>
            <tr><td>Dwarven Thrower GWM (melee)</td><td>${atk('thrower-gwm-hit')}</td><td>${atk('thrower-gwm-dmg')}</td></tr>
            <tr><td>Dwarven Thrower SS (thrown)</td><td>${atk('thrower-ss-hit')}</td><td>${atk('thrower-ss-dmg')}</td></tr>
            <tr><td>Halberd</td><td>${atk('halberd-hit')}</td><td>${atk('halberd-dmg')}</td></tr>
            <tr><td>Battle Axe</td><td>${atk('axe-hit')}</td><td>${atk('axe-dmg')}</td></tr>
          </tbody>
        </table>
        <div class="ps-fn">GWM: −5/+10 · SS: −5/+10 ranged · Giant's Might: +1d10 one attack/turn · Thrown hammer returns end of turn</div>
      </div>
    </div>

    <!-- RIGHT: Equipment + Proficiencies + XP -->
    <div class="ps-right">
      <div class="ps-section">
        <div class="ps-sec-title">EQUIPMENT</div>
        <div class="ps-eq-list">${equipRows}</div>
      </div>
      <div class="ps-section">
        <div class="ps-sec-title">PROFICIENCIES &amp; LANGUAGES</div>
        <div class="ps-prof-block">
          <div class="ps-prof-group"><strong>Languages</strong><br/>${langText}</div>
          <div class="ps-prof-group"><strong>Tool Prof.</strong><br/>${toolText}</div>
          <div class="ps-prof-group"><strong>Armor</strong><br/>All armor &amp; shields</div>
          <div class="ps-prof-group"><strong>Weapons</strong><br/>Simple &amp; martial</div>
        </div>
      </div>
      <div class="ps-section">
        <div class="ps-sec-title">EXPERIENCE POINTS</div>
        <div class="ps-xp-val">${xpRaw.toLocaleString()} XP</div>
        <div class="ps-xp-note">${escapeHtml(levelLabel)}</div>
        <div class="ps-xp-note">${escapeHtml(xpNeeded)}</div>
        <div class="ps-xp-note">Next journal: ${escapeHtml(journalAmt)}</div>
      </div>
    </div>

  </div><!-- /ps-body -->
</div><!-- /ps-p1 -->`;

  // ── PAGE 2 ───────────────────────────────────────────────────
  const page2 = `
<div class="ps-page" id="ps-p2">
  <header class="ps-hdr ps-hdr-sm">
    <div class="ps-hdr-name-sm">${escapeHtml(name)}</div>
    <div class="ps-hdr-pg">Features, Traits &amp; Notes</div>
  </header>
  <div class="ps-body ps-body-2col">
    <div class="ps-wide">
      <div class="ps-sec-title ps-sec-title-lg">FEATURES &amp; TRAITS</div>
      ${featHTML}
    </div>
    <div class="ps-narrow">
      <div class="ps-section">
        <div class="ps-sec-title">BACKSTORY &amp; NOTES</div>
        <div class="ps-notes">${escapeHtml(notes).split('\n').join('<br/>')}</div>
      </div>
    </div>
  </div>
</div><!-- /ps-p2 -->`;

  const el = document.getElementById('print-sheet');
  if (el) el.innerHTML = page1 + page2;
}

function printSheet() {
  buildPrintSheet();
  window.print();
}

function exportPDF() {
  buildPrintSheet();
  window.print();
}

// ─────────────────────────────────────────────────────────────
// EQUIPMENT SYSTEM
// ─────────────────────────────────────────────────────────────

/** Generate a simple unique ID for new equipment items */
function equipId() {
  return 'eq_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

function normalizeEquipmentItem(item) {
  const normalized = { ...item };
  if (normalized.cat === 'consumable') {
    const count = parseInt(normalized.count, 10);
    normalized.count = Number.isFinite(count) ? Math.max(0, count) : 1;
  } else {
    delete normalized.count;
  }
  return normalized;
}

function syncEquipNewCountState() {
  const catEl = document.getElementById('equip-new-cat');
  const countEl = document.getElementById('equip-new-count');
  if (!catEl || !countEl) return;
  const isConsumable = catEl.value === 'consumable';
  countEl.disabled = !isConsumable;
  countEl.classList.toggle('equip-new-count-disabled', !isConsumable);
}

function adjustEquipCount(id, delta) {
  const entry = equipmentItems.find(i => i.id === id);
  if (!entry || entry.cat !== 'consumable') return;
  const current = parseInt(entry.count, 10);
  const nextCount = Math.max(0, (Number.isFinite(current) ? current : 0) + delta);
  entry.count = nextCount;

  const row = document.querySelector(`.equip-item[data-id="${id}"]`);
  if (row) {
    const countInput = row.querySelector('.equip-count-input');
    const countBadge = row.querySelector('.equip-count-badge');
    if (countInput) countInput.value = nextCount;
    if (countBadge) countBadge.textContent = `×${nextCount}`;
  }

  saveSheet(true);
}

/** Render all equipment items into the list */
function renderEquipment() {
  const list = document.getElementById('equip-list');
  if (!list) return;
  list.innerHTML = '';
  equipmentItems = equipmentItems.map(normalizeEquipmentItem);
  equipmentItems.forEach(item => {
    list.appendChild(buildEquipRow(item));
  });
  // Re-apply active filter
  const activeTab = document.querySelector('.equip-tab.active');
  if (activeTab) filterEquip(activeTab, activeTab.dataset.cat);
}

/** Build a single equipment list item element */
function buildEquipRow(item) {
  item = normalizeEquipmentItem(item);
  const li = document.createElement('li');
  li.className = 'equip-item';
  li.dataset.id = item.id;
  li.dataset.cat = item.cat;

  const catLabels = { armor: 'Armor', weapon: 'Weapon', magic: 'Magic', tool: 'Tool', consumable: 'Consumable', misc: 'Misc' };
  const consumableControls = item.cat === 'consumable'
    ? `<div class="equip-item-controls no-print">
         <button class="equip-count-btn" type="button" title="Use one" onclick="adjustEquipCount('${item.id}', -1)">−</button>
         <label class="equip-count-label">Qty
           <input type="number" class="equip-count-input" min="0" step="1" value="${item.count}" data-item-id="${item.id}" aria-label="${escapeHtml(item.name)} quantity" />
         </label>
         <button class="equip-count-btn" type="button" title="Gain one" onclick="adjustEquipCount('${item.id}', 1)">+</button>
       </div>
       <span class="equip-count-badge">×${item.count}</span>`
    : '';

  li.innerHTML = `
    <span class="equip-cat-badge">${catLabels[item.cat] || item.cat}</span>
    <div class="equip-item-body">
      <span class="equip-item-name" contenteditable="true" data-item-id="${item.id}" data-field="name">${escapeHtml(item.name)}</span><span class="equip-item-sep"> — </span><span class="equip-item-desc" contenteditable="true" data-item-id="${item.id}" data-field="desc">${escapeHtml(item.desc || '')}</span>
    </div>
    ${consumableControls}
    <button class="equip-delete no-print" title="Remove item" onclick="deleteEquipItem('${item.id}')">✕</button>
  `;

  // Save on blur of name or desc
  li.querySelectorAll('[contenteditable]').forEach(el => {
    el.addEventListener('blur', () => {
      const id = el.dataset.itemId;
      const field = el.dataset.field;
      const entry = equipmentItems.find(i => i.id === id);
      if (entry) {
        entry[field] = el.textContent.trim();
        saveSheet(true);
      }
    });
    // Prevent newlines
    el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
  });

  const countInput = li.querySelector('.equip-count-input');
  if (countInput) {
    const countBadge = li.querySelector('.equip-count-badge');
    const syncCount = () => {
      const entry = equipmentItems.find(i => i.id === countInput.dataset.itemId);
      if (!entry) return;
      const parsed = parseInt(countInput.value, 10);
      const nextCount = Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
      countInput.value = nextCount;
      entry.count = nextCount;
      if (countBadge) countBadge.textContent = `×${nextCount}`;
      saveSheet(true);
    };
    countInput.addEventListener('input', syncCount);
    countInput.addEventListener('change', syncCount);
  }

  return li;
}

/** Add a new equipment item from the form */
function addEquipItem() {
  const catEl   = document.getElementById('equip-new-cat');
  const nameEl  = document.getElementById('equip-new-name');
  const descEl  = document.getElementById('equip-new-desc');
  const countEl = document.getElementById('equip-new-count');

  const name = nameEl?.value.trim();
  if (!name) {
    nameEl?.focus();
    nameEl?.classList.add('input-error');
    setTimeout(() => nameEl?.classList.remove('input-error'), 1200);
    return;
  }

  const newItem = {
    id:   equipId(),
    cat:  catEl?.value || 'misc',
    name: name,
    desc: descEl?.value.trim() || '',
  };
  if (newItem.cat === 'consumable') {
    const parsedCount = parseInt(countEl?.value, 10);
    newItem.count = Number.isFinite(parsedCount) ? Math.max(0, parsedCount) : 1;
  }

  const normalizedItem = normalizeEquipmentItem(newItem);
  equipmentItems.push(normalizedItem);

  const list = document.getElementById('equip-list');
  if (list) list.appendChild(buildEquipRow(normalizedItem));

  // Re-apply filter so new item respects active tab
  const activeTab = document.querySelector('.equip-tab.active');
  if (activeTab) filterEquip(activeTab, activeTab.dataset.cat);

  // Clear inputs
  if (nameEl) nameEl.value = '';
  if (descEl) descEl.value = '';
  if (countEl) countEl.value = '1';
  syncEquipNewCountState();
  nameEl?.focus();

  saveSheet(true);
}

/** Allow pressing Enter in the name field to add the item */
document.addEventListener('DOMContentLoaded', () => {
  const nameEl = document.getElementById('equip-new-name');
  if (nameEl) nameEl.addEventListener('keydown', e => { if (e.key === 'Enter') addEquipItem(); });
  const catEl = document.getElementById('equip-new-cat');
  if (catEl) {
    catEl.addEventListener('change', syncEquipNewCountState);
    syncEquipNewCountState();
  }
});

/** Delete an equipment item by id */
function deleteEquipItem(id) {
  equipmentItems = equipmentItems.filter(i => i.id !== id);
  const li = document.querySelector(`.equip-item[data-id="${id}"]`);
  if (li) {
    li.style.opacity = '0';
    setTimeout(() => li.remove(), 180);
  }
  saveSheet(true);
}

/** Filter equipment by category tab */
function filterEquip(btn, cat) {
  // Update active tab
  document.querySelectorAll('.equip-tab').forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');

  // Show/hide items
  document.querySelectorAll('.equip-item').forEach(li => {
    li.classList.toggle('hidden', cat !== 'all' && li.dataset.cat !== cat);
  });
}
// ─────────────────────────────────────────────────────────────
// DYNAMIC LANGUAGES
// ─────────────────────────────────────────────────────────────

function renderLanguages() {
  const ul = document.getElementById('languages-list');
  if (!ul) return;
  ul.innerHTML = '';
  languageItems.forEach(item => {
    const li = document.createElement('li');
    li.className = 'dyn-list-item';
    li.dataset.id = item.id;
    li.innerHTML = `
      <span class="dyn-item-name" contenteditable="true"
        onblur="updateDynItem(languageItems, '${item.id}', 'name', this); saveSheet(true);">${escapeHtml(item.name)}</span>
      ${item.note ? `<span class="dyn-item-note"> — ${escapeHtml(item.note)}</span>` : ''}
      <button class="dyn-delete no-print" onclick="deleteDynItem('language', '${item.id}')" title="Remove">\u00d7</button>
    `;
    ul.appendChild(li);
  });
}

function addLanguage() {
  const name = prompt('New language:');
  if (!name?.trim()) return;
  const note = prompt('Note (optional — e.g. script, dialect):', '') || '';
  languageItems.push({ id: 'la' + Date.now(), name: name.trim(), note: note.trim() });
  renderLanguages();
  saveSheet(true);
}

// ─────────────────────────────────────────────────────────────
// DYNAMIC TOOLS
// ─────────────────────────────────────────────────────────────

function renderTools() {
  const ul = document.getElementById('tools-list');
  if (!ul) return;
  ul.innerHTML = '';
  toolItems.forEach(item => {
    const subs = item.subitems || [];
    const hasOwned = subs.filter(s => s.have).length;
    const li = document.createElement('li');
    li.className = 'dyn-list-item tool-list-item';
    li.dataset.id = item.id;
    li.innerHTML = `
      <div class="tool-main-row">
        <span class="dyn-item-name" contenteditable="true"
          onblur="updateDynItem(toolItems, '${item.id}', 'name', this); saveSheet(true);">${escapeHtml(item.name)}</span>
        ${item.note ? `<span class="dyn-item-note">${escapeHtml(item.note)}</span>` : ''}
        <button class="tool-subitems-toggle no-print" onclick="toggleToolSubItems('${item.id}')"
          title="Show/hide sub-items">&#9660; <span class="tool-sub-count">${hasOwned}/${subs.length}</span></button>
        <button class="btn-add-inline no-print" onclick="addToolSubItem('${item.id}')" title="Add sub-item">+</button>
        <button class="dyn-delete no-print" onclick="deleteDynItem('tool', '${item.id}')" title="Remove">&times;</button>
      </div>
      ${subs.length > 0 ? `
      <ul class="tool-subitems-list" id="tool-subs-${item.id}">
        ${subs.map(sub => `
        <li class="tool-subitem" data-sub-id="${sub.id}">
          <label class="tool-sub-check">
            <input type="checkbox" ${sub.have ? 'checked' : ''}
              onchange="updateToolSubHave('${item.id}','${sub.id}',this.checked)">
            <span class="dyn-item-name tool-sub-name" contenteditable="true"
              onblur="updateToolSubName('${item.id}','${sub.id}',this);">${escapeHtml(sub.name)}</span>
            ${sub.note ? `<span class="dyn-item-note">${escapeHtml(sub.note)}</span>` : ''}
          </label>
          <button class="dyn-delete no-print" onclick="deleteToolSubItem('${item.id}','${sub.id}')" title="Remove">&times;</button>
        </li>`).join('')}
      </ul>` : ''}
    `;
    ul.appendChild(li);
  });
}

function toggleToolSubItems(toolId) {
  const ul = document.getElementById('tool-subs-' + toolId);
  if (ul) ul.classList.toggle('tool-subs-hidden');
}

function addToolSubItem(toolId) {
  const name = prompt('Sub-item name (e.g. Hops, Hammer):');
  if (!name?.trim()) return;
  const note = prompt('Note (optional — e.g. ingredient, qty):', '') || '';
  const tool = toolItems.find(t => t.id === toolId);
  if (!tool) return;
  if (!tool.subitems) tool.subitems = [];
  tool.subitems.push({ id: 'ts' + Date.now(), name: name.trim(), have: true, note: note.trim() });
  renderTools();
  saveSheet(true);
}

function deleteToolSubItem(toolId, subId) {
  const tool = toolItems.find(t => t.id === toolId);
  if (!tool?.subitems) return;
  tool.subitems = tool.subitems.filter(s => s.id !== subId);
  renderTools();
  saveSheet(true);
}

function updateToolSubHave(toolId, subId, checked) {
  const tool = toolItems.find(t => t.id === toolId);
  const sub = tool?.subitems?.find(s => s.id === subId);
  if (sub) { sub.have = checked; saveSheet(true); }
  // Refresh just the count badge without full re-render
  const toggle = document.querySelector(`[data-id="${toolId}"] .tool-sub-count`);
  if (toggle && tool?.subitems) {
    toggle.textContent = tool.subitems.filter(s => s.have).length + '/' + tool.subitems.length;
  }
}

function updateToolSubName(toolId, subId, el) {
  const tool = toolItems.find(t => t.id === toolId);
  const sub = tool?.subitems?.find(s => s.id === subId);
  if (sub) { sub.name = el.textContent.trim(); saveSheet(true); }
}

function addTool() {
  const name = prompt('New tool proficiency:');
  if (!name?.trim()) return;
  const note = prompt('Note (optional — e.g. ×2 Prof, Prof):', '') || '';
  toolItems.push({ id: 'to' + Date.now(), name: name.trim(), note: note.trim(), subitems: [] });
  renderTools();
  saveSheet(true);
}

// ─────────────────────────────────────────────────────────────
// DYNAMIC FEATS
// ─────────────────────────────────────────────────────────────

function renderFeats() {
  const container = document.getElementById('feats-list');
  if (!container) return;
  container.innerHTML = '';
  featItems.forEach(item => {
    const div = document.createElement('div');
    div.className = 'feat-card';
    div.dataset.id = item.id;
    div.innerHTML = `
      <div class="feat-card-header">
        <div class="feat-name" contenteditable="true"
          onblur="updateDynItem(featItems, '${item.id}', 'name', this); saveSheet(true);">${escapeHtml(item.name)}</div>
        <button class="dyn-delete no-print" onclick="deleteDynItem('feat', '${item.id}')" title="Remove">\u00d7</button>
      </div>
      <div class="feat-desc" contenteditable="true"
        onblur="updateDynItem(featItems, '${item.id}', 'desc', this); saveSheet(true);">${escapeHtml(item.desc)}</div>
    `;
    container.appendChild(div);
  });
}

function addFeat() {
  const name = prompt('Feat name:');
  if (!name?.trim()) return;
  const desc = prompt('Description:', '') || '';
  featItems.push({ id: 'fe' + Date.now(), name: name.trim(), desc: desc.trim() });
  renderFeats();
  saveSheet(true);
}

// ─────────────────────────────────────────────────────────────
// SHARED DYNAMIC LIST HELPERS
// ─────────────────────────────────────────────────────────────

function updateDynItem(arr, id, field, el) {
  const item = arr.find(i => i.id === id);
  if (item) item[field] = el.textContent.trim();
}

function deleteDynItem(type, id) {
  if (!confirm('Remove this item?')) return;
  if (type === 'language') { languageItems = languageItems.filter(i => i.id !== id); renderLanguages(); }
  else if (type === 'tool')     { toolItems = toolItems.filter(i => i.id !== id); renderTools(); }
  else if (type === 'feat')     { featItems = featItems.filter(i => i.id !== id); renderFeats(); }
  saveSheet(true);
}