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

/** Accent color per skill for progress bars and badges. */
export const SKILL_COLORS = Object.freeze({
  [SKILLS.FRONTEND_DEVELOPMENT]: 0x4a9eff,
  [SKILLS.BACKEND_DEVELOPMENT]: 0x3cb371,
  [SKILLS.MOBILE_DEVELOPMENT]: 0x7cfc00,
  [SKILLS.DEVOPS]: 0xff6347,
});
