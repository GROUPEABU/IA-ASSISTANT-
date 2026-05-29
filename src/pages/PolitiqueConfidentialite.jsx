import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { interpolate } from '@/utils/interpolate'

const LOCALE_DATE_MAP = { fr: 'fr-FR', en: 'en-GB', de: 'de-DE', it: 'it-IT', es: 'es-ES' }

export default function PolitiqueConfidentialite() {
  const { t, language } = useSettings()
  const today = new Date().toLocaleDateString(
    LOCALE_DATE_MAP[language] || 'fr-FR',
    { day: 'numeric', month: 'long', year: 'numeric' },
  )

  return (
    <div className="min-h-[100dvh] bg-navy-900 flex flex-col">
      <header className="sticky top-0 z-10 bg-navy-900/95 backdrop-blur border-b border-white/7 px-4 py-3 flex items-center gap-3">
        <Link to="/login" className="text-slate-400 hover:text-white transition" aria-label={t('forgot_back_login')}>
          <ArrowLeft size={16} aria-hidden="true" />
        </Link>
        <h1 className="text-sm font-semibold text-white">{t('legal_privacy')}</h1>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-8">
        <div className="glass-card px-4 py-3 border-cyan-400/20 bg-cyan-400/4">
          <p className="text-xs text-cyan-400">
            <strong>{t('privacy_last_update')} :</strong> {today}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{t('privacy_compliance')}</p>
        </div>

        <Section title={t('privacy_controller_title')}>
          <p className="text-sm text-slate-400 leading-relaxed">
            {interpolate(t('privacy_controller_text'), {
              company: 'Autobuyunion SAS',
              dpo: 'privacy@autobuyunion.eu',
            })}
          </p>
        </Section>

        <Section title={t('privacy_data_title')}>
          <p className="text-sm text-slate-400 leading-relaxed mb-3">{t('privacy_data_intro')}</p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 pr-4 text-slate-400 font-semibold">{t('privacy_col_data')}</th>
                <th className="text-left py-2 pr-4 text-slate-400 font-semibold">{t('privacy_col_purpose')}</th>
                <th className="text-left py-2 text-slate-400 font-semibold">{t('privacy_col_basis')}</th>
              </tr>
            </thead>
            <tbody className="text-slate-400">
              <DataRow data={t('privacy_data_username')}   purpose={t('privacy_purpose_auth')}      basis={t('privacy_basis_contract')} />
              <DataRow data={t('privacy_data_session')}    purpose={t('privacy_purpose_session')}   basis={t('privacy_basis_legitimate')} />
              <DataRow data={t('privacy_data_prefs')}      purpose={t('privacy_purpose_prefs')}     basis={t('privacy_basis_implicit')} />
              <DataRow data={t('privacy_data_apikey')}     purpose={t('privacy_purpose_apikey')}    basis={t('privacy_basis_explicit')} last />
            </tbody>
          </table>
          <p className="text-[11px] text-slate-500 mt-3">{t('privacy_no_third_party')}</p>
        </Section>

        <Section title={t('privacy_storage_title')}>
          <p className="text-sm text-slate-400 leading-relaxed">{t('privacy_storage_p1')}</p>
          <p className="text-sm text-slate-400 leading-relaxed mt-3">
            {t('privacy_storage_p2_prefix')}{' '}
            {t('privacy_storage_anthropic_link')}
            {t('privacy_storage_p2_suffix')}
          </p>
        </Section>

        <Section title={t('privacy_retention_title')}>
          <div className="space-y-2">
            <RetentionRow item={t('privacy_retention_session')} duration={t('privacy_retention_session_duration')} />
            <RetentionRow item={t('privacy_retention_prefs')}   duration={t('privacy_retention_prefs_duration')} />
            <RetentionRow item={t('privacy_retention_apikey')}  duration={t('privacy_retention_apikey_duration')} />
          </div>
        </Section>

        <Section title={t('privacy_rights_title')}>
          <p className="text-sm text-slate-400 leading-relaxed mb-3">{t('privacy_rights_intro')}</p>
          <ul className="space-y-1.5 text-sm text-slate-400">
            {[
              ['privacy_right_access',      'privacy_right_access_desc'],
              ['privacy_right_rectify',     'privacy_right_rectify_desc'],
              ['privacy_right_erase',       'privacy_right_erase_desc'],
              ['privacy_right_portability', 'privacy_right_portability_desc'],
              ['privacy_right_oppose',      'privacy_right_oppose_desc'],
            ].map(([titleKey, descKey]) => (
              <li key={titleKey} className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5 flex-shrink-0">✓</span>
                <span>
                  <strong className="text-slate-300">{t(titleKey)} :</strong> {t(descKey)}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-400 mt-3">
            {t('privacy_rights_contact_prefix')} <strong className="text-slate-200">privacy@autobuyunion.eu</strong>
          </p>
          <p className="text-[11px] text-slate-500 mt-2">
            {t('privacy_rights_cnil_prefix')}{' '}
            <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">CNIL</a>
            {t('privacy_rights_cnil_suffix')}
          </p>
        </Section>

        <Section title={t('privacy_cookies_title')}>
          <p className="text-sm text-slate-400 leading-relaxed">{t('privacy_cookies_p1')}</p>
          <p className="text-sm text-slate-400 leading-relaxed mt-3">{t('privacy_cookies_p2')}</p>
        </Section>

        <Section title={t('privacy_security_title')}>
          <p className="text-sm text-slate-400 leading-relaxed">{t('privacy_security_text')}</p>
        </Section>

        <div className="pt-4 flex flex-wrap gap-4 text-xs text-slate-600">
          <Link to="/mentions-legales" className="hover:text-cyan-400 transition">
            {t('legal_mentions')}
          </Link>
          <span>·</span>
          <Link to="/conditions-utilisation" className="hover:text-cyan-400 transition">
            {t('legal_cgu')}
          </Link>
          <span>·</span>
          <span>© {new Date().getFullYear()} Autobuyunion SAS — GDPR</span>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">{title}</h2>
      <div className="glass-card p-4">{children}</div>
    </section>
  )
}

function DataRow({ data, purpose, basis, last }) {
  return (
    <tr className={last ? '' : 'border-b border-white/5'}>
      <td className="py-2 pr-4">{data}</td>
      <td className="py-2 pr-4">{purpose}</td>
      <td className="py-2">{basis}</td>
    </tr>
  )
}

function RetentionRow({ item, duration }) {
  return (
    <div className="flex flex-col sm:flex-row gap-0.5 sm:gap-3 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs font-semibold text-slate-300 sm:w-48 flex-shrink-0">{item}</span>
      <span className="text-xs text-slate-500">{duration}</span>
    </div>
  )
}
