// ─────────────────────────────────────────────────────────────────────────
// homebrew-content.js  —  HAND-AUTHORED (safe to edit; not generated)
//
// Holds content not available from the SRD API: Tasha's/Xanathar's-era
// subclasses and the player feat library. Entered by hand from owned books
// for personal use. The generator (scripts/fetch-class-features.mjs) never
// touches this file.
//
// Shapes:
//   EXTRA_SUBCLASS_FEATURES[slug] = [ { id, level, name, desc }, ... ]
//   FEAT_LIBRARY = [ { id, name, source, prerequisite, desc }, ... ]
// ─────────────────────────────────────────────────────────────────────────

// Subclass slugs are matched against the parenthetical in a multiclass row's
// class name, e.g. "Fighter (Rune Knight)" -> "rune-knight".
const EXTRA_SUBCLASS_FEATURES = {
  // Tasha's Cauldron of Everything — Fighter: Rune Knight.
  // NOTE: Thrain's sheet has a dedicated "⚒ Rune Knight Features" section with
  // use-trackers; rune-knight is on SUBCLASS_RENDER_SKIP in script.js so these
  // summaries are NOT duplicated into the auto Class Features section. Authored
  // here for completeness / reuse.
  'rune-knight': [
    { id: 'rk-bonus-prof', level: 3, name: 'Bonus Proficiencies',
      desc: 'You gain proficiency with smith’s tools, and you learn to speak, read, and write Giant.' },
    { id: 'rk-rune-carver', level: 3, name: 'Rune Carver',
      desc: 'You can carve runes (Cloud, Fire, Frost/Stone, Hill, Storm) into items. Each rune grants a passive benefit and can be invoked for an active effect. You learn additional runes at 7th, 10th, and 15th level.' },
    { id: 'rk-giants-might', level: 3, name: 'Giant’s Might',
      desc: 'Bonus action: become Large (if room), gain advantage on Strength checks and saves, and add 1d6 (scales to 1d8/1d10) to one weapon attack’s damage once per turn. Uses = proficiency bonus per long rest.' },
    { id: 'rk-runic-shield', level: 7, name: 'Runic Shield',
      desc: 'Reaction: force an attacker who hits an ally you can see to reroll the attack. Uses = proficiency bonus per long rest.' },
    { id: 'rk-great-stature', level: 10, name: 'Great Stature',
      desc: 'You grow 3d4 inches taller, and Giant’s Might’s extra damage die becomes 1d8.' },
    { id: 'rk-master-of-runes', level: 15, name: 'Master of Runes',
      desc: 'You can invoke each rune you know twice rather than once, and you can do so on each of your turns.' },
    { id: 'rk-runic-juggernaut', level: 18, name: 'Runic Juggernaut',
      desc: 'Giant’s Might’s extra damage die becomes 1d10, you can become Huge, and your reach increases by 5 feet while enlarged.' },
  ],

  // Xanathar's Guide to Everything — Wizard: War Magic.
  // Not in SUBCLASS_RENDER_SKIP, so these DO render in the Class Features section.
  'war-magic': [
    { id: 'wm-arcane-deflection', level: 2, name: 'Arcane Deflection',
      desc: 'Reaction (when hit by an attack or you fail a save): gain +2 AC against that attack, or +4 to that saving throw. Until the end of your next turn you can then cast only cantrips.' },
    { id: 'wm-tactical-wit', level: 2, name: 'Tactical Wit',
      desc: 'You add your Intelligence modifier to your initiative rolls.' },
    { id: 'wm-power-surge', level: 6, name: 'Power Surge',
      desc: 'Store power surges (max = your INT modifier, min 1). Gain one when you end a spell early with a successful save or by countering/dispelling it; regain to one on a long rest. Spend one to add force damage equal to half your wizard level to one damage roll of a spell.' },
    { id: 'wm-durable-magic', level: 10, name: 'Durable Magic',
      desc: 'While you maintain concentration on a spell, you gain +2 AC and +2 to all saving throws.' },
    { id: 'wm-deflecting-shroud', level: 14, name: 'Deflecting Shroud',
      desc: 'When you use Arcane Deflection, magical energy arcs to up to three creatures of your choice within 60 ft, each taking force damage equal to half your wizard level.' },
  ],

  // Tasha's Cauldron of Everything — Cleric: Twilight Domain.
  'twilight-domain': [
    { id: 'tw-bonus-prof', level: 1, name: 'Bonus Proficiencies',
      desc: 'You gain proficiency with martial weapons and heavy armor.' },
    { id: 'tw-eyes-of-night', level: 1, name: 'Eyes of Night',
      desc: 'You have darkvision out to 300 ft. As an action you can share it with willing creatures (number = WIS modifier, min 1) for 1 hour. Uses = WIS modifier per long rest, or by spending a spell slot.' },
    { id: 'tw-vigilant-blessing', level: 1, name: 'Vigilant Blessing',
      desc: 'As an action, give yourself or one creature you touch advantage on the next initiative roll. This benefit ends immediately after the roll or if you use the feature again.' },
    { id: 'tw-twilight-sanctuary', level: 2, name: 'Channel Divinity: Twilight Sanctuary',
      desc: 'As an action, create a 30-ft-radius sphere of dim light centered on you for 1 minute. When a creature (you choose) starts its turn in the sphere, it gains 1d6 + cleric level temporary HP, or you end one charm or fright effect on it.' },
    { id: 'tw-steps-of-night', level: 6, name: 'Steps of Night',
      desc: 'While in dim light or darkness, you can use a bonus action to gain a flying speed equal to your walking speed for 1 minute. Uses = WIS modifier per long rest, or by spending a spell slot.' },
    { id: 'tw-divine-strike', level: 8, name: 'Divine Strike',
      desc: 'Once on each of your turns when you hit with a weapon attack, deal an extra 1d8 radiant damage (increases to 2d8 at 14th level).' },
    { id: 'tw-twilight-shroud', level: 17, name: 'Twilight Shroud',
      desc: 'You and allies have half cover while within your Twilight Sanctuary.' },
  ],
};

