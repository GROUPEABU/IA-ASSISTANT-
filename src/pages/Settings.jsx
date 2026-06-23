import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Key, Palette, Globe, Check, Monitor, Sun, Laptop, Scale, ChevronRight, Wifi, BarChart2, RotateCcw, Info, User, Camera, Trash2, Lock, Eye, EyeOff, Users, RefreshCw, ChevronDown } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'
import { useAuth } from '@/contexts/AuthContext'
import { ukey } from '@/utils/userStorage'
import { getCosts, resetCosts } from '@/utils/apiCost'
import { seedServerSpend } from '@/services/claude'
import { getSpend, MONTHLY_CAP, DAILY_CAP, migrateToQuota } from '@/utils/spendTracker'
import { getAvatar, saveAvatar, removeAvatar, resizeToDataUrl, syncAvatar } from '@/utils/avatarStore'
import { fetchTeamUsage, resetUserSpend, setUserBudget } from '@/utils/cloudStore'

const Section = ({ icon: Icon, title, children }) => (
  <div className="glass-card p-6 sm:p-8">
    <div className="flex items-center gap-2.5 mb-7">
      <Icon size={18} className="text-cyan-400/80 flex-shrink-0" />
      <h2 className="text-lg font-semibold text-white tracking-tight">{title}</h2>
    </div>
    <div className="space-y-6">
      {children}
    </div>
  </div>
)

const Field = ({ label, description, children }) => (
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
    <div className="flex-1">
      <p className="text-sm font-medium text-slate-200">{label}</p>
      {description && <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{description}</p>}
    </div>
    <div className="flex-shrink-0 w-full sm:w-auto">{children}</div>
  </div>
)

const DENSITY_OPTIONS = [
  { key: 'compact', label: 'Compact' },
  { key: 'normal',  label: 'Normal' },
  { key: 'large',   label: 'Large' },
]

const TOOL_LABELS = {
  veilleprix:        'Veille Prix',
  ficheIA:           'Fiche IA',
  analysemarche:     'Analyse marché',
  comparateur:       'Comparateur',
  objections:        'Objections',
  pitch:             'Pitch',
  rapportcommercial: 'Rapport commercial',
  analysestock:      'Analyse de stock',
  importsmart:       'Import intelligent',
  logistique:        'Logistique',
  chat:              'Chat assistant',
}

