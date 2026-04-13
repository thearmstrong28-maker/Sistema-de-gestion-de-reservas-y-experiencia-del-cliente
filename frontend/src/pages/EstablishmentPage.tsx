import { Fragment, useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react'
import {
  createInternalUser,
  createTablesBulk,
  createTablesDistribution,
  deleteReportSnapshot,
  deleteTable,
  deleteUser,
  fetchDailyReportComparison,
  fetchDailyReportSummary,
  fetchEstablishmentSummary,
  fetchFrequentCustomers,
  listReportSnapshots,
  listTables,
  listUsers,
  updateTableAvailability,
  updateTable,
  updateUser,
} from '../api/admin'
import { getApiErrorMessage } from '../api/http'
import type {
  AdminUser,
  CreateInternalUserRequest,
  CreateTablesDistributionRequest,
  DailyComparisonRow,
  DailyReportSummary,
  DailySummaryQuery,
  EstablishmentSummary,
  FrequentCustomerRow,
  InternalUserRole,
  ReportSnapshot,
  RestaurantTable,
  EditableUserRole,
  TableCategory,
  UpdateTableRequest,
  UpdateUserRequest,
} from '../api/types'
import { StatusMessage } from '../components/StatusMessage'
import { formatDateTime, formatPercent } from '../lib/format'
import { formatTableAvailabilityStatus, formatTableIdentifier, formatUserRole } from '../lib/labels'
import { omitEmptyString } from '../lib/forms'
import { useAuthStore } from '../store/auth'
import editIcon from '../assets/icon-edit.png'
import deleteIcon from '../assets/icon-delete.png'
import availabilityIcon from '../assets/icon-availability.png'

type Status = 'idle' | 'loading' | 'success' | 'error'
type AdminTab = 'usuarios' | 'mesas' | 'reportes'

interface ResultState<T> {
  status: Status
  message: string
  data: T
}

interface ReportFilters {
  date: string
  days: string
  minVisits: string
  limit: string
}

interface TablesCreationForm {
  capacity: string
  category: TableCategory
}

interface TableEditForm {
  capacity: string
  category: TableCategory
}

interface UserEditForm {
  fullName: string
  email: string
  phone: string
  role: EditableUserRole
}

const today = new Date().toISOString().slice(0, 10)

const emptyCreateUserForm = {
  fullName: '',
  email: '',
  phone: '',
  password: '',
  role: 'host' as InternalUserRole,
}

const tableCategories: Array<{ value: TableCategory; label: string }> = [
  { value: 'Normal', label: 'Normal' },
  { value: 'Premium', label: 'Premium' },
  { value: 'Privada', label: 'Privada' },
]

const emptyTablesForm: TablesCreationForm = {
  capacity: '4',
  category: 'Normal',
}

const emptyTableEditForm: TableEditForm = {
  capacity: '4',
  category: 'Normal',
}

const emptyUserEditForm: UserEditForm = {
  fullName: '',
  email: '',
  phone: '',
  role: 'host',
}

const editableUserRoles: Array<{ value: EditableUserRole; label: string }> = [
  { value: 'host', label: 'Recepcionista' },
  { value: 'manager', label: 'Gerente' },
  { value: 'customer', label: 'Cliente' },
]

const initialReportFilters: ReportFilters = {
  date: today,
  days: '7',
  minVisits: '2',
  limit: '8',
}

const adminTabs: Array<{ id: AdminTab; label: string; description: string }> = [
  { id: 'usuarios', label: 'Usuarios', description: 'Alta y baja de recepcionistas, gerentes y clientes.' },
  { id: 'mesas', label: 'Mesas', description: 'Distribución visual y capacidad por mesa.' },
  { id: 'reportes', label: 'Reportes', description: 'Métricas, comparativo y gestión de snapshots.' },
]

const parsePositiveInteger = (value: string, fallback: number): number => {
  const parsed = Number(value)

  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback
  }

  return Math.trunc(parsed)
}

const STAGE_INSET_X_PERCENT = 8
const STAGE_INSET_Y_PERCENT = 10
const STAGE_RANGE_X_PERCENT = 84
const STAGE_RANGE_Y_PERCENT = 78

interface LayoutBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

interface TableDragState {
  tableId: string
  pointerId: number
  pointerOffsetX: number
  pointerOffsetY: number
  nodeHalfWidth: number
  nodeHalfHeight: number
  bounds: LayoutBounds
}

const clamp = (value: number, min: number, max: number): number => Math.min(Math.max(value, min), max)

const roundToLayoutUnit = (value: number): number => Math.round(value * 100) / 100

const buildLayoutBounds = (tables: RestaurantTable[]): LayoutBounds => {
  if (!tables.length) {
    return {
      minX: 0,
      maxX: 1,
      minY: 0,
      maxY: 1,
    }
  }

  const xValues = tables.map((table) => table.posX ?? 0)
  const yValues = tables.map((table) => table.posY ?? 0)

  return {
    minX: Math.min(...xValues),
    maxX: Math.max(...xValues),
    minY: Math.min(...yValues),
    maxY: Math.max(...yValues),
  }
}

const normalizeTableLayout = (table: RestaurantTable): RestaurantTable => ({
  ...table,
  posX: table.posX ?? 0,
  posY: table.posY ?? 0,
})

const normalizeTablesLayout = (tables: RestaurantTable[]): RestaurantTable[] => tables.map(normalizeTableLayout)

const hasUsefulLayout = (tables: RestaurantTable[]): boolean => {
  const positionedTables = tables.filter((table) => table.posX !== null && table.posY !== null)

  if (positionedTables.length < 2) {
    return false
  }

  const bounds = buildLayoutBounds(positionedTables)
  return bounds.maxX - bounds.minX > 0 || bounds.maxY - bounds.minY > 0
}

const buildCenteredPositions = (
  count: number,
  options?: {
    centerX?: number
    centerY?: number
    spacingX?: number
    spacingY?: number
  },
): Array<{ posX: number; posY: number }> => {
  const centerX = options?.centerX ?? 0
  const centerY = options?.centerY ?? 0
  const spacingX = options?.spacingX ?? 2
  const spacingY = options?.spacingY ?? 2
  const columns = Math.max(1, Math.ceil(Math.sqrt(count)))

  return Array.from({ length: count }, (_, index) => {
    const row = Math.floor(index / columns)
    const column = index % columns
    const offsetX = column - (columns - 1) / 2
    const offsetY = row - (Math.ceil(count / columns) - 1) / 2

    return {
      posX: roundToLayoutUnit(centerX + offsetX * spacingX),
      posY: roundToLayoutUnit(centerY + offsetY * spacingY),
    }
  })
}

