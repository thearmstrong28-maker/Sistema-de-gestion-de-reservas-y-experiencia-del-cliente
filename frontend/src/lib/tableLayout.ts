import type { RestaurantTable } from '../api/types'

export interface LayoutBounds {
  minX: number
  maxX: number
  minY: number
  maxY: number
}

export const STAGE_INSET_X_PERCENT = 8
export const STAGE_INSET_Y_PERCENT = 10
export const STAGE_RANGE_X_PERCENT = 84
export const STAGE_RANGE_Y_PERCENT = 78

const roundToLayoutUnit = (value: number): number => Math.round(value * 100) / 100

export const buildLayoutBounds = (tables: RestaurantTable[]): LayoutBounds => {
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

export const hydrateTablesLayout = (tables: RestaurantTable[]): RestaurantTable[] => {
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
  const missingIndexes = normalizedTables
    .map((table, index) => (table.posX === null || table.posY === null ? index : -1))
    .filter((index) => index >= 0)

  if (!missingIndexes.length) {
    return normalizeTablesLayout(normalizedTables)
  }

  const bounds = buildLayoutBounds(positionedTables)
  const fillerPositions = buildCenteredPositions(missingIndexes.length, {
    centerX: (bounds.minX + bounds.maxX) / 2,
    centerY: (bounds.minY + bounds.maxY) / 2,
    spacingX: Math.max((bounds.maxX - bounds.minX) / Math.max(1, missingIndexes.length + 1), 1.5),
    spacingY: Math.max((bounds.maxY - bounds.minY) / Math.max(1, missingIndexes.length + 1), 1.5),
  })

  return normalizedTables.map((table, index) => {
    if (table.posX !== null && table.posY !== null) {
      return table
    }

    const fillerIndex = missingIndexes.indexOf(index)
    const fallbackPosition = fillerPositions[fillerIndex] ?? fillerPositions[0]

    return {
      ...table,
      posX: fallbackPosition.posX,
      posY: fallbackPosition.posY,
    }
  })
}

export const getTableAvailabilityStatus = (
  table: Pick<RestaurantTable, 'availabilityStatus'>,
): 'disponible' | 'ocupada' => (table.availabilityStatus === 'ocupada' ? 'ocupada' : 'disponible')

export const toStagePercent = (
  value: number | null,
  minValue: number,
  maxValue: number,
  stageInsetPercent: number,
  stageRangePercent: number,
): number => {
  if (value === null) {
    return stageInsetPercent + stageRangePercent / 2
  }

  if (maxValue === minValue) {
    return stageInsetPercent + stageRangePercent / 2
  }

  return stageInsetPercent + ((value - minValue) / (maxValue - minValue)) * stageRangePercent
}
