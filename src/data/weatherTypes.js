/**
 * Weather type definitions for the daily productivity modifier.
 *
 * Five equally-probable states; modifier values are the source of truth for
 * the weather factor in Total_Productivity (see docs/PRODUCTIVITY.md §3).
 *
 * sentiment: 'bad' | 'neutral' | 'good'
 */
export const WEATHER_TYPES = Object.freeze([
  { id: 'very_bad',  label: 'Stormy',   modifier: 0.950, sentiment: 'bad'     },
  { id: 'bad',       label: 'Overcast', modifier: 0.975, sentiment: 'bad'     },
  { id: 'neutral',   label: 'Cloudy',   modifier: 1.000, sentiment: 'neutral' },
  { id: 'good',      label: 'Sunny',    modifier: 1.025, sentiment: 'good'    },
  { id: 'very_good', label: 'Perfect',  modifier: 1.050, sentiment: 'good'    },
]);
