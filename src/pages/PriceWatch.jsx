import { useState, useRef, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Bell, Search, RotateCcw, ExternalLink, Clock, Download, FileText,
  Wifi, WifiOff, Calculator, Sparkles, ShieldCheck, Copy, Mic, TrendingDown, TrendingUp,
  FileSpreadsheet, ChevronDown, CheckSquare, Square, StopCircle, X, AlertTriangle, Share2,
} from 'lucide-react'
import { sendMessage } from '@/services/claude'
import { buildPrompt } from '@/services/veillePrixPrompt'
import { extractVehiclesSmart } from '@/services/smartImport'
import { MILEAGE_MIN_VALUES, MILEAGE_MAX_VALUES, MAKES_AS24 as MAKES, YEARS } from '@/data/vehicleFilters'
import { fmtEur, fmtRange } from '@/utils/formatters'
import { COUNTRIES } from '@/data/marketCountries'
import { sendToTool, takeBridgePayload } from '@/utils/toolBridge'
import { extractReportFigures } from '@/utils/reportFigures'
import { computeOpportunityScore } from '@/utils/opportunityScore'
import { copyReportText } from '@/utils/mdToPlainText'
import { stripLeadingReasoning, hasStructuredContent } from '@/utils/stripReportReasoning'
import { downloadCsv } from '@/utils/exportCsv'
import { getMarginTarget, setMarginTarget, MARGIN_DEFAULT, MARGIN_MIN, MARGIN_MAX } from '@/utils/marginTarget'
import { getSessionUserId, ukey } from '@/utils/userStorage'
import Spinner from '@/components/ui/Spinner'
import ErrorAlert from '@/components/ui/ErrorAlert'
import HistoryPanel from '@/components/ui/HistoryPanel'
import { mdToHtml } from '@/utils/mdToHtml'
import { useSettings } from '@/contexts/SettingsContext'
import { useHistory } from '@/hooks/useHistory'
import { useLastVehicle } from '@/hooks/useLastVehicle'
import { useExport } from '@/hooks/useExport'
import { pdfFileName } from '@/utils/exportPdf'
import { exportReportPdf } from '@/utils/exportReportPdf'
import { useToast } from '@/components/ui/Toast'

const PW_SESSION = 'abu_pw_filters'
function readPwSession(field, def) {
  try { return JSON.parse(sessionStorage.getItem(PW_SESSION))?.[field] ?? def } catch { return def }
}

// État du lot persisté par utilisateur : un import interrompu (navigation,
// fermeture) se retrouve intact au retour, avec reprise des lignes restantes.
function readBatchStore() {
  try { return JSON.parse(localStorage.getItem(ukey(getSessionUserId(), 'pw_batch_state'))) || null } catch { return null }
}

// ── Données filtres ────────────────────────────────────────────────────────────
// MAKES (forme { label, code } AS24) et YEARS : voir @/data/vehicleFilters.
// COUNTRIES : voir @/data/marketCountries (partagé avec MarketAnalysis)
const AS24_FUEL = { ES: '1', GO: '2', GP: '3', EL: '6', HY: '8', GH: '10' }
function buildAs24Url(ctry, filters) {
  if (!ctry.as24cy) return null
  const makeSlug = (filters.make || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const modelSlug = (filters.model || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const p = ['atype=C', `cy=${ctry.as24cy}`, 'damaged_listing=exclude', 'sort=standard', 'ustate=N%2CU']
  if (filters.yearMin)    p.push(`fregfrom=${filters.yearMin}`)
  if (filters.yearMax)    p.push(`fregto=${filters.yearMax}`)
  if (filters.mileageMin) p.push(`kmfrom=${filters.mileageMin}`)
  if (filters.mileageMax) p.push(`kmto=${filters.mileageMax}`)
  if (filters.fuel && AS24_FUEL[filters.fuel]) p.push(`fuel=${AS24_FUEL[filters.fuel]}`)
  const base = makeSlug ? `https://www.autoscout24.${ctry.tld}/lst/${makeSlug}${modelSlug ? '/' + modelSlug : ''}` : `https://www.autoscout24.${ctry.tld}/`
  return `${base}?${p.join('&')}`
}

// ── Analyse par lot (import CSV / Excel) ─────────────────────────────────────
// Chaque ligne du fichier relance EXACTEMENT la même analyse que la recherche
// unitaire (même buildPrompt, mêmes paramètres) — rien ne change côté prompt.
const MAX_BATCH = 30

const BATCH_FUEL_CODE = [
  [/rechargeable|phev|plug/i, 'GH'],
  [/hybride|hybrid/i, 'HY'],
  [/électrique|electrique|electric/i, 'EL'],
  [/diesel/i, 'GO'],
  [/gpl|lpg/i, 'GP'],
  [/essence|petrol|gasoline/i, 'ES'],
]

function batchRowToFilters(v) {
  const km = Number(v.mileageKm) || 0
  const fuel = (BATCH_FUEL_CODE.find(([re]) => re.test(v.fuel || '')) || [])[1] || ''
  const gearbox = /auto/i.test(v.gearbox || '') ? 'A' : /manuelle|manual/i.test(v.gearbox || '') ? 'M' : ''
  return {
    type: 'vo',
    make: String(v.make || '').trim(),
    model: String(v.model || '').trim(),
    finition: String(v.version || '').trim(),
    carrosserie: '',
    yearMin: v.year ? String(v.year) : '',
    yearMax: v.year ? String(v.year) : '',
    mileageMin: km ? String([...MILEAGE_MIN_VALUES].reverse().find((x) => x <= km) || '') : '',
    mileageMax: km ? String(MILEAGE_MAX_VALUES.find((x) => x >= km) || '') : '',
    fuel, gearbox, powerMin: '', powerMax: '',
  }
}

function batchRowLabel(v) {
  return [
    [v.make, v.model, v.version].filter(Boolean).join(' '),
    v.year,
    v.mileageKm != null ? `${Number(v.mileageKm).toLocaleString('fr-FR')} km` : null,
    v.fuel,
  ].filter(Boolean).join(' · ')
}

// ── Helpers ───────────────────────────────────────────────────────────────────
async function fetchSources(filters) {
  const params = new URLSearchParams(
    Object.fromEntries(Object.entries(filters).filter(([, v]) => v !== ''))
  )
  const res = await fetch(`/api/price-watch?${params}`)
  if (!res.ok) throw new Error(`Server error: ${res.status}`)
  return res.json()
}


// ── Composants UI ─────────────────────────────────────────────────────────────
const selectClass = `w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
  text-sm text-slate-300 focus:outline-none focus:border-cyan-400/50 transition`

function FilterSelect({ label, value, onChange, children }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} className={selectClass}>
        {children}
      </select>
    </div>
  )
}

