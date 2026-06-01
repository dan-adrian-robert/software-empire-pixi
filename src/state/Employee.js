/**
 * Employee state factory.
 *
 * An employee is a plain data object. All mutation happens through
 * functions exported here so logic stays testable and traceable.
 */
import { GameConfig } from '../config.js';
import { STAFF_ROLES } from '../data/staffRoles.js';

let _nextId = 1;
export function peekNextId() { return _nextId; }
export function setNextId(n) { _nextId = n; }

/** Repeating 15-minute schedule cycle for every employee. */
export const SCHEDULE_CYCLE = ['WORK', 'BREAK', 'WORK', 'TALK'];

/**
 * @param {object} opts
 * @param {string} opts.name
 * @param {Array<{skill: string, level: number}>} opts.skills  - max two skills
 * @param {number} opts.salary  - daily salary cost
 * @param {number} [opts.characterIndex]  1-based index into characterN.png portraits.
 * @param {string} [opts.role]  - STAFF_ROLES value, defaults to 'programmer'.
 * @param {number|null} [opts.startingLevel]  - Explicit starting level for non-programmer roles.
 * @param {{ [archetypeId: string]: number }} [opts.archetypes]  - Weighted archetype profile.
 * @returns {Employee}
 */
export function createEmployee({ name, skills, salary, characterIndex = 1, role = STAFF_ROLES.PROGRAMMER, startingLevel = null, archetypes = {} }) {
  const { BASE_PRODUCTIVITY_MIN, BASE_PRODUCTIVITY_MAX } = GameConfig.gameplay;
  const clampedSkills = skills.slice(0, 2);
  const derivedLevel = clampedSkills.reduce((s, sk) => s + sk.level, 0);
  return {
    id: _nextId++,
    name,
    characterIndex,
    role,
    /** @type {Array<{skill: string, level: number}>} */
    skills: clampedSkills,
    salary,
    /** Innate productivity multiplier [0.85, 1.05], rolled once on creation. */
    baseProductivity: BASE_PRODUCTIVITY_MIN + Math.random() * (BASE_PRODUCTIVITY_MAX - BASE_PRODUCTIVITY_MIN),
    /** Starting level = sum of all skill levels (programmers) or explicit value (non-programmers). */
    level: startingLevel ?? derivedLevel,
    /** Accumulated EXP toward the next level (0 – EXP_PER_LEVEL-1). */
    exp: 0,
    /** Skill points earned via levelling up but not yet spent by the player. */
    pendingSkillPoints: 0,
    /** Id of the active project this employee is contributing to, or null. */
    activeProjectId: null,
    /** Manually pinned project id, or null for automatic greedy assignment. */
    pinnedProjectId: null,
    /** Current schedule state — one of SCHEDULE_CYCLE entries. */
    scheduleState: 'WORK',
    /** Points buffered during the current WORK period, keyed by projectId → skill → points. */
    workBuffer: {},
    /** Running sum of all buffered points this WORK period. */
    workPeriodTotal: 0,
    /** When true, notifications about this employee skip the toast popup. */
    logsMuted: false,
    /** Weighted archetype profile: { [archetypeId]: number }, values sum to 100. */
    archetypes,
  };
}

/**
 * Total points per day this employee can generate across all their skills.
 * Actual distribution depends on ProjectSystem matching requirements.
 */
export function employeeTotalPoints(employee, pointsPerLevel) {
  return employee.skills.reduce((sum, s) => sum + s.level * pointsPerLevel, 0);
}

/** True when the employee is a developer who earns story points. */
export function isProgrammer(employee) {
  return (employee.role ?? STAFF_ROLES.PROGRAMMER) === STAFF_ROLES.PROGRAMMER;
}

/** True when the employee is a Project Manager. */
export function isProjectManager(employee) {
  return employee.role === STAFF_ROLES.PROJECT_MANAGER;
}

/** True when the employee is a Team Lead. */
export function isTeamLead(employee) {
  return employee.role === STAFF_ROLES.TEAM_LEAD;
}

/**
 * Returns the subset of an employee's skills that match any open
 * requirement in the given project.
 */
export function matchingSkills(employee, project) {
  const openSkills = new Set(
    project.requirements.filter((r) => r.current < r.points).map((r) => r.skill),
  );
  return employee.skills.filter((s) => openSkills.has(s.skill));
}
