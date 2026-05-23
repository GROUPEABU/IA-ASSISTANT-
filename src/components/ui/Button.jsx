import clsx from 'clsx'

const variants = {
  primary: 'bg-cyan-400 text-navy-900 hover:bg-cyan-300',
  ghost: 'text-cyan-400 border border-cyan-400/30 hover:bg-cyan-400/10',
  danger: 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20',
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
        'inline-flex items-center justify-center gap-2 font-semibold rounded-lg',
        'active:scale-95 transition-all duration-150 disabled:opacity-40 disabled:pointer-events-none',
        size === 'sm' && 'px-3 py-1.5 text-xs',
        size === 'md' && 'px-4 py-2 text-sm',
        size === 'lg' && 'px-6 py-3 text-base',
        variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}
