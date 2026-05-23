import clsx from 'clsx'

const variants = {
  success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  warning: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  danger: 'bg-red-500/10 text-red-400 border-red-500/20',
  cyan: 'bg-cyan-400/10 text-cyan-400 border-cyan-400/20',
  default: 'bg-slate-700/50 text-slate-400 border-slate-600/30',
}

export default function Badge({ children, variant = 'default', className }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
      variants[variant],
      className,
    )}>
      {children}
    </span>
  )
}
