/**
 * Company state factory.
 * The Company object is the single root of all mutable game state.
 * Systems read and write its fields; UI reads it to render.
 */
import { createOffice } from './Office.js';
import { createEmployee } from './Employee.js';
import { createCandidate } from './Candidate.js';
import {
  STARTER_COMPANY_NAME,
  STARTER_MONEY,
  STARTER_DAY,
  STARTER_MAX_ACTIVE_PROJECTS,
  STARTER_OFFICE_TIER_INDEX,
} from '../data/starter.js';
import { SKILLS } from '../data/skills.js';
import { generateStarterEmployee, generateStarterCandidates, generateStarterPmCandidates, generateStarterTeamLeadCandidates } from '../systems/EmployeeGenerator.js';
import { generateStarterPool } from '../systems/ProjectGenerator.js';

/**
 * Create a fresh Company from the starter seed.
 * @returns {Company}
 */
export function createCompany() {
  const starterResearch = ['skill_frontend_dev'];

  const starterEmpData = generateStarterEmployee(SKILLS.FRONTEND_DEVELOPMENT);
  const employees = [createEmployee(starterEmpData)];

  const starterCandidateData = generateStarterCandidates(SKILLS.FRONTEND_DEVELOPMENT);
  const candidates = starterCandidateData.map((c) => createCandidate(c));

  const otherCandidates = [
    ...generateStarterPmCandidates(3),
    ...generateStarterTeamLeadCandidates(2),
  ];

  const availableProjects = generateStarterPool(starterResearch, 3);

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

    /** Programmer candidates available to hire this day. */
    /** @type {import('./Candidate.js').Candidate[]} */
    candidates,

    /** Non-programmer (Other) candidates available to hire this day. */
    /** @type {import('./Candidate.js').Candidate[]} */
    otherCandidates,

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
     * Before the work_schedule research node is unlocked this is fixed at
     * 9 AM–9 PM (startHour: 9, workHours: 12) and cannot be changed by the player.
     */
    schedule: {
      startHour: 9,
      workHours: 12,
    },

    /** Cumulative totals for statistics. */
    stats: {
      totalRevenue: 0,
      totalSalariesPaid: 0,
      projectsCompleted: 0,
    },

    /**
     * Current daily weather state. Set by ProductivitySystem.rollDailyWeather()
     * at the start of each new day. Null until the first roll.
     * @type {import('../data/weatherTypes.js').WeatherType | null}
     */
    currentWeather: null,

    /**
     * Placed furniture items on the office floor.
     * @type {import('./FurnitureItem.js').FurnitureItem[]}
     */
    furniture: [],

    /**
     * Teams managed by hired Team Leads. Each team is created automatically
     * when a Team Lead is hired and dissolved when they are fired.
     * @type {import('./Team.js').Team[]}
     */
    teams: [],

    /**
     * SP production history for the current day.
     * Populated by recordSpPeriod() at the end of each WORK period.
     */
    dailySpProductivity: {
      day: STARTER_DAY,
      /** SP flushed at the end of each WORK period, in chronological order. */
      periods: /** @type {number[]} */ ([]),
      total: 0,
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

/** Reset the daily SP productivity snapshot for a new day. */
export function resetDailySpProductivity(company) {
  company.dailySpProductivity.day     = company.day;
  company.dailySpProductivity.periods = [];
  company.dailySpProductivity.total   = 0;
}

/**
 * Record the SP produced at the end of a WORK period.
 * @param {Company} company
 * @param {number}  sp  Raw SP sum (will be rounded to 1 decimal).
 */
export function recordSpPeriod(company, sp) {
  if (sp <= 0) return;
  const rounded = Math.round(sp * 10) / 10;
  company.dailySpProductivity.periods.push(rounded);
  company.dailySpProductivity.total = Math.round((company.dailySpProductivity.total + rounded) * 10) / 10;
}

/**
 * Sum of in-progress (buffered but not yet flushed) SP across all employees.
 * Used for the live partial bar.
 * @param {Company} company
 * @returns {number}
 */
export function currentPeriodSp(company) {
  return company.employees.reduce((s, e) => s + e.workPeriodTotal, 0);
}
