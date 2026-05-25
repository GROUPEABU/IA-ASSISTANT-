import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'

export default function ConditionsUtilisation() {
  const { t } = useSettings()

  return (
    <div className="min-h-[100dvh] bg-navy-900 flex flex-col">
      <header className="sticky top-0 z-10 bg-navy-900/95 backdrop-blur border-b border-white/7 px-4 py-3 flex items-center gap-3">
        <Link to="/login" className="text-slate-400 hover:text-white transition" aria-label={t('forgot_back_login')}>
          <ArrowLeft size={16} aria-hidden="true" />
        </Link>
        <h1 className="text-sm font-semibold text-white">{t('cgu_title')}</h1>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-8">

        <div className="glass-card px-4 py-3 border-cyan-400/20 bg-cyan-400/4">
          <p className="text-xs text-cyan-400">
            <strong>{t('cgu_version')}</strong> — {t('cgu_effective')}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">{t('cgu_reserved_notice')}</p>
        </div>

        <Article title={t('cgu_art1_title')}>
          <p>{t('cgu_art1_p1')}</p>
          <p className="mt-3">{t('cgu_art1_p2')}</p>
        </Article>

        <Article title={t('cgu_art2_title')}>
          <p>{t('cgu_art2_p1')}</p>
          <ul className="mt-3 space-y-1.5">
            <Item>{t('cgu_art2_item1')}</Item>
            <Item>{t('cgu_art2_item2')}</Item>
            <Item>{t('cgu_art2_item3')}</Item>
          </ul>
          <p className="mt-3">{t('cgu_art2_p2')}</p>
        </Article>

        <Article title={t('cgu_art3_title')}>
          <p>{t('cgu_art3_p1')}</p>
          <ul className="mt-3 space-y-1.5">
            <Item>{t('cgu_art3_item1')}</Item>
            <Item>{t('cgu_art3_item2')}</Item>
            <Item>{t('cgu_art3_item3')}</Item>
            <Item>{t('cgu_art3_item4')}</Item>
          </ul>
        </Article>

        <Article title={t('cgu_art4_title')}>
          <p>{t('cgu_art4_p1')}</p>
          <ul className="mt-3 space-y-1.5">
            <Item>{t('cgu_art4_item1')}</Item>
            <Item>{t('cgu_art4_item2')}</Item>
            <Item>{t('cgu_art4_item3')}</Item>
            <Item>{t('cgu_art4_item4')}</Item>
            <Item>{t('cgu_art4_item5')}</Item>
          </ul>
          <p className="mt-3 text-amber-400/80 text-[12px] font-medium">{t('cgu_art4_warning')}</p>
        </Article>

        <Article title={t('cgu_art5_title')}>
          <p>{t('cgu_art5_p1')}</p>
          <p className="mt-3">{t('cgu_art5_p2')}</p>
        </Article>

        <Article title={t('cgu_art6_title')}>
          <p>{t('cgu_art6_p1')}</p>
          <p className="mt-3">{t('cgu_art6_p2')}</p>
        </Article>

        <Article title={t('cgu_art7_title')}>
          <p>{t('cgu_art7_p1')}</p>
          <ul className="mt-3 space-y-1.5">
            <Item>{t('cgu_art7_item1')}</Item>
            <Item>{t('cgu_art7_item2')}</Item>
            <Item>{t('cgu_art7_item3')}</Item>
          </ul>
        </Article>

        <Article title={t('cgu_art8_title')}>
          <p>{t('cgu_art8_p1')}</p>
          <p className="mt-3">{t('cgu_art8_p2')}</p>
        </Article>

        <Article title={t('cgu_art9_title')}>
          <p>{t('cgu_art9_p1')}</p>
          <p className="mt-3">{t('cgu_art9_p2')}</p>
        </Article>

        <Article title={t('cgu_art10_title')}>
          <p>{t('cgu_art10_p1')}</p>
          <p className="mt-3">{t('cgu_art10_p2')}</p>
        </Article>

        <div className="glass-card px-4 py-3">
          <p className="text-xs text-slate-400">
            <span className="font-semibold text-slate-200">{t('cgu_contact_label')}</span>{' '}
            <a href="mailto:legal@autobuyunion.eu" className="text-cyan-400 hover:underline">
              legal@autobuyunion.eu
            </a>
          </p>
        </div>

        <div className="pt-4 flex flex-wrap gap-4 text-xs text-slate-600">
          <Link to="/mentions-legales" className="hover:text-cyan-400 transition">
            {t('legal_mentions')}
          </Link>
          <span>·</span>
          <Link to="/politique-confidentialite" className="hover:text-cyan-400 transition">
            {t('legal_privacy')}
          </Link>
          <span>·</span>
          <span>© {new Date().getFullYear()} Autobuyunion SAS</span>
        </div>
      </main>
    </div>
  )
}

function Article({ title, children }) {
  return (
    <section>
      <h2 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">{title}</h2>
      <div className="glass-card p-4 text-sm text-slate-400 leading-relaxed">{children}</div>
    </section>
  )
}

function Item({ children }) {
  return (
    <li className="flex items-start gap-2">
      <span className="text-cyan-400 mt-0.5 flex-shrink-0">–</span>
      <span>{children}</span>
    </li>
  )
}
