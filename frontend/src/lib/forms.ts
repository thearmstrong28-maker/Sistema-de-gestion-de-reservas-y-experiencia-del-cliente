export const omitEmptyString = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).filter(([, item]) => {
      if (item === undefined || item === null) {
        return false
      }

      if (typeof item === 'string') {
        return item.trim().length > 0
      }

      return true
    }),
  ) as T

export const parseJsonRecord = (
  raw: string,
): Record<string, unknown> | undefined => {
  const trimmed = raw.trim()

  if (!trimmed) {
    return undefined
  }

  try {
    const parsed: unknown = JSON.parse(trimmed)

    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      !Array.isArray(parsed)
    ) {
      return parsed as Record<string, unknown>
    }
  } catch {
    // Fall through to the user-facing error below.
  }

  throw new Error('Las preferencias deben escribirse como un objeto válido.')
}
