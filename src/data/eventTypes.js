/**
 * Company event type definitions.
 * All events share the same mechanic outcome (+1 potential point per employee)
 * but differ in flavour and description.
 */
export const EVENT_TYPES = [
  {
    id: 'hackathon',
    name: 'Hackathon',
    icon: '💻',
    description: 'Day-long coding sprint. Employees skip normal work to collaborate and innovate.',
  },
  {
    id: 'software_presentation',
    name: 'Software Presentation',
    icon: '📊',
    description: 'Your team showcases their work to stakeholders and the wider industry.',
  },
];

/** Quick O(1) lookup by event type id. */
export const EVENT_TYPE_MAP = Object.fromEntries(EVENT_TYPES.map((e) => [e.id, e]));
