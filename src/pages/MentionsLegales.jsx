import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { useSettings } from '@/contexts/SettingsContext'

export default function MentionsLegales() {
  const { t } = useSettings()
  return (
    <div className="min-h-[100dvh] bg-navy-900 flex flex-col">
      <header className="sticky top-0 z-10 bg-navy-900/95 backdrop-blur border-b border-white/7 px-4 py-3 flex items-center gap-3">
        <Link to="/login" className="text-slate-400 hover:text-white transition">
          <ArrowLeft size={16} />
        </Link>
        <h1 className="text-sm font-semibold text-white">{t('legal_mentions')}</h1>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-8 space-y-8">
        <Section title="Éditeur du site">
          <Row label="Dénomination sociale" value="Autobuyunion SAS" />
          <Row label="Forme juridique" value="Société par Actions Simplifiée (SAS)" />
          <Row label="Capital social" value="[Capital social en €]" />
          <Row label="SIREN / SIRET" value="[Numéro SIREN/SIRET]" />
          <Row label="RCS" value="[Ville d'immatriculation]" />
          <Row label="Siège social" value="[Adresse complète], France" />
          <Row label="Contact" value="contact@autobuyunion.eu" />
          <Row label="Directeur de la publication" value="[Nom du directeur de la publication]" />
        </Section>

        <Section title="Hébergement">
          <Row label="Hébergeur" value="Vercel Inc." />
          <Row label="Adresse" value="340 Pine Street, Suite 701, San Francisco, CA 94104, États-Unis" />
          <Row label="Site web" value="https://vercel.com" />
        </Section>

        <Section title="Propriété intellectuelle">
          <p className="text-sm text-slate-400 leading-relaxed">
            L'ensemble des contenus présents sur ce portail (textes, images, logotypes, fonctionnalités, codes source) sont la propriété exclusive d'Autobuyunion SAS ou de ses partenaires, et sont protégés par les lois françaises et internationales relatives à la propriété intellectuelle.
          </p>
          <p className="text-sm text-slate-400 leading-relaxed mt-3">
            Toute reproduction, représentation, modification, publication ou adaptation de tout ou partie des éléments du portail, quel que soit le moyen ou le procédé utilisé, est interdite sans autorisation écrite préalable d'Autobuyunion SAS.
          </p>
        </Section>

        <Section title="Responsabilité">
          <p className="text-sm text-slate-400 leading-relaxed">
            Les informations et outils disponibles sur ce portail sont fournis à titre indicatif. Autobuyunion SAS s'efforce d'assurer l'exactitude des données (barèmes fiscaux, prix de marché, calculs TCO), mais ne saurait être tenu responsable des erreurs ou omissions, ni des résultats obtenus par l'utilisation de ces informations.
          </p>
          <p className="text-sm text-slate-400 leading-relaxed mt-3">
            Les barèmes de malus CO₂ et autres données fiscales sont susceptibles d'évoluer. L'utilisateur est invité à consulter les autorités compétentes de chaque pays avant toute décision commerciale.
          </p>
        </Section>

        <Section title="Droit applicable">
          <p className="text-sm text-slate-400 leading-relaxed">
            Les présentes mentions légales sont soumises au droit français. En cas de litige, et à défaut de résolution amiable, les tribunaux français seront seuls compétents.
          </p>
        </Section>

        <div className="pt-4 flex gap-4 text-xs text-slate-600">
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
