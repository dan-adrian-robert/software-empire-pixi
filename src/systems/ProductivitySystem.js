/**
 * ProductivitySystem
 *
 * Computes the combined productivity multiplier applied to each employee's SP
 * output each frame, and rolls the daily weather state.
 *
 * Canonical formula and modifier model: docs/PRODUCTIVITY.md
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
