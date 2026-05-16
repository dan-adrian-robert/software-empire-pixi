/**
 * Project state factory.
 *
 * An active Project is built from a PROJECT_TEMPLATES entry and tracks
 * per-requirement progress (`current` field).
 */

let _nextId = 1;

/**
 * @param {import('../data/projectTemplates.js').ProjectTemplate} template
 * @returns {Project}
 */
export function createProject(template) {
  return {
    id: _nextId++,
    templateId: template.id,
    name: template.name,
    description: template.description,
    payout: template.payout,
    tier: template.tier,
    /** @type {Array<{skill: string, points: number, current: number}>} */
    requirements: template.requirements.map((r) => ({
      skill: r.skill,
      points: r.points,
      current: 0,
    })),
    /** Whether the player has accepted this project as active. */
    isActive: false,
    /** Set to true when all requirements are met — awaiting player collection. */
    isReadyToFinish: false,
    /** Set to true once the player has collected the payout. */
    isCompleted: false,
  };
}

/** Returns total required points across all requirements. */
export function projectTotalPoints(project) {
  return project.requirements.reduce((s, r) => s + r.points, 0);
}

/** Returns total current progress points. */
export function projectCurrentPoints(project) {
  return project.requirements.reduce((s, r) => s + r.current, 0);
}

/** Returns 0..1 completion ratio. */
export function projectProgress(project) {
  const total = projectTotalPoints(project);
  if (total === 0) return 1;
  return Math.min(1, projectCurrentPoints(project) / total);
}

/** Returns true if every requirement is fully filled. */
export function isProjectComplete(project) {
  return project.requirements.every((r) => r.current >= r.points);
}
