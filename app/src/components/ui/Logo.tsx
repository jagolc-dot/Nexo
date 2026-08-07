export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span
      className="notranslate inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--color-primario)] font-semibold text-white"
      style={{ width: size, height: size, fontSize: size * 0.5 }}
      aria-label="Nexo"
      translate="no"
    >
      N
    </span>
  )
}
