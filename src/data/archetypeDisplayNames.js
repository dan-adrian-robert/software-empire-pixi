/**
 * Display name lookup for employee archetype combinations.
 *
 * Structure: DISPLAY_NAMES[primary][secondary] → string
 * Each primary also has a `_default` fallback.
 *
 * Usage:
 *   getDisplayName(archetypes)
 *     → DISPLAY_NAMES[primary][secondary] ?? DISPLAY_NAMES[primary]._default
 */

export const DISPLAY_NAMES = {
  creator: {
    ruler:     'Structured Innovator',
    caregiver: 'Nurturing Creator',
    innocent:  'Idealistic Designer',
    sage:      'Creative Thinker',
    explorer:  'Visionary Pioneer',
    outlaw:    'Disruptive Builder',
    magician:  'Transformative Creator',
    hero:      'Bold Innovator',
    everyman:  'Accessible Creator',
    jester:    'Playful Designer',
    lover:     'Expressive Creator',
    _default:  'The Creator',
  },
  ruler: {
    creator:   'Commanding Visionary',
    caregiver: 'Benevolent Leader',
    innocent:  'Principled Authority',
    sage:      'Strategic Commander',
    explorer:  'Pioneering Executive',
    outlaw:    'Iron-Willed Director',
    magician:  'Influential Strategist',
    hero:      'Driven Leader',
    everyman:  'Grounded Executive',
    jester:    'Charismatic Director',
    lover:     'Passionate Authority',
    _default:  'The Ruler',
  },
  caregiver: {
    creator:   'Empowering Mentor',
    ruler:     'Protective Leader',
    innocent:  'Gentle Guardian',
    sage:      'Wise Counsellor',
    explorer:  'Nurturing Guide',
    outlaw:    'Fierce Protector',
    magician:  'Healing Catalyst',
    hero:      'Courageous Supporter',
    everyman:  'Community Caregiver',
    jester:    'Warmhearted Companion',
    lover:     'Devoted Nurturer',
    _default:  'The Caregiver',
  },
  innocent: {
    creator:   'Pure Idealist',
    ruler:     'Hopeful Follower',
    caregiver: 'Trusting Soul',
    sage:      'Bright Learner',
    explorer:  'Curious Dreamer',
    outlaw:    'Naive Rebel',
    magician:  'Believing Optimist',
    hero:      'Earnest Champion',
    everyman:  'Simple Heart',
    jester:    'Joyful Innocent',
    lover:     'Tender Spirit',
    _default:  'The Innocent',
  },
  sage: {
    creator:   'Creative Analyst',
    ruler:     'Methodical Advisor',
    caregiver: 'Thoughtful Mentor',
    innocent:  'Enlightened Teacher',
    explorer:  'Curious Scholar',
    outlaw:    'Radical Thinker',
    magician:  'Arcane Analyst',
    hero:      'Strategic Challenger',
    everyman:  'Practical Philosopher',
    jester:    'Witty Sage',
    lover:     'Romantic Intellectual',
    _default:  'The Sage',
  },
  explorer: {
    creator:   'Creative Adventurer',
    ruler:     'Trailblazing Director',
    caregiver: 'Compassionate Scout',
    innocent:  'Wondrous Wanderer',
    sage:      'Analytical Explorer',
    outlaw:    'Renegade Trailblazer',
    magician:  'Mystical Wanderer',
    hero:      'Daring Pioneer',
    everyman:  'Accessible Adventurer',
    jester:    'Playful Nomad',
    lover:     'Passionate Wanderer',
    _default:  'The Explorer',
  },
  outlaw: {
    creator:   'Revolutionary Designer',
    ruler:     'Defiant Challenger',
    caregiver: 'Fierce Advocate',
    innocent:  'Misunderstood Rebel',
    sage:      'Radical Philosopher',
    explorer:  'Reckless Pioneer',
    magician:  'Dark Catalyst',
    hero:      'Unstoppable Force',
    everyman:  'Street-Smart Rebel',
    jester:    'Chaotic Free Spirit',
    lover:     'Passionate Outlaw',
    _default:  'The Outlaw',
  },
  magician: {
    creator:   'Inventive Alchemist',
    ruler:     'Commanding Transformer',
    caregiver: 'Healing Magician',
    innocent:  'Enchanted Dreamer',
    sage:      'Scholarly Sorcerer',
    explorer:  'Mystical Pathfinder',
    outlaw:    'Chaos Weaver',
    hero:      'Empowering Champion',
    everyman:  'Everyday Transformer',
    jester:    'Trickster Mage',
    lover:     'Enchanting Romantic',
    _default:  'The Magician',
  },
  hero: {
    creator:   'Inspired Champion',
    ruler:     'Commanding Hero',
    caregiver: 'Heroic Protector',
    innocent:  'Pure-Hearted Warrior',
    sage:      'Wise Warrior',
    explorer:  'Adventurous Hero',
    outlaw:    'Rebel Champion',
    magician:  'Transcendent Hero',
    everyman:  'Everyday Hero',
    jester:    'Daring Performer',
    lover:     'Devoted Fighter',
    _default:  'The Hero',
  },
  everyman: {
    creator:   'Creative Everyman',
    ruler:     'Reliable Team Player',
    caregiver: 'Caring Colleague',
    innocent:  'Wholesome Friend',
    sage:      'Thoughtful Everyman',
    explorer:  'Curious Companion',
    outlaw:    'Grounded Rebel',
    magician:  'Practical Dreamer',
    hero:      'Dependable Champion',
    jester:    'Friendly Jokester',
    lover:     'Warm-Hearted Friend',
    _default:  'The Everyman',
  },
  jester: {
    creator:   'Comic Creator',
    ruler:     'Playful Provocateur',
    caregiver: 'Cheerful Entertainer',
    innocent:  'Innocent Joker',
    sage:      'Sharp-Witted Comedian',
    explorer:  'Adventurous Jokester',
    outlaw:    'Anarchic Clown',
    magician:  'Trickster Illusionist',
    hero:      'Comic Relief Hero',
    everyman:  'Relatable Funny Guy',
    lover:     'Romantic Joker',
    _default:  'The Jester',
  },
  lover: {
    creator:   'Inspired Romantic',
    ruler:     'Devoted Partner',
    caregiver: 'Tender Nurturer',
    innocent:  'Pure-Hearted Romantic',
    sage:      'Thoughtful Companion',
    explorer:  'Passionate Wanderer',
    outlaw:    'Forbidden Romantic',
    magician:  'Enchanting Lover',
    hero:      'Heroic Romantic',
    everyman:  'Devoted Companion',
    jester:    'Flirtatious Dreamer',
    _default:  'The Lover',
  },
};

/**
 * Get the display name for an employee's archetype profile.
 *
 * @param {{ [id: string]: number }} archetypes  e.g. { creator: 60, sage: 25, explorer: 15 }
 * @returns {string}
 */
export function getDisplayName(archetypes) {
  if (!archetypes || Object.keys(archetypes).length === 0) return 'Unknown';

  // Sort descending by weight to get primary and secondary
  const sorted = Object.entries(archetypes).sort((a, b) => b[1] - a[1]);
  const primary   = sorted[0]?.[0];
  const secondary = sorted[1]?.[0];

  if (!primary) return 'Unknown';

  const table = DISPLAY_NAMES[primary];
  if (!table) return primary.charAt(0).toUpperCase() + primary.slice(1);

  return table[secondary] ?? table._default ?? primary;
}
