/**
 * ProductivitySystem
 *
 * Manages the two inputs to Total_Productivity:
 *   - baseProductivity: a per-employee innate trait [0.85, 1.05] (set at creation)
 *   - weatherModifier:  a global daily multiplier from one of 5 weather states
 *
 * Formula applied by ProjectSystem each frame:
 *   contribution = Base_SP × baseProductivity × weatherModifier
 *
 * Call rollDailyWeather(company) once per day (at day:ended) to pick a new
 * weather state for the coming day.
 */
import { WEATHER_TYPES } from '../data/weatherTypes.js';

export class ProductivitySystem {
  /**
   * Pick a uniformly random weather state and store it on the company.
   * @param {import('../state/Company.js').Company} company
   */
  rollDailyWeather(company) {
    const idx = Math.floor(Math.random() * WEATHER_TYPES.length);
    company.currentWeather = WEATHER_TYPES[idx];
  }

  /**
   * Compute the combined productivity multiplier for a single employee on
   * the current day.
   *
   * @param {import('../state/Employee.js').Employee} employee
   * @param {import('../state/Company.js').Company} company
   * @returns {number}  Multiplier applied to raw story-point output.
   */
  getTotalProductivity(employee, company) {
    const weatherMod = company.currentWeather?.modifier ?? 1;
    return employee.baseProductivity * weatherMod;
  }
}