const hydrateTablesLayout = (tables: RestaurantTable[]): RestaurantTable[] => {
  if (!tables.length) {
    return []
  }

  if (!hasUsefulLayout(tables)) {
    const centeredPositions = buildCenteredPositions(tables.length)

    return tables.map((table, index) => ({
      ...table,
      posX: centeredPositions[index].posX,
      posY: centeredPositions[index].posY,
    }))
  }

  const normalizedTables = tables.map((table) => {
    if (table.posX !== null && table.posY !== null) {
      return normalizeTableLayout(table)
    }

    return {
      ...table,
      posX: null,
      posY: null,
    }
  })

  const positionedTables = normalizedTables.filter((table) => table.posX !== null && table.posY !== null)
  const fallbackIndexes = normalizedTables
    .map((table, index) => (table.posX === null || table.posY === null ? index : -1))
    .filter((index) => index >= 0)

  if (!fallbackIndexes.length) {
    return normalizedTables as RestaurantTable[]
  }

  const bounds = buildLayoutBounds(positionedTables as RestaurantTable[])
  const centeredPositions = buildCenteredPositions(fallbackIndexes.length, {
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerY: (bounds.minY + bounds.maxY) / 2,
    spacingX: Math.max(1, (bounds.maxX - bounds.minX) / 4),
    spacingY: Math.max(1, (bounds.maxY - bounds.minY) / 4),
  })

  return normalizedTables.map((table, index) => {
    const fallbackIndex = fallbackIndexes.indexOf(index)

    if (fallbackIndex === -1) {
      return table as RestaurantTable
    }

    return {
      ...table,
      posX: centeredPositions[fallbackIndex].posX,
      posY: centeredPositions[fallbackIndex].posY,
    } as RestaurantTable
  })
}

const reconcileTablesWithPending = (
  tables: RestaurantTable[],
  pendingTables: RestaurantTable[],
): { tables: RestaurantTable[]; unresolvedPending: RestaurantTable[] } => {
  if (!pendingTables.length) {
    return { tables, unresolvedPending: [] }
  }

  const pendingById = new Map(pendingTables.map((table) => [table.id, table]))
  const reconciledTables = tables.map((table) => {
    const pendingTable = pendingById.get(table.id)

    if (!pendingTable) {
      return table
    }

    pendingById.delete(table.id)

    return {
      ...table,
      posX: table.posX ?? pendingTable.posX,
      posY: table.posY ?? pendingTable.posY,
      layoutLabel: table.layoutLabel ?? pendingTable.layoutLabel,
    }
  })

  return {
    tables: reconciledTables.concat(Array.from(pendingById.values())),
    unresolvedPending: Array.from(pendingById.values()),
  }
}

const toStagePercent = (value: number | null, min: number, max: number, inset: number, range: number): number => {
  const safeValue = value ?? 0
  const normalized = (safeValue - min) / Math.max(1, max - min)
  return inset + clamp(normalized, 0, 1) * range
}

const fromStagePercent = (percent: number, min: number, max: number, inset: number, range: number): number => {
  const normalized = clamp((percent - inset) / Math.max(1, range), 0, 1)
  return min + normalized * Math.max(1, max - min)
}

const getTableAvailabilityStatus = (table: RestaurantTable): 'disponible' | 'ocupada' =>
  table.availabilityStatus === 'ocupada' ? 'ocupada' : 'disponible'

const decrementSummaryValue = (value: number): number => Math.max(0, value - 1)

const updateSummaryAfterUserDeletion = (summary: EstablishmentSummary, user: AdminUser): EstablishmentSummary => {
  const nextSummary: EstablishmentSummary = {
    ...summary,
    usersCount: decrementSummaryValue(summary.usersCount),
    activeUsersCount: decrementSummaryValue(summary.activeUsersCount),
  }

  if (user.role === 'customer') {
    nextSummary.customerUsersCount = decrementSummaryValue(summary.customerUsersCount)
  }

  if (user.role === 'host' || user.role === 'manager') {
    nextSummary.internalUsersCount = decrementSummaryValue(summary.internalUsersCount)
  }

  return nextSummary
}

