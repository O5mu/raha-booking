// The gate of a walled istiraha: the mark is drawn from the thing itself.
export function Logo({ size = "1.75rem" }: { size?: number | string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" fill="currentColor" />
      <path d="M14 50V26l18-12 18 12v24H38V36H26v14z" fill="var(--bg)" />
    </svg>
  );
}
