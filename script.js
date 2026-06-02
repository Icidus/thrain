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

const FISHING_RARITY_ORDER = ['Nothing', 'Junk', 'Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary Fish'];
const FISHING_GEAR_REGEX = /fish|fisher|rod|pole|net|hook|line|lure|bait|tackle/i;
let fishingTable = {};
let fishingPanelInitialized = false;

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
let dismissedClassFeatures = []; // ids of auto class features the user has hidden

// ─────────────────────────────────────────────────────────────
// INITIALIZATION
// ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadSheet(); // also calls renderEquipment + renderLanguages + renderTools + renderFeats internally
  initMulticlassUI(); // build class/subclass dropdowns for any existing rows
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

  initFishingPanel();
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

  // Auto-populate class features from the multiclass rows
  syncMulticlassFeatures();

  // Spellcasting section (DC/attack/slots depend on stats + caster level)
  renderSpells();

  renderFishingSummary();
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

// ─────────────────────────────────────────────────────────────
// FISHING MECHANIC
// ─────────────────────────────────────────────────────────────

function rollDie(sides) {
  return Math.ceil(Math.random() * sides);
}

function parseCsvLine(line) {
  const out = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === ',' && !inQuotes) {
      out.push(current);
      current = '';
      continue;
    }

    current += ch;
  }

  out.push(current);
  return out;
}

function normalizeFishingRarity(label) {
  const cleaned = (label || '').trim();
  if (FISHING_RARITY_ORDER.includes(cleaned)) return cleaned;
  return '';
}

function ensureFishingTableLoaded() {
  if (Object.keys(fishingTable).length > 0) return fishingTable;

  const csv = window.FISHING_TABLE_CSV || '';
  if (!csv.trim()) {
    fishingTable = {};
    return fishingTable;
  }

  const parsed = {
    Nothing: [],
    Junk: [],
    Common: [],
    Uncommon: [],
    Rare: [],
    'Very Rare': [],
    'Legendary Fish': [],
  };

  let currentRarity = '';
  csv.split(/\r?\n/).forEach(rawLine => {
    const line = rawLine.trim();
    if (!line) return;

    const cols = parseCsvLine(line);
    const rollCell = (cols[0] || '').trim();
    const labelCell = (cols[1] || '').trim();
    const rarity = normalizeFishingRarity(labelCell);

    if (rarity) {
      currentRarity = rarity;
      return;
    }

    if (rollCell === 'Roll' || !currentRarity) return;
    if (!/^\d+$/.test(rollCell)) return;

    parsed[currentRarity].push({
      roll: parseInt(rollCell, 10),
      name: labelCell,
      description: (cols[2] || '').trim(),
      fishingDC: parseInt(cols[5], 10) || 0,
      ps: parseInt(cols[6], 10) || 0,
    });
  });

  fishingTable = parsed;
  return fishingTable;
}

function getFishingGearItems() {
  return equipmentItems.filter(item => {
    const haystack = `${item.name || ''} ${item.desc || ''}`;
    return FISHING_GEAR_REGEX.test(haystack);
  });
}

function getFishingBackgroundAdvantage() {
  const bgEl = document.querySelector('[data-key="background"]');
  const bgText = bgEl?.textContent?.trim() || '';
  return /fisher/i.test(bgText);
}

function getCurrentStrengthScore() {
  const beltActive = document.getElementById('belt-active')?.checked ?? false;
  const rawStr = getNum('stat_str', 18);
  return beltActive ? Math.max(rawStr, BELT_STR) : rawStr;
}

function getCurrentStrengthMod() {
  return mod(getCurrentStrengthScore());
}

function getDisplayedModifier(id, fallback = 0) {
  const text = document.getElementById(id)?.textContent?.trim();
  const value = parseInt(text, 10);
  return Number.isFinite(value) ? value : fallback;
}

function getFishingRarity(total) {
  if (total >= 29) return 'Legendary Fish';
  if (total >= 25) return 'Very Rare';
  if (total >= 22) return 'Rare';
  if (total >= 19) return 'Uncommon';
  if (total >= 14) return 'Common';
  if (total >= 10) return 'Junk';
  return 'Nothing';
}

function renderFishingSummary() {
  const summaryEl = document.getElementById('fishing-summary');
  if (!summaryEl) return;

  const survivalMod = getDisplayedModifier('sk-survival', 0);
  const strScore = getCurrentStrengthScore();
  const strMod = getCurrentStrengthMod();
  const advantageNote = getFishingBackgroundAdvantage() ? ' · Fisherman ADV' : '';

  summaryEl.textContent = `Survival ${fmtMod(survivalMod)} · STR ${strScore} (${fmtMod(strMod)})${advantageNote}`;
}

function renderFishingGearOptions() {
  const select = document.getElementById('fishing-gear-select');
  const status = document.getElementById('fishing-gear-status');
  const halfBtn = document.getElementById('fish-btn-half');
  const fullBtn = document.getElementById('fish-btn-full');
  if (!select) return;

  ensureFishingTableLoaded();

  const availableGear = getFishingGearItems();
  const savedValue = select.value;
  select.innerHTML = '';

  if (availableGear.length === 0) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'No fishing gear in inventory';
    select.appendChild(option);
    select.disabled = true;
    if (halfBtn) halfBtn.disabled = true;
    if (fullBtn) fullBtn.disabled = true;
    if (status) status.textContent = 'Add a pole, rod, net, or Fisherman\'s Tools to Equipment to unlock fishing rolls.';
    return;
  }

  availableGear.forEach(item => {
    const option = document.createElement('option');
    option.value = item.id;
    option.textContent = item.desc ? `${item.name} — ${item.desc}` : item.name;
    select.appendChild(option);
  });

  select.disabled = false;
  select.value = availableGear.some(item => item.id === savedValue) ? savedValue : availableGear[0].id;
  if (halfBtn) halfBtn.disabled = false;
  if (fullBtn) fullBtn.disabled = false;

  const advantageText = getFishingBackgroundAdvantage()
    ? 'Fisherman background advantage is applied automatically on the Survival rarity roll.'
    : 'Survival rarity roll is normal unless your DM grants advantage.';
  if (status) status.textContent = `${advantageText} Luck is always an unmodified d20.`;
}

function getSelectedFishingGear() {
  const selectedId = document.getElementById('fishing-gear-select')?.value;
  return getFishingGearItems().find(item => item.id === selectedId) || null;
}

function getFishingEntry(rarity, luckRoll) {
  ensureFishingTableLoaded();
  return (fishingTable[rarity] || []).find(entry => entry.roll === luckRoll) || null;
}

function formatFishingRarityClass(rarity) {
  return rarity.toLowerCase().replace(/[^a-z]+/g, '-');
}

