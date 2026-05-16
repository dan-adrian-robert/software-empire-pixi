/**
 * Canonical skill identifiers and display metadata.
 * Every employee skill and every project requirement must reference one of these keys.
 */
export const SKILLS = Object.freeze({
  FRONTEND_DEVELOPMENT: 'frontendDevelopment',
  BACKEND_DEVELOPMENT: 'backendDevelopment',
  MOBILE_DEVELOPMENT: 'mobileDevelopment',
  DEVOPS: 'devops',
});

/** Human-readable labels for UI display. */
export const SKILL_LABELS = Object.freeze({
  [SKILLS.FRONTEND_DEVELOPMENT]: 'Frontend Dev',
  [SKILLS.BACKEND_DEVELOPMENT]: 'Backend Dev',
  [SKILLS.MOBILE_DEVELOPMENT]: 'Mobile Dev',
  [SKILLS.DEVOPS]: 'DevOps',
});

/** Compact labels for tight UI grids (skill bar grids, badges, etc.). */
export const SKILL_LABELS_SHORT = Object.freeze({
  [SKILLS.FRONTEND_DEVELOPMENT]: 'Frontend',
  [SKILLS.BACKEND_DEVELOPMENT]: 'Backend',
  [SKILLS.MOBILE_DEVELOPMENT]: 'Mobile',
  [SKILLS.DEVOPS]: 'DevOps',
});

/**
 * Maximum displayable level for a single skill. Used by skill-bar widgets so
 * the UI can render a fixed-length track (filled cells = current level,
 * remaining cells = grayed-out potential).
 */
export const MAX_SKILL_LEVEL = 10;

/**
 * Maps each skill ID to the research node that must be unlocked before
 * that skill can be used in projects or hired for.
 */
export const SKILL_RESEARCH_NODE = Object.freeze({
  [SKILLS.FRONTEND_DEVELOPMENT]: 'skill_frontend_dev',
  [SKILLS.BACKEND_DEVELOPMENT]:  'skill_backend_dev',
  [SKILLS.MOBILE_DEVELOPMENT]:   'skill_mobile_dev',
  [SKILLS.DEVOPS]:               'skill_devops',
});

/**
 * Returns the set of skill IDs that are currently unlocked based on
 * the company's unlockedResearch array.
 * @param {string[]} unlockedResearch
 * @returns {Set<string>}
 */
export function getUnlockedSkills(unlockedResearch) {
  const set = new Set(unlockedResearch);
  return new Set(
    Object.entries(SKILL_RESEARCH_NODE)
      .filter(([, node]) => set.has(node))
      .map(([skill]) => skill),
  );
}

/** Accent color per skill for progress bars and badges. */
export const SKILL_COLORS = Object.freeze({
  [SKILLS.FRONTEND_DEVELOPMENT]: 0x4a9eff,
  [SKILLS.BACKEND_DEVELOPMENT]: 0x3cb371,
  [SKILLS.MOBILE_DEVELOPMENT]: 0x7cfc00,
  [SKILLS.DEVOPS]: 0xff6347,
});
