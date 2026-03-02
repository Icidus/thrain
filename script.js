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
// INITIALIZATION
// ─────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  loadSheet(); // also calls renderEquipment internally
  recalcAll();
  updateXP();
  setFooterDate();
  hookAutoSave();

  // Fallback: if loadSheet didn't render equipment (no saved data), render defaults
  if (equipmentItems.length === 0) {
    equipmentItems = DEFAULT_EQUIPMENT.map(e => ({ ...e }));
    renderEquipment();
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

  // Rune Save DC: 8 + prof + CON mod
  const runeDC = 8 + prof + mCon;
  setText('rune-dc-display', runeDC);

  // Giant's Might: uses = prof bonus
  setText('giants-might-uses', prof);
  setText('gm-uses-text', prof);

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
  const effStr = beltActive ? Math.max(mStr, mod(BELT_STR)) : mStr;

  // Dwarven Thrower: STR + prof + magic bonus + archery (ranged)
  const throwerMelee = effStr + prof + DWARVEN_THROWER_BONUS;
  const throwerRanged = effStr + prof + DWARVEN_THROWER_BONUS + ARCHERY_STYLE_BONUS;
  setText('thrower-hit', `+${throwerMelee} / ${fmtMod(throwerRanged)} ranged`);

  // Halberd & Battle Axe: STR + prof
  const meleeBonus = effStr + prof;
  setText('halberd-hit', fmtMod(meleeBonus));
  setText('axe-hit', fmtMod(meleeBonus));

  // GWM version: -5 to hit
  const throwerGWM = throwerRanged - 5;
  setText('thrower-gwm-hit', fmtMod(throwerGWM));
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

  return data;
}

/** Save sheet to localStorage. Pass silent=true to skip status flash. */
function saveSheet(silent = false) {
  try {
    const data = collectData();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    if (!silent) flashStatus('✓ Saved!', 'success');
  } catch (e) {
    flashStatus('✗ Save failed', 'error');
    console.error('Save failed:', e);
  }
}

/** Load sheet from localStorage. */
function loadSheet() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return; // no saved data — use HTML defaults

    const data = JSON.parse(raw);

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
