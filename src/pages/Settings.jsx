import { Key, Palette, Bell, Globe } from 'lucide-react'
import Button from '@/components/ui/Button'

const Section = ({ icon: Icon, title, children }) => (
  <div className="glass-card p-5 space-y-4">
    <div className="flex items-center gap-2 pb-3 border-b border-navy-700/50">
      <Icon size={16} className="text-cyan-400" />
      <h3 className="text-sm font-semibold text-white">{title}</h3>
    </div>
    {children}
  </div>
)

const Field = ({ label, description, children }) => (
  <div className="flex items-start justify-between gap-4">
    <div className="flex-1">
      <p className="text-sm font-medium text-slate-200">{label}</p>
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
    </div>
    <div className="flex-shrink-0">{children}</div>
  </div>
)

export default function Settings() {
  return (
    <div className="max-w-2xl space-y-4 animate-fade-in">
      <Section icon={Key} title="API & Intégrations">
        <Field label="Clé API Anthropic" description="Utilisée pour l'assistant IA">
          <input
            type="password"
            placeholder="sk-ant-..."
            className="w-64 bg-navy-900/60 border border-navy-700/50 rounded-lg px-3 py-1.5
                       text-sm text-slate-300 placeholder-slate-600
                       focus:outline-none focus:border-cyan-400/50 transition"
          />
        </Field>
        <Field label="Modèle Claude" description="Modèle utilisé pour les réponses">
          <select className="w-48 bg-navy-900/60 border border-navy-700/50 rounded-lg px-3 py-1.5
                             text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition">
            <option>claude-sonnet-4-6</option>
            <option>claude-opus-4-7</option>
            <option>claude-haiku-4-5</option>
          </select>
        </Field>
        <div className="flex justify-end">
          <Button size="sm">Enregistrer</Button>
        </div>
      </Section>

      <Section icon={Bell} title="Notifications">
        <Field label="Alertes de performance" description="Notifier si les ventes baissent de plus de 10 %">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" defaultChecked />
            <div className="w-9 h-5 bg-navy-700 peer-focus:ring-2 peer-focus:ring-cyan-400/30 rounded-full peer
                            peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-0.5
                            after:bg-white after:rounded-full after:h-4 after:w-4 after:transition
                            peer-checked:bg-cyan-400" />
          </label>
        </Field>
        <Field label="Rapports hebdomadaires" description="Envoi automatique chaque lundi">
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" className="sr-only peer" />
            <div className="w-9 h-5 bg-navy-700 peer-focus:ring-2 peer-focus:ring-cyan-400/30 rounded-full peer
                            peer-checked:after:translate-x-full after:absolute after:top-0.5 after:left-0.5
                            after:bg-white after:rounded-full after:h-4 after:w-4 after:transition
                            peer-checked:bg-cyan-400" />
          </label>
        </Field>
      </Section>

      <Section icon={Globe} title="Données & Région">
        <Field label="Devise" description="Monnaie par défaut pour les rapports">
          <select className="w-32 bg-navy-900/60 border border-navy-700/50 rounded-lg px-3 py-1.5
                             text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition">
            <option>EUR (€)</option>
            <option>GBP (£)</option>
            <option>CHF</option>
          </select>
        </Field>
        <Field label="Langue" description="Langue de l'interface et des rapports">
          <select className="w-32 bg-navy-900/60 border border-navy-700/50 rounded-lg px-3 py-1.5
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