function extractSaleText(description) {
  const match = (description || '').match(/Sells for[^.]*\./i);
  return match ? match[0] : '';
}

function resolveFishingAttempt(attemptNumber, gear) {
  const survivalMod = getDisplayedModifier('sk-survival', 0);
  const hasAdvantage = getFishingBackgroundAdvantage();
  const survivalRollA = rollDie(20);
  const survivalRollB = hasAdvantage ? rollDie(20) : null;
  const chosenSurvival = hasAdvantage ? Math.max(survivalRollA, survivalRollB) : survivalRollA;
  const rarityTotal = chosenSurvival + survivalMod;
  const rarity = getFishingRarity(rarityTotal);

  const result = {
    attemptNumber,
    gear,
    survivalMod,
    hasAdvantage,
    survivalRollA,
    survivalRollB,
    chosenSurvival,
    rarityTotal,
    rarity,
    luckRoll: null,
    entry: null,
    strengthRequired: false,
    strengthScore: getCurrentStrengthScore(),
    strengthMod: getCurrentStrengthMod(),
    strengthRoll: null,
    strengthTotal: null,
    strengthSuccess: true,
  };

  if (rarity === 'Nothing') return result;

  result.luckRoll = rollDie(20);
  result.entry = getFishingEntry(rarity, result.luckRoll);

  if (!result.entry) return result;

  const fishPs = Number(result.entry.ps) || 0;
  if (fishPs >= result.strengthScore && fishPs > 0) {
    result.strengthRequired = true;
    result.strengthRoll = rollDie(20);
    result.strengthTotal = result.strengthRoll + result.strengthMod;
    result.strengthSuccess = result.strengthTotal >= fishPs;
  }

  return result;
}

function renderFishingAttemptCard(result) {
  const rarityClass = formatFishingRarityClass(result.rarity);
  const survivalRollText = result.hasAdvantage
    ? `${result.survivalRollA} / ${result.survivalRollB} → ${result.chosenSurvival}`
    : `${result.survivalRollA}`;

  if (result.rarity === 'Nothing') {
    return `
      <article class="fishing-card fishing-card-${rarityClass}">
        <div class="fishing-card-head">
          <div class="fishing-card-title">Attempt ${result.attemptNumber}</div>
          <span class="fishing-rarity-badge fishing-rarity-${rarityClass}">${escapeHtml(result.rarity)}</span>
        </div>
        <div class="fishing-roll-line"><strong>Gear:</strong> ${escapeHtml(result.gear.name)}</div>
        <div class="fishing-roll-line"><strong>Survival:</strong> d20 ${result.hasAdvantage ? '(adv)' : ''} = ${survivalRollText}; ${fmtMod(result.survivalMod)} → <strong>${result.rarityTotal}</strong></div>
        <div class="fishing-outcome fishing-outcome-empty">No catch this attempt.</div>
      </article>
    `;
  }

  const entry = result.entry;
  const saleText = extractSaleText(entry?.description || '');
  const strengthBlock = result.strengthRequired
    ? `<div class="fishing-roll-line"><strong>Strength check:</strong> d20 = ${result.strengthRoll}; ${fmtMod(result.strengthMod)} → <strong>${result.strengthTotal}</strong> vs PS ${entry.ps} ${result.strengthSuccess ? '<span class="fishing-pass">Success</span>' : '<span class="fishing-fail">Failed</span>'}</div>`
    : `<div class="fishing-roll-line"><strong>Strength check:</strong> Not required (${entry?.ps || 0} PS vs STR ${result.strengthScore}).</div>`;

  const outcomeText = result.strengthSuccess
    ? `Caught ${escapeHtml(entry?.name || 'Unknown Catch')}`
    : `${escapeHtml(entry?.name || 'The catch')} got away`;

  return `
    <article class="fishing-card fishing-card-${rarityClass}">
      <div class="fishing-card-head">
        <div class="fishing-card-title">Attempt ${result.attemptNumber}</div>
        <span class="fishing-rarity-badge fishing-rarity-${rarityClass}">${escapeHtml(result.rarity)}</span>
      </div>
      <div class="fishing-roll-line"><strong>Gear:</strong> ${escapeHtml(result.gear.name)}</div>
      <div class="fishing-roll-line"><strong>Survival:</strong> d20 ${result.hasAdvantage ? '(adv)' : ''} = ${survivalRollText}; ${fmtMod(result.survivalMod)} → <strong>${result.rarityTotal}</strong></div>
      <div class="fishing-roll-line"><strong>Luck:</strong> d20 = ${result.luckRoll} → ${escapeHtml(entry?.name || 'Unknown Catch')}</div>
      ${strengthBlock}
      <div class="fishing-outcome ${result.strengthSuccess ? 'fishing-outcome-catch' : 'fishing-outcome-lost'}">${outcomeText}</div>
      ${entry?.description ? `<div class="fishing-catch-desc">${escapeHtml(entry.description)}</div>` : ''}
      ${saleText ? `<div class="fishing-catch-sale">${escapeHtml(saleText)}</div>` : ''}
    </article>
  `;
}

function runFishingSession(attemptCount) {
  ensureFishingTableLoaded();
  renderFishingGearOptions();
  renderFishingSummary();

  const gear = getSelectedFishingGear();
  const resultsEl = document.getElementById('fishing-results');
  if (!resultsEl) return;

  if (!gear) {
    resultsEl.innerHTML = '<div class="fishing-empty">No valid fishing gear found in Equipment. Add a pole, rod, net, or Fisherman\'s Tools first.</div>';
    return;
  }

  const attempts = [];
  for (let i = 1; i <= attemptCount; i++) {
    attempts.push(resolveFishingAttempt(i, gear));
  }

  resultsEl.innerHTML = attempts.map(renderFishingAttemptCard).join('');
}

function fishHalfDay() {
  runFishingSession(1);
}

function fishFullDay() {
  runFishingSession(2);
}

function initFishingPanel() {
  fishingPanelInitialized = true;
  ensureFishingTableLoaded();
  renderFishingGearOptions();
  renderFishingSummary();

  const bgEl = document.querySelector('[data-key="background"]');
  bgEl?.addEventListener('input', () => {
    renderFishingGearOptions();
    renderFishingSummary();
  });

  const gearSelect = document.getElementById('fishing-gear-select');
  gearSelect?.addEventListener('change', () => {
    const resultsEl = document.getElementById('fishing-results');
    if (resultsEl) {
      resultsEl.innerHTML = '<div class="fishing-empty">Gear changed. Roll a new half-day or full-day fishing session.</div>';
    }
  });
}

