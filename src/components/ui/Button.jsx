import clsx from 'clsx'

// Hiérarchie d'emphase — une seule action `primary` par écran ; le reste descend
// d'un cran. Le cyan reste un signal (action clé + survols), pas un fond permanent.
const variants = {
  primary:   'bg-cyan-400 text-navy-900 font-bold shadow-[0_2px_12px_rgba(80,229,229,0.25)] hover:bg-cyan-300',
  secondary: 'text-cyan-400 border border-cyan-400/30 hover:bg-cyan-400/10',
  tertiary:  'text-slate-400 border border-white/10 hover:text-cyan-400 hover:border-cyan-400/30',
  danger:    'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20',
  // `ghost` conservé comme alias de `secondary` (compat usages existants).
  ghost:     'text-cyan-400 border border-cyan-400/30 hover:bg-cyan-400/10',
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  className,
  disabled,
  ...props
}) {
  return (
    <button
      disabled={disabled}
      className={clsx(
        'inline-flex items-center justify-center gap-2 font-semibold rounded-xl',
        'active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',
        variants[variant] ?? variants.primary,
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
