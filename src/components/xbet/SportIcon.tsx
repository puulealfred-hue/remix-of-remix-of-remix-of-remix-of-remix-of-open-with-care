/** Sport (ball) icon — inherits currentColor so it themes like lucide icons. */
export function SportIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      aria-hidden
    >
      <circle cx="33.69" cy="32" r="24.99" />
      <polygon points="33.43 20.18 22.84 27.88 26.89 40.32 39.98 40.32 44.02 27.88 33.43 20.18" />
      <polyline points="40.41 7.92 33.43 13.48 26.59 8.04" />
      <line x1="33.43" y1="20.18" x2="33.43" y2="13.48" />
      <polyline points="58.68 32 50.6 25.92 53.78 17.14" />
      <polyline points="40.72 55.99 44.02 46.39 54.05 46.49" />
      <polyline points="25.61 55.65 22.55 46.39 13.26 46.39" />
      <polyline points="8.7 32 15.99 25.97 13.16 17.76" />
      <line x1="22.84" y1="27.88" x2="15.99" y2="25.97" />
      <line x1="26.89" y1="40.32" x2="22.55" y2="46.39" />
      <line x1="39.98" y1="40.32" x2="44.02" y2="46.39" />
      <line x1="44.02" y1="27.89" x2="50.6" y2="25.92" />
    </svg>
  );
}