window.fishHalfDay = fishHalfDay;
window.fishFullDay = fishFullDay;

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
  btRenderClassAbilities();
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

  // Mirror the roll into the persistent dice tracker
  if (window.diceRoller && window.diceRoller.pushEntry) {
    window.diceRoller.pushEntry({ label: `${weaponLabel} (hit)`, detail: `d20(${d20})${fmtMod(hitBonus)} = ${totalHit}`, total: totalHit, crit: isCrit, fumble: isFumble });
    window.diceRoller.pushEntry({ label: `${weaponLabel} (dmg)`, detail: `${damageFormula} ${rolledParts.join('+')} ${damageBonusText} = ${totalDmg}`, total: totalDmg });
  }

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
// ── Multiclass abilities (data-driven) ──────────────────────────────────
// Fighter/Rune Knight remains hardcoded above. These are injected into the
// tracker for any OTHER class present in the Multiclass Breakdown, gated by
// level and subclass. Add a class entry here to support more multiclasses.
const BT_CLASS_ABILITIES = {
  barbarian: {
    label: 'Barbarian',
    abilities: [
      { key: 'mc_rage', label: '🔥 Rage', economy: 'bonus', minLevel: 1,
        build: () => ({ html: `<div class="bt-result-card bt-card-bonus">
          <div class="bt-result-head">🔥 Rage (Bonus Action)</div>
          <ul class="bt-result-list">
            <li><strong>Advantage</strong> on STR checks &amp; saves</li>
            <li><strong>+${btRageDamage()}</strong> melee damage on STR attacks</li>
            <li><strong>Resistance</strong> to bludgeoning, piercing &amp; slashing</li>
            <li>Lasts 1 min (while you attack or take damage each round)</li>
          </ul>
          <div class="bt-result-notes">✎ Track rage rounds · can't cast/concentrate while raging</div>
        </div>` }) },
      { key: 'mc_reckless', label: '⚡ Reckless Attack', economy: 'free', minLevel: 2,
        build: () => ({ html: `<div class="bt-result-card bt-card-action">
          <div class="bt-result-head">⚡ Reckless Attack (declare on your first attack)</div>
          <ul class="bt-result-list">
            <li><strong>Advantage</strong> on melee STR attack rolls this turn</li>
            <li>⚠ Attacks <strong>against you</strong> have advantage until your next turn</li>
          </ul>
          <div class="bt-result-notes">Tip: set ADV in the dice panel, or roll the dice twice and keep the higher.</div>
        </div>` }) },
      { key: 'mc_danger_sense', label: 'Danger Sense', economy: 'passive', minLevel: 2,
        note: '🜂 Danger Sense — advantage on DEX saves vs. effects you can see.' },
    ],
    subclasses: {
      berserker: [
        { key: 'mc_frenzy', label: '🗡 Frenzy Attack', economy: 'bonus', minLevel: 3,
          build: (s) => {
            const hit = s.mStr + s.prof;
            return {
              html: `<div class="bt-result-card bt-card-bonus">
                <div class="bt-result-head">🗡 Frenzy — Bonus-Action Melee Attack (while raging)</div>
                <div class="bt-result-dice-row">
                  <div class="bt-dice-block bt-hit-block"><div class="bt-dice-label">To Hit:</div><div class="bt-dice-value">1d20 <span class="bt-bonus">${fmtMod(hit)}</span></div></div>
                  <div class="bt-dice-arrow">&#10132;</div>
                  <div class="bt-dice-block bt-dmg-block"><div class="bt-dice-label">Damage:</div><div class="bt-dice-value">1d8 <span class="bt-bonus">${fmtMod(s.mStr)}</span> <span class="bt-tag">+ weapon die</span></div></div>
                </div>
                <div class="bt-result-notes">⚠ Exhaustion when your rage ends (Berserker Frenzy)</div>
              </div>`,
              roll: { kind: 'attack', label: 'Frenzy Attack', hit, dmg: '1d8', dmgBonus: s.mStr },
            };
          } },
      ],
    },
  },
};

/** Highest Barbarian level across the multiclass rows. */
function btBarbarianLevel() {
  let lvl = 0;
  readMulticlassRows().forEach(r => { if (r.key === 'barbarian') lvl = Math.max(lvl, r.level); });
  return lvl;
}
/** Rage bonus damage by Barbarian level: +2 / +3 (9th) / +4 (16th). */
function btRageDamage() {
  const l = btBarbarianLevel();
  return l >= 16 ? 4 : l >= 9 ? 3 : 2;
}

let btDynamicAbilities = {}; // key -> ability def (for btUse lookup)
let btPendingRolls = {};     // key -> roll spec (for the 🎲 Roll button)

/** Roll specs for the hardcoded dice cards, so they get a Roll button too. */
const BT_HARDCODED_ROLLS = {
  pam_bonus:   (s) => ({ kind: 'attack', label: 'PAM Butt Attack', hit: s.mStr + s.prof, dmg: '1d4', dmgBonus: s.mStr }),
  gwm_bonus:   (s) => ({ kind: 'attack', label: 'GWM Bonus Attack', hit: s.mStr + s.prof + DWARVEN_THROWER_BONUS, dmg: '1d8', dmgBonus: s.mStr + DWARVEN_THROWER_BONUS }),
  sentinel_oa: (s) => ({ kind: 'attack', label: 'Sentinel OA', hit: s.mStr + s.prof + DWARVEN_THROWER_BONUS, dmg: '1d8', dmgBonus: s.mStr + DWARVEN_THROWER_BONUS }),
  second_wind: (s) => ({ kind: 'expr', label: 'Second Wind heal', expr: `1d10+${s.totalLevel}` }),
};

