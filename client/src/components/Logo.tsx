// A palm leaf in a rounded square: same artwork as the favicon.
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="16" fill="var(--accent)" />
      <path d="M32 14c-6 7-14 9-14 20a14 14 0 0 0 28 0c0-11-8-13-14-20z" fill="#f4e7cf" />
      <path d="M32 30v20" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
