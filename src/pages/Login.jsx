import { useState } from 'react'
import { Car, Eye, EyeOff, Lock, User, AlertCircle } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'

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
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[60vw] h-[60vw] rounded-full bg-cyan-400/5 blur-3xl" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50vw] h-[50vw] rounded-full bg-cyan-400/3 blur-3xl" />
      </div>

      <div className="w-full max-w-sm relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-cyan-400/10 border border-cyan-400/30
                          flex items-center justify-center mb-4 shadow-lg shadow-cyan-400/10">
            <Car size={30} className="text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Autobuyunion</h1>
          <p className="text-sm text-slate-400 mt-1">Portail Membres — Accès privé</p>
        </div>

        {/* Card */}
        <div className="glass-card p-6 md:p-8">
          <h2 className="text-base font-semibold text-white mb-6">Connexion à votre espace</h2>

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
                  autoFocus
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
              className="w-full mt-2 py-3 bg-cyan-400 text-navy-900 text-sm font-bold rounded-xl
                         hover:bg-cyan-300 active:scale-[0.98] transition-all
                         disabled:opacity-40 disabled:pointer-events-none
                         flex items-center justify-center gap-2"
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