/** (Re)build the injected multiclass ability buttons from the multiclass rows. */
function btRenderClassAbilities() {
  const cols = {
    action: document.getElementById('bt-mc-action'),
    bonus: document.getElementById('bt-mc-bonus'),
    reaction: document.getElementById('bt-mc-reaction'),
  };
  if (!cols.action || !cols.bonus || !cols.reaction) return;
  cols.action.innerHTML = ''; cols.bonus.innerHTML = ''; cols.reaction.innerHTML = '';
  const passivesEl = document.getElementById('bt-passives');
  if (passivesEl) passivesEl.innerHTML = '';
  btDynamicAbilities = {};
  const passiveNotes = [];
  const ecoBtnClass = { action: 'bt-action', free: 'bt-action', bonus: 'bt-bonus', reaction: 'bt-reaction' };

  readMulticlassRows().forEach(row => {
    const def = BT_CLASS_ABILITIES[row.key];
    if (!def) return; // Fighter (hardcoded) & unknown classes are skipped
    const list = def.abilities.filter(a => row.level >= (a.minLevel || 1));
    const subSlug = parseSubclassSlug(row.raw);
    if (subSlug && def.subclasses) {
      Object.keys(def.subclasses).forEach(sk => {
        if (subSlug === sk || subSlug.includes(sk) || sk.includes(subSlug)) {
          def.subclasses[sk].forEach(a => { if (row.level >= (a.minLevel || 1)) list.push(a); });
        }
      });
    }
    list.forEach(a => {
      btDynamicAbilities[a.key] = a;
      if (a.economy === 'passive') { if (a.note) passiveNotes.push(a.note); return; }
      const col = cols[a.economy] || cols.action;
      const btn = document.createElement('button');
      btn.className = `bt-btn ${ecoBtnClass[a.economy] || 'bt-action'} bt-mc-btn`;
      btn.innerHTML = `${a.label} <span class="bt-tag">${def.label}</span>`;
      btn.addEventListener('click', () => btUse(a.key));
      col.appendChild(btn);
    });
  });

  if (passivesEl && passiveNotes.length) {
    passivesEl.innerHTML = passiveNotes.map(n => `<span class="bt-passive-note">${n}</span>`).join('');
  }
}

/** HTML for a 🎲 Roll button + output slot on a result card. */
function btRollButtonHtml(key, spec) {
  return `<div class="bt-roll-row">
    <button class="bt-roll-btn" onclick="btRollAbility('${key}')">🎲 Roll ${escapeHtml(spec.label || '')}</button>
    <span id="bt-roll-out-${key}" class="bt-roll-out"></span>
  </div>`;
}

/** Execute a stored roll spec: roll, show inline, and log to the dice tracker. */
function btRollAbility(key) {
  const spec = btPendingRolls[key];
  if (!spec) return;
  const out = document.getElementById('bt-roll-out-' + key);
  if (spec.kind === 'attack') {
    const d20 = Math.ceil(Math.random() * 20);
    const crit = d20 === 20, fumble = d20 === 1;
    const totalHit = d20 + spec.hit;
    const [dc, ds] = spec.dmg.match(/(\d+)d(\d+)/).slice(1).map(Number);
    const dmg = btRollDice(crit ? dc * 2 : dc, ds);
    const totalDmg = dmg.total + (spec.dmgBonus || 0);
    const tag = crit ? ' <strong style="color:#1e7e34">CRIT!</strong>' : fumble ? ' <strong style="color:#b30000">FUMBLE</strong>' : '';
    if (out) out.innerHTML = `Hit <strong>${totalHit}</strong>${tag} · Dmg <strong>${totalDmg}</strong>
      <span class="bt-roll-detail">[d20 ${d20}${fmtMod(spec.hit)}; ${spec.dmg}${crit ? '×2' : ''} ${dmg.rolls.join('+')}${spec.dmgBonus ? fmtMod(spec.dmgBonus) : ''}]</span>`;
    if (window.diceRoller && window.diceRoller.pushEntry) {
      window.diceRoller.pushEntry({ label: `${spec.label} (hit)`, detail: `d20(${d20})${fmtMod(spec.hit)} = ${totalHit}`, total: totalHit, crit, fumble });
      window.diceRoller.pushEntry({ label: `${spec.label} (dmg)`, detail: `${spec.dmg}${crit ? '×2' : ''}(${dmg.rolls.join(',')})${spec.dmgBonus ? fmtMod(spec.dmgBonus) : ''} = ${totalDmg}`, total: totalDmg });
    }
  } else if (spec.kind === 'expr') {
    let res = null;
    if (window.diceRoller && window.diceRoller.rollAndLog) res = window.diceRoller.rollAndLog(spec.label, spec.expr);
    if (out && res) out.innerHTML = `<strong>${res.total}</strong> <span class="bt-roll-detail">[${res.detail}]</span>`;
  }
}

/** Generic handler for a data-driven multiclass ability. */
function btUseDynamic(def) {
  const eco = def.economy;
  if (eco === 'bonus' && btState.bonusUsed) { btShowResult('<div class="bt-result-warn">⚠ Bonus action already used this round.</div>'); return; }
  if (eco === 'reaction' && btState.reactionUsed) { btShowResult('<div class="bt-result-warn">⚠ Reaction already used this round.</div>'); return; }
  if (eco === 'action' && btState.actionUsed) { btShowResult('<div class="bt-result-warn">⚠ Action already used this round.</div>'); return; }

  const built = def.build ? def.build(btGetStats()) : { html: `<div class="bt-result-card"><div class="bt-result-head">${def.label}</div></div>` };
  if (eco === 'bonus') btState.bonusUsed = true;
  else if (eco === 'reaction') btState.reactionUsed = true;
  else if (eco === 'action') btState.actionUsed = true;

  const logType = eco === 'reaction' ? 'reaction' : eco === 'free' ? 'attack' : 'bonus';
  btAddLog(String(def.label).replace(/<[^>]+>/g, '').trim(), logType);

  let html = built.html;
  if (built.roll) { btPendingRolls[def.key] = built.roll; html += btRollButtonHtml(def.key, built.roll); }
  btRender();
  btShowResult(html);
}

