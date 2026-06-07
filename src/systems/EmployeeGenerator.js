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
 *   - Every candidate receives a random archetype profile (60/25/15).
 */
import { createCandidate } from '../state/Candidate.js';
import { pickRandomCharacterIndex } from '../utils/characterSprite.js';
import { randomName } from '../data/namePool.js';
import { computeMedianSalary, randomInt } from '../economy/balance.js';
import { STAFF_ROLES } from '../data/staffRoles.js';
import { ALL_ARCHETYPE_IDS } from '../data/archetypes.js';
import { generateCommunicationProfile } from './CommunicationGenerator.js';
import employeeCatalog from '../data/employeeCatalog.json';
import economyBalance from '../data/economyBalance.json';

const { maxSkillLevel, maxSkills, dualSkillChance } = economyBalance.employeeGeneration;
const { projectManagerSalary, teamLeadSalary } = economyBalance.otherStaffGeneration;

/**
 * Generate a random archetype profile for a candidate.
 * Picks 3 distinct archetypes and assigns weights 60 / 25 / 15.
 *
 * @param {() => number} [rng]
 * @returns {{ [archetypeId: string]: number }}
 */
export function generateArchetypes(rng = Math.random) {
  const shuffled = [...ALL_ARCHETYPE_IDS].sort(() => rng() - 0.5);
  const [primary, secondary, tertiary] = shuffled;
  return { [primary]: 60, [secondary]: 25, [tertiary]: 15 };
}

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
    return createCandidate({
      name: randomName(rng),
      skills: [],
      salary: 0,
      archetypes: generateArchetypes(rng),
      communication: generateCommunicationProfile(rng),
      rng,
    });
  }

  const shuffled = [...pool].sort(() => rng() - 0.5);
  const numSkills = (shuffled.length > 1 && rng() < dualSkillChance) ? Math.min(2, maxSkills) : 1;

  const skills = shuffled.slice(0, numSkills).map((skill) => {
    const level = randomInt(1, maxSkillLevel, rng);
    const potential = Math.max(level, randomInt(1, 10, rng));
    return { skill, level, potential };
  });

  const salary = computeMedianSalary(skills);

  return createCandidate({
    name: randomName(rng),
    skills,
    salary,
    archetypes: generateArchetypes(rng),
    communication: generateCommunicationProfile(rng),
    rng,
  });
}

/**
 * Generate a single Project Manager candidate.
 *
 * @param {object} [opts]
 * @param {() => number} [opts.rng]  Math.random-compatible RNG.
 * @returns {import('../state/Candidate.js').Candidate}
 */
export function generateProjectManagerCandidate({ rng = Math.random } = {}) {
  return createCandidate({
    name: randomName(rng),
    skills: [],
    salary: projectManagerSalary,
    characterIndex: pickRandomCharacterIndex(rng),
    role: STAFF_ROLES.PROJECT_MANAGER,
    archetypes: generateArchetypes(rng),
    communication: generateCommunicationProfile(rng),
    rng,
  });
}

/**
 * Generate a batch of starter PM candidates for day 1.
 *
 * @param {number} [count]
 * @param {() => number} [rng]
 * @returns {import('../state/Candidate.js').Candidate[]}
 */
export function generateStarterPmCandidates(count = 3, rng = Math.random) {
  return Array.from({ length: count }, () => generateProjectManagerCandidate({ rng }));
}

/**
 * Generate a batch of starter Team Lead candidates for day 1.
 *
 * @param {number} [count]
 * @param {() => number} [rng]
 * @returns {import('../state/Candidate.js').Candidate[]}
 */
export function generateStarterTeamLeadCandidates(count = 2, rng = Math.random) {
  return Array.from({ length: count }, () => generateTeamLeadCandidate({ rng }));
}

/**
 * Generate a single Team Lead candidate.
 * Team Leads have no skills but come with a random starting level (1–5).
 *
 * @param {object} [opts]
 * @param {() => number} [opts.rng]  Math.random-compatible RNG.
 * @returns {import('../state/Candidate.js').Candidate}
 */
export function generateTeamLeadCandidate({ rng = Math.random } = {}) {
  const level = randomInt(1, 5, rng);
  return createCandidate({
    name: randomName(rng),
    skills: [],
    salary: teamLeadSalary,
    characterIndex: pickRandomCharacterIndex(rng),
    role: STAFF_ROLES.TEAM_LEAD,
    level,
    archetypes: generateArchetypes(rng),
    communication: generateCommunicationProfile(rng),
    rng,
  });
}

/**
 * Generate the fixed starter employee using the catalog name but randomised skills/salary.
 * The starter always receives a single frontend skill at level 1 to keep the tutorial coherent.
 *
 * @param {string} frontendSkillId  The frontendDevelopment skill string constant.
 * @returns {{ name: string, skills: Array<{skill: string, level: number}>, salary: number, archetypes: object }}
 */
export function generateStarterEmployee(frontendSkillId) {
  const potential = Math.max(1, Math.floor(Math.random() * 10) + 1);
  const skills = [{ skill: frontendSkillId, level: 1, potential }];
  return {
    name: employeeCatalog.starterEmployee.name,
    skills,
    salary: computeMedianSalary(skills),
    characterIndex: pickRandomCharacterIndex(),
    archetypes: generateArchetypes(),
    communication: generateCommunicationProfile(),
  };
}

/**
 * Generate the starter candidate batch using catalog names but randomised skills/salary.
 * All candidates are given the single unlocked frontend skill at random levels 1–3.
 *
 * @param {string} frontendSkillId
 * @param {() => number} [rng]
 * @returns {Array<{ name: string, skills: Array<{skill: string, level: number}>, salary: number, archetypes: object }>}
 */
export function generateStarterCandidates(frontendSkillId, rng = Math.random) {
  return employeeCatalog.starterCandidates.map(({ name }) => {
    const level = randomInt(1, 3, rng);
    const potential = Math.max(level, randomInt(1, 10, rng));
    const skills = [{ skill: frontendSkillId, level, potential }];
    return {
      name,
      skills,
      salary: computeMedianSalary(skills),
      characterIndex: pickRandomCharacterIndex(rng),
      archetypes: generateArchetypes(rng),
      communication: generateCommunicationProfile(rng),
    };
  });
}
