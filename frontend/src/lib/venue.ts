import type { Direction, RenderSeat, VenueData } from '../types'

const STATUS_VALUES = new Set(['available', 'reserved', 'sold', 'held'])

export interface SeatIndex {
  allSeats: RenderSeat[]
  sectionOrder: string[]
  seatById: Map<string, RenderSeat>
  bySectionRowCol: Map<string, string>
  rowColsBySectionRow: Map<string, number[]>
  rowIndexesBySection: Map<string, number[]>
}

const keyForCell = (sectionId: string, row: number, col: number): string => `${sectionId}|${row}|${col}`
const keyForRow = (sectionId: string, row: number): string => `${sectionId}|${row}`

export function isSeatSelectable(status: RenderSeat['status']): boolean {
  return status === 'available'
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function readVenueData(payload: unknown): VenueData {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid venue data payload.')
  }

  const candidate = payload as Partial<VenueData>

  if (!candidate.venueId || !candidate.name || !candidate.map || !candidate.sections) {
    throw new Error('Venue data is missing required fields.')
  }

  if (
    typeof candidate.map.width !== 'number' ||
    typeof candidate.map.height !== 'number' ||
    !Number.isFinite(candidate.map.width) ||
    !Number.isFinite(candidate.map.height)
  ) {
    throw new Error('Venue map dimensions are invalid.')
  }

  for (const section of candidate.sections) {
    if (!section?.id || !section?.label || !section.transform || !Array.isArray(section.rows)) {
      throw new Error('Venue section is invalid.')
    }

    for (const row of section.rows) {
      if (typeof row.index !== 'number' || !Array.isArray(row.seats)) {
        throw new Error('Venue row is invalid.')
      }

      for (const seat of row.seats) {
        if (
          !seat.id ||
          typeof seat.col !== 'number' ||
          typeof seat.x !== 'number' ||
          typeof seat.y !== 'number' ||
          typeof seat.priceTier !== 'number' ||
          !STATUS_VALUES.has(seat.status)
        ) {
          throw new Error('Venue seat is invalid.')
        }
      }
    }
  }

  return candidate as VenueData
}

export function buildSeatIndex(venue: VenueData): SeatIndex {
  const allSeats: RenderSeat[] = []
  const sectionOrder: string[] = []
  const seatById = new Map<string, RenderSeat>()
  const bySectionRowCol = new Map<string, string>()
  const rowColsBySectionRow = new Map<string, number[]>()
  const rowIndexesBySection = new Map<string, number[]>()

  for (const section of venue.sections) {
    sectionOrder.push(section.id)
    const rowSet = new Set<number>()

    for (const row of section.rows) {
      rowSet.add(row.index)
      const rowKey = keyForRow(section.id, row.index)
      const cols = row.seats.map((seat) => seat.col).sort((a, b) => a - b)
      rowColsBySectionRow.set(rowKey, cols)

      for (const seat of row.seats) {
        const x = section.transform.x + seat.x * section.transform.scale
        const y = section.transform.y + seat.y * section.transform.scale

        const renderSeat: RenderSeat = {
          id: seat.id,
          sectionId: section.id,
          sectionLabel: section.label,
          rowIndex: row.index,
          col: seat.col,
          x,
          y,
          priceTier: seat.priceTier,
          status: seat.status,
        }

        allSeats.push(renderSeat)
        seatById.set(renderSeat.id, renderSeat)
        bySectionRowCol.set(keyForCell(section.id, row.index, seat.col), renderSeat.id)
      }
    }

    rowIndexesBySection.set(section.id, Array.from(rowSet).sort((a, b) => a - b))
  }

  return {
    allSeats,
    sectionOrder,
    seatById,
    bySectionRowCol,
    rowColsBySectionRow,
    rowIndexesBySection,
  }
}

