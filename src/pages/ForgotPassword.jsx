import { Link } from 'react-router-dom'
import { ArrowLeft, Key, Mail } from 'lucide-react'
import Logo from '@/components/ui/Logo'
import { useSettings } from '@/contexts/SettingsContext'

// La réinitialisation autonome (OTP affiché à l'écran + override localStorage)
// a été supprimée : elle permettait à n'importe quel visiteur de changer un
// mot de passe sans vérification. L'authentification étant désormais validée
// côté serveur (api/login.js), la réinitialisation passe par l'administrateur.
const ADMIN_EMAIL = 'hubert.saget@aafgroup.eu'

export default function ForgotPassword() {
  const { t } = useSettings()

  return (
    <div className="min-h-[100dvh] bg-navy-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute inset-0 dot-grid opacity-20" />
        <div className="absolute -top-1/4 -left-1/4 w-[60vw] h-[60vw] rounded-full bg-cyan-400/5 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[50vw] h-[50vw] rounded-full bg-blue-500/4 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        <div className="flex flex-col items-center mb-8">
          <div className="mb-5 relative">
            <div className="absolute inset-0 rounded-full bg-cyan-400/15 blur-xl scale-150" />
            <Logo size="md" className="relative" />
          </div>
        </div>

        <div className="glass-card p-6 shadow-2xl shadow-black/40">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl bg-warn/10 border border-warn/20 flex items-center justify-center flex-shrink-0">
              <Key size={16} className="text-warn" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">{t('forgot_title')}</h2>
              <p className="text-[11px] text-slate-500">{t('forgot_admin_subtitle')}</p>
            </div>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed mb-5">
            {t('forgot_admin_msg')}
          </p>

          <a
            href={`mailto:${ADMIN_EMAIL}?subject=${encodeURIComponent(t('forgot_admin_mail_subject'))}`}
            className="w-full py-3 rounded-xl text-sm font-bold
                       bg-gradient-to-r from-cyan-400 to-cyan-500 text-navy-900
                       hover:from-cyan-300 hover:to-cyan-400 active:scale-[0.98] transition-all
                       flex items-center justify-center gap-2 shadow-lg shadow-cyan-400/20"
          >
            <Mail size={14} />
            {t('forgot_admin_contact_btn')}
          </a>

          <Link
            to="/login"
            className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition"
          >
            <ArrowLeft size={12} />
            {t('forgot_back_login')}
          </Link>
        </div>
      </div>
    </div>
  )
}
