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
import { archetypeCompat, ARCHETYPES, CATEGORY_EFFECTS } from '../data/archetypes.js';

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

  // ── Archetype / Chemistry methods ──────────────────────────────────────────

  /**
   * Calculate raw pair compatibility between two employees.
   * For each combination of (archA in empA) × (archB in empB), add COMPAT[a][b].
   * Returns a raw score in [-45, +45].
   *
   * @param {import('../state/Employee.js').Employee} empA
   * @param {import('../state/Employee.js').Employee} empB
   * @returns {number}
   */
  pairCompatibility(empA, empB) {
    const archsA = Object.keys(empA.archetypes ?? {});
    const archsB = Object.keys(empB.archetypes ?? {});
    if (archsA.length === 0 || archsB.length === 0) return 0;

    let score = 0;
    for (const a of archsA) {
      for (const b of archsB) {
        score += archetypeCompat(a, b);
      }
    }
    return score;
  }

  /**
   * Calculate the normalised team compatibility score for a team.
   * Includes the Team Lead and all members.
   * Returns a value in [-100, +100].
   *
   * @param {import('../state/Company.js').Company} company
   * @param {import('../state/Team.js').Team} team
   * @returns {number}
   */
  teamCompatibility(company, team) {
    const lead = this.getTeamLead(company, team);
    const members = team.memberIds
      .map((id) => company.employees.find((e) => e.id === id))
      .filter(Boolean);

    const everyone = lead ? [lead, ...members] : members;
    if (everyone.length < 2) return 50; // single employee — neutral

    let total = 0;
    let pairCount = 0;
    for (let i = 0; i < everyone.length; i++) {
      for (let j = i + 1; j < everyone.length; j++) {
        total += this.pairCompatibility(everyone[i], everyone[j]);
        pairCount += 1;
      }
    }

    const avg = total / pairCount;
    // Normalise from [-45, +45] → [-100, +100] then clamp
    const normalised = (avg / 45) * 100;
    return Math.max(-100, Math.min(100, Math.round(normalised)));
  }

  /**
   * Derive a stress label and modifier from a team compatibility score.
   *
   * @param {number} score  Normalised value in [-100, +100]
   * @returns {{ label: string, modifier: number }}
   */
  teamStressLabel(score) {
    // Map from [-100, +100] to [0, 100] for table lookup
    const shifted = (score + 100) / 2; // 0–100
    if (shifted >= 80) return { label: 'Low Stress',      modifier: -20 };
    if (shifted >= 60) return { label: 'Reduced Stress',  modifier: -10 };
    if (shifted >= 40) return { label: 'Neutral',         modifier:   0 };
    if (shifted >= 20) return { label: 'Elevated Stress', modifier: +10 };
    return                    { label: 'High Stress',     modifier: +20 };
  }

  /**
   * Determine the team effect label based on dominant archetype category.
   * Presence is weighted by each employee's archetype percentages.
   *
   * @param {import('../state/Company.js').Company} company
   * @param {import('../state/Team.js').Team} team
   * @returns {string}
   */
  teamEffect(company, team) {
    const lead = this.getTeamLead(company, team);
    const members = team.memberIds
      .map((id) => company.employees.find((e) => e.id === id))
      .filter(Boolean);

    const everyone = lead ? [lead, ...members] : members;
    if (everyone.length === 0) return 'Balanced Team';

    const categoryTotals = {};
    for (const emp of everyone) {
      for (const [archId, weight] of Object.entries(emp.archetypes ?? {})) {
        const category = ARCHETYPES[archId]?.category;
        if (!category) continue;
        categoryTotals[category] = (categoryTotals[category] ?? 0) + weight;
      }
    }

    if (Object.keys(categoryTotals).length === 0) return 'Balanced Team';

    const sorted = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1]);
    const topWeight   = sorted[0][1];
    const secondWeight = sorted[1]?.[1] ?? 0;

    // Must be strictly dominant (not a tie)
    if (topWeight === secondWeight) return 'Balanced Team';

    return CATEGORY_EFFECTS[sorted[0][0]] ?? 'Balanced Team';
  }
}