function nearestCol(cols: number[], target: number): number | null {
  if (cols.length === 0) {
    return null
  }

  let best = cols[0]
  let bestDistance = Math.abs(cols[0] - target)

  for (let index = 1; index < cols.length; index += 1) {
    const candidate = cols[index]
    const distance = Math.abs(candidate - target)

    if (distance < bestDistance) {
      best = candidate
      bestDistance = distance
    }
  }

  return best
}

export function getDirectionalNeighbor(
  sourceSeat: RenderSeat,
  direction: Direction,
  index: SeatIndex,
): string | null {
  if (direction === 'left' || direction === 'right') {
    const nextCol = sourceSeat.col + (direction === 'left' ? -1 : 1)
    const sameSectionNeighbor = index.bySectionRowCol.get(keyForCell(sourceSeat.sectionId, sourceSeat.rowIndex, nextCol))
    if (sameSectionNeighbor) {
      return sameSectionNeighbor
    }

    const sectionPosition = index.sectionOrder.indexOf(sourceSeat.sectionId)
    if (sectionPosition === -1) {
      return null
    }

    const sectionCount = index.sectionOrder.length
    const step = direction === 'left' ? -1 : 1

    for (let offset = 1; offset < sectionCount; offset += 1) {
      const wrappedPosition = (sectionPosition + step * offset + sectionCount) % sectionCount
      const sectionId = index.sectionOrder[wrappedPosition]
      const candidateCols = index.rowColsBySectionRow.get(keyForRow(sectionId, sourceSeat.rowIndex))
      if (!candidateCols || candidateCols.length === 0) {
        continue
      }

      const targetCol = direction === 'left' ? candidateCols[candidateCols.length - 1] : candidateCols[0]
      const crossSectionNeighbor = index.bySectionRowCol.get(keyForCell(sectionId, sourceSeat.rowIndex, targetCol))
      if (crossSectionNeighbor) {
        return crossSectionNeighbor
      }
    }

    return null
  }

  const rows = index.rowIndexesBySection.get(sourceSeat.sectionId)
  if (!rows) {
    return null
  }

  const currentRowPosition = rows.indexOf(sourceSeat.rowIndex)
  if (currentRowPosition === -1) {
    return null
  }

  const nextRowPosition = currentRowPosition + (direction === 'up' ? -1 : 1)
  const nextRow = rows[nextRowPosition]
  if (typeof nextRow !== 'number') {
    return null
  }

  const candidateCols = index.rowColsBySectionRow.get(keyForRow(sourceSeat.sectionId, nextRow))
  if (!candidateCols) {
    return null
  }

  const col = nearestCol(candidateCols, sourceSeat.col)
  if (col === null) {
    return null
  }

  return index.bySectionRowCol.get(keyForCell(sourceSeat.sectionId, nextRow, col)) ?? null
}

export function findNearestSelectableSeatIds(
  sourceSeatId: string,
  count: number,
  index: SeatIndex,
  excludedSeatIds: ReadonlySet<string> = new Set<string>(),
): string[] {
  if (count <= 0) {
    return []
  }

  const sourceSeat = index.seatById.get(sourceSeatId)
  if (!sourceSeat) {
    return []
  }

  return index.allSeats
    .filter((seat) => seat.id !== sourceSeat.id && isSeatSelectable(seat.status) && !excludedSeatIds.has(seat.id))
    .map((seat) => {
      const dx = seat.x - sourceSeat.x
      const dy = seat.y - sourceSeat.y

      return {
        seat,
        distanceSquared: dx * dx + dy * dy,
      }
    })
    .sort((left, right) => {
      if (left.distanceSquared !== right.distanceSquared) {
        return left.distanceSquared - right.distanceSquared
      }

      if (left.seat.rowIndex !== right.seat.rowIndex) {
        return left.seat.rowIndex - right.seat.rowIndex
      }

      if (left.seat.col !== right.seat.col) {
        return left.seat.col - right.seat.col
      }

      return left.seat.id.localeCompare(right.seat.id)
    })
    .slice(0, count)
    .map((entry) => entry.seat.id)
}
