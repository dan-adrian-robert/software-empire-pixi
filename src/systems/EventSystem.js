/**
 * EventSystem
 *
 * Pure logic layer for company events (Hackathon, Software Presentation, etc.).
 * Reads and writes company.scheduledEvents.
 * No Pixi, no UI — only plain data mutation and bus emissions.
 *
 * Cooldown rule:
 *   Default gap between events: DEFAULT_COOLDOWN days (10).
 *   Each event_frequency research node unlocked reduces the gap by
 *   COOLDOWN_REDUCTION_PER_NODE (2), down to a minimum of 6 days.
 */
import { GameConfig } from '../config.js';
import { EVENT_TYPE_MAP } from '../data/eventTypes.js';

const { DEFAULT_COOLDOWN, COOLDOWN_REDUCTION_PER_NODE } = GameConfig.events;

export class EventSystem {
  /**
   * Effective cooldown based on unlocked research.
   * @param {string[]} unlockedResearch
   * @returns {number}
   */
  getEventCooldown(unlockedResearch) {
    const nodes = ['event_frequency_1', 'event_frequency_2'].filter(
      (id) => unlockedResearch?.includes(id),
    ).length;
    return DEFAULT_COOLDOWN - nodes * COOLDOWN_REDUCTION_PER_NODE;
  }

  /**
   * Whether a given future day is eligible for a new event.
   * Rules:
   *   1. day must be strictly in the future (> company.day)
   *   2. no event is already scheduled on that exact day
   *   3. all existing scheduled events are at least cooldown days away
   *
   * @param {import('../state/Company.js').Company} company
   * @param {number} day
   * @returns {boolean}
   */
  isEligibleDay(company, day) {
    if (day <= company.day) return false;
    const cooldown = this.getEventCooldown(company.unlockedResearch);
    for (const ev of company.scheduledEvents ?? []) {
      if (Math.abs(ev.day - day) < cooldown) return false;
    }
    return true;
  }

  /**
   * Schedule a new event on the given day.
   * Silently ignored if the day is already occupied.
   * @param {import('../state/Company.js').Company} company
   * @param {number} day
   * @param {string} eventTypeId
   */
  scheduleEvent(company, day, eventTypeId) {
    if (company.scheduledEvents.some((e) => e.day === day)) return;
    company.scheduledEvents.push({ day, eventTypeId });
  }

  /**
   * Remove a scheduled event on the given day.
   * @param {import('../state/Company.js').Company} company
   * @param {number} day
   */
  removeEvent(company, day) {
    company.scheduledEvents = company.scheduledEvents.filter((e) => e.day !== day);
  }

  /**
   * Find the scheduled event for a given day, or null.
   * @param {import('../state/Company.js').Company} company
   * @param {number} day
   * @returns {{day: number, eventTypeId: string}|null}
   */
  getEventForDay(company, day) {
    return company.scheduledEvents?.find((e) => e.day === day) ?? null;
  }

  /**
   * Apply end-of-event-day rewards:
   *   - Every employee gains +1 pendingPotentialPoints.
   *   - Emits an event:completed notification.
   *
   * Called from Simulation._wireDayCycle on day:ended when today has an event.
   *
   * @param {import('../state/Company.js').Company} company
   * @param {import('../utils/EventBus.js').EventBus} bus
   */
  applyEventDayOutcome(company, bus) {
    const ev = this.getEventForDay(company, company.day);
    const typeName = ev ? (EVENT_TYPE_MAP[ev.eventTypeId]?.name ?? 'Event') : 'Event';

    for (const emp of company.employees) {
      emp.pendingPotentialPoints = (emp.pendingPotentialPoints ?? 0) + 1;
    }

    bus.emit('notification:add', {
      text: `${typeName} completed! All employees gained +1 potential point.`,
      type: 'success',
    });
    bus.emit('event:completed', { company, eventTypeId: ev?.eventTypeId });
  }
}
