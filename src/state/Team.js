/**
 * Team state factory.
 *
 * A Team is created automatically when a Team Lead is hired and dissolved
 * when the Team Lead is fired. Members are programmer employee ids.
 */
import { nanoid } from 'nanoid';

/** Pre-defined team name pool. Names are picked randomly at creation. */
const TEAM_NAMES = [
  'Team Alpha',
  'Team Beta',
  'Team Gamma',
  'Team Delta',
  'Team Phoenix',
  'Team Nexus',
  'Team Apex',
  'Team Sigma',
  'Team Vortex',
  'Team Eclipse',
  'Team Horizon',
  'Team Zenith',
];

/**
 * Pick a random team name from the pool.
 * @param {() => number} [rng]
 * @returns {string}
 */
export function randomTeamName(rng = Math.random) {
  return TEAM_NAMES[Math.floor(rng() * TEAM_NAMES.length)];
}

/**
 * Create a new Team object.
 *
 * @param {object} opts
 * @param {string}   opts.leadId   Employee id of the Team Lead.
 * @param {string}  [opts.name]    Optional team name; random if omitted.
 * @param {() => number} [opts.rng]
 * @returns {Team}
 */
export function createTeam({ leadId, name, rng = Math.random } = {}) {
  return {
    id: nanoid(),
    name: name ?? randomTeamName(rng),
    leadId,
    /** @type {string[]} */
    memberIds: [],
  };
}

/**
 * @typedef {object} Team
 * @property {string}   id
 * @property {string}   name
 * @property {string}   leadId
 * @property {string[]} memberIds
 */
