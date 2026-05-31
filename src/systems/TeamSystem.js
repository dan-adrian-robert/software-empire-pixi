/**
 * TeamSystem
 *
 * Manages Team objects in company state:
 *   - Creates a team when a Team Lead is hired.
 *   - Dissolves a team (and clears member assignments) when the lead is fired.
 *   - Provides the EXP multiplier applied during ProjectSystem.flushWorkPeriod.
 *
 * EXP buff formula:  expMultiplier = 1 + teamLead.level * 0.05
 *   Lv 1  → +5%
 *   Lv 5  → +25%
 *   Lv 10 → +50%
 */
import { createTeam } from '../state/Team.js';
import { STAFF_ROLES } from '../data/staffRoles.js';

export class TeamSystem {
  /**
   * Create a team for a newly hired Team Lead and push it onto company.teams.
   *
   * @param {import('../state/Company.js').Company} company
   * @param {import('../state/Employee.js').Employee} lead
   */
  createTeamForLead(company, lead) {
    const team = createTeam({ leadId: lead.id });
    company.teams.push(team);
  }

  /**
   * Dissolve the team whose lead is the fired employee.
   * Member ids are cleared so those employees become unassigned.
   *
   * @param {import('../state/Company.js').Company} company
   * @param {string|number} leadId
   */
  dissolveTeam(company, leadId) {
    company.teams = company.teams.filter((t) => t.leadId !== leadId);
  }

  /**
   * Find the team that an employee belongs to (as a member or lead).
   *
   * @param {import('../state/Company.js').Company} company
   * @param {string|number} employeeId
   * @returns {import('../state/Team.js').Team|null}
   */
  getTeamForEmployee(company, employeeId) {
    return (
      company.teams.find(
        (t) => t.leadId === employeeId || t.memberIds.includes(employeeId),
      ) ?? null
    );
  }

  /**
   * Find the Team Lead employee for a given team.
   *
   * @param {import('../state/Company.js').Company} company
   * @param {import('../state/Team.js').Team} team
   * @returns {import('../state/Employee.js').Employee|null}
   */
  getTeamLead(company, team) {
    return company.employees.find((e) => e.id === team.leadId) ?? null;
  }

  /**
   * EXP gain multiplier for an employee based on their team's lead level.
   * Returns 1.0 if the employee has no team or the team has no lead.
   *
   * @param {import('../state/Company.js').Company} company
   * @param {import('../state/Employee.js').Employee} employee
   * @returns {number}
   */
  expMultiplier(company, employee) {
    if (employee.role === STAFF_ROLES.TEAM_LEAD) return 1;

    const team = this.getTeamForEmployee(company, employee.id);
    if (!team) return 1;

    const lead = this.getTeamLead(company, team);
    if (!lead) return 1;

    return 1 + lead.level * 0.05;
  }

  /**
   * Assign a programmer to a team.
   * Removes the employee from any previous team first.
   *
   * @param {import('../state/Company.js').Company} company
   * @param {string|number} employeeId
   * @param {string} teamId
   */
  assignToTeam(company, employeeId, teamId) {
    // Remove from existing team.
    for (const t of company.teams) {
      t.memberIds = t.memberIds.filter((id) => id !== employeeId);
    }
    const target = company.teams.find((t) => t.id === teamId);
    if (target && !target.memberIds.includes(employeeId)) {
      target.memberIds.push(employeeId);
    }
  }

  /**
   * Remove a programmer from their team.
   *
   * @param {import('../state/Company.js').Company} company
   * @param {string|number} employeeId
   */
  removeFromTeam(company, employeeId) {
    for (const t of company.teams) {
      t.memberIds = t.memberIds.filter((id) => id !== employeeId);
    }
  }
}
