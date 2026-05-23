/**
 * Starter seed constants for a new game.
 * Used by Simulation.reset() / createCompany() to initialise the Company state.
 *
 * Employee and candidate data is no longer stored here — it is generated at
 * runtime by EmployeeGenerator using economyBalance.json and employeeCatalog.json.
 */
export const STARTER_COMPANY_NAME = 'TechNova Studios';
export const STARTER_MONEY = 1000;
export const STARTER_DAY = 1;
export const STARTER_MAX_ACTIVE_PROJECTS = 3;
export const STARTER_OFFICE_TIER_INDEX = 0; // Small Office (3 desks)
