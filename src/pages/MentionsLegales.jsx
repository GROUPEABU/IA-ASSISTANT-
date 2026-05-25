import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'

/**
 * Legal notice page. Fully localized.
 * Company-specific values (SIREN, address, capital) intentionally kept as
 * placeholder text — these are filled in once Autobuyunion provides them.
 */
export default function MentionsLegales() {
  const { t } = useSettings()

  return (
    <div className="min-h-[100dvh] bg-navy-900 flex flex-col">
      <header className="sticky top-0 z-10 bg-navy-900/95 backdrop-blur border-b border-white/7 px-4 py-3 flex items-center gap-3">
        <Link to="/login" className="text-slate-400 hover:text-white transition" aria-label={t('forgot_back_login')}>
          <ArrowLeft size={16} aria-hidden="true" />
        </Link>
        <h1 className="text-sm font-semibold text-white">{t('legal_mentions')}</h1>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-8">
        <Section title={t('legal_editor_title')}>
          <Row label={t('legal_editor_name')}    value="Autobuyunion SAS" />
          <Row label={t('legal_editor_form')}    value={t('legal_editor_form_value')} />
          <Row label={t('legal_editor_capital')} value="[Capital social en €]" />
          <Row label={t('legal_editor_siren')}   value="[Numéro SIREN/SIRET]" />
          <Row label={t('legal_editor_rcs')}     value="[Ville d'immatriculation]" />
          <Row label={t('legal_editor_address')} value="[Adresse complète], France" />
          <Row label={t('legal_editor_contact')} value="contact@autobuyunion.eu" />
          <Row label={t('legal_editor_director')} value="[Nom du directeur de la publication]" />
        </Section>

        <Section title={t('legal_hosting_title')}>
          <Row label={t('legal_hosting_provider')} value="Vercel Inc." />
          <Row label={t('legal_hosting_address')}  value="340 Pine Street, Suite 701, San Francisco, CA 94104, USA" />
          <Row label={t('legal_hosting_website')}  value="https://vercel.com" />
        </Section>

        <Section title={t('legal_ip_title')}>
          <p className="text-sm text-slate-400 leading-relaxed">{t('legal_ip_p1')}</p>
          <p className="text-sm text-slate-400 leading-relaxed mt-3">{t('legal_ip_p2')}</p>
        </Section>

        <Section title={t('legal_liability_title')}>
          <p className="text-sm text-slate-400 leading-relaxed">{t('legal_liability_p1')}</p>
          <p className="text-sm text-slate-400 leading-relaxed mt-3">{t('legal_liability_p2')}</p>
        </Section>

        <Section title={t('legal_law_title')}>
          <p className="text-sm text-slate-400 leading-relaxed">{t('legal_law_text')}</p>
        </Section>

        <div className="pt-4 flex flex-wrap gap-4 text-xs text-slate-600">
          <Link to="/politique-confidentialite" className="hover:text-cyan-400 transition">
            {t('legal_privacy')}
          </Link>
          <span>·</span>
          <Link to="/conditions-utilisation" className="hover:text-cyan-400 transition">
            {t('legal_cgu')}
          </Link>
          <span>·</span>
          <span>© {new Date().getFullYear()} Autobuyunion SAS</span>
        </div>
      </main>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section>
      <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">{title}</h2>
      <div className="glass-card p-4 space-y-2">{children}</div>
    </section>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-0.5 sm:gap-3 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide sm:w-48 flex-shrink-0">{label}</span>
      <span className="text-sm text-slate-300">{value}</span>
    </div>
  )
}
