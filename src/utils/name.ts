// Compose a display name from prefix + first + last name parts.
// prefix joins without a space (e.g. "ภก.ศิริพร"), first/last join with a space.
export function composeName(
  prefix?: string | null,
  firstName?: string | null,
  lastName?: string | null,
): string {
  const first = (firstName || '').trim();
  const last = (lastName || '').trim();
  const pfx = (prefix || '').trim();
  const name = [first, last].filter(Boolean).join(' ');
  return `${pfx}${name}`.trim();
}
