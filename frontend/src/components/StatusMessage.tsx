interface StatusMessageProps {
  status: 'idle' | 'loading' | 'success' | 'error'
  message?: string
}

export function StatusMessage({ status, message }: StatusMessageProps) {
  if (status === 'idle' || !message) {
    return null
  }

  return (
    <p className={`status status-${status}`} role={status === 'error' ? 'alert' : 'status'}>
      {message}
    </p>
  )
}
