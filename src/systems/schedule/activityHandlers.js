/**
 * Schedule activity handlers.
 *
 * Each activity can respond to two events in the 15-minute slot lifecycle:
 *
 *   PERIOD_END_HANDLERS   — fired when the slot LEAVES this activity.
 *                           Used by WORK to flush buffered story points.
 *
 *   PERIOD_START_HANDLERS — fired when the slot ENTERS this activity.
 *                           Used by TALK to run the pairing algorithm.
 *
 * Handler signature:
 *   (company: Company, sim: Simulation) => any
 *
 * The WORK end-handler returns the Map<employeeIdx, points> from
 * flushWorkPeriod so OfficeScene can drive the floating "+pts" UI.
 */
import { ScheduleActivity } from '../../data/scheduleActivities.js';
import { recordSpPeriod } from '../../state/Company.js';
import { ALL_TOPIC_IDS, COMMUNICATION_CATEGORIES } from '../../data/communicationTopics.js';
import { applyTalkInteraction } from '../../state/relationships.js';

/** Flat id → label map built once at module load. */
const TOPIC_LABEL_MAP = Object.fromEntries(
  COMMUNICATION_CATEGORIES.flatMap((c) => c.topics.map((t) => [t.id, t.label])),
);

const MAX_COMM_LOG = 50;

// ── WORK period-end handler ───────────────────────────────────────────────────

function onWorkPeriodEnd(company, sim) {
  const totals = sim.projects.flushWorkPeriod(company, sim.teamSystem);

  let periodTotal = 0;
  totals.forEach((pts) => { periodTotal += pts; });
  recordSpPeriod(company, periodTotal);

  sim.pmAssignment.runAfterWorkPeriod(company, sim);

  return totals;
}

// ── TALK period-start handler ─────────────────────────────────────────────────

function onTalkPeriodStart(company /*, sim */) {
  const employees = company.employees;
  if (employees.length < 2) return;

  // Fisher-Yates shuffle of employee array indices.
  const indices = employees.map((_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // Pair consecutive shuffled indices; last odd employee is unpaired.
  for (let i = 0; i < indices.length - 1; i += 2) {
    const empA = employees[indices[i]];
    const empB = employees[indices[i + 1]];
    const topicId = ALL_TOPIC_IDS[Math.floor(Math.random() * ALL_TOPIC_IDS.length)];
    const { delta, friendship } = applyTalkInteraction(company, empA, empB, topicId);

    // Record to the communication log (newest first, capped).
    company.communicationLog.unshift({
      day:        company.day,
      empAName:   empA.name.split(' ')[0],
      empBName:   empB.name.split(' ')[0],
      topicId,
      topicLabel: TOPIC_LABEL_MAP[topicId] ?? topicId,
      delta:      Math.round(delta * 10) / 10,
      friendship: Math.round(friendship * 10) / 10,
    });
  }

  // Keep the log bounded.
  if (company.communicationLog.length > MAX_COMM_LOG) {
    company.communicationLog.length = MAX_COMM_LOG;
  }
}

// ── BATHROOM_BREAK handler (stub) ─────────────────────────────────────────────

function onBathroomBreakPeriodStart(/* company, sim */) {
  // Reserved for future needs/morale gameplay.
}

// ── Handler maps ──────────────────────────────────────────────────────────────

/**
 * Handlers fired when a slot ends (i.e., the activity is leaving).
 * Return values are forwarded to the caller (ScheduleSystem.tick).
 * @type {{ [activity: string]: (company: any, sim: any) => any }}
 */
export const PERIOD_END_HANDLERS = {
  [ScheduleActivity.WORK]: onWorkPeriodEnd,
};

/**
 * Handlers fired when a slot begins (i.e., the activity is entering).
 * @type {{ [activity: string]: (company: any, sim: any) => void }}
 */
export const PERIOD_START_HANDLERS = {
  [ScheduleActivity.TALK]:           onTalkPeriodStart,
  [ScheduleActivity.BATHROOM_BREAK]: onBathroomBreakPeriodStart,
};
