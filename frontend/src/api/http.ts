import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { useAuthStore } from '../store/auth'
import type { ApiErrorResponse } from './types'

const baseURL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = useAuthStore.getState().token.trim()

  if (token) {
    config.headers.set('Authorization', `Bearer ${token}`)
  }

  return config
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error) && error.response?.status === 401) {
      useAuthStore.getState().clearSession()
    }

    return Promise.reject(error)
  },
)

export const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    return getAxiosErrorMessage(error)
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Se produjo un error inesperado.'
}

const getAxiosErrorMessage = (error: AxiosError<ApiErrorResponse>): string => {
  const payload = error.response?.data

  if (payload) {
    const message = payload.message

    if (Array.isArray(message)) {
      return message.join(' · ')
    }

    if (typeof message === 'string' && message.trim()) {
      return message
    }

    if (typeof payload.error === 'string' && payload.error.trim()) {
      return payload.error
    }
  }

  if (error.response) {
    return `Error ${error.response.status} al comunicarse con el servidor.`
  }

  return 'No se pudo conectar con el servidor. Revisá la configuración.'
}
