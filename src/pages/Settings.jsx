import { Key, Palette, Globe } from 'lucide-react'
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
  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
    <div className="flex-1">
      <p className="text-sm font-medium text-slate-200">{label}</p>
      {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
    </div>
    <div className="flex-shrink-0 w-full sm:w-auto">{children}</div>
  </div>
)

export default function Settings() {
  return (
    <div className="max-w-2xl space-y-4 animate-fade-in">
      <Section icon={Key} title="API & Intégrations">
        <Field label="Clé API IA" description="Clé d'accès pour l'assistant et les analyses">
          <input
            type="password"
            placeholder="sk-ant-..."
            className="w-full sm:w-64 bg-navy-900/60 border border-navy-700/50 rounded-lg px-3 py-2
                       text-sm text-slate-300 placeholder-slate-600
                       focus:outline-none focus:border-cyan-400/50 transition"
          />
        </Field>
        <Field label="Puissance IA" description="Niveau de traitement utilisé pour les analyses">
          <select className="w-full sm:w-48 bg-navy-900/60 border border-navy-700/50 rounded-lg px-3 py-2
                             text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition">
            <option value="standard">Standard</option>
            <option value="performance">Performance</option>
            <option value="ultra">Ultra</option>
          </select>
        </Field>
        <div className="flex justify-end">
          <Button size="sm">Enregistrer</Button>
        </div>
      </Section>

      <Section icon={Globe} title="Données & Région">
        <Field label="Devise" description="Monnaie par défaut pour les rapports">
          <select className="w-full sm:w-32 bg-navy-900/60 border border-navy-700/50 rounded-lg px-3 py-2
                             text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition">
            <option>EUR (€)</option>
            <option>GBP (£)</option>
            <option>CHF</option>
          </select>
        </Field>
        <Field label="Langue" description="Langue de l'interface et des rapports">
          <select className="w-full sm:w-32 bg-navy-900/60 border border-navy-700/50 rounded-lg px-3 py-2
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
