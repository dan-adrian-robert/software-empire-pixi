/**
 * ScheduleSystem
 *
 * Owns the 15-minute slot lifecycle:
 *   1. Derives the current slot from dayProgress.
 *   2. Sets every employee's scheduleState.
 *   3. On slot transitions, fires PERIOD_END for the outgoing activity and
 *      PERIOD_START for the incoming one.
 *
 * The scene calls tick() each frame and uses the returned flushTotals to
 * drive floating "+pts" feedback (WORK only).
 */
import { getActivityForSlot } from '../data/scheduleActivities.js';
import {
  PERIOD_END_HANDLERS,
  PERIOD_START_HANDLERS,
} from './schedule/activityHandlers.js';

export class ScheduleSystem {
  constructor() {
    /**
     * The 15-minute slot index from the previous frame.
     * -1 means "not yet seen a slot" (first frame of the day).
     * @type {number}
     */
    this.prevSlot = -1;
  }

  /**
   * Advance the schedule for one frame.
   *
   * @param {import('../state/Company.js').Company} company
   * @param {number} dayProgress  0..1 from TimeSystem.
   * @param {import('./Simulation.js').Simulation} sim
   * @returns {{
   *   slot: number,
   *   activity: string,
   *   flushTotals: Map<number,number>|null
   * }}
   */
  tick(company, dayProgress, sim) {
    // Company event days suspend the normal 15-minute activity cycle entirely.
    const todayEvent = company.scheduledEvents?.find((e) => e.day === company.day);
    if (todayEvent) {
      company.employees.forEach((e) => { e.scheduleState = 'EVENT'; });
      // Reset prevSlot so the normal cycle restarts cleanly the next (non-event) day.
      this.prevSlot = -1;
      return { slot: -1, activity: 'EVENT', flushTotals: null };
    }

    const slot = Math.floor((dayProgress * company.schedule.workHours * 60) / 15);
    const activity = getActivityForSlot(slot);

    company.employees.forEach((e) => { e.scheduleState = activity; });

    let flushTotals = null;

    if (slot !== this.prevSlot) {
      // End the outgoing activity.
      if (this.prevSlot >= 0) {
        const endedActivity = getActivityForSlot(this.prevSlot);
        const result = PERIOD_END_HANDLERS[endedActivity]?.(company, sim);
        if (result !== undefined) flushTotals = result;
      }
      // Start the incoming activity.
      PERIOD_START_HANDLERS[activity]?.(company, sim);
    }

    this.prevSlot = slot;
    return { slot, activity, flushTotals };
  }

  /** Reset to initial state at the start of each new day. */
  resetDay() {
    this.prevSlot = -1;
  }
}
