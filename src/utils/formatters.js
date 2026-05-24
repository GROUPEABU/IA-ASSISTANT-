/**
 * Locale-aware formatting helpers (French defaults).
 *
 * For multi-currency support that respects the user's settings, use
 * SettingsContext.formatCurrency() instead of the EUR-only helper here.
 */

const FR_LOCALE = 'fr-FR'

/** @param {number} n @returns {string} e.g. "12 345" */
export const formatNumber = (n) => new Intl.NumberFormat(FR_LOCALE).format(n)

/** @param {number} n @returns {string} e.g. "12,5%" */
export const formatPercent = (n) =>
  new Intl.NumberFormat(FR_LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(n) + '%'

/**
 * EUR-only currency formatter. For multi-currency, prefer useSettings().formatCurrency.
 * @param {number} n @returns {string} e.g. "12 345 €"
 */
export const formatCurrency = (n) =>
  new Intl.NumberFormat(FR_LOCALE, { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n)

/** @param {string|number|Date} d @returns {string} e.g. "12 mars 2025" */
export const formatDate = (d) =>
  new Intl.DateTimeFormat(FR_LOCALE, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(d))