export default function Settings() {
  const [saved, setSaved] = useState(false)
  const { language, currency, density, changeLanguage, changeCurrency, changeDensity, t } = useSettings()
  const { user } = useAuth()
  const [costs, setCosts] = useState(() => getCosts())
  const [spend, setSpend] = useState(() => user?.id != null ? getSpend(user.id) : { month: 0, day: 0 })
  const [avatar, setAvatar] = useState(() => getAvatar(user?.id ?? null))
  const fileInputRef = useRef(null)
  const [avatarLoading, setAvatarLoading] = useState(false)

  // Onglet actif (navigation latérale)
  const [activeTab, setActiveTab] = useState('profile')

  // Vue admin : utilisation agrégée de tous les comptes (onglet réservé admin).
  const isAdmin = user?.role === 'admin'
  const [teamUsage, setTeamUsage] = useState(null) // { enabled, users } | null
  const [teamLoading, setTeamLoading] = useState(false)
  const [teamError, setTeamError] = useState('')
  const loadTeamUsage = async () => {
    setTeamLoading(true)
    setTeamError('')
    const res = await fetchTeamUsage()
    if (res.error === 'forbidden') setTeamError(t('settings_team_forbidden'))
    else if (!res.enabled && res.error) setTeamError(t('settings_team_unavailable'))
    setTeamUsage(res)
    setTeamLoading(false)
  }
  // Charge à l'ouverture de l'onglet « Équipe ».
  useEffect(() => {
    if (activeTab === 'team' && isAdmin && teamUsage === null) loadTeamUsage()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isAdmin])

  // Gestion des cartes utilisateur (reset dépense + plafonds)
  const [expandedIds,  setExpandedIds]  = useState({})
  const [capEdits,     setCapEdits]     = useState({})
  const [capSaving,    setCapSaving]    = useState({})
  const [capSaved,     setCapSaved]     = useState({})
  const [resetConfirm, setResetConfirm] = useState(null)
  const [resetLoading, setResetLoading] = useState({})

  const toggleExpand = (uid) => {
    setExpandedIds(prev => ({ ...prev, [uid]: !prev[uid] }))
  }

  const handleResetSpend = async (uid) => {
    setResetLoading(prev => ({ ...prev, [uid]: true }))
    const ok = await resetUserSpend(uid)
    if (ok) {
      setTeamUsage(prev => ({
        ...prev,
        users: prev.users.map(u => u.id === uid ? { ...u, spend: { month: 0, day: 0 } } : u),
      }))
    }
    setResetLoading(prev => ({ ...prev, [uid]: false }))
    setResetConfirm(null)
  }

  const handleCapSave = async (uid, u) => {
    const edit = capEdits[uid]
    const month = parseFloat(edit?.month ?? String(u.cap?.month ?? MONTHLY_CAP))
    const day   = parseFloat(edit?.day   ?? String(u.cap?.day   ?? DAILY_CAP))
    if (isNaN(month) || isNaN(day) || month <= 0 || day <= 0) return
    setCapSaving(prev => ({ ...prev, [uid]: true }))
    const ok = await setUserBudget(uid, { month, day })
    if (ok) {
      setTeamUsage(prev => ({
        ...prev,
        users: prev.users.map(u2 => u2.id === uid ? { ...u2, cap: { month, day } } : u2),
      }))
      setCapSaved(prev => ({ ...prev, [uid]: true }))
      setTimeout(() => setCapSaved(prev => ({ ...prev, [uid]: false })), 2000)
    }
    setCapSaving(prev => ({ ...prev, [uid]: false }))
  }

  // Champs de profil éditables
  const profileKey = ukey(user?.id ?? null, 'profile')
  const loadProfile = () => {
    try { return JSON.parse(localStorage.getItem(profileKey) || '{}') } catch { return {} }
  }
  const nameParts = (user?.name || '').split(' ')
  const [profileFirstname, setProfileFirstname] = useState(() => loadProfile().firstname ?? nameParts[0] ?? '')
  const [profileLastname,  setProfileLastname]  = useState(() => loadProfile().lastname  ?? nameParts.slice(1).join(' ') ?? '')
  const [profilePhone,     setProfilePhone]     = useState(() => loadProfile().phone ?? '')
  const [profileSaved,     setProfileSaved]     = useState(false)

  // Changement de mot de passe
  const [pwCurrent,  setPwCurrent]  = useState('')
  const [pwNew,      setPwNew]      = useState('')
  const [pwConfirm,  setPwConfirm]  = useState('')
  const [pwLoading,  setPwLoading]  = useState(false)
  const [pwError,    setPwError]    = useState('')
  const [pwSuccess,  setPwSuccess]  = useState(false)
  const [pwShowCur,  setPwShowCur]  = useState(false)
  const [pwShowNew,  setPwShowNew]  = useState(false)
  const [pwShowConf, setPwShowConf] = useState(false)
  const themeKey    = ukey(user?.id ?? null, 'theme')
  const aiPowerKey  = ukey(user?.id ?? null, 'ai_power')
  const [theme,      setTheme]      = useState(() => localStorage.getItem(themeKey)   || 'dark')
  const [aiPower,    setAiPower]    = useState(() => localStorage.getItem(aiPowerKey) || 'performance')

  // Arrivée via la jauge de la sidebar (lien /settings#usage) → ouvre l'onglet
  // Utilisation directement.
  const location = useLocation()
  useEffect(() => {
    if (location.hash === '#usage') setActiveTab('usage')
  }, [location.hash])

  // Migration one-shot : si des coûts historiques existent mais que les jauges
  // mois/jour sont à 0, on injecte le total dans le quota courant.
  useEffect(() => {
    if (user?.id == null) return
    const entries = Object.entries(costs).filter(([, v]) => v.cost > 0)
    const legacy  = entries.reduce((s, [, v]) => s + v.cost, 0)
    if (legacy > 0) {
      migrateToQuota(user.id, legacy)
      setSpend(getSpend(user.id))
    }
    // Synchronise sur le compteur autoritaire du compte (et seede l'historique
    // une fois) puis rafraîchit la jauge — affiche le même total sur tous les
    // appareils, y compris ceux sans estimation locale.
    ;(async () => {
      await seedServerSpend(user.id, legacy)
      setSpend(getSpend(user.id))
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  // Sync avatar depuis le serveur si aucun avatar local
  useEffect(() => {
    if (user?.id == null) return
    syncAvatar(user.id).then(() => setAvatar(getAvatar(user.id)))
  }, [user?.id])

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file || user?.id == null) return
    setAvatarLoading(true)
    try {
      const dataUrl = await resizeToDataUrl(file)
      saveAvatar(user.id, dataUrl)
      setAvatar(dataUrl)
    } catch {}
    setAvatarLoading(false)
    e.target.value = ''
  }

  const handleAvatarRemove = () => {
    if (user?.id == null) return
    removeAvatar(user.id)
    setAvatar(null)
  }

  const handleProfileSave = () => {
    const data = { firstname: profileFirstname.trim(), lastname: profileLastname.trim(), phone: profilePhone.trim() }
    try { localStorage.setItem(profileKey, JSON.stringify(data)) } catch {}
    import('@/utils/cloudStore').then(({ cloudPut }) => cloudPut('profile', data))
    try { window.dispatchEvent(new Event('abu:profile')) } catch {} // rafraîchit la sidebar
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  // Sync profil depuis le serveur au montage
  useEffect(() => {
    if (user?.id == null) return
    import('@/utils/cloudStore').then(({ cloudGet }) =>
      cloudGet('profile').then((remote) => {
        if (!remote || typeof remote !== 'object') return
        if (remote.firstname !== undefined) setProfileFirstname(remote.firstname)
        if (remote.lastname  !== undefined) setProfileLastname(remote.lastname)
        if (remote.phone     !== undefined) setProfilePhone(remote.phone)
        try { localStorage.setItem(profileKey, JSON.stringify(remote)) } catch {}
        try { window.dispatchEvent(new Event('abu:profile')) } catch {}
      })
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const handlePasswordChange = async () => {
    setPwError('')
    if (!pwCurrent || !pwNew || !pwConfirm) return setPwError(t('pw_all_required'))
    if (pwNew.length < 8) return setPwError(t('pw_too_short'))
    if (pwNew !== pwConfirm) return setPwError(t('pw_mismatch'))
    setPwLoading(true)
    try {
      const token = JSON.parse(localStorage.getItem('abu_session') || 'null')?.token
      const res = await fetch('/api/change-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwCurrent, newPassword: pwNew }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setPwError(data.error || t('pw_error')); return }
      setPwSuccess(true)
      setPwCurrent(''); setPwNew(''); setPwConfirm('')
      setTimeout(() => setPwSuccess(false), 3000)
    } catch { setPwError(t('pw_error')) }
    finally { setPwLoading(false) }
  }

  function applyThemeValue(v) {
    if (v === 'light') {
      document.documentElement.classList.add('light')
    } else if (v === 'dark') {
      document.documentElement.classList.remove('light')
    } else {
      // system
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      if (prefersDark) document.documentElement.classList.remove('light')
      else document.documentElement.classList.add('light')
    }
  }

  const handleTheme = (v) => {
    setTheme(v)
    applyThemeValue(v)
    localStorage.setItem(themeKey, v)
  }

  // Follow OS changes when theme = 'system'
  useEffect(() => {
    if (theme !== 'system') return
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeValue('system')
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [theme])

  const handleSave = () => {
    localStorage.setItem(aiPowerKey, aiPower)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const TABS = [
    { key: 'profile',  icon: User,      labelKey: 'settings_tab_profile' },
    { key: 'security', icon: Lock,      labelKey: 'settings_tab_security' },
    { key: 'ai',       icon: Key,       labelKey: 'settings_tab_ai' },
    { key: 'prefs',    icon: Palette,   labelKey: 'settings_tab_prefs' },
    { key: 'usage',    icon: BarChart2, labelKey: 'settings_tab_usage' },
    // Onglet réservé à l'administrateur : suivi de l'utilisation de tous les comptes.
    ...(isAdmin ? [{ key: 'team', icon: Users, labelKey: 'settings_tab_team' }] : []),
    { key: 'legal',    icon: Scale,     labelKey: 'settings_tab_legal' },
  ]

  return (
    <div className="w-full max-w-5xl mx-auto animate-fade-in">
      {/* Onglets — barre horizontale en haut, répartis sur toute la largeur */}
      <nav className="mb-6">
        <div className="glass-card p-1.5 flex gap-1 overflow-x-auto">
          {TABS.map(({ key, icon: Icon, labelKey }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`relative flex-1 min-w-fit flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === key
                  ? 'bg-cyan-400/15 text-cyan-400'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-navy-800/40'
              }`}
            >
              <Icon size={16} className="flex-shrink-0" />
              {t(labelKey)}
              {/* Barre indicatrice cyan sous l'onglet actif */}
              {activeTab === key && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 h-[3px] w-2/3 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(80,229,229,0.7)]" />
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Contenu de l'onglet actif */}
      <div className="space-y-6">

      {activeTab === 'profile' && (
      <Section icon={User} title={t('settings_profile_section')}>
        {/* Photo + identité */}
        <div className="flex items-start gap-6 pb-6 border-b border-white/5">
          <div className="flex-shrink-0">
            {avatar
              ? <img src={avatar} alt="avatar" className="w-24 h-24 rounded-full object-cover ring-2 ring-cyan-400/30 shadow-xl" />
              : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500
                                flex items-center justify-center text-navy-900 text-3xl font-bold shadow-xl">
                  {user?.initials || '?'}
                </div>
              )
            }
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <p className="text-lg font-bold text-white leading-tight">
              {[profileFirstname, profileLastname].filter(Boolean).join(' ') || user?.name}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={avatarLoading}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                           border border-navy-600/70 text-slate-300 hover:border-cyan-400/50 hover:text-cyan-400
                           bg-navy-900/40 transition-all disabled:opacity-50"
              >
                <Camera size={14} />
                {avatarLoading ? t('settings_avatar_loading') : t('settings_avatar_change')}
              </button>
              {avatar && (
                <button
                  onClick={handleAvatarRemove}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                             border border-navy-600/70 text-slate-500 hover:border-red-400/40 hover:text-red-400
                             bg-navy-900/40 transition-all"
                >
                  <Trash2 size={14} />
                  {t('settings_avatar_remove')}
                </button>
              )}
            </div>
            <p className="text-xs text-slate-600 mt-2">{t('settings_avatar_hint')}</p>
          </div>
        </div>

        {/* Formulaire — 2 colonnes */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-slate-400">{t('settings_profile_firstname')}</label>
            <input
              type="text"
              value={profileFirstname}
              onChange={e => setProfileFirstname(e.target.value)}
              placeholder={t('settings_profile_firstname')}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-4 py-3
                         text-sm text-slate-200 placeholder-slate-600
                         focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-slate-400">{t('settings_profile_lastname')}</label>
            <input
              type="text"
              value={profileLastname}
              onChange={e => setProfileLastname(e.target.value)}
              placeholder={t('settings_profile_lastname')}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-4 py-3
                         text-sm text-slate-200 placeholder-slate-600
                         focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition"
            />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-slate-400">{t('settings_profile_email')}</label>
            <input
              type="email"
              value={user?.username || ''}
              readOnly
              className="w-full bg-navy-950/40 border border-navy-700/30 rounded-xl px-4 py-3
                         text-sm text-slate-500 cursor-not-allowed"
            />
            <p className="text-[11px] text-slate-600">{t('settings_profile_email_readonly')}</p>
          </div>
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-slate-400">{t('settings_profile_phone')}</label>
            <input
              type="tel"
              value={profilePhone}
              onChange={e => setProfilePhone(e.target.value)}
              placeholder="+33 1 23 45 67 89"
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-4 py-3
                         text-sm text-slate-200 placeholder-slate-600
                         focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={handleProfileSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold
                       bg-gradient-to-r from-cyan-400 to-cyan-500 text-navy-900
                       hover:from-cyan-300 hover:to-cyan-400 active:scale-95 transition-all shadow-md shadow-cyan-400/20"
          >
            {profileSaved ? <><Check size={14} /> {t('settings_profile_saved')}</> : t('settings_profile_save')}
          </button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      </Section>
      )}

      {activeTab === 'security' && (
      <Section icon={Lock} title={t('settings_security_section')}>
        <p className="text-sm text-slate-400 -mt-2">{t('settings_security_desc')}</p>

        <div className="space-y-4">
          {/* Mot de passe actuel */}
          <div className="space-y-1.5">
            <label className="block text-[13px] font-medium text-slate-400">{t('pw_current')}</label>
            <div className="relative">
              <input
                type={pwShowCur ? 'text' : 'password'}
                value={pwCurrent}
                onChange={e => setPwCurrent(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-4 py-3 pr-11
                           text-sm text-slate-200 placeholder-slate-600
                           focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition"
              />
              <button type="button" onClick={() => setPwShowCur(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                {pwShowCur ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Nouveau + confirmation — côte à côte sur desktop */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-slate-400">{t('pw_new')}</label>
              <div className="relative">
                <input
                  type={pwShowNew ? 'text' : 'password'}
                  value={pwNew}
                  onChange={e => setPwNew(e.target.value)}
                  placeholder="8 caractères min."
                  className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-4 py-3 pr-11
                             text-sm text-slate-200 placeholder-slate-600
                             focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition"
                />
                <button type="button" onClick={() => setPwShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                  {pwShowNew ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-slate-400">{t('pw_confirm')}</label>
              <div className="relative">
                <input
                  type={pwShowConf ? 'text' : 'password'}
                  value={pwConfirm}
                  onChange={e => setPwConfirm(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-4 py-3 pr-11
                             text-sm text-slate-200 placeholder-slate-600
                             focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition"
                />
                <button type="button" onClick={() => setPwShowConf(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition">
                  {pwShowConf ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          </div>

          {pwError && (
            <p className="text-xs text-red-400 bg-red-400/8 border border-red-400/20 rounded-lg px-3 py-2">{pwError}</p>
          )}
          {pwSuccess && (
            <p className="text-xs text-emerald-400 bg-emerald-400/8 border border-emerald-400/20 rounded-lg px-3 py-2">
              <Check size={12} className="inline mr-1" />{t('pw_success')}
            </p>
          )}

          <div className="flex justify-end">
            <button
              onClick={handlePasswordChange}
              disabled={pwLoading}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold
                         bg-gradient-to-r from-cyan-400 to-cyan-500 text-navy-900
                         hover:from-cyan-300 hover:to-cyan-400 active:scale-95 transition-all
                         shadow-md shadow-cyan-400/20 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {pwLoading ? t('pw_updating') : t('pw_submit')}
            </button>
          </div>
        </div>
      </Section>
      )}

      {activeTab === 'ai' && (
      <Section icon={Key} title={t('settings_api_section')}>
        <div className="space-y-5">
          {/* API key — statut connexion (champ masqué, clé gérée côté serveur) */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-400/8 border border-emerald-400/20">
            <div className="w-7 h-7 rounded-lg bg-emerald-400/10 flex items-center justify-center flex-shrink-0">
              <Wifi size={14} className="text-emerald-400" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-200">{t('settings_api_key_label')}</p>
              <p className="text-xs text-emerald-400 mt-0.5">{t('settings_api_connected')}</p>
            </div>
            <div className="ml-auto w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0 animate-pulse" />
          </div>

          {/* Power + Save — second row, aligned */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 pt-1 border-t border-navy-700/40">
            <div className="flex-1 pt-4">
              <p className="text-sm font-medium text-slate-200">{t('settings_api_power_label')}</p>
              <p className="text-xs text-slate-500 mt-0.5 mb-2 leading-relaxed">{t('settings_api_power_desc')}</p>
              <select
                value={aiPower}
                onChange={e => setAiPower(e.target.value)}
                className="w-full sm:w-64 bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                           text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition">
                <option value="standard">{t('settings_standard')}</option>
                <option value="performance">{t('settings_performance')}</option>
                <option value="ultra">{t('settings_ultra')}</option>
              </select>
            </div>
            <button
              onClick={handleSave}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold
                         bg-gradient-to-r from-cyan-400 to-cyan-500 text-navy-900
                         hover:from-cyan-300 hover:to-cyan-400 active:scale-95 transition-all flex-shrink-0"
            >
              {saved ? <><Check size={14} /> {t('settings_saved')}</> : t('settings_save')}
            </button>
          </div>
        </div>
      </Section>
      )}

      {activeTab === 'prefs' && (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Section icon={Palette} title={t('settings_appearance')}>
          <Field label={t('settings_theme_label')} description={t('settings_theme_desc')}>
            <div className="flex gap-2">
              {[
                { value: 'dark',   icon: Monitor, labelKey: 'settings_dark' },
                { value: 'light',  icon: Sun,     labelKey: 'settings_light' },
                { value: 'system', icon: Laptop,  labelKey: 'settings_system' },
              ].map(({ value, icon: Icon, labelKey }) => (
                <button
                  key={value}
                  onClick={() => handleTheme(value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                    theme === value
                      ? 'bg-cyan-400/10 border-cyan-400/30 text-cyan-400'
                      : 'border-navy-600/50 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <Icon size={13} /> {t(labelKey)}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t('settings_density_label')} description={t('settings_density_desc')}>
            <div className="flex gap-1 p-1 bg-navy-900/60 rounded-xl border border-navy-700/40">
              {DENSITY_OPTIONS.map(({ key }) => (
                <button
                  key={key}
                  onClick={() => changeDensity(key)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition ${
                    density === key
                      ? 'bg-cyan-400/15 text-cyan-400'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {t(`settings_${key}`)}
                </button>
              ))}
            </div>
          </Field>
        </Section>

        <Section icon={Globe} title={t('settings_data')}>
          <Field label={t('settings_currency_label')} description={t('settings_currency_desc')}>
            <select
              value={currency}
              onChange={e => changeCurrency(e.target.value)}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition"
            >
              <option value="EUR">EUR (€)</option>
              <option value="GBP">{t('currency_gbp')}</option>
              <option value="CHF">{t('currency_chf')}</option>
            </select>
          </Field>
          <Field label={t('settings_language_label')} description={t('settings_language_desc')}>
            <select
              value={language}
              onChange={e => changeLanguage(e.target.value)}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition"
            >
              <option value="fr">Français</option>
              <option value="en">English</option>
            </select>
          </Field>
        </Section>
      </div>
      )}

      {activeTab === 'usage' && (
      <Section icon={BarChart2} title={t('settings_cost_section')}>
          {/* Quota gauges — toujours visibles */}
          <div className="space-y-3 pb-3 border-b border-navy-700/40">
            {[
              { label: t('settings_quota_month'), spent: spend.month, cap: MONTHLY_CAP, resetNote: t('settings_quota_reset_month') },
              { label: t('settings_quota_day'),   spent: spend.day,   cap: DAILY_CAP,   resetNote: t('settings_quota_reset_day')   },
            ].map(({ label, spent, cap, resetNote }) => {
              const pct     = Math.min(100, (spent / cap) * 100)
              const reached = spent >= cap
              return (
                <div key={label}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-slate-300">{label}</span>
                    <span className={`text-xs font-mono tabular-nums ${reached ? 'text-red-400 font-semibold' : 'text-slate-400'}`}>
                      €{spent.toFixed(2)} / €{cap}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-navy-700/50">
                    <div
                      className={`h-1.5 rounded-full transition-all ${reached ? 'bg-red-400' : pct > 75 ? 'bg-warn/70' : 'bg-cyan-400/70'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-600 mt-0.5">{resetNote}</p>
                </div>
              )
            })}
          </div>
          {(() => {
            const entries = Object.entries(costs).filter(([, v]) => v.cost > 0)
            const total = entries.reduce((s, [, v]) => s + v.cost, 0)
            return entries.length === 0 ? (
              <p className="text-xs text-slate-500">{t('settings_cost_empty')}</p>
            ) : (
              <>
                <div className="flex items-end justify-between mb-3">
                  <div>
                    <p className="text-xs text-slate-500">{t('settings_cost_total')}</p>
                    <p className="text-2xl font-bold text-white">€{total.toFixed(3)}</p>
                    <p className="text-[10px] text-slate-600">{t('settings_cost_since')}</p>
                  </div>
                  <button
                    onClick={() => { resetCosts(); setCosts({}) }}
                    className="flex items-center gap-1.5 text-xs text-slate-500 border border-navy-600/50
                               px-3 py-1.5 rounded-lg hover:text-slate-300 hover:border-navy-500 transition"
                  >
                    <RotateCcw size={11} /> {t('settings_cost_reset')}
                  </button>
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t('settings_cost_breakdown')}</p>
                <div className="space-y-1.5">
                  {entries.sort((a, b) => b[1].cost - a[1].cost).map(([tool, v]) => {
                    const pct = total > 0 ? (v.cost / total) * 100 : 0
                    return (
                      <div key={tool}>
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-xs text-slate-300">{TOOL_LABELS[tool] || tool}</span>
                          <span className="text-xs text-slate-400 tabular-nums">
                            €{v.cost.toFixed(3)} · {v.calls} {v.calls > 1 ? t('settings_cost_calls') : t('settings_cost_call')} · {Math.round(pct)} %
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-navy-700/50">
                          <div className="h-1 rounded-full bg-cyan-400/60" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div className="flex items-start gap-1.5 mt-3">
                  <Info size={11} className="text-slate-600 flex-shrink-0 mt-0.5" />
                  <p className="text-[10px] text-slate-600 leading-relaxed">{t('settings_cost_disclaimer')}</p>
                </div>
              </>
            )
          })()}
      </Section>
      )}

      {activeTab === 'team' && isAdmin && (
      <Section icon={Users} title={t('settings_team_section')}>
        <div className="flex items-start justify-between gap-3 -mt-2">
          <p className="text-sm text-slate-400 leading-relaxed">{t('settings_team_desc')}</p>
          <button
            onClick={loadTeamUsage}
            disabled={teamLoading}
            className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                       px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 transition
                       disabled:opacity-50 flex-shrink-0"
          >
            <RefreshCw size={12} className={teamLoading ? 'animate-spin' : ''} />
            {t('settings_team_refresh')}
          </button>
        </div>

        {teamError ? (
          <p className="text-xs text-warn bg-warn/8 border border-warn/20 rounded-lg px-3 py-2.5">{teamError}</p>
        ) : teamLoading && !teamUsage ? (
          <p className="text-xs text-slate-500">{t('settings_team_loading')}</p>
        ) : teamUsage?.enabled === false ? (
          <p className="text-xs text-slate-500">{t('settings_team_unavailable')}</p>
        ) : teamUsage?.users?.length ? (
          <>
            {/* Total équipe — mois en cours */}
            {(() => {
              const totalMonth = teamUsage.users.reduce((s, u) => s + (u.spend?.month || 0), 0)
              const totalDay   = teamUsage.users.reduce((s, u) => s + (u.spend?.day || 0), 0)
              return (
                <div className="flex flex-wrap gap-6 pb-4 border-b border-navy-700/40">
                  <div>
                    <p className="text-xs text-slate-500">{t('settings_team_total_month')}</p>
                    <p className="text-2xl font-bold text-white tabular-nums">€{totalMonth.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{t('settings_team_total_day')}</p>
                    <p className="text-2xl font-bold text-white tabular-nums">€{totalDay.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">{t('settings_team_accounts')}</p>
                    <p className="text-2xl font-bold text-white tabular-nums">{teamUsage.users.length}</p>
                  </div>
                </div>
              )
            })()}

            {/* Tableau par compte */}
            <div className="space-y-2.5">
              {teamUsage.users.map((u) => {
                const effectiveMonthCap = u.cap?.month ?? MONTHLY_CAP
                const effectiveDayCap   = u.cap?.day   ?? DAILY_CAP
                const monthPct = Math.min(100, ((u.spend?.month || 0) / effectiveMonthCap) * 100)
                const reached  = (u.spend?.month || 0) >= effectiveMonthCap
                const isExpanded = !!expandedIds[u.id]
                return (
                  <div key={u.id} className="rounded-xl border border-navy-700/40 bg-navy-900/30 px-4 py-3">
                    <div className="flex items-center justify-between gap-3 mb-1.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-400 to-cyan-500
                                        flex items-center justify-center text-navy-900 text-[11px] font-bold flex-shrink-0">
                          {u.initials || (u.name || '?').slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-200 truncate flex items-center gap-1.5">
                            {u.name}
                            {u.role === 'admin' && (
                              <span className="text-[9px] font-bold uppercase tracking-wide text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-1.5 py-0.5 rounded">
                                {t('settings_team_admin_badge')}
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">{u.username}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className={`text-sm font-mono tabular-nums ${reached ? 'text-red-400 font-semibold' : 'text-slate-200'}`}>
                            €{(u.spend?.month || 0).toFixed(2)}
                            <span className="text-slate-600"> / €{effectiveMonthCap}</span>
                          </p>
                          <p className="text-[11px] text-slate-500 tabular-nums">
                            {t('settings_quota_day')} : €{(u.spend?.day || 0).toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={() => toggleExpand(u.id)}
                          className="p-1 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-400/10 transition"
                          title="Gérer"
                        >
                          <ChevronDown size={14} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-navy-700/50">
                      <div
                        className={`h-1.5 rounded-full transition-all ${reached ? 'bg-red-400' : monthPct > 75 ? 'bg-warn/70' : 'bg-cyan-400/70'}`}
                        style={{ width: `${monthPct}%` }}
                      />
                    </div>

                    {/* Panneau de gestion (expand) */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-navy-700/40 space-y-3">
                        {/* Reset dépense */}
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-[11px] text-slate-500">{t('settings_team_reset')}</p>
                          {resetConfirm === u.id ? (
                            <div className="flex items-center gap-2">
                              <span className="text-[11px] text-warn">{t('settings_team_reset_confirm')}</span>
                              <button
                                onClick={() => handleResetSpend(u.id)}
                                disabled={!!resetLoading[u.id]}
                                className="text-[11px] font-semibold text-red-400 border border-red-400/30 px-2 py-0.5 rounded-lg hover:bg-red-400/10 transition disabled:opacity-50"
                              >
                                {resetLoading[u.id] ? '…' : t('settings_team_reset_ok')}
                              </button>
                              <button
                                onClick={() => setResetConfirm(null)}
                                className="text-[11px] text-slate-500 hover:text-slate-300 px-1 transition"
                              >✕</button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setResetConfirm(u.id)}
                              className="flex items-center gap-1.5 text-[11px] text-slate-400 border border-navy-600/50 px-2.5 py-1 rounded-lg hover:text-warn hover:border-warn/30 transition"
                            >
                              <RotateCcw size={11} /> {t('settings_team_reset')}
                            </button>
                          )}
                        </div>

                        {/* Plafonds budgétaires */}
                        <div className="space-y-2">
                          <p className="text-[11px] font-medium text-slate-500">{t('settings_team_cap_title')}</p>
                          <div className="flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-1.5">
                              <label className="text-[10px] text-slate-600 whitespace-nowrap">{t('settings_team_cap_month')}</label>
                              <input
                                type="number"
                                min="0.1"
                                step="0.5"
                                value={capEdits[u.id]?.month ?? String(effectiveMonthCap)}
                                onChange={e => setCapEdits(prev => ({ ...prev, [u.id]: { ...(prev[u.id] || {}), month: e.target.value } }))}
                                className="w-16 bg-navy-900/60 border border-navy-700/50 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-400/60 transition"
                              />
                            </div>
                            <div className="flex items-center gap-1.5">
                              <label className="text-[10px] text-slate-600 whitespace-nowrap">{t('settings_team_cap_day')}</label>
                              <input
                                type="number"
                                min="0.1"
                                step="0.1"
                                value={capEdits[u.id]?.day ?? String(effectiveDayCap)}
                                onChange={e => setCapEdits(prev => ({ ...prev, [u.id]: { ...(prev[u.id] || {}), day: e.target.value } }))}
                                className="w-16 bg-navy-900/60 border border-navy-700/50 rounded-lg px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-400/60 transition"
                              />
                            </div>
                            <button
                              onClick={() => handleCapSave(u.id, u)}
                              disabled={!!capSaving[u.id]}
                              className="flex items-center gap-1.5 text-[11px] font-semibold bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 px-2.5 py-1 rounded-lg hover:bg-cyan-400/20 transition disabled:opacity-50"
                            >
                              {capSaved[u.id]
                                ? <><Check size={10} /> {t('settings_team_cap_saved')}</>
                                : capSaving[u.id] ? '…' : t('settings_team_cap_save')}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div className="flex items-start gap-1.5 mt-1">
              <Info size={11} className="text-slate-600 flex-shrink-0 mt-0.5" />
              <p className="text-[10px] text-slate-600 leading-relaxed">{t('settings_team_disclaimer')}</p>
            </div>
          </>
        ) : (
          <p className="text-xs text-slate-500">{t('settings_team_empty')}</p>
        )}
      </Section>
      )}

      {activeTab === 'legal' && (
      <Section icon={Scale} title={t('settings_legal_section')}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
            {[
              { to: '/mentions-legales',          labelKey: 'legal_mentions',  descKey: 'settings_legal_mentions_desc' },
              { to: '/politique-confidentialite',  labelKey: 'legal_privacy',   descKey: 'settings_legal_privacy_desc' },
              { to: '/conditions-utilisation',     labelKey: 'legal_cgu',       descKey: 'settings_legal_cgu_desc' },
            ].map(({ to, labelKey, descKey }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center justify-between gap-3 py-3 px-3 rounded-xl
                           border border-white/5 hover:border-cyan-400/20 hover:bg-white/3 transition group"
              >
                <div>
                  <p className="text-sm font-medium text-slate-200 group-hover:text-white transition">{t(labelKey)}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{t(descKey)}</p>
                </div>
                <ChevronRight size={14} className="text-slate-600 group-hover:text-cyan-400 transition flex-shrink-0" />
              </Link>
            ))}
          </div>
      </Section>
      )}
      </div>

      {/* Marqueur de build — vérifie que l'appareil charge la dernière version */}
      <p className="text-[10px] text-slate-600 text-center mt-6">
        Build {typeof __APP_BUILD__ !== 'undefined' ? __APP_BUILD__ : '—'}
      </p>
    </div>
  )
}
