/**
 * Economy balance helpers.
 *
 * All formulas are derived from docs/PLOT.md:
 *   - Daily SP  = skillSpTable[level] × workPeriodsPerDay
 *   - Salary    = sum(dailySP per skill) × spValue × salaryRatio   (normal market)
 *   - Payout    = totalSp × spValue                                (normal market)
 *   - Insurance = totalSp × insuranceSpFactor
 *   - Timing    = ceil(totalSp / teamOutput)  → onTrack ≈ spMultiplier days by design
 *
 * These are pure functions; no side effects and no imports from game state.
 */
import balance from '../data/economyBalance.json';

const {
  spValue,
  salaryRatio,
  workPeriodsPerDay,
  skillSpTable,
  insuranceSpFactor,
  projectGeneration: { milestoneMinOnTrackDays },
  projectDifficulty,
} = balance;

// Pre-build the weighted difficulty pool once at module load.
const _difficultyPool = Object.entries(projectDifficulty).flatMap(([key, cfg]) =>
  Array.from({ length: cfg.weight }, () => key),
);

/**
 * Story points produced by one skill per full in-game day.
 * @param {number} level  Skill level 1–10.
 * @returns {number}
 */
export function dailySpForSkill(level) {
  return (skillSpTable[level] ?? 0) * workPeriodsPerDay;
}

/**
 * Median daily salary for an employee given their skills.
 * Rounded to the nearest $10 to avoid odd cents.
 * @param {Array<{skill: string, level: number}>} skills
 * @returns {number}
 */
export function computeMedianSalary(skills) {
  const totalDailySp = skills.reduce((sum, sk) => sum + dailySpForSkill(sk.level), 0);
  return Math.round((totalDailySp * spValue * salaryRatio) / 10) * 10;
}

/**
 * Median base payout for a project given its total SP requirement.
 * Normal market conditions (multiplier 1.0).
 * @param {number} totalSp  Sum of all requirement points.
 * @returns {number}
 */
export function computeMedianPayout(totalSp) {
  return totalSp * spValue;
}

/**
 * Derive milestone deadlines (in elapsed days) and insurance cost from total SP and
 * the team's raw daily output. Deadlines are expressed as multiples of team throughput,
 * so Common (~1.2× output) takes ~1–2 days on track and Rare (~2.0×) takes ~2 days.
 *
 * @param {number} totalSp     Sum of all requirement points.
 * @param {number} teamOutput  Raw SP/day produced by the team (from computeTeamOutput).
 * @returns {{ milestones: { ahead: number, onTrack: number, delayed: number, critical: number }, insurance: number }}
 */
export function computeProjectTiming(totalSp, teamOutput) {
  const effectiveOutput = Math.max(1, teamOutput);
  const onTrack = Math.max(
    milestoneMinOnTrackDays,
    Math.ceil(totalSp / effectiveOutput),
  );
  return {
    milestones: {
      ahead:    Math.max(1, onTrack - 2),
      onTrack,
      delayed:  onTrack + 2,
      critical: onTrack + 4,
    },
    insurance: Math.round(totalSp * insuranceSpFactor),
  };
}

/**
 * Inclusive random integer in [min, max].
 * @param {number} min
 * @param {number} max
 * @param {() => number} rng  Math.random-compatible function.
 * @returns {number}
 */
export function randomInt(min, max, rng = Math.random) {
  return Math.floor(rng() * (max - min + 1)) + min;
}

/**
 * Total raw SP produced by the entire team per in-game day.
 * Falls back to 16 (one Lv1 employee) when the team is empty so project
 * generation always produces non-zero SP values.
 *
 * @param {Array<{skills: Array<{skill: string, level: number}>}>} employees
 * @returns {number}
 */
export function computeTeamOutput(employees) {
  if (!employees || employees.length === 0) return dailySpForSkill(1);
  const total = employees.reduce(
    (sum, emp) => sum + emp.skills.reduce((s, sk) => s + dailySpForSkill(sk.level), 0),
    0,
  );
  return total > 0 ? total : dailySpForSkill(1);
}

/**
 * Pick a difficulty key ('common' | 'uncommon' | 'rare') using weighted
 * random selection. Weights are defined in economyBalance.json.
 *
 * @param {() => number} [rng]
 * @returns {'common' | 'uncommon' | 'rare'}
 */
export function pickDifficulty(rng = Math.random) {
  return _difficultyPool[Math.floor(rng() * _difficultyPool.length)];
}

/**
 * Retrieve the config object for a given difficulty key.
 * @param {'common' | 'uncommon' | 'rare'} key
 * @returns {{ label: string, spMultiplier: number, weight: number }}
 */
export function getDifficultyConfig(key) {
  return projectDifficulty[key];
}
