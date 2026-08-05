export function Toggle({ activo, onClick, ariaLabel }: { activo: boolean; onClick: () => void; ariaLabel?: string }) {
  return (
    <button
      onClick={onClick}
      className="relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors"
      style={{ background: activo ? 'var(--color-primario)' : '#E0D4CC' }}
      aria-pressed={activo}
      aria-label={ariaLabel ?? (activo ? 'Desactivar' : 'Activar')}
    >
      <span className="absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-all" style={{ left: activo ? 18 : 2 }} />
    </button>
  )
}
