import { useState } from 'react'
import { Key, Palette, Globe, Check, Monitor, Sun } from 'lucide-react'
import Button from '@/components/ui/Button'

const Section = ({ icon: Icon, title, children }) => (
  <div className="glass-card overflow-hidden">
    <div className="flex items-center gap-2.5 px-5 py-4 border-b border-navy-700/50 bg-navy-900/20">
      <div className="w-8 h-8 rounded-lg bg-cyan-400/10 border border-cyan-400/15 flex items-center justify-center flex-shrink-0">
        <Icon size={15} className="text-cyan-400" />
      </div>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
    </div>
    <div className="p-5 space-y-5">
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

const DENSITY_OPTIONS = ['Compact', 'Normal', 'Large']

export default function Settings() {
  const [saved, setSaved] = useState(false)
  const [density, setDensity] = useState(1)

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl space-y-4 animate-fade-in">

      <Section icon={Key} title="API & Intégrations">
        <Field label="Clé API IA" description="Clé d'accès pour l'assistant intelligent et les analyses de marché">
          <input
            type="password"
            placeholder="sk-ant-..."
            className="w-full sm:w-64 bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                       text-sm text-slate-300 placeholder-slate-600
                       focus:outline-none focus:border-cyan-400/50 focus:ring-1 focus:ring-cyan-400/10 transition"
          />
        </Field>
        <Field label="Puissance IA" description="Niveau de traitement utilisé pour les analyses et générations">
          <select className="w-full sm:w-48 bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                             text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition">
            <option value="standard">Standard</option>
            <option value="performance">Performance</option>
            <option value="ultra">Ultra</option>
          </select>
        </Field>
        <div className="flex justify-end pt-1">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold
                       bg-gradient-to-r from-cyan-400 to-cyan-500 text-navy-900
                       hover:from-cyan-300 hover:to-cyan-400 active:scale-95 transition-all"
          >
            {saved ? <><Check size={14} /> Enregistré</> : 'Enregistrer'}
          </button>
        </div>
      </Section>

      <Section icon={Palette} title="Apparence">
        <Field label="Thème" description="Mode d'affichage de l'interface">
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-cyan-400/10 border border-cyan-400/30 text-cyan-400 text-xs font-semibold">
              <Monitor size={13} /> Sombre
            </button>
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-navy-600/50 text-slate-500 text-xs font-medium hover:text-slate-300 transition">
              <Sun size={13} /> Clair
            </button>
          </div>
        </Field>
        <Field label="Densité d'affichage" description="Espacement et taille des éléments de l'interface">
          <div className="flex gap-1 p-1 bg-navy-900/60 rounded-xl border border-navy-700/40">
            {DENSITY_OPTIONS.map((d, i) => (
              <button
                key={d}
                onClick={() => setDensity(i)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  density === i
                    ? 'bg-cyan-400/15 text-cyan-400'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </Field>
      </Section>

      <Section icon={Globe} title="Données & Région">
        <Field label="Devise" description="Monnaie par défaut pour les rapports et analyses de prix">
          <select className="w-full sm:w-36 bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                             text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition">
            <option>EUR (€)</option>
            <option>GBP (£)</option>
            <option>CHF</option>
          </select>
        </Field>
        <Field label="Langue" description="Langue de l'interface et des rapports générés">
          <select className="w-full sm:w-36 bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                             text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition">
            <option>Français</option>
            <option>English</option>
            <option>Deutsch</option>
          </select>
        </Field>
      </Section>
    </div>
  )
}
