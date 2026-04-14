export const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'UTC',
  }).format(new Date(value))
}

export const formatDate = (value?: string | null): string => {
  if (!value) {
    return '—'
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value
  }

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(value))
}

export const formatPercent = (value: number): string => `${value.toFixed(1)}%`

export const stringifyJson = (value: Record<string, unknown>): string =>
  Object.keys(value).length > 0 ? JSON.stringify(value, null, 2) : '—'

// Convierte un string de input datetime-local ("2026-04-13T18:01") a ISO UTC explícito.
// Tratamos la hora ingresada por el usuario como hora del restaurante (sin conversión de zona horaria).
export const toIsoFromDatetimeLocal = (value: string): string =>
  value ? `${value.slice(0, 16)}:00Z` : ''

// Convierte fecha + hora por separado a ISO UTC explícito.
// La "Z" evita que el navegador o Node.js apliquen su zona horaria local.
export const toIsoFromDateAndTime = (dateValue: string, timeValue: string): string =>
  dateValue && timeValue ? `${dateValue}T${timeValue}:00Z` : ''

// Lee la hora de un timestamp UTC y la devuelve como "HH:MM" sin conversión de zona horaria.
export const toTimeInputValue = (value: string | null | undefined): string => {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}

// Lee la fecha de un timestamp UTC y la devuelve como "YYYY-MM-DD" sin conversión de zona horaria.
export const toDateInputValue = (value: string | null | undefined): string => {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(
    date.getUTCDate(),
  ).padStart(2, '0')}`
}
