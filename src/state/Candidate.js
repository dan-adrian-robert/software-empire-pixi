/**
 * Candidate state factory.
 * Candidates appear in the hiring pool and can be hired if there is desk space.
 */
import { randomName } from '../data/namePool.js';
import { SKILLS } from '../data/skills.js';
import { pickRandomCharacterIndex } from '../utils/characterSprite.js';
import { STAFF_ROLES } from '../data/staffRoles.js';

let _nextId = 1;
export function peekNextId() { return _nextId; }
export function setNextId(n) { _nextId = n; }

const ALL_SKILL_KEYS = Object.values(SKILLS);

/**
 * @param {object} [opts]
 * @param {string} [opts.name]
 * @param {Array<{skill: string, level: number}>} [opts.skills]
 * @param {number} [opts.salary]
 * @param {number} [opts.characterIndex]  1-based index into characterN.png portraits.
 * @param {string} [opts.role]  - STAFF_ROLES value, defaults to 'programmer'.
 * @param {number} [opts.level] - Starting level override (used for Team Leads).
 * @param {() => number} [opts.rng]
 * @returns {Candidate}
 */
export function createCandidate({ name, skills, salary, characterIndex, role, level, rng } = {}) {
  return {
    id: _nextId++,
    name: name ?? randomName(),
    skills: skills ?? [],
    salary: salary ?? 100,
    characterIndex: characterIndex ?? pickRandomCharacterIndex(rng),
    role: role ?? STAFF_ROLES.PROGRAMMER,
    /** Explicit starting level — only set for non-programmer roles like Team Lead. */
    level: level ?? null,
  };
}

/**
 * Generate a random candidate appropriate for the given company tier
 * (1 = startup ... 4 = multinational).
 * @param {number} tier
 * @param {() => number} rng
 * @param {Set<string>|null} allowedSkills  If provided, only skills in this set are used.
 */
export function generateRandomCandidate(tier = 1, rng = Math.random, allowedSkills = null) {
  const minLevel = 1 + tier;
  const maxLevel = 3 + tier * 2;

  const pool = allowedSkills
    ? ALL_SKILL_KEYS.filter((s) => allowedSkills.has(s))
    : ALL_SKILL_KEYS;

  // Fallback: if no skills are unlocked yet, return a no-skill candidate.
  if (pool.length === 0) {
    return createCandidate({ name: randomName(rng), skills: [], salary: 100, rng });
  }

  const shuffled = [...pool].sort(() => rng() - 0.5);
  const numSkills = rng() < 0.3 || pool.length === 1 ? 1 : 2;
  const skills = shuffled.slice(0, numSkills).map((skill) => ({
    skill,
    level: Math.floor(minLevel + rng() * (maxLevel - minLevel + 1)),
  }));

  const totalLevels = skills.reduce((s, sk) => s + sk.level, 0);
  const salary = Math.round((60 + totalLevels * 12 + rng() * 20) / 10) * 10;

  return createCandidate({ name: randomName(rng), skills, salary, rng });
}