// Marge partenaire cible — partagée via marginTarget (affichage uniquement,
// n'altère pas le prompt Veille Prix verrouillé).
// 3 000 € HT écrit dans le champ par défaut ; modifiable à la main, et si on
// vide le champ il revient au défaut.
function MarginField({ value, onChange, onReset }) {
  return (
    <div>
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">
        Marge cible € HT
      </label>
      <input
        type="number" min={MARGIN_MIN} max={MARGIN_MAX} step="100" value={value}
        onChange={e => onChange(e.target.value)} onBlur={onReset} aria-label="Marge cible € HT"
        className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                   text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 transition"
      />
      <div className="flex gap-1 mt-1.5">
        {[3000, 3500, 4000].map(p => (
          <button
            key={p} type="button" onClick={() => onChange(String(p))}
            className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border transition ${
              Number(value) === p
                ? 'bg-cyan-400/15 text-cyan-400 border-cyan-400/30'
                : 'text-slate-500 border-navy-600/50 hover:text-slate-300 hover:border-navy-500'
            }`}
          >
            {p.toLocaleString('fr-FR')}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Score d'opportunité 0-100 (calcul client, prompt non modifié) ────────────
// Un seul chiffre pour prioriser sans lire le rapport : vert ≥ 70, ambre ≥ 45,
// rouge en dessous. Le détail des composantes s'affiche au survol.
function ScoreBadge({ score, t }) {
  if (!score) return null
  const tone = score.score >= 70 ? 'bg-emerald-400/10 text-emerald-400 border-emerald-400/20'
    : score.score >= 45 ? 'bg-warn/10 text-warn border-warn/20'
    : 'bg-red-500/10 text-red-400 border-red-500/20'
  const title = [
    `${t('pw_score_pos')} : ${score.parts.positionnement}/40`,
    `${t('pw_score_roi')} : ${score.parts.rentabilite}/30`,
    `${t('pw_score_depth')} : ${score.parts.profondeur}/30`,
  ].join(' · ')
  return (
    <span title={title} className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${tone}`}>
      {t('pw_score_badge').replace('{n}', score.score)}
    </span>
  )
}

// ── Évolution prix entre deux analyses du même véhicule ──────────────────────
// fmtEur / fmtRange : voir @/utils/formatters (partagés avec l'Analyse de stock).

function EvolutionCard({ evolution, t }) {
  const { prevAt, prev, cur, prevMargin, curMargin } = evolution
  const marginChanged = prevMargin != null && curMargin != null && prevMargin !== curMargin
  const rows = [
    { label: t('pw_evol_achat'),   pMin: prev.achatMin,   pMax: prev.achatMax,   cMin: cur.achatMin,   cMax: cur.achatMax },
    { label: t('pw_evol_revente'), pMin: prev.reventeMin, pMax: prev.reventeMax, cMin: cur.reventeMin, cMax: cur.reventeMax },
  ].filter((r) => r.pMin != null && r.cMin != null)
  if (rows.length === 0) return null

  const allStable = rows.every((r) => r.cMin === r.pMin)

  return (
    <div className="glass-card p-4">
      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
        {t('pw_evol_title')} · {new Date(prevAt).toLocaleDateString()}
      </p>
      {marginChanged && (
        <p className="flex items-start gap-1.5 text-[11px] text-warn mb-2">
          <AlertTriangle size={12} className="flex-shrink-0 mt-0.5" />
          {t('pw_evol_margin_warn')
            .replace('{a}', prevMargin.toLocaleString('fr-FR'))
            .replace('{b}', curMargin.toLocaleString('fr-FR'))}
        </p>
      )}
      {allStable ? (
        <p className="text-xs text-slate-400">{t('pw_evol_stable')}</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((r) => {
            const delta = r.cMin - r.pMin
            const up = delta > 0
            return (
              <div key={r.label} className="flex items-center gap-2 flex-wrap text-xs">
                <span className="text-slate-500 w-28 flex-shrink-0">{r.label}</span>
                <span className="text-slate-400">{fmtRange(r.pMin, r.pMax)}</span>
                <span className="text-slate-600">→</span>
                <span className="text-slate-200 font-semibold">{fmtRange(r.cMin, r.cMax)}</span>
                {delta !== 0 && (
                  <span className={`flex items-center gap-1 font-bold ${up ? 'text-warn' : 'text-emerald-400'}`}>
                    {up ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {up ? '+' : ''}{delta.toLocaleString('fr-FR')} €
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function PriceWatch() {
  const { t, lang } = useSettings()
  const { toast } = useToast()
  const navigate = useNavigate()
  const resultRef = useRef(null)

  const FUELS = [
    { label: t('price_fuel_all'), code: '' },
    { label: t('price_fuel_petrol'), code: 'ES' },
    { label: t('price_fuel_diesel'), code: 'GO' },
    { label: t('price_fuel_electric'), code: 'EL' },
    { label: t('price_fuel_hybrid'), code: 'HY' },
    { label: t('price_fuel_phev'), code: 'GH' },
    { label: t('price_fuel_lpg'), code: 'GP' },
  ]

  const GEARBOXES = [
    { label: t('price_gearbox_all'), code: '' },
    { label: t('price_gearbox_manual'), code: 'M' },
    { label: t('price_gearbox_auto'), code: 'A' },
  ]

  const BODIES = [
    { label: t('price_body_all'), code: '' },
    { label: t('price_body_berline'), code: 'berline' },
    { label: t('price_body_break'), code: 'break' },
    { label: t('price_body_suv'), code: 'suvcrossover' },
    { label: t('price_body_coupe'), code: 'coupe' },
    { label: t('price_body_cabriolet'), code: 'cabriolet' },
    { label: t('price_body_monospace'), code: 'monospace' },
    { label: t('price_body_citadine'), code: 'citadine' },
    { label: t('price_body_pickup'), code: 'pickup' },
  ]

  const MILEAGE_MIN_OPTS = [
    { label: t('km_min'), value: '' },
    { label: '≥ 500 km', value: '500' },
    { label: '≥ 5 000 km', value: '5000' },
    { label: '≥ 10 000 km', value: '10000' },
    { label: '≥ 20 000 km', value: '20000' },
    { label: '≥ 30 000 km', value: '30000' },
    { label: '≥ 50 000 km', value: '50000' },
  ]
  const MILEAGE_MAX_OPTS = [
    { label: t('km_max'), value: '' },
    { label: '< 10 000 km', value: '10000' },
    { label: '< 20 000 km', value: '20000' },
    { label: '< 30 000 km', value: '30000' },
    { label: '< 50 000 km', value: '50000' },
    { label: '< 80 000 km', value: '80000' },
    { label: '< 100 000 km', value: '100000' },
    { label: '< 150 000 km', value: '150000' },
    { label: '< 200 000 km', value: '200000' },
  ]

  const POWER_MIN_OPTS = [
    { label: t('power_min'), value: '' },
    { label: '≥ 50 ch', value: '50' },
    { label: '≥ 75 ch', value: '75' },
    { label: '≥ 90 ch', value: '90' },
    { label: '≥ 100 ch', value: '100' },
    { label: '≥ 110 ch', value: '110' },
    { label: '≥ 130 ch', value: '130' },
    { label: '≥ 150 ch', value: '150' },
    { label: '≥ 170 ch', value: '170' },
    { label: '≥ 200 ch', value: '200' },
    { label: '≥ 250 ch', value: '250' },
    { label: '≥ 300 ch', value: '300' },
    { label: '≥ 400 ch', value: '400' },
  ]
  const POWER_MAX_OPTS = [
    { label: t('power_max'), value: '' },
    { label: '< 75 ch', value: '75' },
    { label: '< 90 ch', value: '90' },
    { label: '< 100 ch', value: '100' },
    { label: '< 110 ch', value: '110' },
    { label: '< 130 ch', value: '130' },
    { label: '< 150 ch', value: '150' },
    { label: '< 170 ch', value: '170' },
    { label: '< 200 ch', value: '200' },
    { label: '< 250 ch', value: '250' },
    { label: '< 300 ch', value: '300' },
    { label: '< 400 ch', value: '400' },
    { label: '< 500 ch', value: '500' },
  ]

  const [type, setType]           = useState(() => readPwSession('type', 'vo'))
  const [make, setMake]           = useState(() => readPwSession('make', ''))
  const [model, setModel]         = useState(() => readPwSession('model', ''))
  const [finition, setFinition]   = useState(() => readPwSession('finition', ''))
  const [carrosserie, setCarrosserie] = useState(() => readPwSession('carrosserie', ''))
  const [yearMin, setYearMin]     = useState(() => readPwSession('yearMin', ''))
  const [yearMax, setYearMax]     = useState(() => readPwSession('yearMax', ''))
  const [mileageMin, setMileageMin] = useState(() => readPwSession('mileageMin', ''))
  const [mileageMax, setMileageMax] = useState(() => readPwSession('mileageMax', ''))
  const [fuel, setFuel]           = useState(() => readPwSession('fuel', ''))
  const [gearbox, setGearbox]     = useState(() => readPwSession('gearbox', ''))
  const [powerMin, setPowerMin]   = useState(() => readPwSession('powerMin', ''))
  const [powerMax, setPowerMax]   = useState(() => readPwSession('powerMax', ''))
  const [country, setCountry]     = useState(() => readPwSession('country', 'FR'))
  const [pwMode, setPwMode]       = useState('search') // 'search' | 'file'
  const [margin, setMargin]       = useState(getMarginTarget)

  const handleMargin = (raw) => {
    const v = Number(raw) || 0
    setMargin(raw === '' ? '' : v)
    if (v >= MARGIN_MIN && v <= MARGIN_MAX) setMarginTarget(v)
  }

  // Champ vidé ou valeur hors plage → on revient au défaut 3 000 € HT.
  const resetMarginIfInvalid = () => {
    const v = Number(margin) || 0
    if (!(v >= MARGIN_MIN && v <= MARGIN_MAX)) {
      setMargin(MARGIN_DEFAULT)
      setMarginTarget(MARGIN_DEFAULT)
    }
  }

  const [loading, setLoading]     = useState(false)   // avant le 1er token
  const [streaming, setStreaming] = useState(false)   // tokens en cours d'arrivée
  const [report, setReport]       = useState('')      // texte Markdown streamé
  const [hasLiveData, setHasLiveData] = useState(false)
  const [truncated, setTruncated] = useState(false)   // rapport coupé (plafond de tokens atteint)
  const [fetchedAt, setFetchedAt] = useState(null)
  const [sources, setSources]     = useState([])
  const [error, setError]         = useState(null)
  const [centraleUrl, setCentraleUrl] = useState('')
  const [searchLabel, setSearchLabel] = useState('')
  const [evolution, setEvolution] = useState(null) // diff vs analyse précédente du même véhicule
  const [reportMargin, setReportMargin] = useState(null) // marge utilisée pour le rapport affiché

  // Analyse par lot (fichier CSV / Excel)
  const batchFileRef = useRef(null)
  const batchCancelRef = useRef(false)
  const [batchParsing, setBatchParsing] = useState(false)
  const [batch, setBatch] = useState(() => readBatchStore()?.batch ?? null) // { rows, fileName, source }
  const [batchSel, setBatchSel] = useState(() => new Set(readBatchStore()?.sel ?? []))
  const [batchRunning, setBatchRunning] = useState(false)
  const [batchResults, setBatchResults] = useState(() => {
    const r = readBatchStore()?.results
    // Une ligne « en cours » au moment de la fermeture redevient « en attente ».
    return r ? r.map((x) => (x.status === 'running' ? { ...x, status: 'pending' } : x)) : null
  })
  const [batchOpen, setBatchOpen] = useState(null)  // index du rapport déplié
  const [batchEta, setBatchEta] = useState(null)    // minutes restantes estimées

  // Comparaison multi-marchés (jusqu'à 2 pays en plus du marché principal)
  const [extraCountries, setExtraCountries] = useState([])
  const [multiResults, setMultiResults] = useState(null)
  const [multiOpen, setMultiOpen] = useState(null)
  const [multiRunning, setMultiRunning] = useState(false)

  const { history, add: addHistory, remove: removeHistory, clear: clearHistory, togglePin } = useHistory('pricewatch')
  const { save: saveLastVehicle } = useLastVehicle()
  const { exporting, withExporting } = useExport()

  // Synchronise le formulaire avec un jeu de filtres (restauration / pont inter-outils).
  const applyFilters = (f) => {
    setType(f.type || 'vo'); setMake(f.make || ''); setModel(f.model || ''); setFinition(f.finition || '')
    setCarrosserie(f.carrosserie || ''); setYearMin(f.yearMin || ''); setYearMax(f.yearMax || '')
    setMileageMin(f.mileageMin || ''); setMileageMax(f.mileageMax || ''); setFuel(f.fuel || '')
    setGearbox(f.gearbox || ''); setPowerMin(f.powerMin || ''); setPowerMax(f.powerMax || '')
    setCountry(f.country || 'FR')
  }

  // Persist filter state across page navigations (session-scoped)
  useEffect(() => {
    try {
      sessionStorage.setItem(PW_SESSION, JSON.stringify(
        { type, make, model, finition, carrosserie, yearMin, yearMax, mileageMin, mileageMax, fuel, gearbox, powerMin, powerMax, country }
      ))
    } catch {}
  }, [type, make, model, finition, carrosserie, yearMin, yearMax, mileageMin, mileageMax, fuel, gearbox, powerMin, powerMax, country])

  // Persiste l'état du lot (fichier, sélection, résultats) — reprise possible
  // après navigation ou fermeture. Supprimé quand le lot est fermé.
  useEffect(() => {
    try {
      const key = ukey(getSessionUserId(), 'pw_batch_state')
      if (!batch) localStorage.removeItem(key)
      else localStorage.setItem(key, JSON.stringify({ batch, sel: [...batchSel], results: batchResults }))
    } catch {}
  }, [batch, batchSel, batchResults])

  // Pont inter-outils : filtres reçus (Analyse de stock, Hub) → pré-remplit et
  // lance ; restoreId (Hub « Reprendre ») → restaure l'analyse archivée.
  useEffect(() => {
    const p = takeBridgePayload('/price-watch')
    if (!p) return
    if (p.filters) {
      applyFilters(p.filters)
      search(p.filters)
    } else if (p.restoreId != null) {
      const item = history.find((h) => (h.id ?? h.savedAt) === p.restoreId)
      if (item) restore(item)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const canSearch = make.trim() || model.trim()

  const search = async (overrides = {}) => {
    if (!canSearch && !overrides.make && !overrides.model) return
    const rawMake = overrides.make ?? make
    const matchedMake = MAKES.find(m => m.label.toLowerCase() === rawMake.toLowerCase())
    const resolvedMake = matchedMake ? matchedMake.code : rawMake
    const filters = { make: resolvedMake, model, finition, carrosserie, type, yearMin, yearMax, mileageMin, mileageMax, fuel, gearbox, powerMin, powerMax, ...overrides }
    // Libellés lisibles des filtres énumérés, pour que l'analyse les applique en STRICT.
    filters.fuelLabel        = filters.fuel ? FUELS.find(f => f.code === filters.fuel)?.label || '' : ''
    filters.gearboxLabel     = filters.gearbox ? GEARBOXES.find(g => g.code === filters.gearbox)?.label || '' : ''
    filters.carrosserieLabel = filters.carrosserie ? BODIES.find(b => b.code === filters.carrosserie)?.label || '' : ''
    const ctry = COUNTRIES.find(c => c.code === (overrides.country ?? country)) ?? COUNTRIES[0]

    const vehicleDesc = [
      rawMake, filters.model, filters.finition,
      filters.yearMin && filters.yearMax ? `${filters.yearMin}–${filters.yearMax}`
        : filters.yearMin ? `depuis ${filters.yearMin}` : filters.yearMax ? `jusqu'en ${filters.yearMax}` : '',
      (filters.mileageMin || filters.mileageMax)
        ? filters.mileageMin && filters.mileageMax
          ? `${Number(filters.mileageMin).toLocaleString('fr-FR')}–${Number(filters.mileageMax).toLocaleString('fr-FR')} km`
          : filters.mileageMin ? `> ${Number(filters.mileageMin).toLocaleString('fr-FR')} km`
          : `< ${Number(filters.mileageMax).toLocaleString('fr-FR')} km`
        : '',
      filters.fuel ? FUELS.find(f => f.code === filters.fuel)?.label : '',
      filters.gearbox ? GEARBOXES.find(g => g.code === filters.gearbox)?.label : '',
      filters.carrosserie ? BODIES.find(b => b.code === filters.carrosserie)?.label : '',
      (filters.powerMin || filters.powerMax)
        ? filters.powerMin && filters.powerMax
          ? `${filters.powerMin}–${filters.powerMax} ch`
          : filters.powerMin ? `≥ ${filters.powerMin} ch` : `< ${filters.powerMax} ch`
        : '',
    ].filter(Boolean).join(' · ')

    const label = [
      filters.make, filters.model, filters.finition,
      filters.yearMin && `${filters.yearMin}${filters.yearMax ? '–'+filters.yearMax : '+'}`,
      (filters.mileageMin || filters.mileageMax) && (
        filters.mileageMin && filters.mileageMax
          ? `${Number(filters.mileageMin).toLocaleString('fr-FR')}–${Number(filters.mileageMax).toLocaleString('fr-FR')} km`
          : filters.mileageMin ? `> ${Number(filters.mileageMin).toLocaleString('fr-FR')} km`
          : `< ${Number(filters.mileageMax).toLocaleString('fr-FR')} km`
      ),
      (filters.powerMin || filters.powerMax) && (
        filters.powerMin && filters.powerMax
          ? `${filters.powerMin}–${filters.powerMax} ch`
          : filters.powerMin ? `≥ ${filters.powerMin} ch` : `< ${filters.powerMax} ch`
      ),
      ctry.label,
    ].filter(Boolean).join(' · ')

    saveLastVehicle([rawMake, model, finition].filter(Boolean).join(' '))
    setSearchLabel(label)
    setLoading(true)
    setStreaming(false)
    setError(null)
    setReport('')
    setHasLiveData(false)
    setTruncated(false)
    setEvolution(null)
    setMultiResults(null)
    setMultiOpen(null)
    const marginUsed = getMarginTarget()

    try {
      // Liens de référence — for non-France markets, use AutoScout24 country URL.
      if (ctry.code === 'FR') {
        const meta = await fetchSources(filters)
        setFetchedAt(meta.fetchedAt)
        setCentraleUrl(meta.centraleUrl || '')
        setSources(meta.sources || [])
      } else {
        const as24Url = buildAs24Url(ctry, filters)
        const q = encodeURIComponent([filters.make, filters.model].filter(Boolean).join(' '))
        const SECONDARY = {
          DE: { name: 'mobile.de', url: `https://suchen.mobile.de/auto/search.html?makeModelVariant1.makeName=${encodeURIComponent(filters.make || '')}&makeModelVariant1.searchText=${encodeURIComponent(filters.model || '')}` },
          BE: { name: '2dehands.be', url: `https://www.2dehands.be/q/${q}/` },
          NL: { name: 'Marktplaats.nl', url: `https://www.marktplaats.nl/q/${q}/` },
          IT: { name: 'Subito.it', url: `https://www.subito.it/annunci-italia/vendita/usato/auto/?q=${q}` },
          ES: { name: 'Coches.net', url: `https://www.coches.net/segunda-mano/?q=${q}` },
          PT: { name: 'CustoJusto.pt', url: `https://www.custojusto.pt/portugal/carros-e-motos/carros/?q=${q}` },
          LU: { name: 'Luxauto.lu', url: 'https://www.luxauto.lu/' },
          CH: { name: 'Tutti.ch', url: `https://www.tutti.ch/de/suche/auto?q=${q}` },
          HR: { name: 'Njuškalo.hr', url: `https://www.njuskalo.hr/auti?q=${q}` },
          PL: { name: 'OtoMoto.pl', url: `https://www.otomoto.pl/osobowe?search[filter_str]=${q}` },
          SE: { name: 'Blocket.se', url: `https://www.blocket.se/annonser/hela_sverige/fordon/bilar?q=${q}` },
          NO: { name: 'Finn.no', url: `https://www.finn.no/car/used/search.html?q=${q}` },
          FI: { name: 'Nettiauto.com', url: `https://www.nettiauto.com/en/?search[q]=${q}` },
          MA: { name: 'Avito.ma', url: `https://www.avito.ma/fr/voitures?query=${q}` },
          TN: { name: 'Tayara.tn', url: `https://www.tayara.tn/search/?q=${q}` },
          DZ: { name: 'Ouedkniss.com', url: `https://www.ouedkniss.com/auto-vehicule-occasion?q=${q}` },
        }
        setFetchedAt(new Date().toISOString())
        if (as24Url) {
          setCentraleUrl(as24Url)
          setSources([
            { name: `AutoScout24 ${ctry.label}`, url: as24Url },
            ...(SECONDARY[ctry.code] ? [SECONDARY[ctry.code]] : []),
          ])
        } else {
          const sec = SECONDARY[ctry.code]
          setCentraleUrl(sec?.url || '')
          setSources(sec ? [sec] : [])
        }
      }

      // Analyse streamée en direct (comme le chat) — le texte s'affiche au fil
      // de l'eau dès le 1er token reçu. Passe UNIQUE : la grille de prix et
      // l'auto-vérification sont intégrées au prompt (plus de 2e passe).
      let first = true
      const { text, usedWebSearch, truncated: wasTruncated } = await sendMessage(
        [{ role: 'user', content: buildPrompt(filters, vehicleDesc, ctry, marginUsed) }],
        {
          lang, expert: true, temperature: 0, tool: 'veilleprix',
          webSearch: true, maxSearches: 3, maxTokens: 8000,
          returnMeta: true, stream: true,
          onChunk: (full) => {
            if (first) { first = false; setLoading(false); setStreaming(true) }
            setReport(full)
          },
        }
      )
      const cleanText = stripLeadingReasoning(text)
      setReport(cleanText)
      setHasLiveData(!!usedWebSearch)
      setTruncated(!!wasTruncated)
      setStreaming(false)
      setReportMargin(marginUsed)

      saveLastVehicle([rawMake, model, finition].filter(Boolean).join(' '))

      // Évolution prix : compare aux chiffres de la dernière analyse archivée
      // du même véhicule (même libellé de recherche).
      const figures = extractReportFigures(cleanText)
      const prev = history.find((h) => h.searchLabel === label && h.figures)
      if (figures && prev?.figures) {
        setEvolution({
          prevAt: prev.savedAt, prev: prev.figures, cur: figures,
          // Anciennes analyses sans marge stockée : générées avec 3 000 (hardcodé).
          prevMargin: prev.margin ?? MARGIN_DEFAULT, curMargin: marginUsed,
        })
      }

      const filtersSnapshot = { ...filters, country: ctry.code }
      addHistory({ searchLabel: label, country: ctry.code, type: filters.type, report: cleanText, hasLiveData: !!usedWebSearch, fetchedAt: new Date().toISOString(), sources: [], centraleUrl: '', filters: filtersSnapshot, figures, margin: marginUsed })

      // Comparaison multi-marchés : même véhicule, mêmes filtres, autres pays.
      const extras = extraCountries.filter((code) => code !== ctry.code)
      if (extras.length) {
        const multi = [
          { code: ctry.code, label: ctry.label, status: 'done', report: text, figures, hasLiveData: !!usedWebSearch },
          ...extras.map((code) => ({
            code, label: COUNTRIES.find((c) => c.code === code)?.label || code,
            status: 'pending', report: '', figures: null, hasLiveData: false,
          })),
        ]
        setMultiResults([...multi])
        setMultiRunning(true)
        try {
          for (let k = 1; k < multi.length; k++) {
            multi[k] = { ...multi[k], status: 'running' }
            setMultiResults([...multi])
            const exCtry = COUNTRIES.find((c) => c.code === multi[k].code)
            const exLabel = label.endsWith(ctry.label)
              ? label.slice(0, label.length - ctry.label.length) + exCtry.label
              : `${label} · ${exCtry.label}`
            try {
              const { text: xRaw, usedWebSearch: xLive } = await sendMessage(
                [{ role: 'user', content: buildPrompt(filters, vehicleDesc, exCtry, marginUsed) }],
                {
                  lang, expert: true, temperature: 0, tool: 'veilleprix',
                  webSearch: true, maxSearches: 3, maxTokens: 8000,
                  returnMeta: true, stream: true,
                }
              )
              const xText = stripLeadingReasoning(xRaw)
              const xFig = extractReportFigures(xText)
              multi[k] = { ...multi[k], status: 'done', report: xText, figures: xFig, hasLiveData: !!xLive }
              addHistory({
                searchLabel: exLabel, country: exCtry.code, type: filters.type, report: xText,
                hasLiveData: !!xLive, fetchedAt: new Date().toISOString(), sources: [], centraleUrl: '',
                filters: { ...filters, country: exCtry.code }, figures: xFig, margin: marginUsed,
              })
            } catch (e) {
              multi[k] = { ...multi[k], status: 'error', error: e.message }
            }
            setMultiResults([...multi])
          }
        } finally {
          setMultiRunning(false)
        }
      }
    } catch (err) {
      setError(err.message)
      toast(err.message, 'error')
    } finally {
      setLoading(false)
      setStreaming(false)
    }
  }

  // ── Lot : import du fichier, sélection, exécution séquentielle ─────────────
  const onBatchFile = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setBatchParsing(true)
    setError(null)
    try {
      const { vehicles, source } = await extractVehiclesSmart(file, { lang })
      const rows = vehicles.filter((v) => v.make || v.model)
      if (!rows.length) throw new Error(t('pw_batch_none'))
      setBatch({ rows, fileName: file.name, source })
      setBatchSel(new Set(rows.slice(0, MAX_BATCH).map((_, i) => i)))
      setBatchResults(null)
      setBatchOpen(null)
    } catch (err) {
      toast(err.message, 'error')
    } finally {
      setBatchParsing(false)
    }
  }

  const toggleBatchRow = (i) => {
    setBatchSel((prev) => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i)
      else if (next.size < MAX_BATCH) next.add(i)
      return next
    })
  }

  const runBatch = async () => {
    if (!batch || batchSel.size === 0) return
    const rows = [...batchSel].sort((a, b) => a - b).map((i) => batch.rows[i])
    const ctry = COUNTRIES.find(c => c.code === country) ?? COUNTRIES[0]
    batchCancelRef.current = false
    setBatchRunning(true)
    setBatchOpen(null)
    // Reprise : si l'état précédent correspond aux mêmes lignes, on conserve
    // les rapports déjà terminés et on ne relance que le reste.
    const reuse = batchResults && batchResults.length === rows.length
      && batchResults.every((r, i) => r.label === batchRowLabel(rows[i]))
    const results = reuse
      ? batchResults.map((r) => (r.status === 'done' ? r : { ...r, status: 'pending', error: undefined }))
      : rows.map((v) => ({ label: batchRowLabel(v), status: 'pending', report: '', figures: null, hasLiveData: false, margin: null }))
    setBatchResults([...results])
    const durations = []
    setBatchEta(null)

    for (let i = 0; i < rows.length; i++) {
      if (batchCancelRef.current) {
        for (let j = i; j < results.length; j++) {
          if (results[j].status !== 'done') results[j] = { ...results[j], status: 'cancelled' }
        }
        setBatchResults([...results])
        break
      }
      if (results[i].status === 'done') continue
      results[i] = { ...results[i], status: 'running' }
      setBatchResults([...results])

      const v = rows[i]
      const filters = batchRowToFilters(v)
      filters.fuelLabel        = filters.fuel ? FUELS.find(f => f.code === filters.fuel)?.label || '' : ''
      filters.gearboxLabel     = filters.gearbox ? GEARBOXES.find(g => g.code === filters.gearbox)?.label || '' : ''
      filters.carrosserieLabel = ''
      const vehicleDesc = batchRowLabel(v)
      // Marge : colonne « marge » du fichier si présente et valide, sinon champ global.
      const rowMargin = (Number(v.margin) >= MARGIN_MIN && Number(v.margin) <= MARGIN_MAX)
        ? Number(v.margin) : getMarginTarget()
      const t0 = Date.now()

      try {
        // Même appel que la recherche unitaire — prompt et paramètres identiques.
        const { text: rawText, usedWebSearch } = await sendMessage(
          [{ role: 'user', content: buildPrompt(filters, vehicleDesc, ctry, rowMargin) }],
          {
            lang, expert: true, temperature: 0, tool: 'veilleprix',
            webSearch: true, maxSearches: 3, maxTokens: 8000,
            returnMeta: true, stream: true,
          }
        )
        // Vérifie que l'analyse est complète (## L'essentiel présent).
        // Si la limite de recherches a été atteinte avant la fin, le stream
        // se termine avec seulement le texte d'intro → on marque en erreur
        // pour permettre une relance ciblée.
        if (!hasStructuredContent(rawText)) {
          throw new Error("Analyse incomplète : la limite de recherches web a été atteinte avant la fin. Relancez uniquement ce véhicule.")
        }
        const text = stripLeadingReasoning(rawText)
        const figures = extractReportFigures(text)
        results[i] = { ...results[i], status: 'done', report: text, figures, hasLiveData: !!usedWebSearch, margin: rowMargin }
        addHistory({
          searchLabel: `${results[i].label} · ${ctry.label}`,
          country: ctry.code, type: 'vo', report: text, hasLiveData: !!usedWebSearch,
          fetchedAt: new Date().toISOString(), sources: [], centraleUrl: '',
          filters: { ...filters, country: ctry.code }, figures, margin: rowMargin,
        })
      } catch (err) {
        results[i] = { ...results[i], status: 'error', error: err.message }
      }
      // Estimation du temps restant : moyenne des analyses déjà faites.
      durations.push(Date.now() - t0)
      const remaining = results.filter((r, j) => j > i && r.status === 'pending').length
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length
      setBatchEta(remaining > 0 ? Math.max(1, Math.ceil((avg * remaining) / 60000)) : null)
      setBatchResults([...results])
    }
    setBatchRunning(false)
    setBatchEta(null)
  }

  const stopBatch = () => { batchCancelRef.current = true }

  const closeBatch = () => {
    if (batchRunning) batchCancelRef.current = true
    setBatch(null); setBatchResults(null); setBatchSel(new Set()); setBatchOpen(null)
  }

  const handleBatchExcel = () => {
    const done = (batchResults || []).filter((r) => r.status === 'done')
    if (!done.length) return
    const ctryLabel = COUNTRIES.find(c => c.code === country)?.label || country
    const rows = [[
      t('model_label'), t('price_country_label'),
      `${t('pw_evol_achat')} min`, `${t('pw_evol_achat')} max`,
      `${t('pw_evol_revente')} min`, `${t('pw_evol_revente')} max`,
      t('pw_margin_col'), t('pw_score_col'), t('price_live_badge'),
    ]]
    for (const r of done) {
      rows.push([
        r.label, ctryLabel,
        r.figures?.achatMin ?? '', r.figures?.achatMax ?? r.figures?.achatMin ?? '',
        r.figures?.reventeMin ?? '', r.figures?.reventeMax ?? r.figures?.reventeMin ?? '',
        r.margin ?? MARGIN_DEFAULT,
        computeOpportunityScore(r.report, r.margin ?? MARGIN_DEFAULT)?.score ?? '',
        r.hasLiveData ? 'Oui' : 'Non',
      ])
    }
    downloadCsv(`ABU Veille prix lot - ${new Date().toLocaleDateString('fr-FR').replace(/\//g, '.')}.csv`, rows)
  }

  const handleBatchPdf = () => {
    const done = (batchResults || []).filter((r) => r.status === 'done')
    if (!done.length) return
    const ctryLabel = COUNTRIES.find(c => c.code === country)?.label || country
    const md = done.map((r) => `# ${r.label}\n\n*${t('pw_margin_badge').replace('{n}', (r.margin ?? MARGIN_DEFAULT).toLocaleString('fr-FR'))}*\n\n${r.report}`).join('\n\n---\n\n')
    return withExporting(() =>
      exportReportPdf(md, pdfFileName(`lot-${done.length}-vehicules`, `Veille prix ${ctryLabel}`),
        { title: `Veille prix · ${t('pw_batch_title')} (${ctryLabel})`, subtitle: `${done.length} ${t('pw_batch_vehicles')}` }))
  }

  const handlePdf = () => {
    const ctryLabel = (COUNTRIES.find(c => c.code === country)?.label || country).toUpperCase()
    const pdfTitle = `Veille prix ${ctryLabel}`
    const marginTxt = t('pw_margin_badge').replace('{n}', (reportMargin ?? getMarginTarget()).toLocaleString('fr-FR'))
    return withExporting(() =>
      exportReportPdf(report, pdfFileName(searchLabel, pdfTitle), { title: pdfTitle, subtitle: `${searchLabel} · ${marginTxt}` }))
  }

  // Partage natif (mobile) : PDF via Web Share API ; repli = téléchargement.
  const handleShare = () => withExporting(async () => {
    const ctryLabel = (COUNTRIES.find(c => c.code === country)?.label || country).toUpperCase()
    const pdfTitle = `Veille prix ${ctryLabel}`
    const marginTxt = t('pw_margin_badge').replace('{n}', (reportMargin ?? getMarginTarget()).toLocaleString('fr-FR'))
    const filename = pdfFileName(searchLabel, pdfTitle)
    const meta = { title: pdfTitle, subtitle: `${searchLabel} · ${marginTxt}` }
    try {
      const blob = await exportReportPdf(report, filename, { ...meta, output: 'blob' })
      const file = new File([blob], filename, { type: 'application/pdf' })
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: pdfTitle, text: searchLabel })
        return
      }
    } catch (err) {
      if (err?.name === 'AbortError') return // partage annulé par l'utilisateur
    }
    await exportReportPdf(report, filename, meta)
  })

  const reset = () => {
    setReport(''); setMake(''); setModel(''); setFinition(''); setCarrosserie('')
    setYearMin(''); setYearMax(''); setMileageMin(''); setMileageMax(''); setFuel(''); setGearbox(''); setPowerMin(''); setPowerMax('')
    setCountry('FR')
    setSearchLabel(''); setCentraleUrl(''); setFetchedAt(null); setSources([]); setHasLiveData(false); setReportMargin(null)
    setTruncated(false)
    setMultiResults(null); setMultiOpen(null); setExtraCountries([])
  }

  const restore = (item) => {
    setReport(item.report || '')
    setTruncated(false)
    setSearchLabel(item.searchLabel)
    setType(item.type)
    setCountry(item.country || 'FR')
    setHasLiveData(!!item.hasLiveData)
    setFetchedAt(item.fetchedAt || null)
    setSources(item.sources || [])
    setCentraleUrl(item.centraleUrl || '')
    setEvolution(null)
    setMultiResults(null); setMultiOpen(null)
    setReportMargin(item.margin ?? MARGIN_DEFAULT)
    // Resynchronise le formulaire : le bouton « Analyser » relance la même veille.
    if (item.filters) applyFilters(item.filters)
  }

  // Pont sortant : véhicule courant → Pitch / Objections (champs VehicleDetails).
  const vehicleDetailsPayload = () => ({
    details: {
      type, make, model, finition, carrosserie,
      yearMin, yearMax, mileageMin, mileageMax, fuel, gearbox,
    },
  })

  const handleCopy = async () => {
    await copyReportText(report)
    toast(t('copy_done'), 'success')
  }

  // Score d'opportunité du rapport affiché — dérivé du texte (recherche,
  // restauration d'historique…), donc rien à stocker.
  const oppScore = useMemo(
    () => (report && !streaming ? computeOpportunityScore(report, reportMargin ?? MARGIN_DEFAULT) : null),
    [report, streaming, reportMargin]
  )

  const showResult = (loading || streaming || report) && !error

  return (
    <div className="space-y-4 animate-fade-in">

      {/* ── Filtres ─────────────────────────────────────────────────────────── */}
      <div className="glass-card p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <Bell size={15} className="text-cyan-400" />
          <h2 className="text-sm font-semibold text-white">{t('tool_price_title')}</h2>
        </div>

        {/* Toggle mode : recherche | fichier (comme Analyse de stock) */}
        <div className="flex gap-1 p-1 bg-navy-900/60 rounded-xl w-fit mb-4 border border-navy-700/40">
          {[
            { id: 'search', label: t('pw_mode_search'), icon: Search },
            { id: 'file',   label: t('pw_import_btn'),  icon: FileSpreadsheet },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setPwMode(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                pwMode === tab.id ? 'bg-cyan-400 text-navy-900' : 'text-slate-400 hover:text-white'
              }`}
            >
              <tab.icon size={13} /> {tab.label}
            </button>
          ))}
        </div>

        {pwMode === 'file' ? (
          /* ── Mode fichier : pays + zone de dépôt, c'est tout ── */
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-[500px]">
              <FilterSelect label={t('price_country_label')} value={country} onChange={setCountry}>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
              </FilterSelect>
              <MarginField value={margin} onChange={handleMargin} onReset={resetMarginIfInvalid} />
            </div>
            <button
              onClick={() => batchFileRef.current?.click()}
              disabled={batchParsing || batchRunning}
              className="w-full flex items-center justify-center gap-2 px-4 py-6 rounded-xl border border-dashed border-navy-600/60
                         text-sm text-slate-400 hover:text-cyan-400 hover:border-cyan-400/40 transition disabled:opacity-40"
            >
              {batchParsing ? <Spinner size="sm" /> : <FileSpreadsheet size={16} />}
              {batchParsing ? t('import_parsing') : (batch?.fileName || t('pw_batch_drop'))}
            </button>
            <p className="text-[10px] text-slate-600">{t('pw_batch_drop_hint')}</p>
            <input
              ref={batchFileRef} type="file" accept=".csv,.xlsx,.xlsm,.txt,text/csv"
              className="hidden" onChange={onBatchFile}
            />
          </div>
        ) : (
        <>
        {/* ── Mode recherche ── */}
        {/* VO / VN toggle + Marché — flex-wrap : sur mobile le pays passe en
            pleine largeur dessous au lieu de déborder de la carte */}
        <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
          <div className="flex gap-1 p-1 bg-navy-900/60 rounded-xl w-fit border border-navy-700/40">
            {[{ id: 'vo', label: t('used_vehicle') }, { id: 'vn', label: t('new_vehicle') }].map(tab => (
              <button
                key={tab.id}
                onClick={() => { setType(tab.id); if (tab.id === 'vn') setMileageMax('') }}
                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                  type === tab.id ? 'bg-cyan-400 text-navy-900' : 'text-slate-400 hover:text-white'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <div className="w-full sm:w-auto sm:min-w-[180px]">
            <FilterSelect label={t('price_country_label')} value={country} onChange={setCountry}>
              {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
            </FilterSelect>
          </div>
        </div>

        {/* Comparaison multi-marchés : jusqu'à 2 marchés en plus du principal */}
        <div className="flex items-center gap-2 flex-wrap mb-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('pw_multi_label')}</span>
          {extraCountries.map((code) => (
            <button
              key={code} type="button"
              onClick={() => setExtraCountries((p) => p.filter((c) => c !== code))}
              className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-semibold
                         bg-cyan-400/10 text-cyan-400 border border-cyan-400/25 hover:bg-cyan-400/20 transition"
            >
              {COUNTRIES.find((c) => c.code === code)?.label || code} <X size={10} />
            </button>
          ))}
          {extraCountries.length < 2 && (
            <select
              value=""
              onChange={(e) => e.target.value && setExtraCountries((p) => [...p, e.target.value])}
              aria-label={t('pw_multi_add')}
              className="bg-navy-900/60 border border-navy-700/50 rounded-lg px-2 py-1 text-[11px] text-slate-400
                         focus:outline-none focus:border-cyan-400/50 transition"
            >
              <option value="">{t('pw_multi_add')}</option>
              {COUNTRIES.filter((c) => c.code !== country && !extraCountries.includes(c.code)).map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
          )}
        </div>

        {/* Ligne 1 : Marque + Modèle + Année min + Année max */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-2">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('make_label')}</label>
            <input
              type="text" value={make} onChange={e => setMake(e.target.value)}
              list="makes-list" placeholder={t('make_ph')} aria-label={t('make_label')}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 transition"
            />
            <datalist id="makes-list">
              {MAKES.map(m => <option key={m.code} value={m.label} />)}
            </datalist>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('model_label')}</label>
            <input
              type="text" value={model} onChange={e => setModel(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()} placeholder={t('price_model_ph')} aria-label={t('model_label')}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 transition"
            />
          </div>

          <FilterSelect label={t('year_min')} value={yearMin} onChange={setYearMin}>
            <option value="">{t('year_min')}</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </FilterSelect>

          <FilterSelect label={t('year_max')} value={yearMax} onChange={setYearMax}>
            <option value="">{t('year_max')}</option>
            {YEARS.filter(y => !yearMin || y >= Number(yearMin)).map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </FilterSelect>
        </div>

        {/* Ligne 1b : Finition + Carrosserie + Marge cible */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 mb-2">
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1">{t('price_finition_label')}</label>
            <input
              type="text" value={finition} onChange={e => setFinition(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()} placeholder={t('price_finition_ph')} aria-label={t('price_finition_label')}
              className="w-full bg-navy-900/60 border border-navy-700/50 rounded-xl px-3 py-2.5
                         text-sm text-white placeholder-slate-600 focus:outline-none focus:border-cyan-400/50 transition"
            />
          </div>
          <FilterSelect label={t('price_body_label')} value={carrosserie} onChange={setCarrosserie}>
            {BODIES.map(b => <option key={b.code} value={b.code}>{b.label}</option>)}
          </FilterSelect>
          <MarginField value={margin} onChange={handleMargin} onReset={resetMarginIfInvalid} />
        </div>

        {/* Ligne 2 : Km min + Km max (VO only) + Carburant + Boîte */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 mb-4">
          {type === 'vo' && (
            <FilterSelect label={t('km_min')} value={mileageMin} onChange={setMileageMin}>
              {MILEAGE_MIN_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </FilterSelect>
          )}
          {type === 'vo' && (
            <FilterSelect label={t('km_max')} value={mileageMax} onChange={setMileageMax}>
              {MILEAGE_MAX_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </FilterSelect>
          )}
          <FilterSelect label={t('fuel_label')} value={fuel} onChange={setFuel}>
            {FUELS.map(f => <option key={f.code} value={f.code}>{f.label}</option>)}
          </FilterSelect>
          <FilterSelect label={t('gearbox_label')} value={gearbox} onChange={setGearbox}>
            {GEARBOXES.map(g => <option key={g.code} value={g.code}>{g.label}</option>)}
          </FilterSelect>
          <FilterSelect label={t('power_min')} value={powerMin} onChange={setPowerMin}>
            {POWER_MIN_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </FilterSelect>
          <FilterSelect label={t('power_max')} value={powerMax} onChange={setPowerMax}>
            {POWER_MAX_OPTS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </FilterSelect>
        </div>

        {/* Bouton */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => search()} disabled={!canSearch || loading || streaming || multiRunning}
            className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400 text-navy-900 text-sm font-bold rounded-xl
                       hover:bg-cyan-300 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
          >
            {(loading || streaming) ? <Spinner size="sm" /> : <Search size={14} />}
            {(loading || streaming) ? t('analyzing') : t('analyze_btn')}
          </button>

          {centraleUrl && !loading && !streaming && (
            <a href={centraleUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                         px-3 py-2.5 rounded-xl hover:text-cyan-400 hover:border-cyan-400/30 transition">
              <ExternalLink size={12} />
              {country === 'FR' ? t('price_see_listing') : `AutoScout24 ${COUNTRIES.find(c => c.code === country)?.label}`}
            </a>
          )}
        </div>
        </>
        )}
      </div>

      {/* ── Résultats du lot (fichier CSV / Excel) ───────────────────────────── */}
      {pwMode === 'file' && batch && (
        <div className="glass-card p-4 md:p-5 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <FileSpreadsheet size={15} className="text-cyan-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {t('pw_batch_title')} · {batch.fileName}
                </p>
                <p className="text-[11px] text-slate-500">
                  {t('pw_batch_detected').replace('{n}', batch.rows.length)}
                  {' · '}
                  {t('pw_batch_country_note').replace('{c}', COUNTRIES.find(c => c.code === country)?.label || country)}
                </p>
              </div>
            </div>
            <button
              onClick={closeBatch} aria-label={t('pw_batch_close')}
              className="w-8 h-8 flex items-center justify-center text-slate-500 hover:text-white transition flex-shrink-0"
            >
              <X size={16} />
            </button>
          </div>

          {batch.source === 'ai' && !batchResults && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-violet-400/10 border border-violet-400/20">
              <Sparkles size={13} className="text-violet-400 flex-shrink-0" />
              <p className="text-[11px] text-violet-300">{t('import_smart_badge')}</p>
            </div>
          )}

          {/* Sélection des modèles avant lancement */}
          {!batchResults && (
            <>
              <p className="text-[11px] text-slate-500">
                {t('pw_batch_select_hint').replace('{max}', MAX_BATCH)}
              </p>
              <div className="max-h-72 overflow-y-auto divide-y divide-navy-700/30 rounded-xl border border-navy-700/40">
                {batch.rows.map((v, i) => {
                  const selected = batchSel.has(i)
                  return (
                    <button
                      key={i} onClick={() => toggleBatchRow(i)}
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-navy-900/40 transition"
                    >
                      {selected
                        ? <CheckSquare size={15} className="text-cyan-400 flex-shrink-0" />
                        : <Square size={15} className="text-slate-600 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-semibold truncate ${selected ? 'text-slate-200' : 'text-slate-500'}`}>
                          {[v.make, v.model, v.version].filter(Boolean).join(' ')}
                        </p>
                        <p className="text-[10px] text-slate-600">
                          {[v.year, v.mileageKm != null ? `${Number(v.mileageKm).toLocaleString('fr-FR')} km` : null, v.fuel]
                            .filter(Boolean).join(' · ')}
                        </p>
                      </div>
                      {v.priceEur != null && (
                        <span className="text-xs font-bold text-cyan-400 flex-shrink-0">{fmtEur(v.priceEur)}</span>
                      )}
                    </button>
                  )
                })}
              </div>
              <button
                onClick={runBatch} disabled={batchSel.size === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-400 text-navy-900 text-sm font-bold rounded-xl
                           hover:bg-cyan-300 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                <Search size={14} />
                {t('pw_batch_launch').replace('{n}', batchSel.size)}
              </button>
            </>
          )}

          {/* Progression + tableau récapitulatif */}
          {batchResults && (
            <>
              {batchRunning && (
                <div className="flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 text-xs text-cyan-400">
                    <Spinner size="sm" />
                    {t('pw_batch_progress')
                      .replace('{i}', Math.min(
                        batchResults.filter(r => r.status !== 'pending' && r.status !== 'running').length + 1,
                        batchResults.length,
                      ))
                      .replace('{n}', batchResults.length)}
                    {batchEta != null && (
                      <span className="text-slate-500">· {t('pw_batch_eta').replace('{m}', batchEta)}</span>
                    )}
                  </p>
                  <button
                    onClick={stopBatch}
                    className="flex items-center gap-1.5 text-xs text-warn border border-warn/30
                               px-3 py-1.5 rounded-lg hover:bg-warn/10 transition"
                  >
                    <StopCircle size={13} /> {t('pw_batch_stop')}
                  </button>
                </div>
              )}

              <div className="divide-y divide-navy-700/30 rounded-xl border border-navy-700/40 overflow-hidden">
                {batchResults.map((r, i) => (
                  <div key={i}>
                    <button
                      onClick={() => r.status === 'done' && setBatchOpen(batchOpen === i ? null : i)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition ${
                        r.status === 'done' ? 'hover:bg-navy-900/40 cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${
                        r.status === 'done'      ? 'bg-emerald-400/10 text-emerald-400'
                        : r.status === 'running' ? 'bg-cyan-400/10 text-cyan-400 animate-pulse'
                        : r.status === 'error'   ? 'bg-red-500/10 text-red-400'
                        : r.status === 'cancelled' ? 'bg-navy-700/40 text-slate-500'
                        : 'bg-navy-700/40 text-slate-500'
                      }`}>
                        {t(`pw_batch_status_${r.status}`)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-200 truncate">{r.label}</p>
                        {r.figures && (
                          <p className="text-[10px] text-slate-500">
                            {r.figures.achatMin != null && `${t('pw_evol_achat')} ${fmtRange(r.figures.achatMin, r.figures.achatMax)}`}
                            {r.figures.achatMin != null && r.figures.reventeMin != null && ' · '}
                            {r.figures.reventeMin != null && `${t('pw_evol_revente')} ${fmtRange(r.figures.reventeMin, r.figures.reventeMax)}`}
                          </p>
                        )}
                        {r.status === 'error' && <p className="text-[10px] text-red-400 truncate">{r.error}</p>}
                      </div>
                      {r.status === 'done' && (
                        <ScoreBadge score={computeOpportunityScore(r.report, r.margin ?? MARGIN_DEFAULT)} t={t} />
                      )}
                      {r.status === 'done' && r.hasLiveData && (
                        <Wifi size={11} className="text-emerald-400 flex-shrink-0" />
                      )}
                      {r.status === 'done' && (
                        <ChevronDown size={13} className={`text-slate-500 flex-shrink-0 transition-transform ${batchOpen === i ? 'rotate-180' : ''}`} />
                      )}
                    </button>
                    {batchOpen === i && r.report && (
                      <div className="px-3 pb-3">
                        <div className="rounded-xl bg-navy-900/40 border border-navy-700/40 p-4 md:p-6">
                          <div className="report-md text-slate-200"
                               dangerouslySetInnerHTML={{ __html: mdToHtml(r.report) }} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {!batchRunning && (
                <div className="flex items-center gap-2 flex-wrap">
                  {batchResults.some(r => r.status !== 'done') && (
                    <button
                      onClick={runBatch}
                      className="flex items-center gap-1.5 text-xs font-bold text-navy-900 bg-cyan-400
                                 px-3 py-1.5 rounded-lg hover:bg-cyan-300 active:scale-95 transition"
                    >
                      <Search size={12} />
                      {t('pw_batch_resume').replace('{n}', batchResults.filter(r => r.status !== 'done').length)}
                    </button>
                  )}
                  <button
                    onClick={handleBatchPdf}
                    disabled={exporting || !batchResults.some(r => r.status === 'done')}
                    className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                               px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition
                               disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {exporting ? <Spinner size="sm" /> : <Download size={12} />}
                    {t('pw_batch_export')}
                  </button>
                  <button
                    onClick={handleBatchExcel}
                    disabled={!batchResults.some(r => r.status === 'done')}
                    className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                               px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition
                               disabled:opacity-40 disabled:pointer-events-none"
                  >
                    <FileText size={12} /> Excel
                  </button>
                  <button
                    onClick={closeBatch}
                    className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition px-2.5 py-1.5 rounded-lg hover:bg-navy-700/30"
                  >
                    <RotateCcw size={11} /> {t('pw_batch_close')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────────── */}
      {error && <ErrorAlert message={error} onRetry={() => search()} />}

      {/* ── Résultat streamé ─────────────────────────────────────────────────── */}
      {showResult && (
        <>
          {/* Header + actions */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <h3 className="text-base font-bold text-white">{searchLabel || t('tool_price_title')}</h3>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  type === 'vo' ? 'bg-warn/10 text-warn' : 'bg-emerald-400/10 text-emerald-400'
                }`}>{type === 'vo' ? t('used_vehicle') : t('new_vehicle')}</span>

                {streaming ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-400/10 text-cyan-400 border border-cyan-400/20 animate-pulse">
                    <Sparkles size={9} /> {t('price_live_refreshing')}
                  </span>
                ) : report ? (
                  <>
                    {hasLiveData ? (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                        <Wifi size={9} /> {t('price_live_badge')}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-400/10 text-violet-400 border border-violet-400/20">
                        <WifiOff size={9} /> {t('price_knowledge_badge')}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20">
                      <ShieldCheck size={9} /> {t('price_guardrail_done')}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-warn/10 text-warn border border-warn/20">
                      {t('pw_margin_badge').replace('{n}', (reportMargin ?? getMarginTarget()).toLocaleString('fr-FR'))}
                    </span>
                    <ScoreBadge score={oppScore} t={t} />
                  </>
                ) : null}

                {fetchedAt && (
                  <div className="flex items-center gap-1">
                    <Clock size={10} className="text-slate-600" />
                    <span className="text-[10px] text-slate-600">{new Date(fetchedAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            {report && !streaming && (
              <div className="flex items-center gap-2 overflow-x-auto pb-0.5 w-full sm:w-auto">
                <button onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                             px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition flex-shrink-0">
                  <Copy size={12} /> {t('copy_btn')}
                </button>
                <button onClick={handlePdf} disabled={exporting}
                  className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                             px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition flex-shrink-0">
                  {exporting ? <Spinner size="sm" /> : <Download size={12} />}
                  {t('download_pdf')}
                </button>
                <button onClick={handleShare} disabled={exporting}
                  className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                             px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition flex-shrink-0">
                  <Share2 size={12} /> {t('pw_share')}
                </button>
                <button onClick={() => sendToTool(navigate, '/pitch', vehicleDetailsPayload())}
                  className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                             px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition flex-shrink-0">
                  <Mic size={12} /> {t('bridge_pitch')}
                </button>
                <button onClick={() => sendToTool(navigate, '/objections', vehicleDetailsPayload())}
                  className="flex items-center gap-1.5 text-xs text-slate-400 border border-navy-600/50
                             px-3 py-1.5 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 hover:bg-cyan-400/5 transition flex-shrink-0">
                  <ShieldCheck size={12} /> {t('bridge_objections')}
                </button>
                <button onClick={() => search()}
                  className="flex items-center gap-1.5 text-xs text-cyan-400 border border-cyan-400/30
                             px-3 py-2 rounded-lg hover:bg-cyan-400/10 transition flex-shrink-0">
                  <Search size={12} /> {t('analyze_btn')}
                </button>
                <button onClick={reset}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition px-2.5 py-1.5 rounded-lg hover:bg-navy-700/30 flex-shrink-0">
                  <RotateCcw size={11} /> {t('new_analysis_btn')}
                </button>
              </div>
            )}
          </div>

          {/* Loading avant 1er token */}
          {loading && !report && (
            <div className="glass-card p-8 flex flex-col items-center gap-3 text-center">
              <Spinner />
              <p className="text-sm text-slate-400">{t('price_step_calculating')}</p>
              <p className="text-xs text-slate-600">{t('price_step_collecting')}</p>
            </div>
          )}

          {/* Évolution vs dernière analyse du même véhicule */}
          {report && !streaming && evolution && (
            <EvolutionCard evolution={evolution} t={t} />
          )}

          {/* Comparatif multi-marchés */}
          {multiResults && (
            <div className="glass-card p-4 space-y-2">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{t('pw_multi_title')}</p>
              <div className="divide-y divide-navy-700/30 rounded-xl border border-navy-700/40 overflow-hidden">
                {(() => {
                  const doneFig = multiResults.filter((x) => x.status === 'done' && x.figures?.achatMin != null)
                  const bestAchat = doneFig.length > 1 ? Math.min(...doneFig.map((x) => x.figures.achatMin)) : null
                  return multiResults.map((r, i) => (
                    <div key={r.code}>
                      <button
                        onClick={() => r.status === 'done' && r.report && setMultiOpen(multiOpen === i ? null : i)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition ${
                          r.status === 'done' && r.report ? 'hover:bg-navy-900/40 cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        <span className="text-xs font-semibold text-slate-200 w-24 sm:w-28 flex-shrink-0 truncate">{r.label}</span>
                        {r.status === 'done' ? (
                          <div className="flex-1 min-w-0 text-[11px] text-slate-400 truncate">
                            {r.figures?.achatMin != null && (
                              <span>{t('pw_evol_achat')} <span className="text-slate-200 font-semibold">{fmtRange(r.figures.achatMin, r.figures.achatMax)}</span></span>
                            )}
                            {r.figures?.achatMin != null && r.figures?.reventeMin != null && ' · '}
                            {r.figures?.reventeMin != null && (
                              <span>{t('pw_evol_revente')} <span className="text-slate-200 font-semibold">{fmtRange(r.figures.reventeMin, r.figures.reventeMax)}</span></span>
                            )}
                            {r.figures?.achatMin == null && r.figures?.reventeMin == null && <span className="text-slate-600">—</span>}
                          </div>
                        ) : r.status === 'error' ? (
                          <p className="flex-1 text-[11px] text-red-400 truncate">{r.error}</p>
                        ) : (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            r.status === 'running' ? 'bg-cyan-400/10 text-cyan-400 animate-pulse' : 'bg-navy-700/40 text-slate-500'
                          }`}>
                            {t(`pw_batch_status_${r.status}`)}
                          </span>
                        )}
                        {r.status === 'done' && (
                          <ScoreBadge score={computeOpportunityScore(r.report, reportMargin ?? MARGIN_DEFAULT)} t={t} />
                        )}
                        {bestAchat != null && r.status === 'done' && r.figures?.achatMin === bestAchat && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-400 border border-emerald-400/20 flex-shrink-0">
                            {t('pw_multi_best')}
                          </span>
                        )}
                        {r.status === 'done' && r.report && (
                          <ChevronDown size={13} className={`text-slate-500 flex-shrink-0 transition-transform ${multiOpen === i ? 'rotate-180' : ''}`} />
                        )}
                      </button>
                      {multiOpen === i && r.report && (
                        <div className="px-3 pb-3">
                          <div className="rounded-xl bg-navy-900/40 border border-navy-700/40 p-4 md:p-6">
                            <div className="report-md text-slate-200" dangerouslySetInnerHTML={{ __html: mdToHtml(r.report) }} />
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                })()}
              </div>
            </div>
          )}

          {/* Rapport Markdown streamé */}
          {report && (
            <div ref={resultRef} className="space-y-3">
              <div className="glass-card p-6 md:p-8">
                <div className="report-md text-slate-200"
                     dangerouslySetInnerHTML={{ __html: mdToHtml(report) }} />
                {streaming && (
                  <span className="inline-block w-0.5 h-[1em] animate-pulse align-middle ml-0.5 opacity-80 bg-cyan-400" />
                )}
              </div>

              {/* Avertissement : rapport tronqué (plafond de tokens atteint) */}
              {!streaming && truncated && (
                <div className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-warn/10 border border-warn/30">
                  <AlertTriangle size={15} className="text-warn flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-warn leading-relaxed">{t('price_truncated_warn')}</p>
                </div>
              )}

              {/* Malus — lien centré vers le calculateur */}
              {!streaming && (
                <div className="glass-card p-4 flex justify-center">
                  <Link to="/co2-malus"
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-warn/10 border border-warn/30
                               text-sm font-bold text-warn hover:bg-warn/20 active:scale-95 transition-all">
                    <Calculator size={15} /> {t('price_malus_calc_link')}
                  </Link>
                </div>
              )}

              {/* Sources */}
              {!streaming && (sources.length > 0 || centraleUrl) && (
                <div className="glass-card p-4">
                  <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-2">{t('sources_consulted')}</p>
                  <div className="flex flex-wrap gap-2">
                    {sources.map(s => (
                      <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-slate-400 bg-navy-700/40 border border-navy-600/30
                                   px-2.5 py-1 rounded-lg hover:text-cyan-400 hover:border-cyan-400/30 transition">
                        {s.name} <ExternalLink size={10} />
                      </a>
                    ))}
                    {!hasLiveData && (
                      <span className="flex items-center gap-1 text-xs text-violet-400 bg-violet-400/5 border border-violet-400/20 px-2.5 py-1 rounded-lg">
                        <WifiOff size={10} /> {t('price_knowledge_badge')}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {!showResult && !error && (
        <div className="glass-card p-10 text-center">
          <Bell size={36} className="text-slate-700 mx-auto mb-3" />
          <p className="text-sm text-slate-400 mb-1">{t('select_brand_model')}</p>
          <p className="text-xs text-slate-600">{t('refine_filters')}</p>
        </div>
      )}

      <HistoryPanel
        items={history}
        onRestore={restore}
        onRemove={removeHistory}
        onClear={clearHistory}
        onTogglePin={togglePin}
        primary={(item) => item.searchLabel}
        badge={(item) => (
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0 ${
            item.type === 'vo' ? 'bg-warn/10 text-warn' : 'bg-emerald-400/10 text-emerald-400'
          }`}>{item.type?.toUpperCase()}</span>
        )}
      />
    </div>
  )
}