// Player feats. Sources: PHB = Player's Handbook, TCE = Tasha's Cauldron of
// Everything. (Xanathar's Guide added optional class features, not feats.)
const FEAT_LIBRARY = [
  // ── The 6 feats already on the sheet ──
  { id: 'feat-sentinel', name: 'Sentinel', source: 'PHB', prerequisite: '',
    desc: 'When you hit with an opportunity attack, the target’s speed becomes 0 for the turn. Creatures provoke opportunity attacks even if they Disengage. When a creature within 5 ft attacks a target other than you, you can use your reaction to make a melee attack against it.' },
  { id: 'feat-polearm-master', name: 'Polearm Master', source: 'PHB', prerequisite: '',
    desc: 'When wielding a glaive, halberd, pike, quarterstaff, or spear, you can use a bonus action to make a melee attack with the opposite end (1d4 bludgeoning). Other creatures provoke an opportunity attack when they enter your reach.' },
  { id: 'feat-great-weapon-master', name: 'Great Weapon Master', source: 'PHB', prerequisite: '',
    desc: 'On a crit or reducing a creature to 0 HP with a melee weapon, make one melee weapon attack as a bonus action. Before a heavy-weapon attack, you can take −5 to hit for +10 damage.' },
  { id: 'feat-sharpshooter', name: 'Sharpshooter', source: 'PHB', prerequisite: '',
    desc: 'No disadvantage at long range; ignore half and three-quarters cover. Before a ranged-weapon attack you can take −5 to hit for +10 damage.' },
  { id: 'feat-resilient', name: 'Resilient', source: 'PHB', prerequisite: '',
    desc: 'Increase one ability score by 1 (max 20) and gain proficiency in saving throws using that ability.' },
  { id: 'feat-tough', name: 'Tough', source: 'PHB', prerequisite: '',
    desc: 'Your hit point maximum increases by an amount equal to twice your level, and by 2 every time you gain a level thereafter.' },

  // ── Starter pack ──
  { id: 'feat-alert', name: 'Alert', source: 'PHB', prerequisite: '',
    desc: '+5 bonus to initiative. You can’t be surprised while conscious, and other creatures don’t gain advantage on attacks against you from being unseen.' },
  { id: 'feat-lucky', name: 'Lucky', source: 'PHB', prerequisite: '',
    desc: 'You have 3 luck points (regained on a long rest). Spend one to roll an extra d20 for an attack, ability check, or save, or to make an attacker reroll; choose which die to use.' },
  { id: 'feat-war-caster', name: 'War Caster', source: 'PHB', prerequisite: 'Ability to cast at least one spell',
    desc: 'Advantage on Constitution saves to maintain concentration. You can perform somatic components with weapons/shield in hand, and cast a spell as an opportunity attack instead of a melee attack.' },
  { id: 'feat-mobile', name: 'Mobile', source: 'PHB', prerequisite: '',
    desc: 'Your speed increases by 10 ft. Difficult terrain doesn’t cost extra movement when you Dash. When you make a melee attack against a creature, you don’t provoke opportunity attacks from it this turn.' },
  { id: 'feat-magic-initiate', name: 'Magic Initiate', source: 'PHB', prerequisite: '',
    desc: 'Learn two cantrips and one 1st-level spell from a chosen class’s list; cast the 1st-level spell once per long rest (or with slots if you have them).' },
  { id: 'feat-fey-touched', name: 'Fey Touched', source: 'TCE', prerequisite: '',
    desc: 'Increase Int, Wis, or Cha by 1 (max 20). Learn Misty Step and one 1st-level divination or enchantment spell; cast each once per long rest for free (or with slots).' },
  { id: 'feat-telekinetic', name: 'Telekinetic', source: 'TCE', prerequisite: '',
    desc: 'Increase Int, Wis, or Cha by 1 (max 20). Learn Mage Hand (invisible, bonus-action control). As a bonus action, telekinetically shove a creature 5 ft (Str save).' },
  { id: 'feat-skill-expert', name: 'Skill Expert', source: 'TCE', prerequisite: '',
    desc: 'Increase one ability score by 1 (max 20). Gain proficiency in one skill, and choose one skill proficiency to gain expertise (double proficiency).' },
  { id: 'feat-crusher', name: 'Crusher', source: 'TCE', prerequisite: '',
    desc: 'Increase Str or Con by 1 (max 20). Once per turn on bludgeoning damage, move the target 5 ft. On a crit, attackers have advantage against it until your next turn.' },
  { id: 'feat-piercer', name: 'Piercer', source: 'TCE', prerequisite: '',
    desc: 'Increase Str or Dex by 1 (max 20). Once per turn, reroll one piercing damage die. On a crit with piercing, roll one additional damage die.' },
  { id: 'feat-slasher', name: 'Slasher', source: 'TCE', prerequisite: '',
    desc: 'Increase Str or Dex by 1 (max 20). Once per turn on slashing damage, reduce the target’s speed by 10 ft. On a crit, the target has disadvantage on attacks until your next turn.' },
  { id: 'feat-eldritch-adept', name: 'Eldritch Adept', source: 'TCE', prerequisite: 'Spellcasting or Pact Magic feature',
    desc: 'Learn one Eldritch Invocation of your choice (any prerequisite must be met). You can swap it when you gain a level.' },
];
