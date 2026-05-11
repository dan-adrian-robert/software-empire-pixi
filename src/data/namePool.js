/**
 * Name pool for procedural employee and candidate generation.
 */
export const FIRST_NAMES = [
  'Alex', 'Jordan', 'Morgan', 'Taylor', 'Casey',
  'Riley', 'Avery', 'Quinn', 'Skyler', 'Reese',
  'Jamie', 'Logan', 'Peyton', 'Drew', 'Sam',
  'Blake', 'Cameron', 'Dana', 'Frankie', 'Harper',
  'Jesse', 'Kennedy', 'Lane', 'Micah', 'Nico',
  'Ollie', 'Parker', 'Robin', 'Sage', 'Tatum',
];

export const LAST_NAMES = [
  'Morgan', 'Chen', 'Patel', 'Williams', 'Johnson',
  'Lee', 'Garcia', 'Martinez', 'Brown', 'Davis',
  'Wilson', 'Anderson', 'Taylor', 'Thomas', 'Jackson',
  'White', 'Harris', 'Martin', 'Thompson', 'Young',
  'Robinson', 'Walker', 'Hall', 'Allen', 'King',
  'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill',
];

/**
 * Returns a random full name from the pools.
 * @param {() => number} rng  - random function returning [0,1)
 */
export function randomName(rng = Math.random) {
  const first = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
  return `${first} ${last}`;
}
