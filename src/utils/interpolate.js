/**
 * Replaces {key} placeholders in a translation string with values.
 *
 * @example
 *   interpolate('Hello {name}, you have {n} message{plural}.', {
 *     name: 'Alice', n: 3, plural: 's',
 *   })
 *   // → 'Hello Alice, you have 3 messages.'
 *
 * @param {string} template
 * @param {Record<string, string|number>} values
 * @returns {string}
 */
export function interpolate(template, values) {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  )
}
