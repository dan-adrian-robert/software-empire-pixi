/**
 * Shared UI styling tokens for project difficulty (rarity).
 *
 * Returns a { label, bg, border, text } palette for each difficulty tier so
 * both ProjectsPanel and RightWidgetBar render cards consistently.
 */

/** @type {Record<string, { label: string, bg: number, border: number, text: number }>} */
const DIFFICULTY_STYLES = {
  common: {
    label: 'Common',
    bg:     0x131929,
    border: 0x2a4a6a,
    text:   0x7a86a3,
  },
  uncommon: {
    label: 'Uncommon',
    bg:     0x15102a,
    border: 0x7c3aed,
    text:   0xa78bfa,
  },
  rare: {
    label: 'Rare',
    bg:     0x1a1408,
    border: 0xd97706,
    text:   0xfbbf24,
  },
};

const FALLBACK = DIFFICULTY_STYLES.common;

/**
 * Returns UI color tokens for a project's difficulty level.
 * Safely falls back to Common when the field is missing (e.g. older saves).
 *
 * @param {string|undefined} difficulty  'common' | 'uncommon' | 'rare'
 * @returns {{ label: string, bg: number, border: number, text: number }}
 */
export function getProjectDifficultyStyle(difficulty) {
  return DIFFICULTY_STYLES[difficulty] ?? FALLBACK;
}
