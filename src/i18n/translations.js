import fr from './locales/fr'
import en from './locales/en'
import de from './locales/de'
import it from './locales/it'
import es from './locales/es'

/**
 * Translation registry. Each locale is a flat key→string map kept in
 * `src/i18n/locales/<lang>.js`. The SettingsContext `t()` function falls
 * back to French when a key is missing in the active language.
 */
const translations = { fr, en, de, it, es }

export default translations
