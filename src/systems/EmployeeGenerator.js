/**
 * EmployeeGenerator
 *
 * Procedurally creates Candidate objects whose salary is derived from the
 * PLOT.md economy table rather than a hard-coded ad-hoc formula.
 *
 * Generation rules:
 *   - 1 or 2 skills, drawn from the player's currently unlocked skill pool.
 *   - Each skill level is random in [1, maxSkillLevel] (currently 5).
 *   - Salary = median value from computeMedianSalary(), rounded to $10.
 *   - dualSkillChance controls how often a second skill is added.
 */
import { createCandidate } from '../state/Candidate.js';
import { randomName } from '../data/namePool.js';
import { computeMedianSalary, randomInt } from '../economy/balance.js';
import employeeCatalog from '../data/employeeCatalog.json';
import economyBalance from '../data/economyBalance.json';

const { maxSkillLevel, maxSkills, dualSkillChance } = economyBalance.employeeGeneration;

/**
 * Generate a single random Candidate from the current unlocked skill pool.
 *
 * @param {object} opts
 * @param {Set<string>} opts.allowedSkills  Skills the player has unlocked.
 * @param {() => number} [opts.rng]         Math.random-compatible RNG.
 * @returns {import('../state/Candidate.js').Candidate}
 */
export function generateCandidate({ allowedSkills, rng = Math.random } = {}) {
  const pool = allowedSkills ? [...allowedSkills] : [];

  if (pool.length === 0) {
    return createCandidate({ name: randomName(rng), skills: [], salary: 0 });
  }

  const shuffled = [...pool].sort(() => rng() - 0.5);
  const numSkills = (shuffled.length > 1 && rng() < dualSkillChance) ? Math.min(2, maxSkills) : 1;

  const skills = shuffled.slice(0, numSkills).map((skill) => ({
    skill,
    level: randomInt(1, maxSkillLevel, rng),
  }));

  const salary = computeMedianSalary(skills);

  return createCandidate({ name: randomName(rng), skills, salary });
}

/**
 * Generate the fixed starter employee using the catalog name but randomised skills/salary.
 * The starter always receives a single frontend skill at level 1 to keep the tutorial coherent.
 *
 * @param {string} frontendSkillId  The frontendDevelopment skill string constant.
 * @returns {{ name: string, skills: Array<{skill: string, level: number}>, salary: number }}
 */
export function generateStarterEmployee(frontendSkillId) {
  const skills = [{ skill: frontendSkillId, level: 1 }];
  return {
    name: employeeCatalog.starterEmployee.name,
    skills,
    salary: computeMedianSalary(skills),
  };
}

/**
 * Generate the starter candidate batch using catalog names but randomised skills/salary.
 * All candidates are given the single unlocked frontend skill at random levels 1–3.
 *
 * @param {string} frontendSkillId
 * @param {() => number} [rng]
 * @returns {Array<{ name: string, skills: Array<{skill: string, level: number}>, salary: number }>}
 */
export function generateStarterCandidates(frontendSkillId, rng = Math.random) {
  return employeeCatalog.starterCandidates.map(({ name }) => {
    const skills = [{ skill: frontendSkillId, level: randomInt(1, 3, rng) }];
    return { name, skills, salary: computeMedianSalary(skills) };
  });
}
