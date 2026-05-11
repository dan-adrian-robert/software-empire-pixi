/**
 * Canonical skill identifiers and display metadata.
 * Every employee skill and every project requirement must reference one of these keys.
 */
export const SKILLS = Object.freeze({
  BASIC_CODING: 'basicCoding',
  BACKEND_DEVELOPMENT: 'backendDevelopment',
  DATABASE_MANAGEMENT: 'databaseManagement',
  MOBILE_DEVELOPMENT: 'mobileDevelopment',
  PROJECT_MANAGEMENT: 'projectManagement',
});

/** Human-readable labels for UI display. */
export const SKILL_LABELS = Object.freeze({
  [SKILLS.BASIC_CODING]: 'Basic Coding',
  [SKILLS.BACKEND_DEVELOPMENT]: 'Backend Dev',
  [SKILLS.DATABASE_MANAGEMENT]: 'Database',
  [SKILLS.MOBILE_DEVELOPMENT]: 'Mobile Dev',
  [SKILLS.PROJECT_MANAGEMENT]: 'Project Mgmt',
});

/** Compact labels for tight UI grids (skill bar grids, badges, etc.). */
export const SKILL_LABELS_SHORT = Object.freeze({
  [SKILLS.BASIC_CODING]: 'Coding',
  [SKILLS.BACKEND_DEVELOPMENT]: 'Backend',
  [SKILLS.DATABASE_MANAGEMENT]: 'Database',
  [SKILLS.MOBILE_DEVELOPMENT]: 'Mobile',
  [SKILLS.PROJECT_MANAGEMENT]: 'PM',
});

/**
 * Maximum displayable level for a single skill. Used by skill-bar widgets so
 * the UI can render a fixed-length track (filled cells = current level,
 * remaining cells = grayed-out potential).
 */
export const MAX_SKILL_LEVEL = 10;

/** Accent color per skill for progress bars and badges. */
export const SKILL_COLORS = Object.freeze({
  [SKILLS.BASIC_CODING]: 0x4a9eff,
  [SKILLS.BACKEND_DEVELOPMENT]: 0x3cb371,
  [SKILLS.DATABASE_MANAGEMENT]: 0xffa500,
  [SKILLS.MOBILE_DEVELOPMENT]: 0x7cfc00,
  [SKILLS.PROJECT_MANAGEMENT]: 0xffd700,
});
