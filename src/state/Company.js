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

/**
 * Create a fresh Company from the starter seed.
 * @returns {Company}
 */
export function createCompany() {
  const employees = STARTER_EMPLOYEES.map((e) => createEmployee(e));
  const candidates = STARTER_CANDIDATES.map((c) => createCandidate(c));

  // Pick 3 tier-1 starter projects as "available"
  const starterTemplates = PROJECT_TEMPLATES.filter((t) => t.tier === 1).slice(0, 3);
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
