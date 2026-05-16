/**
 * Company state factory.
 * The Company object is the single root of all mutable game state.
 * Systems read and write its fields; UI reads it to render.
 */
import { createOffice } from './Office.js';
import { createEmployee } from './Employee.js';
import { createProject } from './Project.js';
import { createCandidate } from './Candidate.js';
import {
  STARTER_COMPANY_NAME,
  STARTER_MONEY,
  STARTER_DAY,
  STARTER_MAX_ACTIVE_PROJECTS,
  STARTER_OFFICE_TIER_INDEX,
  STARTER_EMPLOYEES,
  STARTER_CANDIDATES,
} from '../data/starter.js';
import { PROJECT_TEMPLATES } from '../data/projectTemplates.js';
import { SKILL_RESEARCH_NODE, getUnlockedSkills } from '../data/skills.js';

/**
 * Create a fresh Company from the starter seed.
 * @returns {Company}
 */
export function createCompany() {
  const employees = STARTER_EMPLOYEES.map((e) => createEmployee(e));

  // Only include starter candidates whose skills are all within the initial research unlock.
  const starterAllowedSkills = getUnlockedSkills(['skill_frontend_dev']);
  const candidates = STARTER_CANDIDATES
    .filter((c) => c.skills.every((s) => starterAllowedSkills.has(s.skill)))
    .map((c) => createCandidate(c));

  // Pick up to 3 tier-1 projects that only require the pre-unlocked frontend skill.
  const starterUnlocked = new Set(['skill_frontend_dev']);
  const starterTemplates = PROJECT_TEMPLATES.filter(
    (t) => t.tier === 1 && t.requirements.every((r) => starterUnlocked.has(SKILL_RESEARCH_NODE[r.skill])),
  ).slice(0, 3);
  const availableProjects = starterTemplates.map((t) => createProject(t));

  return {
    name: STARTER_COMPANY_NAME,
    money: STARTER_MONEY,
    day: STARTER_DAY,
    maxActiveProjects: STARTER_MAX_ACTIVE_PROJECTS,

    office: createOffice(STARTER_OFFICE_TIER_INDEX),

    /** @type {import('./Employee.js').Employee[]} */
    employees,

    /** Projects currently being worked on (isActive === true). */
    /** @type {import('./Project.js').Project[]} */
    activeProjects: [],

    /** Projects offered to the player, not yet accepted or rejected. */
    /** @type {import('./Project.js').Project[]} */
    availableProjects,

    /** Completed projects waiting to be cleared from UI. */
    /** @type {import('./Project.js').Project[]} */
    completedProjects: [],

    /** Candidates available to hire this day. */
    /** @type {import('./Candidate.js').Candidate[]} */
    candidates,

    /** Running income banked from completed projects during current day (paid at day end). */
    pendingPayout: 0,

    /** Accumulated R&D points (spent on research tree nodes). */
    rdPoints: 5000,

    /** R&D points generated each end-of-day. */
    rdPointsPerDay: 10,

    /** IDs of research nodes that have been unlocked. */
    /** @type {string[]} */
    unlockedResearch: ['skill_frontend_dev'],

    /**
     * Work-day schedule. Controls in-game clock display and productivity.
     * startHour: 6–16 (hour the day begins, 24h clock)
     * workHours: 8 | 10 | 12 | 14
     */
    schedule: {
      startHour: 8,
      workHours: 8,
    },

    /** Cumulative totals for statistics. */
    stats: {
      totalRevenue: 0,
      totalSalariesPaid: 0,
      projectsCompleted: 0,
    },
  };
}

/** How many desks are currently occupied. */
export function usedDesks(company) {
  return company.employees.length;
}

/** How many desks are free for new hires. */
export function freeDesks(company) {
  return company.office.desks - usedDesks(company);
}

/** Daily salary sum for all current employees. */
export function dailySalaryCost(company) {
  return company.employees.reduce((s, e) => s + e.salary, 0);
}

/** Estimated daily profit = pending payout (avg per day) - salary cost. */
export function estimatedDailyProfit(company) {
  return -dailySalaryCost(company);
}
