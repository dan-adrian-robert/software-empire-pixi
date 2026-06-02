/**
 * Communication topic catalog.
 *
 * Defines the 4 categories × 6 topics used in the Communication tab.
 * Scores are stored on the employee as { [topicId]: number } (1–100).
 */

export const COMMUNICATION_CATEGORIES = [
  {
    id:     'society',
    label:  'SOCIETY',
    topics: [
      { id: 'politics',       label: 'Politics' },
      { id: 'religion',       label: 'Religion' },
      { id: 'environment',    label: 'Environment' },
      { id: 'education',      label: 'Education' },
      { id: 'socialEquality', label: 'Social Equality' },
      { id: 'privacyRights',  label: 'Privacy Rights' },
    ],
  },
  {
    id:     'technology',
    label:  'TECHNOLOGY',
    topics: [
      { id: 'aiAutomation',  label: 'AI & Automation' },
      { id: 'openSource',    label: 'Open Source' },
      { id: 'cybersecurity', label: 'Cybersecurity' },
      { id: 'innovation',    label: 'Innovation' },
      { id: 'cryptoWeb3',    label: 'Crypto / Web3' },
      { id: 'spaceTech',     label: 'Space Tech' },
    ],
  },
  {
    id:     'lifestyle',
    label:  'LIFESTYLE',
    topics: [
      { id: 'gaming',    label: 'Gaming' },
      { id: 'fitness',   label: 'Fitness' },
      { id: 'travel',    label: 'Travel' },
      { id: 'food',      label: 'Food' },
      { id: 'moviesTv',  label: 'Movies & TV' },
      { id: 'music',     label: 'Music' },
    ],
  },
  {
    id:     'workPhilosophy',
    label:  'WORK PHILOSOPHY',
    topics: [
      { id: 'ambition',       label: 'Ambition' },
      { id: 'workLifeBalance', label: 'Work-Life Balance' },
      { id: 'competition',    label: 'Competition' },
      { id: 'teamwork',       label: 'Teamwork' },
      { id: 'riskTaking',     label: 'Risk Taking' },
      { id: 'authority',      label: 'Authority' },
    ],
  },
];

/** Emoji icon per category id. */
export const CATEGORY_ICONS = {
  society:       '🏛️',
  technology:    '💻',
  lifestyle:     '🎮',
  workPhilosophy: '🧭',
};

/** Emoji icon per topic id. */
export const TOPIC_ICONS = {
  // Society
  politics:       '🗳️',
  religion:       '⛪',
  environment:    '🌿',
  education:      '🎓',
  socialEquality: '⚖️',
  privacyRights:  '🔒',
  // Technology
  aiAutomation:  '🤖',
  openSource:    '</>',
  cybersecurity: '🛡️',
  innovation:    '💡',
  cryptoWeb3:    '₿',
  spaceTech:     '🚀',
  // Lifestyle
  gaming:   '🎮',
  fitness:  '🏋️',
  travel:   '✈️',
  food:     '🍴',
  moviesTv: '🎬',
  music:    '🎵',
  // Work Philosophy
  ambition:        '📈',
  workLifeBalance: '⚖️',
  competition:     '🏆',
  teamwork:        '🤝',
  riskTaking:      '🎲',
  authority:       '👔',
};

/** Category display colors (match the mockup accent tones). */
export const CATEGORY_COLORS = {
  society:        0x4a9eff,
  technology:     0xf59e0b,
  lifestyle:      0xa855f7,
  workPhilosophy: 0xf97316,
};

/** Flat ordered list of all topic ids — useful for score iteration. */
export const ALL_TOPIC_IDS = COMMUNICATION_CATEGORIES.flatMap((c) => c.topics.map((t) => t.id));