export function AdministrationPage() {
  const profile = useAuthStore((state) => state.profile)
  const [activeTab, setActiveTab] = useState<AdminTab>('usuarios')
  const [establishmentState, setEstablishmentState] = useState<ResultState<EstablishmentSummary | null>>({
    status: 'idle',
    message: '',
    data: null,
  })
  const [createUserForm, setCreateUserForm] = useState(emptyCreateUserForm)
  const [createUserState, setCreateUserState] = useState<{ status: Status; message: string }>({
    status: 'idle',
    message: '',
  })
  const [usersState, setUsersState] = useState<ResultState<AdminUser[]>>({
    status: 'idle',
    message: '',
    data: [],
  })
  const [usersActionState, setUsersActionState] = useState<{ status: Status; message: string }>({
    status: 'idle',
    message: '',
  })
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [userEditForm, setUserEditForm] = useState<UserEditForm>(emptyUserEditForm)
  const [tablesForm, setTablesForm] = useState<TablesCreationForm>(emptyTablesForm)
  const [tablesState, setTablesState] = useState<ResultState<RestaurantTable[]>>({
    status: 'idle',
    message: '',
    data: [],
  })
  const [tablesActionState, setTablesActionState] = useState<{ status: Status; message: string }>({
    status: 'idle',
    message: '',
  })
  const [editingTableId, setEditingTableId] = useState<string | null>(null)
  const [tableEditForm, setTableEditForm] = useState<TableEditForm>(emptyTableEditForm)
  const [editableTables, setEditableTables] = useState<RestaurantTable[]>([])
  const [tableCoordinateBounds, setTableCoordinateBounds] = useState<LayoutBounds>(buildLayoutBounds([]))
  const [tableDragState, setTableDragState] = useState<TableDragState | null>(null)
  const [layoutDirty, setLayoutDirty] = useState(false)
  const [updatingTableId, setUpdatingTableId] = useState<string | null>(null)
  const [selectedTableId, setSelectedTableId] = useState('')
  const pendingCreatedTablesRef = useRef<RestaurantTable[]>([])
  const [reportFilters, setReportFilters] = useState<ReportFilters>(initialReportFilters)
  const [dailySummaryState, setDailySummaryState] = useState<ResultState<DailyReportSummary | null>>({
    status: 'idle',
    message: '',
    data: null,
  })
  const [comparisonState, setComparisonState] = useState<ResultState<DailyComparisonRow[]>>({
    status: 'idle',
    message: '',
    data: [],
  })
  const [frequentState, setFrequentState] = useState<ResultState<FrequentCustomerRow[]>>({
    status: 'idle',
    message: '',
    data: [],
  })
  const [snapshotsState, setSnapshotsState] = useState<ResultState<ReportSnapshot[]>>({
    status: 'idle',
    message: '',
    data: [],
  })
  const [snapshotsActionState, setSnapshotsActionState] = useState<{ status: Status; message: string }>({
    status: 'idle',
    message: '',
  })
  const tablesStageRef = useRef<HTMLDivElement | null>(null)

  const restaurantName = useMemo(
    () =>
      dailySummaryState.data?.restaurantName ||
      profile?.restaurantName ||
      establishmentState.data?.restaurantName ||
      'Restaurante principal',
    [dailySummaryState.data?.restaurantName, establishmentState.data?.restaurantName, profile?.restaurantName],
  )

  const selectedTable = useMemo(
    () => editableTables.find((table) => table.id === selectedTableId) ?? editableTables[0] ?? null,
    [editableTables, selectedTableId],
  )

  const visibleTableIdentifierById = useMemo(() => {
    const sortedTables = [...editableTables].sort((left, right) => {
      if (left.tableNumber !== right.tableNumber) {
        return left.tableNumber - right.tableNumber
      }

      return left.id.localeCompare(right.id)
    })

    return new Map(sortedTables.map((table, index) => [table.id, formatTableIdentifier(index + 1)]))
  }, [editableTables])

  const getVisibleTableIdentifier = useCallback(
    (table: Pick<RestaurantTable, 'id' | 'tableNumber'>) =>
      visibleTableIdentifierById.get(table.id) ?? formatTableIdentifier(table.tableNumber),
    [visibleTableIdentifierById],
  )

  const loadOverview = useCallback(async () => {
    setEstablishmentState({
      status: 'loading',
      message: 'Cargando datos del establecimiento...',
      data: null,
    })

    try {
      const data = await fetchEstablishmentSummary()
      setEstablishmentState({
        status: 'success',
        message: 'Datos del establecimiento listos.',
        data,
      })
    } catch (error) {
      setEstablishmentState({
        status: 'error',
        message: getApiErrorMessage(error),
        data: null,
      })
    }
  }, [])

  const loadUsers = useCallback(async () => {
    setUsersState((state) => ({
      ...state,
      status: 'loading',
      message: 'Cargando usuarios...',
    }))

    try {
      const data = await listUsers({ isActive: true })
      const activeUsers = data.filter((user) => user.isActive === true)
      setUsersState({
        status: 'success',
        message: 'Listado de usuarios actualizado.',
        data: activeUsers,
      })
    } catch (error) {
      setUsersState({
        status: 'error',
        message: getApiErrorMessage(error),
        data: [],
      })
    }
  }, [])

  const resetUserEditForm = useCallback(() => {
    setEditingUserId(null)
    setUserEditForm(emptyUserEditForm)
  }, [])

  const resetTableEditForm = useCallback(() => {
    setEditingTableId(null)
    setTableEditForm(emptyTableEditForm)
  }, [])

  const startEditingTable = useCallback((table: RestaurantTable) => {
    setEditingTableId(table.id)
    setTableEditForm({
      capacity: String(table.capacity),
      category: table.category ?? 'Normal',
    })
    setSelectedTableId(table.id)
  }, [])

  const startEditingUser = useCallback((user: AdminUser) => {
    setEditingUserId(user.id)
    setUserEditForm({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone ?? '',
      role: user.role === 'admin' ? 'host' : user.role,
    })
  }, [])

  const loadTables = useCallback(async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setTablesState((state) => ({
        ...state,
        status: 'loading',
        message: 'Cargando mesas...',
      }))
    }

    try {
      const backendTables = await listTables()
      const reconciledTables = reconcileTablesWithPending(backendTables, pendingCreatedTablesRef.current)
      pendingCreatedTablesRef.current = reconciledTables.unresolvedPending.filter((table) => table.isActive)
      const data = hydrateTablesLayout(reconciledTables.tables.filter((table) => table.isActive))
      setTablesState({
        status: 'success',
        message: 'Distribución de mesas actualizada.',
        data,
      })
      setEditableTables(data)
      setTableCoordinateBounds(buildLayoutBounds(data))
      setLayoutDirty(false)
    } catch (error) {
      if (options?.silent) {
        setTablesState((state) => ({
          ...state,
          status: 'error',
          message: getApiErrorMessage(error),
        }))
      } else {
        setTablesState({
          status: 'error',
          message: getApiErrorMessage(error),
          data: [],
        })
        setEditableTables([])
        setLayoutDirty(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!tableDragState) {
      return
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== tableDragState.pointerId) {
        return
      }

      const stageElement = tablesStageRef.current
      if (!stageElement) {
        return
      }

      const stageRect = stageElement.getBoundingClientRect()
      if (!stageRect.width || !stageRect.height) {
        return
      }

      const centerX = event.clientX - stageRect.left - tableDragState.pointerOffsetX
      const centerY = event.clientY - stageRect.top - tableDragState.pointerOffsetY

      const clampedCenterX = clamp(centerX, tableDragState.nodeHalfWidth, stageRect.width - tableDragState.nodeHalfWidth)
      const clampedCenterY = clamp(centerY, tableDragState.nodeHalfHeight, stageRect.height - tableDragState.nodeHalfHeight)

      const leftPercent = (clampedCenterX / stageRect.width) * 100
      const topPercent = (clampedCenterY / stageRect.height) * 100

      const nextPosX = Math.round(
        fromStagePercent(
          leftPercent,
          tableDragState.bounds.minX,
          tableDragState.bounds.maxX,
          STAGE_INSET_X_PERCENT,
          STAGE_RANGE_X_PERCENT,
        ),
      )
      const nextPosY = Math.round(
        fromStagePercent(
          topPercent,
          tableDragState.bounds.minY,
          tableDragState.bounds.maxY,
          STAGE_INSET_Y_PERCENT,
          STAGE_RANGE_Y_PERCENT,
        ),
      )

      setEditableTables((previousTables) =>
        previousTables.map((table) =>
          table.id === tableDragState.tableId
            ? {
                ...table,
                posX: nextPosX,
                posY: nextPosY,
              }
            : table,
        ),
      )
      setLayoutDirty(true)
    }

    const handlePointerUp = (event: PointerEvent) => {
      if (event.pointerId !== tableDragState.pointerId) {
        return
      }

      setTableDragState(null)
    }

    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
    window.addEventListener('pointercancel', handlePointerUp)

    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointercancel', handlePointerUp)
    }
  }, [tableDragState])

  const loadDailySummary = useCallback(async (filters: ReportFilters) => {
    setDailySummaryState({
      status: 'loading',
      message: 'Cargando resumen diario...',
      data: null,
    })

    try {
      const query: DailySummaryQuery = {
        date: filters.date || undefined,
      }
      const data = await fetchDailyReportSummary(query)
      setDailySummaryState({
        status: 'success',
        message: 'Resumen diario listo.',
        data,
      })
    } catch (error) {
      setDailySummaryState({
        status: 'error',
        message: getApiErrorMessage(error),
        data: null,
      })
    }
  }, [])

  const loadComparison = useCallback(async (filters: ReportFilters) => {
    setComparisonState({
      status: 'loading',
      message: 'Cargando comparativo...',
      data: [],
    })

    try {
      const data = await fetchDailyReportComparison({
        date: filters.date || undefined,
        days: parsePositiveInteger(filters.days, 7),
      })
      setComparisonState({
        status: 'success',
        message: 'Comparativo actualizado.',
        data,
      })
    } catch (error) {
      setComparisonState({
        status: 'error',
        message: getApiErrorMessage(error),
        data: [],
      })
    }
  }, [])

  const loadFrequentCustomers = useCallback(async (filters: ReportFilters) => {
    setFrequentState({
      status: 'loading',
      message: 'Cargando clientes frecuentes...',
      data: [],
    })

    try {
      const data = await fetchFrequentCustomers({
        minVisits: parsePositiveInteger(filters.minVisits, 2),
        limit: parsePositiveInteger(filters.limit, 8),
      })
      setFrequentState({
        status: 'success',
        message: 'Clientes frecuentes listos.',
        data,
      })
    } catch (error) {
      setFrequentState({
        status: 'error',
        message: getApiErrorMessage(error),
        data: [],
      })
    }
  }, [])

  const loadSnapshots = useCallback(async () => {
    setSnapshotsState({
      status: 'loading',
      message: 'Cargando reportes generados...',
      data: [],
    })

    try {
      const data = await listReportSnapshots()
      setSnapshotsState({
        status: 'success',
        message: 'Reportes generados listos.',
        data,
      })
    } catch (error) {
      setSnapshotsState({
        status: 'error',
        message: getApiErrorMessage(error),
        data: [],
      })
    }
  }, [])

  const loadReports = useCallback(
    async (filters: ReportFilters) => {
      await Promise.all([loadDailySummary(filters), loadComparison(filters), loadFrequentCustomers(filters), loadSnapshots()])
    },
    [loadComparison, loadDailySummary, loadFrequentCustomers, loadSnapshots],
  )

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadOverview()
      void loadUsers()
      void loadTables()
      void loadReports(initialReportFilters)
    }, 0)

    return () => window.clearTimeout(timer)
  }, [loadOverview, loadReports, loadTables, loadUsers])

  const handleCreateUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setCreateUserState({ status: 'loading', message: 'Creando usuario interno...' })

    try {
      const payload: CreateInternalUserRequest = omitEmptyString({
        email: createUserForm.email.trim(),
        fullName: createUserForm.fullName.trim(),
        phone: createUserForm.phone.trim(),
        password: createUserForm.password,
        role: createUserForm.role,
      })

      await createInternalUser(payload)
      setCreateUserForm(emptyCreateUserForm)
      setCreateUserState({ status: 'success', message: 'Usuario creado correctamente.' })
      await Promise.all([loadUsers(), loadOverview()])
    } catch (error) {
      setCreateUserState({
        status: 'error',
        message: getApiErrorMessage(error),
      })
    }
  }

  const handleDeleteUser = async (user: AdminUser) => {
    if (!window.confirm(`Dar de baja a ${user.fullName}?`)) {
      return
    }

    setUsersActionState({ status: 'loading', message: 'Aplicando baja lógica...' })

    try {
      await deleteUser(user.id)
      setUsersState((state) => ({
        ...state,
        data: state.data.filter((item) => item.id !== user.id),
      }))
      setEstablishmentState((state) =>
        state.data
          ? {
              ...state,
              data: updateSummaryAfterUserDeletion(state.data, user),
            }
          : state,
      )
      setUsersActionState({ status: 'success', message: 'Usuario dado de baja.' })
      if (editingUserId === user.id) {
        resetUserEditForm()
      }
      await Promise.all([loadUsers(), loadOverview()])
    } catch (error) {
      setUsersActionState({
        status: 'error',
        message: getApiErrorMessage(error),
      })
    }
  }

  const handleUpdateUser = async (event: FormEvent<HTMLFormElement>, userId: string) => {
    event.preventDefault()
    setUsersActionState({ status: 'loading', message: 'Guardando cambios del usuario...' })

    try {
      const payload: UpdateUserRequest = omitEmptyString({
        fullName: userEditForm.fullName.trim(),
        email: userEditForm.email.trim(),
        phone: userEditForm.phone.trim(),
        role: userEditForm.role,
      })

      const updatedUser = await updateUser(userId, payload)
      setUsersState((state) => ({
        ...state,
        data: state.data.map((item) => (item.id === userId ? updatedUser : item)),
      }))
      setUsersActionState({ status: 'success', message: 'Usuario actualizado correctamente.' })
      resetUserEditForm()
      await Promise.all([loadUsers(), loadOverview()])
    } catch (error) {
      setUsersActionState({
        status: 'error',
        message: getApiErrorMessage(error),
      })
    }
  }

  const handleCreateTable = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTablesActionState({ status: 'loading', message: 'Creando mesa...' })

    try {
      const payload = {
        quantity: 1,
        capacity: parsePositiveInteger(tablesForm.capacity, 2),
        category: tablesForm.category,
      }

      const createdTables = await createTablesBulk(payload)
      pendingCreatedTablesRef.current = [...pendingCreatedTablesRef.current, ...createdTables]
      const optimisticTables = hydrateTablesLayout(
        reconcileTablesWithPending([...tablesState.data, ...createdTables], pendingCreatedTablesRef.current).tables,
      )

      setTablesState((state) => ({
        ...state,
        status: 'success',
        message: 'Mesa creada correctamente.',
        data: optimisticTables,
      }))
      setEditableTables(optimisticTables)
      setTableCoordinateBounds(buildLayoutBounds(optimisticTables))
      setLayoutDirty(false)
      setSelectedTableId(createdTables[0]?.id ?? '')
      setTablesActionState({
        status: 'success',
        message: `Mesa ${tablesForm.category} creada correctamente.`,
      })
      await Promise.all([loadTables(), loadOverview()])
    } catch (error) {
      setTablesActionState({
        status: 'error',
        message: getApiErrorMessage(error),
      })
    }
  }

  const handleTablePointerDown = (event: ReactPointerEvent<HTMLButtonElement>, tableId: string) => {
    event.preventDefault()

    const stageElement = tablesStageRef.current
    if (!stageElement) {
      return
    }

    const table = editableTables.find((item) => item.id === tableId)
    if (!table) {
      return
    }

    const stageRect = stageElement.getBoundingClientRect()
    const tableLeftPercent = toStagePercent(
      table.posX,
      tableCoordinateBounds.minX,
      tableCoordinateBounds.maxX,
      STAGE_INSET_X_PERCENT,
      STAGE_RANGE_X_PERCENT,
    )
    const tableTopPercent = toStagePercent(
      table.posY,
      tableCoordinateBounds.minY,
      tableCoordinateBounds.maxY,
      STAGE_INSET_Y_PERCENT,
      STAGE_RANGE_Y_PERCENT,
    )

    const centerX = (tableLeftPercent / 100) * stageRect.width
    const centerY = (tableTopPercent / 100) * stageRect.height
    const nodeRect = event.currentTarget.getBoundingClientRect()

    event.currentTarget.setPointerCapture(event.pointerId)
    setSelectedTableId(tableId)
    setTableDragState({
      tableId,
      pointerId: event.pointerId,
      pointerOffsetX: event.clientX - stageRect.left - centerX,
      pointerOffsetY: event.clientY - stageRect.top - centerY,
      nodeHalfWidth: nodeRect.width / 2,
      nodeHalfHeight: nodeRect.height / 2,
      bounds: tableCoordinateBounds,
    })
  }

  const handleSaveLayout = async () => {
    if (!editableTables.length) {
      return
    }

    setTablesActionState({ status: 'loading', message: 'Guardando nueva posición de mesas...' })

    try {
      const payload: CreateTablesDistributionRequest = {
        tables: normalizeTablesLayout(editableTables).map((table) => ({
          tableNumber: table.tableNumber,
          capacity: table.capacity,
          posX: table.posX ?? 0,
          posY: table.posY ?? 0,
          category: table.category ?? 'Normal',
          ...(table.layoutLabel ? { layoutLabel: table.layoutLabel } : {}),
        })),
      }

      const savedTables = normalizeTablesLayout(await createTablesDistribution(payload))
      setTablesState((state) => ({
        ...state,
        data: savedTables,
      }))
      setEditableTables(savedTables)
      setTableCoordinateBounds(buildLayoutBounds(savedTables))
      setLayoutDirty(false)
      setTablesActionState({ status: 'success', message: 'Posiciones de la maqueta guardadas.' })
    } catch (error) {
      setTablesActionState({
        status: 'error',
        message: getApiErrorMessage(error),
      })
    }
  }

  const handleUpdateTable = async (tableId: string) => {
    const parsedCapacity = Number(tableEditForm.capacity)
    if (!Number.isInteger(parsedCapacity) || parsedCapacity < 1) {
      setTablesActionState({
        status: 'error',
        message: 'La capacidad debe ser un número entero mayor o igual a 1.',
      })
      return
    }

    if (!tableCategories.some((category) => category.value === tableEditForm.category)) {
      setTablesActionState({
        status: 'error',
        message: 'La categoría seleccionada no es válida.',
      })
      return
    }

    setUpdatingTableId(tableId)
    setTablesActionState({ status: 'loading', message: 'Guardando cambios de la mesa...' })

    try {
      const payload: UpdateTableRequest = {
        capacity: parsedCapacity,
        category: tableEditForm.category,
      }

      const updatedTable = normalizeTableLayout(await updateTable(tableId, payload))
      setEditableTables((previousTables) =>
        previousTables.map((item) => (item.id === tableId ? updatedTable : item)),
      )
      setTablesState((state) => ({
        ...state,
        data: state.data.map((item) => (item.id === tableId ? updatedTable : item)),
      }))
      await loadTables({ silent: true })
      setTableEditForm({
        capacity: String(updatedTable.capacity),
        category: updatedTable.category ?? 'Normal',
      })
      setTablesActionState({
        status: 'success',
        message: `Mesa ${getVisibleTableIdentifier(updatedTable)} actualizada correctamente. Listado y maqueta sincronizados.`,
      })
    } catch (error) {
      setTablesActionState({
        status: 'error',
        message: `No se pudieron guardar los cambios de la mesa: ${getApiErrorMessage(error)}`,
      })
    } finally {
      setUpdatingTableId(null)
    }
  }

  const resolveTableIdForSave = (fallbackTableId: string): string | null => {
    const existingTableIds = new Set(editableTables.map((table) => table.id))

    if (editingTableId && existingTableIds.has(editingTableId)) {
      return editingTableId
    }

    if (existingTableIds.has(fallbackTableId)) {
      return fallbackTableId
    }

    return null
  }

  const triggerTableSave = (fallbackTableId: string, event?: FormEvent<HTMLFormElement>) => {
    event?.preventDefault()

    const targetTableId = resolveTableIdForSave(fallbackTableId)
    if (!targetTableId) {
      setTablesActionState({
        status: 'error',
        message: 'No se pudo identificar el ID real de la mesa para guardar cambios.',
      })
      return
    }

    if (updatingTableId === targetTableId) {
      return
    }

    void handleUpdateTable(targetTableId)
  }

  const handleToggleTableAvailability = async (table: RestaurantTable) => {
    const nextAvailability =
      getTableAvailabilityStatus(table) === 'disponible' ? 'ocupada' : 'disponible'

    setUpdatingTableId(table.id)
    setTablesActionState({
      status: 'loading',
      message: `Actualizando la disponibilidad de ${getVisibleTableIdentifier(table)}...`,
    })

    try {
      const updatedTable = await updateTableAvailability(table.id, nextAvailability)
      const normalizedTable = normalizeTableLayout(updatedTable)
      setEditableTables((previousTables) =>
        previousTables.map((item) => (item.id === table.id ? normalizedTable : item)),
      )
      setTablesState((state) => ({
        ...state,
        data: state.data.map((item) => (item.id === table.id ? normalizedTable : item)),
      }))
      await loadTables({ silent: true })
      setTablesActionState({
        status: 'success',
        message: `La mesa ${getVisibleTableIdentifier(table)} ahora está ${formatTableAvailabilityStatus(nextAvailability)}.`,
      })
    } catch (error) {
      setTablesActionState({
        status: 'error',
        message: getApiErrorMessage(error),
      })
    } finally {
      setUpdatingTableId(null)
    }
  }

  const handleDeleteTable = async (table: RestaurantTable) => {
    if (!window.confirm(`Eliminar la mesa ${getVisibleTableIdentifier(table)}?`)) {
      return
    }

    setTablesActionState({ status: 'loading', message: 'Eliminando mesa...' })

    try {
      await deleteTable(table.id)
      pendingCreatedTablesRef.current = pendingCreatedTablesRef.current.filter((item) => item.id !== table.id)
      setEditableTables((previousTables) => previousTables.filter((item) => item.id !== table.id))
      setTablesState((state) => ({
        ...state,
        data: state.data.filter((item) => item.id !== table.id),
      }))
      if (editingTableId === table.id) {
        resetTableEditForm()
      }
      if (selectedTableId === table.id) {
        setSelectedTableId('')
      }
      await loadTables({ silent: true })
      setTablesActionState({
        status: 'success',
        message: `La mesa ${getVisibleTableIdentifier(table)} fue eliminada.`,
      })
      await loadOverview()
    } catch (error) {
      setTablesActionState({
        status: 'error',
        message: getApiErrorMessage(error),
      })
    }
  }

  const handleRefreshReports = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    await loadReports(reportFilters)
  }

  const handleDeleteSnapshot = async (snapshot: ReportSnapshot) => {
    if (!window.confirm(`Eliminar reporte del ${snapshot.reportDate}?`)) {
      return
    }

    setSnapshotsActionState({ status: 'loading', message: 'Eliminando reporte...' })

    try {
      await deleteReportSnapshot(snapshot.id)
      setSnapshotsActionState({ status: 'success', message: 'Reporte eliminado correctamente.' })
      await loadSnapshots()
    } catch (error) {
      setSnapshotsActionState({
        status: 'error',
        message: getApiErrorMessage(error),
      })
    }
  }

  const visibleTablesCount =
    tablesState.status === 'success' ? editableTables.length : (establishmentState.data?.activeTablesCount ?? 0)

  const availableVisibleTablesCount =
    tablesState.status === 'success'
      ? editableTables.filter(
          (table) => table.isActive === true && table.availabilityStatus === 'disponible',
        ).length
      : (establishmentState.data?.activeTablesCount ?? 0)

  const activeUsersCount =
    usersState.status === 'success' ? usersState.data.length : (establishmentState.data?.activeUsersCount ?? 0)

  const overviewCards = [
    { label: 'Usuarios', value: activeUsersCount },
    { label: 'Activos', value: activeUsersCount },
    { label: 'Mesas', value: visibleTablesCount },
    { label: 'Mesas disponibles', value: availableVisibleTablesCount },
    { label: 'Reservas', value: establishmentState.data?.reservationsCount ?? 0 },
    { label: 'Clientes', value: establishmentState.data?.customerUsersCount ?? 0 },
  ]

  const summaryCards = [
    {
      label: 'Reservas del día',
      value: dailySummaryState.data?.reservationsCount ?? 0,
    },
    {
      label: 'Asistencias',
      value: dailySummaryState.data?.attendedCount ?? 0,
    },
    {
      label: 'Clientes',
      value: dailySummaryState.data?.customerCount ?? 0,
    },
    {
      label: 'Sin asistencia',
      value: dailySummaryState.data?.noShowCount ?? 0,
    },
  ]

  const maxComparisonValue = Math.max(1, ...comparisonState.data.map((row) => row.reservationsCount))

  return (
    <section className="page-stack establishment-page fade-in">
      <article className="panel establishment-hero">
        <div className="establishment-hero-copy">
          <p className="eyebrow">Panel administrativo</p>
          <h2>Administración</h2>
          <p className="lead">{restaurantName}</p>
        </div>

        <div className="summary-grid establishment-overview-grid">
          {overviewCards.map((card) => (
            <article key={card.label} className="panel summary-card summary-card-compact">
              <p className="eyebrow">{card.label}</p>
              <h3>{card.value}</h3>
            </article>
          ))}
        </div>
      </article>

      <StatusMessage status={establishmentState.status} message={establishmentState.message} />

      <div className="admin-tabs" role="tablist" aria-label="Secciones de Administración">
        {adminTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            className={activeTab === tab.id ? 'admin-tab admin-tab-active' : 'admin-tab'}
            onClick={() => setActiveTab(tab.id)}
          >
            <span>{tab.label}</span>
            <small>{tab.description}</small>
          </button>
        ))}
      </div>

      {activeTab === 'usuarios' ? (
        <div className="two-column-grid users-layout-grid">
          <article className="panel form-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Usuarios</p>
                <h3>Crear cuenta interna</h3>
              </div>
            </div>

            <form className="form-panel" onSubmit={handleCreateUser}>
              <div className="form-grid">
                <label>
                  Nombre
                  <input
                    value={createUserForm.fullName}
                    onChange={(event) =>
                      setCreateUserForm({ ...createUserForm, fullName: event.target.value })
                    }
                    autoComplete="name"
                    required
                  />
                </label>

                <label>
                  Rol
                  <select
                    value={createUserForm.role}
                    onChange={(event) =>
                      setCreateUserForm({
                        ...createUserForm,
                        role: event.target.value as InternalUserRole,
                      })
                    }
                  >
                    <option value="host">Recepcionista</option>
                    <option value="manager">Gerente</option>
                  </select>
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Contraseña
                  <input
                    type="password"
                    value={createUserForm.password}
                    onChange={(event) =>
                      setCreateUserForm({ ...createUserForm, password: event.target.value })
                    }
                    autoComplete="new-password"
                    required
                  />
                </label>

                <label>
                  Email (opcional)
                  <input
                    type="email"
                    value={createUserForm.email}
                    onChange={(event) => setCreateUserForm({ ...createUserForm, email: event.target.value })}
                    autoComplete="email"
                  />
                </label>
              </div>

              <label>
                Teléfono (opcional)
                <input
                  type="tel"
                  value={createUserForm.phone}
                  onChange={(event) => setCreateUserForm({ ...createUserForm, phone: event.target.value })}
                  autoComplete="tel"
                />
              </label>

              <button type="submit" className="button button-primary">
                Crear usuario
              </button>
              <StatusMessage status={createUserState.status} message={createUserState.message} />
            </form>
          </article>

          <article className="panel form-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Usuarios</p>
                <h3>Listado y bajas</h3>
              </div>
            </div>

            <StatusMessage status={usersState.status} message={usersState.message} />
            <StatusMessage status={usersActionState.status} message={usersActionState.message} />

            <div className="table-scroll users-table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Usuario</th>
                    <th>Rol</th>
                    <th>Estado</th>
                    <th>Ultimo ingreso</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usersState.data.length ? (
                    usersState.data.map((user) => (
                      <Fragment key={user.id}>
                        <tr>
                          <td>
                            <strong>{user.fullName}</strong>
                            <div className="subtle">{user.email}</div>
                            <div className="subtle">{user.phone ?? 'Sin teléfono'}</div>
                          </td>
                          <td>{formatUserRole(user.role)}</td>
                          <td>{user.isActive ? 'Activo' : 'Inactivo'}</td>
                          <td>{formatDateTime(user.lastLoginAt)}</td>
                          <td>
                            <div className="user-actions">
                              <button
                                type="button"
                                className="button button-secondary button-icon button-icon-edit"
                                onClick={() => startEditingUser(user)}
                                aria-label="Editar usuario"
                              >
                                <img className="button-icon-image" src={editIcon} alt="" aria-hidden="true" />
                              </button>
                              <button
                                type="button"
                                className="button button-ghost button-icon button-icon-delete"
                                onClick={() => handleDeleteUser(user)}
                                disabled={!user.isActive}
                                aria-label="Dar de baja usuario"
                              >
                                <img className="button-icon-image" src={deleteIcon} alt="" aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {editingUserId === user.id ? (
                          <tr className="user-edit-row">
                            <td colSpan={5}>
                              <form className="form-panel user-edit-form" onSubmit={(event) => void handleUpdateUser(event, user.id)}>
                                <div className="form-grid">
                                  <label>
                                    Nombre
                                    <input
                                      value={userEditForm.fullName}
                                      onChange={(event) =>
                                        setUserEditForm({ ...userEditForm, fullName: event.target.value })
                                      }
                                      autoComplete="name"
                                      required
                                    />
                                  </label>

                                  <label>
                                    Rol
                                    <select
                                      value={userEditForm.role}
                                      onChange={(event) =>
                                        setUserEditForm({
                                          ...userEditForm,
                                          role: event.target.value as EditableUserRole,
                                        })
                                      }
                                    >
                                      {editableUserRoles.map((option) => (
                                        <option key={option.value} value={option.value}>
                                          {option.label}
                                        </option>
                                      ))}
                                    </select>
                                  </label>
                                </div>

                                <div className="form-grid">
                                  <label>
                                    Email (opcional)
                                    <input
                                      type="email"
                                      value={userEditForm.email}
                                      onChange={(event) =>
                                        setUserEditForm({ ...userEditForm, email: event.target.value })
                                      }
                                      autoComplete="email"
                                    />
                                  </label>

                                  <label>
                                    Teléfono (opcional)
                                    <input
                                      type="tel"
                                      value={userEditForm.phone}
                                      onChange={(event) =>
                                        setUserEditForm({ ...userEditForm, phone: event.target.value })
                                      }
                                      autoComplete="tel"
                                    />
                                  </label>
                                </div>

                                <div className="button-row">
                                  <button type="submit" className="button button-primary button-tight">
                                    Guardar cambios
                                  </button>
                                  <button
                                    type="button"
                                    className="button button-ghost button-tight"
                                    onClick={resetUserEditForm}
                                  >
                                    Cancelar
                                  </button>
                                </div>

                              </form>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>Sin usuarios para mostrar.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      ) : null}

      {activeTab === 'mesas' ? (
        <div className="stacked-panels">
          <article className="panel form-panel tables-visual-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Mesas</p>
                <h3>Maqueta visual del salón</h3>
              </div>
              <div className="button-row tables-stage-actions">
                <button
                  type="button"
                  className="button button-primary"
                  onClick={handleSaveLayout}
                  disabled={!layoutDirty || !editableTables.length || tablesActionState.status === 'loading'}
                >
                  Guardar posiciones
                </button>
              </div>
            </div>

            <StatusMessage status={tablesState.status} message={tablesState.message} />
            <StatusMessage status={tablesActionState.status} message={tablesActionState.message} />

            <div className="tables-stage-meta">
              <p className="muted">Arrastrá mesas dentro del plano para reubicar su posición.</p>
            </div>

            <div className="tables-status-legend" aria-label="Leyenda de estado de mesas">
              <span className="tables-legend-item">
                <span className="tables-legend-dot tables-legend-dot-disponible" aria-hidden="true" />
                Disponible
              </span>
              <span className="tables-legend-item">
                <span className="tables-legend-dot tables-legend-dot-ocupada" aria-hidden="true" />
                Ocupada
              </span>
            </div>

            {editableTables.length ? (
              <div
                ref={tablesStageRef}
                className={tableDragState ? 'tables-stage tables-stage-large tables-stage-dragging' : 'tables-stage tables-stage-large'}
                role="img"
                aria-label="Maqueta de distribución de mesas"
              >
                {editableTables.map((table) => {
                  const left = toStagePercent(
                    table.posX,
                    tableCoordinateBounds.minX,
                    tableCoordinateBounds.maxX,
                    STAGE_INSET_X_PERCENT,
                    STAGE_RANGE_X_PERCENT,
                  )
                  const top = toStagePercent(
                    table.posY,
                    tableCoordinateBounds.minY,
                    tableCoordinateBounds.maxY,
                    STAGE_INSET_Y_PERCENT,
                    STAGE_RANGE_Y_PERCENT,
                  )
                  const availability = getTableAvailabilityStatus(table)
                  const tableIdentifier = getVisibleTableIdentifier(table)
                  const isSelected = (selectedTableId || editableTables[0]?.id) === table.id

                  return (
                    <button
                      key={table.id}
                      type="button"
                      className={[
                        'table-node',
                        availability === 'ocupada' ? 'table-node-ocupada' : 'table-node-disponible',
                        isSelected ? 'table-node-active' : '',
                        tableDragState?.tableId === table.id ? 'table-node-dragging' : '',
                      ].join(' ').trim()}
                      style={{ left: `${left}%`, top: `${top}%` }}
                      onClick={() => setSelectedTableId(table.id)}
                      onPointerDown={(event) => handleTablePointerDown(event, table.id)}
                      aria-label={`${tableIdentifier}, ${table.capacity} plazas, ${table.category ?? 'Normal'}, ${formatTableAvailabilityStatus(availability)}`}
                    >
                      <span>{tableIdentifier}</span>
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state">Todavía no hay mesas para mostrar.</div>
            )}

            {selectedTable ? (
              <div className="selected-table-card">
                <p className="eyebrow">{getVisibleTableIdentifier(selectedTable)}</p>
                <h3>{selectedTable.capacity} plazas</h3>
                <p className="muted">
                  Categoría: {selectedTable.category ?? 'Normal'}
                </p>
                <p className="muted">
                  Estado: {formatTableAvailabilityStatus(getTableAvailabilityStatus(selectedTable))}
                </p>
              </div>
            ) : null}
          </article>

          <div className="two-column-grid tables-layout-grid">
            <article className="panel form-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Mesas</p>
                  <h3>Alta de mesa</h3>
                </div>
              </div>

              <form className="form-panel" onSubmit={handleCreateTable}>
                <div className="form-grid">
                  <label>
                    Capacidad
                    <input
                      type="number"
                      min={1}
                      value={tablesForm.capacity}
                      onChange={(event) => setTablesForm({ ...tablesForm, capacity: event.target.value })}
                      required
                    />
                  </label>

                  <label>
                    Categoría de mesa
                    <select
                      value={tablesForm.category}
                      onChange={(event) =>
                        setTablesForm({ ...tablesForm, category: event.target.value as TableCategory })
                      }
                    >
                      {tableCategories.map((category) => (
                        <option key={category.value} value={category.value}>
                          {category.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <button type="submit" className="button button-primary">
                  Crear mesa
                </button>
              </form>
            </article>

            <article className="panel form-panel">
              <div className="panel-heading">
                <div>
                  <p className="eyebrow">Mesas</p>
                  <h3>Listado de mesas</h3>
                </div>
              </div>

              <div className="table-scroll tables-table-scroll">
                <table>
                  <thead>
                    <tr>
                      <th>Mesa</th>
                      <th>Capacidad</th>
                      <th>Categoría</th>
                      <th>Disponibilidad</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {editableTables.length ? (
                      editableTables.map((table) => {
                        const availability = getTableAvailabilityStatus(table)
                        const tableIdentifier = getVisibleTableIdentifier(table)
                        const isEditingTable = editingTableId === table.id

                        return (
                          <Fragment key={table.id}>
                            <tr>
                              <td>
                                <strong>{tableIdentifier}</strong>
                              </td>
                              <td>{table.capacity}</td>
                              <td>{table.category ?? 'Normal'}</td>
                              <td>{formatTableAvailabilityStatus(availability)}</td>
                              <td>
                                <div className="table-actions">
                                  <button
                                    type="button"
                                    className={[
                                      'button button-secondary button-icon button-icon-availability',
                                      availability === 'ocupada'
                                        ? 'button-icon-availability-ocupada'
                                        : 'button-icon-availability-disponible',
                                    ].join(' ')}
                                    onClick={() => void handleToggleTableAvailability(table)}
                                    disabled={updatingTableId === table.id || tablesActionState.status === 'loading'}
                                    aria-pressed={availability === 'ocupada'}
                                    aria-label={`Cambiar disponibilidad de ${tableIdentifier} a ${
                                      availability === 'disponible' ? 'ocupada' : 'disponible'
                                    }`}
                                  >
                                    <img
                                      className="button-icon-image"
                                      src={availabilityIcon}
                                      alt=""
                                      aria-hidden="true"
                                    />
                                  </button>
                                  <button
                                    type="button"
                                    className="button button-secondary button-icon button-icon-edit"
                                    onClick={() => startEditingTable(table)}
                                    aria-label="Editar mesa"
                                  >
                                    <img className="button-icon-image" src={editIcon} alt="" aria-hidden="true" />
                                  </button>
                                  <button
                                    type="button"
                                    className="button button-ghost button-icon button-icon-delete"
                                    onClick={() => void handleDeleteTable(table)}
                                    disabled={tablesActionState.status === 'loading'}
                                    aria-label="Eliminar mesa"
                                  >
                                    <img className="button-icon-image" src={deleteIcon} alt="" aria-hidden="true" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isEditingTable ? (
                              <tr className="table-edit-row">
                                <td colSpan={5}>
                                  <form className="form-panel table-edit-form" onSubmit={(event) => triggerTableSave(table.id, event)}>
                                    <div className="form-grid">
                                      <label>
                                        Capacidad
                                        <input
                                          type="number"
                                          min={1}
                                          value={tableEditForm.capacity}
                                          onChange={(event) =>
                                            setTableEditForm({
                                              ...tableEditForm,
                                              capacity: event.target.value,
                                            })
                                          }
                                          required
                                        />
                                      </label>

                                      <label>
                                        Categoría
                                        <select
                                          value={tableEditForm.category}
                                          onChange={(event) =>
                                            setTableEditForm({
                                              ...tableEditForm,
                                              category: event.target.value as TableCategory,
                                            })
                                          }
                                        >
                                          {tableCategories.map((category) => (
                                            <option key={category.value} value={category.value}>
                                              {category.label}
                                            </option>
                                          ))}
                                        </select>
                                      </label>
                                    </div>

                                    <div className="button-row">
                                      <button
                                        type="button"
                                        className="button button-primary button-tight"
                                        onClick={() => triggerTableSave(table.id)}
                                        disabled={updatingTableId === table.id}
                                      >
                                        Guardar cambios
                                      </button>
                                      <button
                                        type="button"
                                        className="button button-ghost button-tight"
                                        onClick={resetTableEditForm}
                                        disabled={updatingTableId === table.id}
                                      >
                                        Cancelar
                                      </button>
                                    </div>
                                  </form>
                                </td>
                              </tr>
                            ) : null}
                          </Fragment>
                        )
                      })
                    ) : (
                      <tr>
                        <td colSpan={5}>Sin mesas para mostrar.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>
          </div>
        </div>
      ) : null}

      {activeTab === 'reportes' ? (
        <div className="stacked-panels">
          <article className="panel form-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Reportes</p>
                <h3>Resumen y comparativo</h3>
              </div>
              <button type="button" className="button button-secondary" onClick={() => void loadReports(reportFilters)}>
                Actualizar
              </button>
            </div>

            <form className="form-panel" onSubmit={handleRefreshReports}>
              <div className="form-grid">
                <label>
                  Fecha del resumen
                  <input
                    type="date"
                    value={reportFilters.date}
                    onChange={(event) => setReportFilters({ ...reportFilters, date: event.target.value })}
                  />
                </label>

                <label>
                  Días para comparativo
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={reportFilters.days}
                    onChange={(event) => setReportFilters({ ...reportFilters, days: event.target.value })}
                  />
                </label>
              </div>

              <div className="form-grid">
                <label>
                  Mínimo de visitas
                  <input
                    type="number"
                    min={1}
                    value={reportFilters.minVisits}
                    onChange={(event) => setReportFilters({ ...reportFilters, minVisits: event.target.value })}
                  />
                </label>

                <label>
                  Límite de clientes frecuentes
                  <input
                    type="number"
                    min={1}
                    value={reportFilters.limit}
                    onChange={(event) => setReportFilters({ ...reportFilters, limit: event.target.value })}
                  />
                </label>
              </div>

              <button type="submit" className="button button-primary">
                Consultar reportes
              </button>
            </form>
          </article>

          <StatusMessage status={dailySummaryState.status} message={dailySummaryState.message} />

          <div className="summary-grid">
            {summaryCards.map((card) => (
              <article key={card.label} className="panel summary-card">
                <p className="eyebrow">{card.label}</p>
                <h3>{card.value}</h3>
              </article>
            ))}
          </div>

          <article className="panel report-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Reportes</p>
                <h3>Comparativo últimos días</h3>
              </div>
            </div>

            <StatusMessage status={comparisonState.status} message={comparisonState.message} />

            {comparisonState.data.length ? (
              <div className="comparison-chart" role="img" aria-label="Comparativo de reservas por día">
                {comparisonState.data.map((row) => {
                  const height = Math.max(12, (row.reservationsCount / maxComparisonValue) * 100)

                  return (
                    <div key={row.reportDate} className="chart-column">
                      <div className="chart-track">
                        <div
                          className="chart-bar"
                          style={{ height: `${height}%` }}
                          aria-label={`${row.reportDate}: ${row.reservationsCount} reservas`}
                        />
                      </div>
                      <strong>{row.reservationsCount}</strong>
                      <span>{row.reportDate.slice(5)}</span>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state">Sin datos para comparar.</div>
            )}

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Reservas</th>
                    <th>Asistencias</th>
                    <th>Clientes</th>
                    <th>% asistencia</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonState.data.length ? (
                    comparisonState.data.map((row) => (
                      <tr key={row.reportDate}>
                        <td>{row.reportDate}</td>
                        <td>{row.reservationsCount}</td>
                        <td>{row.attendedCount}</td>
                        <td>{row.customerCount}</td>
                        <td>{formatPercent(row.attendancePercent)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5}>Sin datos para mostrar.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel report-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Reportes</p>
                <h3>Clientes frecuentes</h3>
              </div>
            </div>

            <StatusMessage status={frequentState.status} message={frequentState.message} />

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Cliente</th>
                    <th>Visitas</th>
                    <th>Ausencias</th>
                    <th>Última visita</th>
                  </tr>
                </thead>
                <tbody>
                  {frequentState.data.length ? (
                    frequentState.data.map((row) => (
                      <tr key={row.customerId}>
                        <td>
                          <strong>{row.fullName}</strong>
                          <div className="subtle">{row.email ?? row.phone ?? row.customerId}</div>
                        </td>
                        <td>{row.visitCount}</td>
                        <td>{row.noShowCount}</td>
                        <td>{formatDateTime(row.lastVisitAt)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4}>Sin datos para mostrar.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="panel report-panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Reportes</p>
                <h3>Reportes generados</h3>
              </div>
              <button type="button" className="button button-secondary" onClick={loadSnapshots}>
                Actualizar
              </button>
            </div>

            <StatusMessage status={snapshotsState.status} message={snapshotsState.message} />
            <StatusMessage status={snapshotsActionState.status} message={snapshotsActionState.message} />

            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Reservas</th>
                    <th>Asistencias</th>
                    <th>% asistencia</th>
                    <th>Origen</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshotsState.data.length ? (
                    snapshotsState.data.map((snapshot) => (
                      <tr key={snapshot.id}>
                        <td>{snapshot.reportDate}</td>
                        <td>{snapshot.reservationsCount}</td>
                        <td>{snapshot.attendedCount}</td>
                        <td>{formatPercent(snapshot.attendancePercent)}</td>
                        <td>{snapshot.source}</td>
                        <td>
                          <button
                            type="button"
                            className="button button-ghost button-tight"
                            onClick={() => handleDeleteSnapshot(snapshot)}
                          >
                            Eliminar
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6}>No hay reportes generados todavía.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  )
}
