import { api } from './http'
import type {
  AuthProfile,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
} from './types'

export const login = async (payload: LoginRequest): Promise<LoginResponse> => {
  const { data } = await api.post<LoginResponse>('/auth/login', payload)
  return data
}

export const register = async (
  payload: RegisterRequest,
): Promise<RegisterResponse> => {
  const { data } = await api.post<RegisterResponse>('/auth/register', payload)
  return data
}

export const fetchMe = async (): Promise<AuthProfile> => {
  const { data } = await api.get<AuthProfile>('/auth/me')
  return data
}
