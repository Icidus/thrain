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
  { id: 'to1', name: "Brewer's Supplies", note: 'Proficient' },
  { id: 'to2', name: "Smith's Tools",     note: '×2 Proficiency (Rune Knight)' },
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
    equipmentItems = DEFAULT_EQUIPMENT.map(e => ({ ...e }));
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
  setText('sk-athletics',   fmtMod(mStr + prof));   // proficient
  setText('sk-acrobatics',  fmtMod(mDex));
  setText('sk-sleight',     fmtMod(mDex + dpProf)); // double prof
  setText('sk-stealth',     fmtMod(mDex));
  setText('sk-arcana',      fmtMod(mInt + dpProf)); // double prof
  setText('sk-history',     fmtMod(mInt));
  setText('sk-investigation',fmtMod(mInt));
  setText('sk-nature',      fmtMod(mInt));
  setText('sk-religion',    fmtMod(mInt));
  setText('sk-animal',      fmtMod(mWis));
  setText('sk-insight',     fmtMod(mWis + dpProf)); // double prof
  setText('sk-medicine',    fmtMod(mWis));
  setText('sk-perception',  fmtMod(mWis + prof));   // proficient
  setText('sk-survival',    fmtMod(mWis + prof));   // proficient
  setText('sk-deception',   fmtMod(mCha + dpProf)); // double prof
  setText('sk-intimidation',fmtMod(mCha));
  setText('sk-performance', fmtMod(mCha));
  setText('sk-persuasion',  fmtMod(mCha));

  // Passive scores (10 + modifier)
  const passivePerc = 10 + mWis + prof;
  const passiveInsight = 10 + mWis + dpProf;
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
  return { mStr, mDex, mWis, mCon, totalLevel, prof, runeDC, gmA, vsG, gwm, ss };
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

  let hitBonus, damageDice, damageBonus, notes = [], weaponLabel;

  if (weapon === 'thrown') {
    weaponLabel = 'DT Thrown';
    hitBonus = s.mStr + s.prof + magic + ARCHERY_STYLE_BONUS;
    damageBonus = s.mStr + magic;
    if (s.ss) { hitBonus -= 5; damageBonus += 10; notes.push('Sharpshooter −5/+10'); }
    damageDice = s.vsG ? '3d8' : '2d8';
    if (s.vsG) notes.push('vs Giant +1d8');
    notes.push('bludg · returns');
  } else if (weapon === 'melee') {
    weaponLabel = 'DT Melee';
    hitBonus = s.mStr + s.prof + magic;
    damageBonus = s.mStr + magic;
    if (s.gwm) { hitBonus -= 5; damageBonus += 10; notes.push('GWM −5/+10'); }
    damageDice = '1d8';
    notes.push('bludg');
  } else if (weapon === 'halberd') {
    weaponLabel = 'Halberd';
    hitBonus = s.mStr + s.prof;
    damageBonus = s.mStr;
    if (s.gwm) { hitBonus -= 5; damageBonus += 10; notes.push('GWM −5/+10'); }
    damageDice = '1d10';
    notes.push('slash · reach 10ft');
  } else {
    weaponLabel = 'Battle Axe';
    hitBonus = s.mStr + s.prof;
    damageBonus = s.mStr;
    if (s.gwm) { hitBonus -= 5; damageBonus += 10; notes.push('GWM −5/+10'); }
    damageDice = '1d8';
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

  const dmgBreakdown = `[${dmg.rolls.join('+')}]${isCrit ? '×2' : ''}${gmRoll > 0 ? `+GM(${gmRoll})` : ''}${fmtMod(damageBonus)}`;

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
          <div class="bt-dice-label">Damage &nbsp;${damageDice}${gmRoll > 0 ? '+1d10' : ''}${isCrit ? ' (CRIT ×2)' : ''}</div>
          <div class="bt-dice-value">${dmgBreakdown} = <strong>${totalDmg}</strong></div>
        </div>
      </div>
      ${notes.length ? `<div class="bt-result-notes">${notes.join(' &middot; ')}</div>` : ''}
      ${gmNote ? `<div class="bt-result-notes" style="color:#ffd700">${gmNote}</div>` : ''}
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
      document.getElementById('bt-gm-active').checked = true;
      btAddLog("Giant's Might (BA)", 'bonus');
      html = `<div class="bt-result-card bt-card-bonus">
        <div class="bt-result-head">&#9889; Giant's Might (Bonus Action)</div>
        <ul class="bt-result-list">
          <li>Size becomes <strong>Large</strong> (if space allows)</li>
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
  const currentThreshold = XP_THRESHOLDS[currentLevel];
  if (!nextThreshold) return 0;
  return Math.floor((nextThreshold - currentThreshold) * 0.1);
}

function updateJournalPreview() {
  const currentXP = parseInt(document.getElementById('xp-input')?.value || '355000', 10);
  const jxp = calcJournalXP(currentXP);
  const el = document.getElementById('journal-xp-value');
  if (el) el.textContent = jxp.toLocaleString() + ' XP';
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
    equipmentItems = data['_equipment'];
  } else {
    equipmentItems = DEFAULT_EQUIPMENT.map(e => ({ ...e }));
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
      equipmentItems = DEFAULT_EQUIPMENT.map(e => ({ ...e }));
      renderEquipment();
      return;
    }
    applySheetData(JSON.parse(raw));
  } catch (e) {
    console.error('Load failed:', e);
    equipmentItems = DEFAULT_EQUIPMENT.map(e => ({ ...e }));
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

function printSheet() {
  window.print();
}

function exportPDF() {
  // Check if html2pdf is loaded
  if (typeof html2pdf === 'undefined') {
    alert('PDF library not loaded. Try again in a moment or use the Print button instead.');
    return;
  }

  const btn = document.getElementById('btn-pdf');
  if (btn) { btn.textContent = '⏳ Generating…'; btn.disabled = true; }

  const element = document.getElementById('character-sheet');
  const characterName = document.querySelector('[data-key="char_name"]')?.textContent?.trim() || 'Thrain';
  const safeFilename = characterName.replace(/[^a-z0-9_\-]/gi, '_').replace(/_+/g, '_');

  const opts = {
    margin:      [8, 8, 8, 8],
    filename:    `${safeFilename}_character_sheet.pdf`,
    image:       { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, logging: false, useCORS: true, allowTaint: true },
    jsPDF:       { unit: 'mm', format: 'letter', orientation: 'portrait' },
    pagebreak:   { mode: ['avoid-all', 'css', 'legacy'], before: '.rune-section' },
  };

  html2pdf()
    .set(opts)
    .from(element)
    .save()
    .then(() => {
      if (btn) { btn.textContent = '📄 Export PDF'; btn.disabled = false; }
    })
    .catch(err => {
      console.error('PDF export failed:', err);
      alert('PDF export failed. Try Print → Save as PDF instead.');
      if (btn) { btn.textContent = '📄 Export PDF'; btn.disabled = false; }
    });
}

// ─────────────────────────────────────────────────────────────
// EQUIPMENT SYSTEM
// ─────────────────────────────────────────────────────────────

/** Generate a simple unique ID for new equipment items */
function equipId() {
  return 'eq_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6);
}

/** Render all equipment items into the list */
function renderEquipment() {
  const list = document.getElementById('equip-list');
  if (!list) return;
  list.innerHTML = '';
  equipmentItems.forEach(item => {
    list.appendChild(buildEquipRow(item));
  });
  // Re-apply active filter
  const activeTab = document.querySelector('.equip-tab.active');
  if (activeTab) filterEquip(activeTab, activeTab.dataset.cat);
}

/** Build a single equipment list item element */
function buildEquipRow(item) {
  const li = document.createElement('li');
  li.className = 'equip-item';
  li.dataset.id = item.id;
  li.dataset.cat = item.cat;

  const catLabels = { armor: 'Armor', weapon: 'Weapon', magic: 'Magic', tool: 'Tool', consumable: 'Consumable', misc: 'Misc' };

  li.innerHTML = `
    <span class="equip-cat-badge">${catLabels[item.cat] || item.cat}</span>
    <div class="equip-item-body">
      <span class="equip-item-name" contenteditable="true" data-item-id="${item.id}" data-field="name">${escapeHtml(item.name)}</span><span class="equip-item-sep"> — </span><span class="equip-item-desc" contenteditable="true" data-item-id="${item.id}" data-field="desc">${escapeHtml(item.desc || '')}</span>
    </div>
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

  return li;
}

