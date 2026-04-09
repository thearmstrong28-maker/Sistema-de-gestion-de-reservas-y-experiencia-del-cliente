import { api } from './http'
import type {
  AdminUser,
  DailyComparisonQuery,
  DailyComparisonRow,
  DailyReportSummary,
  DailySummaryQuery,
  CreateInternalUserRequest,
  CreateTablesBulkRequest,
  CreateTablesDistributionRequest,
  EstablishmentSummary,
  ListUsersQuery,
  ReportSnapshot,
  RestaurantTable,
  FrequentCustomerRow,
  FrequentCustomersQuery,
  UpdateUserRequest,
} from './types'

export const fetchEstablishmentSummary = async (): Promise<EstablishmentSummary> => {
  const { data } = await api.get<EstablishmentSummary>('/establishment')
  return data
}

export const createInternalUser = async (
  payload: CreateInternalUserRequest,
): Promise<AdminUser> => {
  const { data } = await api.post<AdminUser>('/users/internal', payload)
  return data
}

export const fetchDailyReportSummary = async (
  query: DailySummaryQuery,
): Promise<DailyReportSummary> => {
  const { data } = await api.get<DailyReportSummary>('/reports/daily-summary', {
    params: query,
  })
  return data
}

export const fetchDailyReportComparison = async (
  query: DailyComparisonQuery,
): Promise<DailyComparisonRow[]> => {
  const { data } = await api.get<DailyComparisonRow[]>('/reports/daily-comparison', {
    params: query,
  })
  return data
}

export const fetchFrequentCustomers = async (
  query: FrequentCustomersQuery,
): Promise<FrequentCustomerRow[]> => {
  const { data } = await api.get<FrequentCustomerRow[]>('/reports/frequent-customers', {
    params: query,
  })
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

export const updateUser = async (
  id: string,
  payload: UpdateUserRequest,
): Promise<AdminUser> => {
  const { data } = await api.patch<AdminUser>(`/users/${id}`, payload)
  return data
}

export const listTables = async (): Promise<RestaurantTable[]> => {
  const { data } = await api.get<RestaurantTable[]>('/establishment/tables')
  return data
}

export const createTablesBulk = async (
  payload: CreateTablesBulkRequest,
): Promise<RestaurantTable[]> => {
  const { data } = await api.post<RestaurantTable[]>('/establishment/tables/bulk', payload)
  return data
}

export const createTablesDistribution = async (
  payload: CreateTablesDistributionRequest,
): Promise<RestaurantTable[]> => {
  const { data } = await api.post<RestaurantTable[]>('/establishment/tables/distribution', payload)
  return data
}

export const listReportSnapshots = async (): Promise<ReportSnapshot[]> => {
  const { data } = await api.get<ReportSnapshot[]>('/reports/snapshots')
  return data
}

export const deleteReportSnapshot = async (id: string): Promise<{ deleted: true }> => {
  const { data } = await api.delete<{ deleted: true }>(`/reports/snapshots/${id}`)
  return data
}
