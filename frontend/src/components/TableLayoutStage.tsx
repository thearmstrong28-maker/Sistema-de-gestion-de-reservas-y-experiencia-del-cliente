import { type PointerEvent as ReactPointerEvent } from 'react'
import type { RestaurantTable } from '../api/types'
import { formatTableAvailabilityStatus, formatTableIdentifier } from '../lib/labels'
import {
  STAGE_INSET_X_PERCENT,
  STAGE_INSET_Y_PERCENT,
  STAGE_RANGE_X_PERCENT,
  STAGE_RANGE_Y_PERCENT,
  getTableAvailabilityStatus,
  toStagePercent,
  type LayoutBounds,
} from '../lib/tableLayout'

interface TableLayoutStageProps {
  tables: RestaurantTable[]
  bounds: LayoutBounds
  selectedTableId?: string
  draggingTableId?: string | null
  readOnly?: boolean
  ariaLabel?: string
  getTableLabel?: (table: Pick<RestaurantTable, 'id' | 'tableNumber'>) => string
  onSelectTable?: (tableId: string) => void
  onTablePointerDown?: (event: ReactPointerEvent<HTMLButtonElement>, tableId: string) => void
}

export function TableLayoutStage({
  tables,
  bounds,
  selectedTableId,
  draggingTableId,
  readOnly = false,
  ariaLabel = 'Maqueta de distribución de mesas',
  getTableLabel,
  onSelectTable,
  onTablePointerDown,
}: TableLayoutStageProps) {
  if (!tables.length) {
    return <div className="empty-state">Todavía no hay mesas para mostrar.</div>
  }

  return (
    <div
      className={
        readOnly ? 'tables-stage tables-stage-large tables-stage-readonly' : 'tables-stage tables-stage-large'
      }
      role="img"
      aria-label={ariaLabel}
    >
      {tables.map((table) => {
        const left = toStagePercent(
          table.posX,
          bounds.minX,
          bounds.maxX,
          STAGE_INSET_X_PERCENT,
          STAGE_RANGE_X_PERCENT,
        )
        const top = toStagePercent(
          table.posY,
          bounds.minY,
          bounds.maxY,
          STAGE_INSET_Y_PERCENT,
          STAGE_RANGE_Y_PERCENT,
        )
        const availability = getTableAvailabilityStatus(table)
        const tableIdentifier = getTableLabel ? getTableLabel(table) : formatTableIdentifier(table.tableNumber)
        const isSelected = (selectedTableId || tables[0]?.id) === table.id

        return (
          <button
            key={table.id}
            type="button"
            className={[
              'table-node',
              availability === 'ocupada' ? 'table-node-ocupada' : 'table-node-disponible',
              isSelected ? 'table-node-active' : '',
              draggingTableId === table.id ? 'table-node-dragging' : '',
              readOnly ? 'table-node-readonly' : '',
            ].join(' ').trim()}
            style={{ left: `${left}%`, top: `${top}%` }}
            onClick={onSelectTable ? () => onSelectTable(table.id) : undefined}
            onPointerDown={readOnly || !onTablePointerDown ? undefined : (event) => onTablePointerDown(event, table.id)}
            aria-label={`${tableIdentifier}, ${table.capacity} plazas, ${table.category ?? 'Normal'}, ${formatTableAvailabilityStatus(availability)}`}
          >
            <span>{tableIdentifier}</span>
          </button>
        )
      })}
    </div>
  )
}
