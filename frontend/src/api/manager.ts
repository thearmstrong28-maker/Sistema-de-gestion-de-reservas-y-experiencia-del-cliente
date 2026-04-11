import { api } from './http'
import type {
  CustomerWithMetrics,
  DailyComparisonQuery,
  DailyComparisonRow,
  DailySummaryQuery,
  DailyReportSummary,
  FrequentCustomerRow,
  FrequentCustomersQuery,
  ReportSnapshot,
  Reservation,
  UpdateCustomerRequest,
} from './types'

export const listCustomersWithMetrics = async (query = ''): Promise<CustomerWithMetrics[]> => {
  const { data } = await api.get<CustomerWithMetrics[]>('/customers/metrics', {
    params: query.trim() ? { q: query.trim() } : undefined,
  })
  return data
}

export const updateCustomer = async (
  id: string,
  payload: UpdateCustomerRequest,
): Promise<CustomerWithMetrics> => {
  const { data } = await api.patch<CustomerWithMetrics>(`/customers/${id}`, payload)
  return data
}

export const listReservationsByDate = async (date: string): Promise<Reservation[]> => {
  const { data } = await api.get<Reservation[]>('/reservations', {
    params: date ? { date } : undefined,
  })
  return data
}

export const fetchDailyReportSummary = async (query: DailySummaryQuery): Promise<DailyReportSummary> => {
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

export const listReportSnapshots = async (): Promise<ReportSnapshot[]> => {
  const { data } = await api.get<ReportSnapshot[]>('/reports/snapshots')
  return data
}
