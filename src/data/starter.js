/**
 * Starter seed data for a new game.
 * Used by Simulation.reset() to build the initial Company state.
 */
import { SKILLS } from './skills.js';

export const STARTER_COMPANY_NAME = 'TechNova Studios';
export const STARTER_MONEY = 5000;
export const STARTER_DAY = 1;
export const STARTER_MAX_ACTIVE_PROJECTS = 3;
export const STARTER_OFFICE_TIER_INDEX = 0; // Small Office (3 desks)

/** Single pre-built employee on the starting team. */
export const STARTER_EMPLOYEES = [
  {
    name: 'Alex Morgan',
    skills: [{ skill: SKILLS.FRONTEND_DEVELOPMENT, level: 1 }],
    salary: 50,
  },
];

/** Four pre-built candidates available at the start (frontend-only, matching initial research). */
export const STARTER_CANDIDATES = [
  {
    name: 'Jordan Patel',
    skills: [{ skill: SKILLS.FRONTEND_DEVELOPMENT, level: 3 }],
    salary: 80,
  },
  {
    name: 'Sam Williams',
    skills: [{ skill: SKILLS.FRONTEND_DEVELOPMENT, level: 2 }],
    salary: 60,
  },
  {
    name: 'Casey Lee',
    skills: [{ skill: SKILLS.FRONTEND_DEVELOPMENT, level: 4 }],
    salary: 100,
  },
  {
    name: 'Morgan Garcia',
    skills: [{ skill: SKILLS.FRONTEND_DEVELOPMENT, level: 2 }],
    salary: 60,
  },
];
