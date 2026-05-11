/**
 * Office tier definitions.
 * The player starts at tier 0 and upgrades over time.
 */
export const OFFICE_TIERS = [
  {
    id: 'small_office',
    name: 'Small Office',
    desks: 3,
    upgradeCost: 0,
    description: 'A tiny startup space. Room for a small team.',
  },
  {
    id: 'local_office',
    name: 'Local Office',
    desks: 8,
    upgradeCost: 8000,
    description: 'A proper local office with more room to grow.',
  },
  {
    id: 'city_office',
    name: 'City Office',
    desks: 20,
    upgradeCost: 30000,
    description: 'A spacious city office with room for specialists.',
  },
  {
    id: 'national_hq',
    name: 'National HQ',
    desks: 50,
    upgradeCost: 120000,
    description: 'A national headquarters befitting a major company.',
  },
  {
    id: 'international_hq',
    name: 'International HQ',
    desks: 100,
    upgradeCost: 500000,
    description: 'A global headquarters for a tech empire.',
  },
];
