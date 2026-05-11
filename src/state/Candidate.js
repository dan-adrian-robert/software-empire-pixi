/**
 * Candidate state factory.
 * Candidates appear in the hiring pool and can be hired if there is desk space.
 */
import { randomName } from '../data/namePool.js';
import { SKILLS } from '../data/skills.js';

let _nextId = 1;

const ALL_SKILL_KEYS = Object.values(SKILLS);

/**
 * @param {object} [opts]
 * @param {string} [opts.name]
 * @param {Array<{skill: string, level: number}>} [opts.skills]
 * @param {number} [opts.salary]
 * @returns {Candidate}
 */
export function createCandidate({ name, skills, salary } = {}) {
  return {
    id: _nextId++,
    name: name ?? randomName(),
    skills: skills ?? [],
    salary: salary ?? 100,
  };
}

/**
 * Generate a random candidate appropriate for the given company tier
 * (1 = startup ... 4 = multinational).
 */
export function generateRandomCandidate(tier = 1, rng = Math.random) {
  const minLevel = 1 + tier;
  const maxLevel = 3 + tier * 2;

  const shuffled = [...ALL_SKILL_KEYS].sort(() => rng() - 0.5);
  const numSkills = rng() < 0.3 ? 1 : 2;
  const skills = shuffled.slice(0, numSkills).map((skill) => ({
    skill,
    level: Math.floor(minLevel + rng() * (maxLevel - minLevel + 1)),
  }));

  const totalLevels = skills.reduce((s, sk) => s + sk.level, 0);
  const salary = Math.round((60 + totalLevels * 12 + rng() * 20) / 10) * 10;

  return createCandidate({ name: randomName(rng), skills, salary });
}
