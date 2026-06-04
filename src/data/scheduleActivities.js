/**
 * Schedule activity definitions.
 *
 * Single source of truth for the repeating 15-minute activity cycle.
 * Import ScheduleActivity and SCHEDULE_CYCLE from here instead of
 * using bare string literals throughout the codebase.
 */

export const ScheduleActivity = Object.freeze({
  WORK:           'WORK',
  BATHROOM_BREAK: 'BATHROOM_BREAK',
  TALK:           'TALK',
});

/** Repeating 15-minute activity cycle for every employee. */
export const SCHEDULE_CYCLE = [
  ScheduleActivity.WORK,
  ScheduleActivity.BATHROOM_BREAK,
  ScheduleActivity.WORK,
  ScheduleActivity.TALK,
];

/** Emoji icon per activity. */
export const SCHEDULE_ICONS = {
  [ScheduleActivity.WORK]:           '💻',
  [ScheduleActivity.BATHROOM_BREAK]: '🚻',
  [ScheduleActivity.TALK]:           '💬',
};

/**
 * Returns the activity for a given 15-minute slot index.
 * @param {number} slot
 * @returns {string}
 */
export function getActivityForSlot(slot) {
  return SCHEDULE_CYCLE[slot % SCHEDULE_CYCLE.length];
}
