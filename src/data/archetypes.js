/**
 * Archetype definitions, compatibility table, and category mappings.
 *
 * 12 archetypes across 4 categories:
 *   structure  – Creator, Ruler, Caregiver
 *   paradise   – Innocent, Sage, Explorer
 *   mark       – Outlaw, Magician, Hero
 *   connection – Everyman, Jester, Lover
 *
 * Each employee gets three archetypes: primary (60%), secondary (25%), tertiary (15%).
 */

export const ARCHETYPES = {
  creator:   { label: 'Creator',   category: 'structure',   theme: 'Innovation' },
  ruler:     { label: 'Ruler',     category: 'structure',   theme: 'Control' },
  caregiver: { label: 'Caregiver', category: 'structure',   theme: 'Service' },
  innocent:  { label: 'Innocent',  category: 'paradise',    theme: 'Safety' },
  sage:      { label: 'Sage',      category: 'paradise',    theme: 'Understanding' },
  explorer:  { label: 'Explorer',  category: 'paradise',    theme: 'Freedom' },
  outlaw:    { label: 'Outlaw',    category: 'mark',        theme: 'Liberation' },
  magician:  { label: 'Magician',  category: 'mark',        theme: 'Power' },
  hero:      { label: 'Hero',      category: 'mark',        theme: 'Mastery' },
  everyman:  { label: 'Everyman',  category: 'connection',  theme: 'Belonging' },
  jester:    { label: 'Jester',    category: 'connection',  theme: 'Enjoyment' },
  lover:     { label: 'Lover',     category: 'connection',  theme: 'Intimacy' },
};

/**
 * Colour per category — used throughout the UI.
 */
export const CATEGORY_COLORS = {
  structure:  0x4a7aff,   // blue
  paradise:   0x4ade80,   // green
  mark:       0xfbbf24,   // amber
  connection: 0xf472b6,   // pink
};

/**
 * Human-readable description for each archetype category.
 * Used in Team Info distribution bars.
 */
export const CATEGORY_LABELS = {
  structure:  'Provide Structure',
  paradise:   'Seek Paradise',
  mark:       'Leave a Mark',
  connection: 'Build Connection',
};

/**
 * Team effect label per dominant category.
 */
export const CATEGORY_EFFECTS = {
  structure:  'Leadership Team',
  paradise:   'Research Team',
  mark:       'High Risk Team',
  connection: 'Social Team',
};

/**
 * Pairwise archetype compatibility.
 * COMPAT[a][b] = +5 (compatible), -5 (conflicts), 0 (neutral).
 *
 * Compatibility is directional in the source spec but symmetric here
 * (if a is compatible with b, b is compatible with a).
 */
export const COMPAT = buildCompatTable();

function buildCompatTable() {
  // Pairs from spec. Each entry [a, b, value] is applied symmetrically.
  const PAIRS = [
    // Creator compatibles
    ['creator', 'sage',      5],
    ['creator', 'explorer',  5],
    ['creator', 'magician',  5],
    // Creator conflicts
    ['creator', 'ruler',    -5],
    ['creator', 'everyman', -5],

    // Ruler compatibles
    ['ruler', 'hero',      5],
    ['ruler', 'sage',      5],
    ['ruler', 'caregiver', 5],
    // Ruler conflicts
    ['ruler', 'outlaw', -5],
    ['ruler', 'jester', -5],

    // Caregiver compatibles
    ['caregiver', 'everyman', 5],
    ['caregiver', 'lover',    5],
    ['caregiver', 'innocent', 5],
    // Caregiver conflicts
    ['caregiver', 'outlaw', -5],
    ['caregiver', 'hero',   -5],

    // Innocent compatibles
    ['innocent', 'caregiver', 5],
    ['innocent', 'everyman',  5],
    ['innocent', 'lover',     5],
    // Innocent conflicts
    ['innocent', 'outlaw',   -5],
    ['innocent', 'magician', -5],

    // Sage compatibles
    ['sage', 'creator',  5],
    ['sage', 'magician', 5],
    ['sage', 'ruler',    5],
    // Sage conflicts
    ['sage', 'jester', -5],
    ['sage', 'lover',  -5],

    // Explorer compatibles
    ['explorer', 'creator',  5],
    ['explorer', 'outlaw',   5],
    ['explorer', 'magician', 5],
    // Explorer conflicts
    ['explorer', 'ruler',    -5],
    ['explorer', 'innocent', -5],

    // Outlaw compatibles
    ['outlaw', 'explorer', 5],
    ['outlaw', 'hero',     5],
    ['outlaw', 'jester',   5],
    // Outlaw conflicts
    ['outlaw', 'ruler',    -5],
    ['outlaw', 'innocent', -5],

    // Magician compatibles
    ['magician', 'creator',  5],
    ['magician', 'sage',     5],
    ['magician', 'explorer', 5],
    // Magician conflicts
    ['magician', 'innocent', -5],
    ['magician', 'everyman', -5],

    // Hero compatibles
    ['hero', 'ruler',   5],
    ['hero', 'outlaw',  5],
    ['hero', 'creator', 5],
    // Hero conflicts
    ['hero', 'innocent',  -5],
    ['hero', 'caregiver', -5],

    // Everyman compatibles
    ['everyman', 'caregiver', 5],
    ['everyman', 'lover',     5],
    ['everyman', 'innocent',  5],
    // Everyman conflicts
    ['everyman', 'outlaw',   -5],
    ['everyman', 'magician', -5],

    // Jester compatibles
    ['jester', 'everyman', 5],
    ['jester', 'outlaw',   5],
    ['jester', 'lover',    5],
    // Jester conflicts
    ['jester', 'sage',  -5],
    ['jester', 'ruler', -5],

    // Lover compatibles
    ['lover', 'everyman',  5],
    ['lover', 'caregiver', 5],
    ['lover', 'innocent',  5],
    // Lover conflicts
    ['lover', 'sage',  -5],
    ['lover', 'ruler', -5],
  ];

  // Build empty table
  const table = {};
  for (const id of Object.keys(ARCHETYPES)) {
    table[id] = {};
  }

  // Fill from pair list (symmetric)
  for (const [a, b, val] of PAIRS) {
    table[a][b] = val;
    table[b][a] = val;
  }

  return table;
}

/**
 * Lookup the compatibility value between two archetype ids.
 * @param {string} a
 * @param {string} b
 * @returns {number} +5, -5, or 0
 */
export function archetypeCompat(a, b) {
  return COMPAT[a]?.[b] ?? 0;
}

/**
 * All archetype ids in a stable order.
 * @type {string[]}
 */
export const ALL_ARCHETYPE_IDS = Object.keys(ARCHETYPES);
