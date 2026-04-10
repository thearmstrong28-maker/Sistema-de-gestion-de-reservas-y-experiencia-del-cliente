export const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return '—'
  }

  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeStyle: 'short',
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
  }).format(new Date(value))
}

export const formatPercent = (value: number): string => `${value.toFixed(1)}%`

export const stringifyJson = (value: Record<string, unknown>): string =>
  Object.keys(value).length > 0 ? JSON.stringify(value, null, 2) : '—'

export const toIsoFromDatetimeLocal = (value: string): string =>
  value ? new Date(value).toISOString() : ''

export const toIsoFromDateAndTime = (dateValue: string, timeValue: string): string =>
  dateValue && timeValue ? new Date(`${dateValue}T${timeValue}:00`).toISOString() : ''

export const toTimeInputValue = (value: string | null | undefined): string => {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export const toDateInputValue = (value: string | null | undefined): string => {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(
    date.getDate(),
  ).padStart(2, '0')}`
}