/** Add a new equipment item from the form */
function addEquipItem() {
  const catEl   = document.getElementById('equip-new-cat');
  const nameEl  = document.getElementById('equip-new-name');
  const descEl  = document.getElementById('equip-new-desc');

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

  equipmentItems.push(newItem);

  const list = document.getElementById('equip-list');
  if (list) list.appendChild(buildEquipRow(newItem));

  // Re-apply filter so new item respects active tab
  const activeTab = document.querySelector('.equip-tab.active');
  if (activeTab) filterEquip(activeTab, activeTab.dataset.cat);

  // Clear inputs
  if (nameEl) nameEl.value = '';
  if (descEl) descEl.value = '';
  nameEl?.focus();

  saveSheet(true);
}

/** Allow pressing Enter in the name field to add the item */
document.addEventListener('DOMContentLoaded', () => {
  const nameEl = document.getElementById('equip-new-name');
  if (nameEl) nameEl.addEventListener('keydown', e => { if (e.key === 'Enter') addEquipItem(); });
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
    const li = document.createElement('li');
    li.className = 'dyn-list-item';
    li.dataset.id = item.id;
    li.innerHTML = `
      <span class="dyn-item-name" contenteditable="true"
        onblur="updateDynItem(toolItems, '${item.id}', 'name', this); saveSheet(true);">${escapeHtml(item.name)}</span>
      ${item.note ? `<span class="dyn-item-note"> — ${escapeHtml(item.note)}</span>` : ''}
      <button class="dyn-delete no-print" onclick="deleteDynItem('tool', '${item.id}')" title="Remove">\u00d7</button>
    `;
    ul.appendChild(li);
  });
}

function addTool() {
  const name = prompt('New tool proficiency:');
  if (!name?.trim()) return;
  const note = prompt('Note (optional — e.g. ×2 Prof, Prof):', '') || '';
  toolItems.push({ id: 'to' + Date.now(), name: name.trim(), note: note.trim() });
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