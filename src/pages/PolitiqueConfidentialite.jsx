import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'

export default function PolitiqueConfidentialite() {
  const { t } = useSettings()

  return (
    <div className="min-h-[100dvh] bg-navy-900 flex flex-col">
      <header className="sticky top-0 z-10 bg-navy-900/95 backdrop-blur border-b border-white/7 px-4 py-3 flex items-center gap-3">
        <Link to="/login" className="text-slate-400 hover:text-white transition">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-sm font-semibold text-white">{t('legal_privacy')}</h1>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-8">
        <div className="glass-card px-4 py-3 border-cyan-400/20 bg-cyan-400/4">
          <p className="text-xs text-cyan-400">
            <strong>Dernière mise à jour :</strong> {new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Conformément au Règlement Général sur la Protection des Données (RGPD — UE 2016/679) et à la loi Informatique et Libertés.
          </p>
        </div>

        <Section title="1. Responsable du traitement">
          <p className="text-sm text-slate-400 leading-relaxed">
            Le responsable du traitement des données personnelles est <strong className="text-slate-200">Autobuyunion SAS</strong>, [adresse], France. Contact DPO : <strong className="text-slate-200">privacy@autobuyunion.eu</strong>
          </p>
        </Section>

        <Section title="2. Données collectées et finalités">
          <p className="text-sm text-slate-400 leading-relaxed mb-3">
            Ce portail est une application à usage interne réservée aux membres Autobuyunion. Les données traitées sont limitées au strict nécessaire :
          </p>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-2 pr-4 text-slate-400 font-semibold">Donnée</th>
                <th className="text-left py-2 pr-4 text-slate-400 font-semibold">Finalité</th>
                <th className="text-left py-2 text-slate-400 font-semibold">Base légale</th>
              </tr>
            </thead>
            <tbody className="text-slate-400">
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4">Identifiant de connexion</td>
                <td className="py-2 pr-4">Authentification au portail</td>
                <td className="py-2">Exécution du contrat</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4">Session locale (localStorage)</td>
                <td className="py-2 pr-4">Maintien de la connexion</td>
                <td className="py-2">Intérêt légitime</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-2 pr-4">Préférences d'interface</td>
                <td className="py-2 pr-4">Langue, thème, devise</td>
                <td className="py-2">Consentement implicite</td>
              </tr>
              <tr>
                <td className="py-2 pr-4">Clé API (optionnelle)</td>
                <td className="py-2 pr-4">Connexion assistant IA</td>
                <td className="py-2">Consentement explicite</td>
              </tr>
            </tbody>
          </table>
          <p className="text-[11px] text-slate-500 mt-3">
            Aucune donnée n'est transmise à des tiers à des fins publicitaires ou commerciales.
          </p>
        </Section>

        <Section title="3. Stockage des données">
          <p className="text-sm text-slate-400 leading-relaxed">
            Toutes les données de préférences et de session sont stockées <strong className="text-slate-200">exclusivement sur votre appareil</strong> (localStorage du navigateur). Aucune base de données centralisée ne conserve vos données personnelles d'utilisation.
          </p>
          <p className="text-sm text-slate-400 leading-relaxed mt-3">
            Les échanges avec l'assistant IA (Claude d'Anthropic) sont traités via leur API. Consultez la <a href="https://www.anthropic.com/privacy" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">politique de confidentialité d'Anthropic</a> pour les conditions applicables.
          </p>
        </Section>

        <Section title="4. Durée de conservation">
          <div className="space-y-2">
            <DataRow item="Session de connexion" duration="Jusqu'à déconnexion ou effacement du navigateur" />
            <DataRow item="Préférences d'interface" duration="Jusqu'à effacement manuel ou du navigateur" />
            <DataRow item="Clé API" duration="Jusqu'à suppression par l'utilisateur dans Paramètres" />
          </div>
        </Section>

        <Section title="5. Vos droits (RGPD)">
          <p className="text-sm text-slate-400 leading-relaxed mb-3">
            Conformément au RGPD, vous disposez des droits suivants :
          </p>
          <ul className="space-y-1.5 text-sm text-slate-400">
            {[
              ['Droit d\'accès', 'Obtenir une copie de vos données personnelles'],
              ['Droit de rectification', 'Corriger des données inexactes'],
              ['Droit à l\'effacement', 'Supprimer vos données (effacez le localStorage de votre navigateur)'],
              ['Droit à la portabilité', 'Recevoir vos données dans un format structuré'],
              ['Droit d\'opposition', 'Vous opposer à certains traitements'],
            ].map(([right, desc]) => (
              <li key={right} className="flex items-start gap-2">
                <span className="text-cyan-400 mt-0.5 flex-shrink-0">✓</span>
                <span><strong className="text-slate-300">{right} :</strong> {desc}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-slate-400 mt-3">
            Pour exercer vos droits : <strong className="text-slate-200">privacy@autobuyunion.eu</strong>
          </p>
          <p className="text-[11px] text-slate-500 mt-2">
            En cas de réclamation non résolue, vous pouvez saisir la <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">CNIL</a> (Commission Nationale de l'Informatique et des Libertés).
          </p>
        </Section>

        <Section title="6. Cookies et traceurs">
          <p className="text-sm text-slate-400 leading-relaxed">
            Ce portail n'utilise <strong className="text-slate-200">pas de cookies tiers</strong> ni de traceurs publicitaires. Seuls des mécanismes de stockage local (localStorage) sont utilisés pour le fonctionnement technique de l'application.
          </p>
          <p className="text-sm text-slate-400 leading-relaxed mt-3">
            Ces données techniques sont exemptées de consentement préalable selon les lignes directrices de la CNIL (cookies strictement nécessaires au service).
          </p>
        </Section>

        <Section title="7. Sécurité">
          <p className="text-sm text-slate-400 leading-relaxed">
            Autobuyunion SAS met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données : connexion HTTPS, protection anti-force brute sur l'authentification, aucune transmission de mot de passe en clair vers des serveurs.
          </p>
        </Section>

        <div className="pt-4 flex gap-4 text-xs text-slate-600">
          <Link to="/mentions-legales" className="hover:text-cyan-400 transition">
            {t('legal_mentions')}
          </Link>
          <span>·</span>
          <span>© {new Date().getFullYear()} Autobuyunion SAS — RGPD</span>
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

function DataRow({ item, duration }) {
  return (
    <div className="flex flex-col sm:flex-row gap-0.5 sm:gap-3 py-1.5 border-b border-white/5 last:border-0">
      <span className="text-xs font-semibold text-slate-300 sm:w-48 flex-shrink-0">{item}</span>
      <span className="text-xs text-slate-500">{duration}</span>
    </div>
  )
}
