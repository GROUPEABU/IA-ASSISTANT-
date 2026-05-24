import { useState } from 'react'
import { Eye, EyeOff, Lock, User, AlertCircle, Sparkles } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import Logo from '@/components/ui/Logo'

export default function Login() {
  const { login } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!username.trim() || !password.trim()) return
    setLoading(true)
    setError('')
    await new Promise((r) => setTimeout(r, 400))
    const ok = login(username, password)
    if (!ok) {
      setError('Identifiants incorrects. Veuillez réessayer.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[100dvh] bg-navy-900 flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Dot grid */}
        <div className="absolute inset-0 dot-grid opacity-30" />
        {/* Gradient orbs */}
        <div className="absolute -top-1/4 -left-1/4 w-[70vw] h-[70vw] rounded-full bg-cyan-400/6 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 w-[60vw] h-[60vw] rounded-full bg-blue-500/5 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40vw] h-[40vw] rounded-full bg-cyan-400/3 blur-3xl" />
        {/* Decorative ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full border border-cyan-400/5" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full border border-cyan-400/3" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo & branding */}
        <div className="flex flex-col items-center mb-8">
          <div className="mb-5 relative">
            <div className="absolute inset-0 rounded-full bg-cyan-400/15 blur-xl scale-150" />
            <Logo size="md" className="relative" />
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-400/10 border border-cyan-400/20 mb-2">
            <Sparkles size={11} className="text-cyan-400" />
            <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-widest">Portail Membres</span>
          </div>
          <p className="text-xs text-slate-500">1er Groupe Européen d'Achats Automobiles</p>
        </div>

        {/* Card */}
        <div className="glass-card p-6 md:p-8 shadow-2xl shadow-black/40">
          <h2 className="text-base font-semibold text-white mb-1">Connexion à votre espace</h2>
          <p className="text-xs text-slate-500 mb-6">Accès réservé aux membres Autobuyunion</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Identifiant
              </label>
              <div className="relative">
                <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Votre identifiant"
                  autoComplete="username"
                  className="w-full bg-navy-900/80 border border-navy-700/60 rounded-xl
                             pl-9 pr-3 py-3 text-sm text-white placeholder-slate-600
                             focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                Mot de passe
              </label>
              <div className="relative">
                <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  autoComplete="current-password"
                  className="w-full bg-navy-900/80 border border-navy-700/60 rounded-xl
                             pl-9 pr-10 py-3 text-sm text-white placeholder-slate-600
                             focus:outline-none focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={!username.trim() || !password.trim() || loading}
              className="w-full mt-2 py-3 rounded-xl text-sm font-bold
                         bg-gradient-to-r from-cyan-400 to-cyan-500 text-navy-900
                         hover:from-cyan-300 hover:to-cyan-400 active:scale-[0.98] transition-all
                         disabled:opacity-40 disabled:pointer-events-none
                         flex items-center justify-center gap-2 shadow-lg shadow-cyan-400/20"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-navy-900/30 border-t-navy-900 rounded-full animate-spin" />
                  Connexion…
                </>
              ) : 'Se connecter'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Accès réservé aux membres Autobuyunion.<br />
          Contactez votre responsable pour obtenir vos accès.
        </p>
      </div>
    </div>
  )
}
