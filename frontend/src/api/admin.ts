import { api } from './http'
import type { AdminUser, CreateInternalUserRequest, ListUsersQuery } from './types'

export const createInternalUser = async (
  payload: CreateInternalUserRequest,
): Promise<AdminUser> => {
  const { data } = await api.post<AdminUser>('/users/internal', payload)
  return data
}

export const listUsers = async (query: ListUsersQuery): Promise<AdminUser[]> => {
  const { data } = await api.get<AdminUser[]>('/users', { params: query })
  return data
}

export const deleteUser = async (id: string): Promise<AdminUser> => {
  const { data } = await api.delete<AdminUser>(`/users/${id}`)
  return data
}
