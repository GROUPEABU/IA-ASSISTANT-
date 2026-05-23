import clsx from 'clsx'

export default function Spinner({ size = 'md', className }) {
  const sizes = { sm: 'w-4 h-4', md: 'w-6 h-6', lg: 'w-8 h-8' }
  return (
    <div className={clsx(
      'rounded-full border-2 border-navy-700 border-t-cyan-400 animate-spin',
      sizes[size],
      className,
    )} />
  )
}
