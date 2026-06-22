/**
 * ProjectGenerator
 *
 * Builds project instances from the static flavor catalog (projectCatalog.json).
 * SP requirements are no longer random within tier bounds — instead they are
 * derived from the team's current raw daily output × a difficulty multiplier:
 *
 *   totalSp  = round(teamOutput × spMultiplier)
 *   spPerSkill = round(totalSp / numSkills)   (last skill absorbs any remainder)
 *
 * Difficulty (Common / Uncommon / Rare) is picked via weighted random from
 * economyBalance.json so the pool skews toward easier work with occasional
 * high-pressure contracts.
 *
 * Tier continues to control which catalog entries appear (office tier +
 * research unlocks) — it no longer drives SP values.
 */
import { createProject } from '../state/Project.js';
import {
  computeMedianPayout,
  computeProjectTiming,
  getDifficultyConfig,
  pickDifficulty,
} from '../economy/balance.js';
import { SKILL_RESEARCH_NODE } from '../data/skills.js';
import catalog from '../data/projectCatalog.json';

/** Baseline team output used when no employees exist yet (one Lv1 employee = 16 SP/day). */
const STARTER_TEAM_OUTPUT = 16;

/**
 * Build one project instance from a catalog entry.
 *
 * @param {object}       entry       A catalog entry from projectCatalog.json.
 * @param {number}       teamOutput  Raw SP/day produced by the entire team.
 * @param {string}       difficulty  'common' | 'uncommon' | 'rare'
 * @param {() => number} [rng]
 * @returns {import('../state/Project.js').Project}
 */
export function generateFromCatalog(entry, teamOutput, difficulty, rng = Math.random) {
  const { spMultiplier } = getDifficultyConfig(difficulty);
  const numSkills = entry.skills.length;

  const totalSp = Math.max(1, Math.round(teamOutput * spMultiplier));
  const basePerSkill = Math.round(totalSp / numSkills);

  const requirements = entry.skills.map((skill, i) => {
    // Last skill absorbs rounding remainder so sum always equals totalSp.
    const isLast = i === numSkills - 1;
    const assigned = isLast
      ? totalSp - basePerSkill * (numSkills - 1)
      : basePerSkill;
    return { skill, points: Math.max(1, assigned) };
  });

  const basePayout = computeMedianPayout(totalSp);
  const { milestones, insurance } = computeProjectTiming(totalSp, teamOutput);

  return createProject({
    id: entry.id,
    name: entry.name,
    description: entry.description,
    tier: entry.tier,
    difficulty,
    requirements,
    basePayout,
    milestones,
    insurance,
  });
}

/**
 * Generate a full available-project pool for the given day.
 *
 * @param {object}   opts
 * @param {number}   opts.maxTier             Highest project tier to include.
 * @param {string[]} opts.unlockedResearch     Company's unlocked research node IDs.
 * @param {string[]} opts.activeTemplateIds    templateId values of currently active projects (excluded).
 * @param {number}   opts.count               How many projects to return.
 * @param {number}   [opts.teamOutput]        Raw SP/day of the current team.
 * @param {() => number} [opts.rng]
 * @returns {import('../state/Project.js').Project[]}
 */
export function generatePool({
  maxTier,
  unlockedResearch,
  activeTemplateIds = [],
  count,
  teamOutput = STARTER_TEAM_OUTPUT,
  rng = Math.random,
}) {
  const unlocked = new Set(unlockedResearch);
  const activeIds = new Set(activeTemplateIds);

  const eligible = catalog.filter((entry) => {
    if (entry.tier > maxTier) return false;
    if (activeIds.has(entry.id)) return false;
    return entry.skills.every((skill) => {
      const node = SKILL_RESEARCH_NODE[skill];
      return !node || unlocked.has(node);
    });
  });

  const shuffled = [...eligible].sort(() => rng() - 0.5);
  return shuffled.slice(0, count).map((entry) => {
    const difficulty = pickDifficulty(rng);
    return generateFromCatalog(entry, teamOutput, difficulty, rng);
  });
}

/**
 * Generate the starter project pool shown to the player on day 1.
 * Uses STARTER_TEAM_OUTPUT so day-1 projects are coherent even before
 * computeTeamOutput() can run.
 *
 * @param {string[]} unlockedResearch
 * @param {number}   [count]
 * @returns {import('../state/Project.js').Project[]}
 */
export function generateStarterPool(unlockedResearch, count = 3) {
  return generatePool({
    maxTier: 1,
    unlockedResearch,
    activeTemplateIds: [],
    count,
    teamOutput: STARTER_TEAM_OUTPUT,
  });
}
