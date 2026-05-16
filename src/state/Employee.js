/**
 * Employee state factory.
 *
 * An employee is a plain data object. All mutation happens through
 * functions exported here so logic stays testable and traceable.
 */

let _nextId = 1;

/** Repeating 15-minute schedule cycle for every employee. */
export const SCHEDULE_CYCLE = ['WORK', 'BREAK', 'WORK', 'TALK'];

/**
 * @param {object} opts
 * @param {string} opts.name
 * @param {Array<{skill: string, level: number}>} opts.skills  - max two skills
 * @param {number} opts.salary  - daily salary cost
 * @returns {Employee}
 */
export function createEmployee({ name, skills, salary }) {
  return {
    id: _nextId++,
    name,
    /** @type {Array<{skill: string, level: number}>} */
    skills: skills.slice(0, 2),
    salary,
    /** Id of the active project this employee is contributing to, or null. */
    activeProjectId: null,
    /** Current schedule state — one of SCHEDULE_CYCLE entries. */
    scheduleState: 'WORK',
  };
}

/**
 * Total points per day this employee can generate across all their skills.
 * Actual distribution depends on ProjectSystem matching requirements.
 */
export function employeeTotalPoints(employee, pointsPerLevel) {
  return employee.skills.reduce((sum, s) => sum + s.level * pointsPerLevel, 0);
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