function btUse(ability) {
  // Data-driven multiclass abilities take precedence.
  if (btDynamicAbilities[ability]) { btUseDynamic(btDynamicAbilities[ability]); return; }

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
  if (html) {
    if (BT_HARDCODED_ROLLS[ability]) {
      const spec = BT_HARDCODED_ROLLS[ability](s);
      btPendingRolls[ability] = spec;
      html += btRollButtonHtml(ability, spec);
    }
    btShowResult(html);
  }
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
window.btRollAbility  = btRollAbility;


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

// ── Multiclass row dropdowns ────────────────────────────────────────────
const MC_CLASSES = ['Barbarian','Bard','Cleric','Druid','Fighter','Monk','Paladin','Ranger','Rogue','Sorcerer','Warlock','Wizard'];
const MC_CLASS_KEYS = MC_CLASSES.map(c => c.toLowerCase());
// Subclasses we have feature data for (SRD + homebrew), by class. Display names
// slugify back to the right key via the forgiving match in resolveSubclassFeatures.
const SUBCLASS_BY_CLASS = {
  barbarian: ['Path of the Berserker'],
  bard: ['College of Lore'],
  cleric: ['Life Domain', 'Twilight Domain'],
  druid: ['Circle of the Land'],
  fighter: ['Champion', 'Rune Knight'],
  monk: ['Way of the Open Hand'],
  paladin: ['Oath of Devotion'],
  ranger: ['Hunter'],
  rogue: ['Thief'],
  sorcerer: ['Draconic Bloodline'],
  warlock: ['The Fiend'],
  wizard: ['School of Evocation', 'War Magic'],
};

/** Inner HTML for a multiclass row (hidden combined value + selector slot). */
function mcRowHTML(idx, name, level, removable) {
  return `
    <input class="mc-class-name" type="hidden" value="${escapeHtml(name || '')}" data-mc-key="mc_class_${idx}" />
    <div class="mc-selectors"></div>
    <input class="mc-level-num" type="number" value="${level == null ? 1 : level}" min="0" max="40" data-mc-key="mc_level_${idx}" oninput="recalcAll(); saveSheet(true);" />
    <span class="mc-label">lvl</span>
    ${removable ? `<button class="mc-remove no-print" onclick="removeMCRow(this)">✕</button>` : ''}
  `;
}

/** Split "Class (Subclass)" into parts. */
function mcParse(raw) {
  const m = String(raw || '').match(/^\s*([^(]*?)\s*(?:\(([^)]*)\))?\s*$/);
  return { className: m ? m[1].trim() : '', subName: (m && m[2]) ? m[2].trim() : '' };
}

/** Build the class + subclass dropdowns (and a Custom… escape hatch) for a row. */
function mcBuildSelectors(rowEl) {
  const hidden = rowEl.querySelector('.mc-class-name');
  const holder = rowEl.querySelector('.mc-selectors');
  if (!hidden || !holder) return;
  holder.innerHTML = '';

  const { className, subName } = mcParse(hidden.value);
  const classKey = className.toLowerCase();
  const known = MC_CLASS_KEYS.includes(classKey);

  const classSel = document.createElement('select');
  classSel.className = 'mc-class-select';
  classSel.innerHTML = '<option value="">— class —</option>'
    + MC_CLASSES.map(c => `<option value="${c.toLowerCase()}">${c}</option>`).join('')
    + '<option value="__custom__">Custom…</option>';

  const subSel = document.createElement('select');
  subSel.className = 'mc-subclass-select';

  const customInput = document.createElement('input');
  customInput.type = 'text';
  customInput.className = 'mc-custom-input';
  customInput.placeholder = 'Custom, e.g. Artificer (Armorer)';

  holder.append(classSel, subSel, customInput);

  const fillSub = () => {
    const list = SUBCLASS_BY_CLASS[classSel.value] || [];
    subSel.innerHTML = '<option value="">— subclass —</option>'
      + list.map(s => `<option value="${escapeHtml(s)}">${escapeHtml(s)}</option>`).join('');
  };
  const setCustom = (on) => { customInput.style.display = on ? '' : 'none'; subSel.style.display = on ? 'none' : ''; };

  classSel.addEventListener('change', () => {
    if (classSel.value === '__custom__') { setCustom(true); }
    else { setCustom(false); fillSub(); }
    mcUpdateHidden(rowEl);
  });
  subSel.addEventListener('change', () => mcUpdateHidden(rowEl));
  customInput.addEventListener('input', () => mcUpdateHidden(rowEl));

  // Initialize from the saved combined value
  if (known) {
    classSel.value = classKey;
    fillSub();
    if (subName) {
      if (![...subSel.options].some(o => o.value === subName)) {
        const opt = document.createElement('option');
        opt.value = subName; opt.textContent = subName; subSel.appendChild(opt);
      }
      subSel.value = subName;
    }
    setCustom(false);
  } else if (hidden.value.trim()) {
    classSel.value = '__custom__'; customInput.value = hidden.value; setCustom(true);
  } else {
    fillSub(); setCustom(false);
  }
}

/** Recompose the hidden "Class (Subclass)" value from a row's selectors. */
function mcUpdateHidden(rowEl) {
  const hidden = rowEl.querySelector('.mc-class-name');
  const classSel = rowEl.querySelector('.mc-class-select');
  const subSel = rowEl.querySelector('.mc-subclass-select');
  const customInput = rowEl.querySelector('.mc-custom-input');
  if (!hidden || !classSel) return;
  let val = '';
  if (classSel.value === '__custom__') {
    val = (customInput?.value || '').trim();
  } else if (classSel.value) {
    const disp = MC_CLASSES[MC_CLASS_KEYS.indexOf(classSel.value)] || classSel.value;
    const sub = subSel && subSel.value ? subSel.value : '';
    val = sub ? `${disp} (${sub})` : disp;
  }
  hidden.value = val;
  recalcAll();
  saveSheet(true);
}

/** Build selectors for any multiclass rows that don't have them yet. */
function initMulticlassUI() {
  document.querySelectorAll('#multiclass-rows .mc-row').forEach(r => {
    if (!r.querySelector('.mc-class-select')) mcBuildSelectors(r);
  });
}

function addMCRow() {
  const container = document.getElementById('multiclass-rows');
  if (!container) return;
  const idx = mcRowCount++;
  const row = document.createElement('div');
  row.className = 'mc-row';
  row.innerHTML = mcRowHTML(idx, '', 1, true);
  container.appendChild(row);
  mcBuildSelectors(row);
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
  data['_dismissed_class_features'] = dismissedClassFeatures;
  data['_spells'] = spellItems;
  data['_spell_slot_overrides'] = spellSlotOverrides;
  data['_spell_slots_used'] = spellSlotsUsed;

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
        div.innerHTML = mcRowHTML(idx, row.name, row.level || 0, idx !== 0);
        container.appendChild(div);
        mcBuildSelectors(div);
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

  // Dismissed auto class features (re-rendered from CLASS_FEATURES via recalcAll below)
  dismissedClassFeatures = Array.isArray(data['_dismissed_class_features'])
    ? data['_dismissed_class_features']
    : [];

  // Spells (re-rendered via recalcAll below)
  spellItems = Array.isArray(data['_spells']) ? data['_spells'] : [];
  spellSlotOverrides = (data['_spell_slot_overrides'] && typeof data['_spell_slot_overrides'] === 'object') ? data['_spell_slot_overrides'] : {};
  spellSlotsUsed = (data['_spell_slots_used'] && typeof data['_spell_slots_used'] === 'object') ? data['_spell_slots_used'] : {};

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

  if (fishingPanelInitialized) renderFishingGearOptions();
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
        renderFishingGearOptions();
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

window.adjustEquipCount = adjustEquipCount;

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
// FEAT LIBRARY — SEARCHABLE PICKER
// ─────────────────────────────────────────────────────────────

/** Show/hide the feat browser panel and render its list. */
function toggleFeatBrowser() {
  const panel = document.getElementById('feat-browser');
  if (!panel) return;
  const open = panel.style.display === 'none' || !panel.style.display;
  panel.style.display = open ? '' : 'none';
  if (open) {
    renderFeatLibrary();
    document.getElementById('feat-search')?.focus();
  }
}

/** True if a library feat is already in the sheet (by id or matching name). */
function featAlreadyAdded(libFeat) {
  return featItems.some(f =>
    f.libId === libFeat.id ||
    f.name.trim().toLowerCase() === libFeat.name.trim().toLowerCase());
}

/** Render the filtered feat library list. */
function renderFeatLibrary() {
  const list = document.getElementById('feat-library-list');
  if (!list || typeof FEAT_LIBRARY === 'undefined') return;
  const q = (document.getElementById('feat-search')?.value || '').trim().toLowerCase();
  const matches = FEAT_LIBRARY.filter(f =>
    !q || f.name.toLowerCase().includes(q) || (f.source || '').toLowerCase().includes(q));

  list.innerHTML = matches.map(f => {
    const added = featAlreadyAdded(f);
    const prereq = f.prerequisite ? ` · <em>${escapeHtml(f.prerequisite)}</em>` : '';
    return `
      <div class="feat-lib-row">
        <button class="feat-lib-add btn-tiny" ${added ? 'disabled' : ''}
          onclick="addFeatFromLibrary('${f.id}')">${added ? '✓ Added' : '+ Add'}</button>
        <div class="feat-lib-info">
          <span class="feat-lib-name">${escapeHtml(f.name)}</span>
          <span class="feat-lib-meta">${escapeHtml(f.source || '')}${prereq}</span>
          <div class="feat-lib-desc">${escapeHtml(f.desc)}</div>
        </div>
      </div>`;
  }).join('') || '<div class="feat-lib-empty">No matching feats.</div>';
}

/** Add a feat from the library to the sheet's Feats section. */
function addFeatFromLibrary(libId) {
  if (typeof FEAT_LIBRARY === 'undefined') return;
  const lib = FEAT_LIBRARY.find(f => f.id === libId);
  if (!lib || featAlreadyAdded(lib)) return;
  const desc = lib.prerequisite ? `(${lib.prerequisite}) ${lib.desc}` : lib.desc;
  featItems.push({ id: 'fe' + Date.now(), libId: lib.id, name: lib.name, desc });
  renderFeats();
  renderFeatLibrary(); // refresh "Added" state
  saveSheet(true);
}

// ─────────────────────────────────────────────────────────────
// SPELLS
// ─────────────────────────────────────────────────────────────

const SPELL_ABILITY = { cleric:'wis', druid:'wis', wizard:'int', bard:'cha', sorcerer:'cha', warlock:'cha', paladin:'cha', ranger:'wis' };
const FULL_CASTERS = ['bard','cleric','druid','sorcerer','wizard'];
const HALF_CASTERS = ['paladin','ranger'];
// Standard multiclass spellcaster slots by combined caster level → [L1..L9].
const SPELL_SLOT_TABLE = {
  1:[2,0,0,0,0,0,0,0,0], 2:[3,0,0,0,0,0,0,0,0], 3:[4,2,0,0,0,0,0,0,0],
  4:[4,3,0,0,0,0,0,0,0], 5:[4,3,2,0,0,0,0,0,0], 6:[4,3,3,0,0,0,0,0,0],
  7:[4,3,3,1,0,0,0,0,0], 8:[4,3,3,2,0,0,0,0,0], 9:[4,3,3,3,1,0,0,0,0],
  10:[4,3,3,3,2,0,0,0,0], 11:[4,3,3,3,2,1,0,0,0], 12:[4,3,3,3,2,1,0,0,0],
  13:[4,3,3,3,2,1,1,0,0], 14:[4,3,3,3,2,1,1,0,0], 15:[4,3,3,3,2,1,1,1,0],
  16:[4,3,3,3,2,1,1,1,0], 17:[4,3,3,3,2,1,1,1,1], 18:[4,3,3,3,3,1,1,1,1],
  19:[4,3,3,3,3,2,1,1,1], 20:[4,3,3,3,3,2,2,1,1],
};

let spellItems = [];          // [{ index, prepared, domain? }]
let spellSlotOverrides = {};  // { "1": n } manual max overrides
let spellSlotsUsed = {};      // { "1": n }

const capWord = s => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

/** Caster classes present in the multiclass rows: [{ key, level }] (max level per class). */
function getCasterClasses() {
  const map = {};
  readMulticlassRows().forEach(r => {
    if (SPELL_ABILITY[r.key]) map[r.key] = Math.max(map[r.key] || 0, r.level);
  });
  return Object.keys(map).map(k => ({ key: k, level: map[k] }));
}

/** Combined caster level for the slot table (full casters full, half casters /2; warlock excluded). */
function casterLevelForSlots() {
  let lvl = 0;
  getCasterClasses().forEach(c => {
    if (FULL_CASTERS.includes(c.key)) lvl += c.level;
    else if (HALF_CASTERS.includes(c.key)) lvl += Math.floor(c.level / 2);
  });
  return lvl;
}

function getSpellSlotMax(spellLevel) {
  const ov = spellSlotOverrides[spellLevel];
  if (ov != null && ov !== '') return parseInt(ov, 10) || 0;
  const row = SPELL_SLOT_TABLE[Math.min(20, casterLevelForSlots())];
  return row ? (row[spellLevel - 1] || 0) : 0;
}

function spellByIndex(idx) {
  return (typeof SPELLS !== 'undefined') ? SPELLS.find(s => s.index === idx) : null;
}

/** Auto-add subclass/domain spells (always prepared) for the current subclasses. */
function syncDomainSpells() {
  if (typeof SUBCLASS_SPELLS === 'undefined') return;
  readMulticlassRows().forEach(r => {
    const slug = parseSubclassSlug(r.raw);
    if (!slug) return;
    const key = Object.keys(SUBCLASS_SPELLS).find(k => slug === k || slug.includes(k) || k.includes(slug));
    if (!key) return;
    SUBCLASS_SPELLS[key].forEach(idx => {
      if (spellByIndex(idx) && !spellItems.some(s => s.index === idx)) {
        spellItems.push({ index: idx, prepared: true, domain: true });
      }
    });
  });
}

/** Rebuild the Spells section. Hidden unless a caster class is present. */
function renderSpells() {
  const section = document.getElementById('spells-section');
  if (!section) return;
  const casters = getCasterClasses();
  if (casters.length === 0) { section.style.display = 'none'; return; }
  section.style.display = '';
  syncDomainSpells();

  // Spellcasting stats per caster class
  const prof = profBonusForLevel(calcTotalLevel());
  document.getElementById('spellcasting-stats').innerHTML = casters.map(c => {
    const ab = SPELL_ABILITY[c.key];
    const m = mod(getNum('stat_' + ab, 10));
    return `<div class="sc-stat">
      <div class="sc-stat-class">${capWord(c.key)} <span class="sc-stat-ab">${ab.toUpperCase()} · lvl ${c.level}</span></div>
      <div class="sc-stat-nums"><span>Save DC <strong>${8 + prof + m}</strong></span><span>Spell Atk <strong>${fmtMod(prof + m)}</strong></span></div>
    </div>`;
  }).join('');

  // Slot tracker
  let slotsHtml = '';
  for (let L = 1; L <= 9; L++) {
    const max = getSpellSlotMax(L);
    if (max <= 0 && spellSlotOverrides[L] == null) continue;
    const used = Math.min(spellSlotsUsed[L] || 0, max);
    slotsHtml += `<div class="slot-box">
      <div class="slot-lvl">L${L}</div>
      <div class="slot-track">${max - used}<span class="slot-of">/${max}</span></div>
      <div class="slot-btns no-print">
        <button onclick="spellSlotAdjust(${L},1)" title="Spend a slot">−</button>
        <button onclick="spellSlotAdjust(${L},-1)" title="Regain a slot">+</button>
      </div>
      <input class="slot-override no-print" type="number" min="0" max="9" placeholder="auto:${max}" value="${spellSlotOverrides[L] != null ? spellSlotOverrides[L] : ''}" oninput="spellSlotOverride(${L}, this.value)" title="Override max slots" />
    </div>`;
  }
  document.getElementById('spell-slots').innerHTML = slotsHtml
    ? slotsHtml + `<button class="btn-small no-print slot-rest" onclick="resetSpellSlots()">↺ Long Rest</button>`
    : '<span class="sub-note">No spell slots at this caster level yet.</span>';

  renderSpellList();
}

function renderSpellList() {
  const el = document.getElementById('spell-list');
  if (!el) return;
  if (spellItems.length === 0) { el.innerHTML = '<div class="spell-empty">No spells added yet — click “✨ Browse spells”.</div>'; return; }
  const byLvl = {};
  spellItems.forEach(item => {
    const sp = spellByIndex(item.index);
    if (sp) (byLvl[sp.level] = byLvl[sp.level] || []).push({ item, sp });
  });
  let html = '';
  Object.keys(byLvl).map(Number).sort((a, b) => a - b).forEach(L => {
    html += `<div class="spell-lvl-group"><div class="spell-lvl-title">${L === 0 ? 'Cantrips' : 'Level ' + L}</div>`;
    byLvl[L].sort((a, b) => a.sp.name.localeCompare(b.sp.name)).forEach(({ item, sp }) => {
      const tags = [sp.school, sp.concentration ? 'Conc' : '', sp.ritual ? 'Ritual' : '', item.domain ? 'Domain' : ''].filter(Boolean);
      const prep = L === 0
        ? '<span class="spell-prep-always" title="Cantrips are always prepared">✦</span>'
        : `<input type="checkbox" class="spell-prep" ${item.prepared ? 'checked' : ''} onchange="toggleSpellPrepared('${sp.index}')" title="Prepared" />`;
      html += `<div class="spell-row">
        <div class="spell-row-head">
          ${prep}
          <span class="spell-name" onclick="this.closest('.spell-row').classList.toggle('open')">${escapeHtml(sp.name)}</span>
          <span class="spell-tags">${tags.map(t => `<span class="spell-tag">${escapeHtml(t)}</span>`).join('')}</span>
          ${item.domain ? '' : `<button class="dyn-delete no-print" onclick="removeSpell('${sp.index}')" title="Remove">×</button>`}
        </div>
        <div class="spell-detail">
          <div class="spell-meta">${escapeHtml(sp.casting_time)} · ${escapeHtml(sp.range)} · ${escapeHtml(sp.components)}${sp.duration ? ' · ' + escapeHtml(sp.duration) : ''}</div>
          <div class="spell-desc">${escapeHtml(sp.desc)}</div>
        </div>
      </div>`;
    });
    html += '</div>';
  });
  el.innerHTML = html;
}

function toggleSpellBrowser() {
  const p = document.getElementById('spell-browser');
  if (!p) return;
  const open = p.style.display === 'none' || !p.style.display;
  p.style.display = open ? '' : 'none';
  if (open) { renderSpellBrowser(); document.getElementById('spell-search')?.focus(); }
}

function renderSpellBrowser() {
  const list = document.getElementById('spell-browser-list');
  if (!list || typeof SPELLS === 'undefined') return;
  const casters = getCasterClasses().map(c => c.key);
  const q = (document.getElementById('spell-search')?.value || '').trim().toLowerCase();
  const matches = SPELLS.filter(s => s.classes.some(c => casters.includes(c))
    && (!q || s.name.toLowerCase().includes(q) || (s.school || '').toLowerCase().includes(q)));
  const byLvl = {};
  matches.forEach(s => (byLvl[s.level] = byLvl[s.level] || []).push(s));
  let html = '';
  Object.keys(byLvl).map(Number).sort((a, b) => a - b).forEach(L => {
    html += `<div class="spell-lvl-title">${L === 0 ? 'Cantrips' : 'Level ' + L}</div>`;
    byLvl[L].sort((a, b) => a.name.localeCompare(b.name)).forEach(s => {
      const added = spellItems.some(x => x.index === s.index);
      const tags = [s.school, s.concentration ? 'Conc' : '', s.ritual ? 'Ritual' : ''].filter(Boolean);
      html += `<div class="spell-lib-row">
        <button class="btn-tiny spell-lib-add" ${added ? 'disabled' : ''} onclick="addSpell('${s.index}')">${added ? '✓' : '+'}</button>
        <span class="spell-lib-name">${escapeHtml(s.name)}</span>
        <span class="spell-lib-tags">${tags.map(t => `<span class="spell-tag">${escapeHtml(t)}</span>`).join('')}</span>
      </div>`;
    });
  });
  list.innerHTML = html || '<div class="spell-empty">No matching spells for your class.</div>';
}

function addSpell(idx) {
  if (spellItems.some(s => s.index === idx)) return;
  spellItems.push({ index: idx, prepared: true });
  renderSpells(); renderSpellBrowser(); saveSheet(true);
}
function removeSpell(idx) {
  spellItems = spellItems.filter(s => s.index !== idx);
  renderSpells(); renderSpellBrowser(); saveSheet(true);
}
function toggleSpellPrepared(idx) {
  const it = spellItems.find(s => s.index === idx);
  if (it) it.prepared = !it.prepared;
  saveSheet(true);
}
function spellSlotAdjust(L, delta) {
  const max = getSpellSlotMax(L);
  spellSlotsUsed[L] = Math.max(0, Math.min(max, (spellSlotsUsed[L] || 0) + delta));
  renderSpells(); saveSheet(true);
}
function spellSlotOverride(L, val) {
  if (val === '' || val == null) delete spellSlotOverrides[L];
  else spellSlotOverrides[L] = parseInt(val, 10) || 0;
  renderSpells(); saveSheet(true);
}
function resetSpellSlots() { spellSlotsUsed = {}; renderSpells(); saveSheet(true); }

// ─────────────────────────────────────────────────────────────
// MULTICLASS — AUTO CLASS FEATURES
// ─────────────────────────────────────────────────────────────

/** Normalize free-text class name to a CLASS_FEATURES key.
 *  "Fighter (Rune Knight)" -> "fighter" (subclass parenthetical stripped). */
function normalizeClassName(raw) {
  if (!raw) return '';
  return String(raw).replace(/\(.*?\)/g, '').trim().toLowerCase();
}

/** Read multiclass rows as [{ raw, key, level }]. */
function readMulticlassRows() {
  const rows = [];
  document.querySelectorAll('[data-mc-key^="mc_class_"]').forEach(nameEl => {
    const idx = nameEl.dataset.mcKey.replace('mc_class_', '');
    const levelEl = document.querySelector(`[data-mc-key="mc_level_${idx}"]`);
    const level = levelEl ? (parseInt(levelEl.value, 10) || 0) : 0;
    rows.push({ raw: nameEl.value || '', key: normalizeClassName(nameEl.value), level });
  });
  return rows;
}

/** Unique dismiss-key for a feature within a class/subclass. */
function classFeatureKey(classKey, featureId) {
  return `${classKey}:${featureId}`;
}

/** Slugify a string: lowercase, non-alphanumerics -> single hyphens. */
function slugify(s) {
  return String(s || '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

/** Extract a subclass slug from the parenthetical, e.g. "Fighter (Rune Knight)" -> "rune-knight". */
function parseSubclassSlug(raw) {
  const m = String(raw || '').match(/\(([^)]+)\)/);
  return m ? slugify(m[1]) : '';
}

// Subclasses authored in homebrew but rendered by a dedicated bespoke section
// instead of the generic Class Features list (avoids duplication).
const SUBCLASS_RENDER_SKIP = ['rune-knight'];

/** Resolve a typed subclass slug to known features (homebrew first, then SRD).
 *  Matches exactly, or by token inclusion ("path-of-the-berserker" -> "berserker").
 *  Returns { slug, features } or null. */
function resolveSubclassFeatures(parenSlug) {
  if (!parenSlug || SUBCLASS_RENDER_SKIP.includes(parenSlug)) return null;
  const extra = (typeof EXTRA_SUBCLASS_FEATURES !== 'undefined') ? EXTRA_SUBCLASS_FEATURES : {};
  const srd = (typeof SUBCLASS_FEATURES !== 'undefined') ? SUBCLASS_FEATURES : {};
  const known = { ...srd, ...extra }; // homebrew overrides SRD on collision
  if (known[parenSlug]) return { slug: parenSlug, features: known[parenSlug] };
  for (const k of Object.keys(known)) {
    if (SUBCLASS_RENDER_SKIP.includes(k)) continue;
    if (parenSlug.includes(k) || k.includes(parenSlug)) return { slug: k, features: known[k] };
  }
  return null;
}

/** Rebuild the auto "Class Features" section from the multiclass rows. */
function syncMulticlassFeatures() {
  const container = document.getElementById('class-features-list');
  if (!container || typeof CLASS_FEATURES === 'undefined') return;

  const rows = readMulticlassRows();
  let anyOver20 = false;
  let hiddenCount = 0;
  const groups = [];

  rows.forEach(row => {
    if (row.level > 20) anyOver20 = true;

    // Base-class features, each tagged with its dismiss class-key.
    const tagged = [];
    const base = CLASS_FEATURES[row.key];
    if (base) base.forEach(f => tagged.push({ f, ck: row.key }));

    // Subclass features (parsed from the parenthetical), if recognized.
    const sub = resolveSubclassFeatures(parseSubclassSlug(row.raw));
    if (sub) sub.features.forEach(f => tagged.push({ f, ck: `sub:${sub.slug}` }));

    const eligible = tagged.filter(t => t.f.level <= row.level);
    const visible = eligible.filter(t => !dismissedClassFeatures.includes(classFeatureKey(t.ck, t.f.id)));
    hiddenCount += eligible.length - visible.length;
    if (visible.length === 0) return;

    // Sort by level then name for a stable, readable group.
    visible.sort((a, b) => a.f.level - b.f.level || a.f.name.localeCompare(b.f.name));
    groups.push({ label: row.raw.trim(), level: row.level, items: visible });
  });

  container.innerHTML = '';
  groups.forEach(g => {
    const block = document.createElement('div');
    block.className = 'cf-group';
    const cards = g.items.map(({ f, ck }) => `
      <div class="cf-card">
        <div class="cf-card-header">
          <span class="cf-level">Lv ${f.level}</span>
          <span class="cf-name">${escapeHtml(f.name)}</span>
          <button class="dyn-delete no-print" title="Hide this feature"
            onclick="dismissClassFeature('${ck}', '${f.id}')">×</button>
        </div>
        <div class="cf-desc">${escapeHtml(f.desc)}</div>
      </div>`).join('');
    block.innerHTML =
      `<h3 class="cf-group-title">${escapeHtml(g.label)} <span class="sub-note">(${g.level} levels)</span></h3>
       <div class="cf-grid">${cards}</div>`;
    container.appendChild(block);
  });

  if (hiddenCount > 0) {
    const restore = document.createElement('button');
    restore.className = 'btn-small no-print';
    restore.textContent = `↺ Restore ${hiddenCount} hidden feature${hiddenCount === 1 ? '' : 's'}`;
    restore.onclick = restoreDismissedClassFeatures;
    container.appendChild(restore);
  }

  // Empty-state hint
  const empty = document.getElementById('class-features-empty');
  if (empty) empty.style.display = groups.length === 0 ? '' : 'none';

  // House-rule: HP-at-higher-levels note when any class exceeds level 20
  const hpNote = document.getElementById('mc-hp-note');
  if (hpNote) hpNote.style.display = anyOver20 ? '' : 'none';
}

/** Hide one auto class feature; persists across reloads. */
function dismissClassFeature(classKey, featureId) {
  const key = classFeatureKey(classKey, featureId);
  if (!dismissedClassFeatures.includes(key)) dismissedClassFeatures.push(key);
  syncMulticlassFeatures();
  saveSheet(true);
}

/** Un-hide all dismissed auto class features. */
function restoreDismissedClassFeatures() {
  dismissedClassFeatures = [];
  syncMulticlassFeatures();
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