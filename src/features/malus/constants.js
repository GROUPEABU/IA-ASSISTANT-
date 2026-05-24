/**
 * Shared constants for the CO₂ malus calculator.
 * Kept colocated with the feature for discoverability.
 */

export const SEVERITY_COLOR = {
  none:      '#50E5E5',
  low:       '#A5F3FC',
  medium:    '#facc15',
  high:      '#fb923c',
  very_high: '#f87171',
}

export const SEVERITY_LABEL = {
  none:      'Aucun',
  low:       'Faible',
  medium:    'Modéré',
  high:      'Élevé',
  very_high: 'Très élevé',
}

export const sevColor = (s) => SEVERITY_COLOR[s] || '#94a3b8'
export const sevLabel = (s) => SEVERITY_LABEL[s] || '—'

export const WEIGHT_PRESETS = [1200, 1450, 1600, 1800, 1950, 2200, 2500, 2800]

export const DATE_PRESETS = [
  { d: '2023-06-15', l: '2023' },     { d: '2024-06-15', l: '2024' },
  { d: '2025-02-15', l: 'Fév 25' },   { d: '2025-03-12', l: 'Mars 25' },
  { d: '2025-10-01', l: 'Oct 25' },   { d: '2026-01-15', l: 'Janv 26' },
  { d: '2026-07-01', l: 'Juil 26' },  { d: '2026-09-15', l: 'Sept 26' },
]

export const DATE_YEARS = [2023, 2024, 2025, 2026, 2027, 2028, 2029, 2030]

export const DATE_MONTHS = [
  { v: '01', l: 'Janv.' }, { v: '02', l: 'Fév.' },  { v: '03', l: 'Mars' },
  { v: '04', l: 'Avr.' },  { v: '05', l: 'Mai' },   { v: '06', l: 'Juin' },
  { v: '07', l: 'Juil.' }, { v: '08', l: 'Août' },  { v: '09', l: 'Sept.' },
  { v: '10', l: 'Oct.' },  { v: '11', l: 'Nov.' },  { v: '12', l: 'Déc.' },
]

export const SELECT_STYLE = {
  background: 'rgba(80,229,229,0.05)',
  borderColor: 'rgba(80,229,229,0.2)',
  color: '#50E5E5',
  fontFamily: 'inherit',
}

/**
 * Returns the number of days in a given month.
 * Uses JavaScript Date's overflow behaviour: day 0 of next month = last day of current month.
 */
export function getDaysInMonth(year, month) {
  return new Date(parseInt(year, 10), parseInt(month, 10), 0).getDate()
}
