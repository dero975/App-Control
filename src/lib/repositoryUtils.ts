export function assertUniqueIdentifiers<T>(rows: T[], getIdentifier: (row: T) => string, errorLabel: string) {
  const seenIdentifiers = new Set<string>()

  for (const row of rows) {
    const identifier = getIdentifier(row).trim()
    if (seenIdentifiers.has(identifier)) {
      throw new Error(`${errorLabel}: ${identifier || 'campo vuoto'}`)
    }

    seenIdentifiers.add(identifier)
  }
}

export function normalizeFieldKey(key: string) {
  return key
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}
