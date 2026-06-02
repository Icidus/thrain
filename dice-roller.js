// ─────────────────────────────────────────────────────────────────────────
// dice-roller.js  —  floating dice roller + persistent roll log
//
// Self-contained: injects its own floating button + panel, wires click-to-roll
// onto the existing skill / saving-throw rows (reading their already-computed
// modifiers), and keeps a roll history in localStorage. No dependencies.
// ─────────────────────────────────────────────────────────────────────────

(function () {
  'use strict';

  const LOG_KEY = 'thrain_dice_log';
  const LOG_CAP = 50;

  let rollMode = 'normal'; // 'normal' | 'adv' | 'dis'
  let rollLog = [];        // [{ label, detail, total, crit, fumble, mode, time }]

  // ── Dice math ──────────────────────────────────────────────────────────
  function rollDie(sides) {
    return Math.floor(Math.random() * sides) + 1;
  }

  /** Parse an integer modifier from text like "+10", "-1", "−1", "+0". */
  function parseMod(text) {
    const v = parseInt(String(text).replace(/−/g, '-').replace(/[^\d-]/g, ''), 10);
    return isNaN(v) ? 0 : v;
  }

  /** Roll a dice expression: "2d6+3", "d20", "4d6-1", "1d8+1d6+2".
   *  Returns { total, detail } or null if nothing parsed. */
  function rollExpression(expr) {
    const s = String(expr).replace(/\s+/g, '').replace(/−/g, '-');
    if (!s) return null;
    const re = /([+-]?)(\d*)d(\d+)|([+-]?)(\d+)/gi;
    let m, total = 0, any = false;
    const parts = [];
    while ((m = re.exec(s)) !== null) {
      if (m.index === re.lastIndex) re.lastIndex++; // guard zero-width
      if (m[3]) { // NdM
        const sign = m[1] === '-' ? -1 : 1;
        const count = Math.min(Math.max(parseInt(m[2] || '1', 10), 1), 100);
        const sides = parseInt(m[3], 10);
        if (sides < 1) continue;
        const rolls = [];
        let sub = 0;
        for (let i = 0; i < count; i++) { const r = rollDie(sides); rolls.push(r); sub += r; }
        total += sign * sub;
        parts.push((sign < 0 ? '-' : (parts.length ? '+' : '')) + count + 'd' + sides + '(' + rolls.join(',') + ')');
        any = true;
      } else if (m[5]) { // flat number
        const sign = m[4] === '-' ? -1 : 1;
        const val = parseInt(m[5], 10);
        total += sign * val;
        parts.push((sign < 0 ? '-' : (parts.length ? '+' : '')) + val);
        any = true;
      }
    }
    return any ? { total, detail: parts.join('') } : null;
  }

  /** Roll a d20 check vs a modifier, honoring the current adv/dis mode. */
  function rollCheck(label, mod) {
    const d1 = rollDie(20), d2 = rollDie(20);
    let nat = d1, modeNote = `d20(${d1})`;
    if (rollMode === 'adv') { nat = Math.max(d1, d2); modeNote = `d20 adv(${d1},${d2}→${nat})`; }
    else if (rollMode === 'dis') { nat = Math.min(d1, d2); modeNote = `d20 dis(${d1},${d2}→${nat})`; }
    const total = nat + mod;
    const detail = `${modeNote}${mod >= 0 ? '+' + mod : mod} = ${total}`;
    addLogEntry({ label, detail, total, crit: nat === 20, fumble: nat === 1, mode: rollMode });
    if (rollMode !== 'normal') setMode('normal'); // adv/dis applies to one roll
  }

  // ── Roll log persistence ────────────────────────────────────────────────
  function loadLog() {
    try { rollLog = JSON.parse(localStorage.getItem(LOG_KEY) || '[]'); }
    catch (e) { rollLog = []; }
    if (!Array.isArray(rollLog)) rollLog = [];
  }
  function saveLog() {
    try { localStorage.setItem(LOG_KEY, JSON.stringify(rollLog.slice(0, LOG_CAP))); } catch (e) { /* ignore */ }
  }
  function addLogEntry(entry) {
    entry.time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    rollLog.unshift(entry);
    rollLog = rollLog.slice(0, LOG_CAP);
    saveLog();
    renderLog();
  }
  function clearLog() {
    rollLog = [];
    saveLog();
    renderLog();
  }

  // ── UI ──────────────────────────────────────────────────────────────────
  function setMode(mode) {
    rollMode = (rollMode === mode) ? 'normal' : mode; // toggle off if re-clicked
    document.getElementById('dr-adv')?.classList.toggle('active', rollMode === 'adv');
    document.getElementById('dr-dis')?.classList.toggle('active', rollMode === 'dis');
  }

  function escapeHtmlLocal(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function renderLog() {
    const list = document.getElementById('dr-log');
    if (!list) return;
    if (rollLog.length === 0) {
      list.innerHTML = '<div class="dr-log-empty">No rolls yet. Click a skill or save, or roll some dice.</div>';
      return;
    }
    list.innerHTML = rollLog.map(e => {
      const tag = e.crit ? '<span class="dr-crit">CRIT!</span>'
        : e.fumble ? '<span class="dr-fumble">FUMBLE</span>' : '';
      return `<div class="dr-log-row${e.crit ? ' is-crit' : ''}${e.fumble ? ' is-fumble' : ''}">
        <div class="dr-log-top"><span class="dr-log-label">${escapeHtmlLocal(e.label)}</span>
          <span class="dr-log-total">${e.total}</span></div>
        <div class="dr-log-detail">${escapeHtmlLocal(e.detail)} ${tag}<span class="dr-log-time">${escapeHtmlLocal(e.time || '')}</span></div>
      </div>`;
    }).join('');
  }

  function togglePanel(force) {
    const panel = document.getElementById('dr-panel');
    if (!panel) return;
    const open = typeof force === 'boolean' ? force : panel.classList.contains('dr-hidden');
    panel.classList.toggle('dr-hidden', !open);
    if (open) document.getElementById('dr-expr')?.focus();
  }

  /** Clean display name for a skill/save row (strip dots, values, controls, badges). */
  function rowName(li) {
    const clone = li.cloneNode(true);
    clone.querySelectorAll('.prof-dot, .stat-val, .skill-bonus-control, .expertise-badge, .adv-badge')
      .forEach(n => n.remove());
    return clone.textContent.replace(/\s+/g, ' ').trim();
  }

  function wireRollableRows() {
    // Saving throws
    document.querySelectorAll('#saving-throws-list li').forEach(li => {
      const val = li.querySelector('.stat-val');
      if (!val) return;
      li.classList.add('dr-rollable');
      li.title = 'Click to roll this save';
      li.addEventListener('click', () => rollCheck(rowName(li) + ' Save', parseMod(val.textContent)));
    });
    // Skills
    document.querySelectorAll('.skills-list li').forEach(li => {
      const val = li.querySelector('.stat-val');
      if (!val) return; // skips group-header rows
      li.classList.add('dr-rollable');
      li.title = 'Click to roll this skill';
      li.addEventListener('click', (e) => {
        if (e.target.closest('.skill-bonus-control')) return; // don't roll when editing the Adj field
        rollCheck(rowName(li), parseMod(val.textContent));
      });
    });
  }

  function rollManual() {
    const input = document.getElementById('dr-expr');
    const expr = (input?.value || '').trim();
    if (!expr) return;
    const res = rollExpression(expr);
    if (!res) { addLogEntry({ label: 'Invalid', detail: `Couldn't parse "${expr}"`, total: '—' }); return; }
    addLogEntry({ label: expr, detail: `${res.detail} = ${res.total}`, total: res.total });
  }

  function rollInitiative() {
    const disp = document.getElementById('initiative-display');
    rollCheck('Initiative', parseMod(disp ? disp.textContent : '+0'));
  }

  function injectUI() {
    const wrap = document.createElement('div');
    wrap.id = 'dice-roller';
    wrap.className = 'no-print';
    wrap.innerHTML = `
      <button id="dr-toggle" title="Dice roller" aria-label="Open dice roller">🎲</button>
      <div id="dr-panel" class="dr-hidden" role="dialog" aria-label="Dice roller">
        <div class="dr-header">
          <span class="dr-title">🎲 Dice Roller</span>
          <button id="dr-close" class="dr-x" aria-label="Close">×</button>
        </div>
        <div class="dr-controls">
          <button id="dr-adv" class="dr-mode" title="Roll with advantage">ADV</button>
          <button id="dr-dis" class="dr-mode" title="Roll with disadvantage">DIS</button>
          <button id="dr-init" class="dr-action" title="Roll initiative">⚔ Initiative</button>
        </div>
        <div class="dr-manual">
          <input id="dr-expr" type="text" placeholder="e.g. 2d6+3, 1d20, 4d6" aria-label="Dice expression" />
          <button id="dr-roll" class="dr-action">Roll</button>
        </div>
        <div class="dr-log-header"><span>Roll Log</span><button id="dr-clear" class="dr-clear">Clear</button></div>
        <div id="dr-log" class="dr-log"></div>
      </div>`;
    document.body.appendChild(wrap);

    document.getElementById('dr-toggle').addEventListener('click', () => togglePanel());
    document.getElementById('dr-close').addEventListener('click', () => togglePanel(false));
    document.getElementById('dr-adv').addEventListener('click', () => setMode('adv'));
    document.getElementById('dr-dis').addEventListener('click', () => setMode('dis'));
    document.getElementById('dr-init').addEventListener('click', rollInitiative);
    document.getElementById('dr-roll').addEventListener('click', rollManual);
    document.getElementById('dr-clear').addEventListener('click', clearLog);
    document.getElementById('dr-expr').addEventListener('keydown', (e) => { if (e.key === 'Enter') rollManual(); });
  }

  function init() {
    injectUI();
    wireRollableRows();
    loadLog();
    renderLog();
  }

  /** Log a pre-computed roll (used by the battle tracker). */
  function pushEntry(entry) {
    addLogEntry({
      label: entry.label || 'Roll',
      detail: entry.detail || '',
      total: (entry.total === undefined ? '—' : entry.total),
      crit: !!entry.crit,
      fumble: !!entry.fumble,
    });
  }

  /** Roll a dice expression AND log it; returns { total, detail } or null. */
  function rollAndLog(label, expr) {
    const res = rollExpression(expr);
    if (res) addLogEntry({ label, detail: `${res.detail} = ${res.total}`, total: res.total });
    return res;
  }

  // Expose a tiny API for testing / external triggers (e.g. the battle tracker).
  window.diceRoller = { rollCheck, rollExpression, rollInitiative, clearLog, pushEntry, rollAndLog, _getLog: () => rollLog };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
