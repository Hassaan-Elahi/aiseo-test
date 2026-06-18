import { useCallback, useState } from 'react'

import { findNearestSelectableSeatIds, type SeatIndex } from '../lib/venue'

const MAX_SELECTION = 8

export function useAdjacentSeatsHelper(focusedSeatId: string | null, seatIndex: SeatIndex | null) {
  const [adjacentCount, setAdjacentCount] = useState(3)
  const [helperMessage, setHelperMessage] = useState<string | null>(null)

  const findAdjacentSeats = useCallback(
    (selectedSeatIds: string[], onSeatsFound: (seatIds: string[]) => void) => {
      if (!seatIndex || !focusedSeatId) {
        setHelperMessage('Focus a seat first to find nearby seats.')
        return
      }

      const selectedSet = new Set(selectedSeatIds)
      const remainingCapacity = MAX_SELECTION - selectedSeatIds.length

      if (remainingCapacity <= 0) {
        setHelperMessage(`Maximum of ${MAX_SELECTION} seats already selected.`)
        return
      }

      const targetCount = Math.max(1, Math.min(adjacentCount, remainingCapacity))
      const nearestSeatIds = findNearestSelectableSeatIds(focusedSeatId, targetCount, seatIndex, selectedSet)

      if (nearestSeatIds.length === 0) {
        setHelperMessage('No nearby available seats found.')
        return
      }

      const message = `Added ${nearestSeatIds.length} nearby seat${nearestSeatIds.length === 1 ? '' : 's'}.`
      setHelperMessage(message)
      onSeatsFound(nearestSeatIds)
    },
    [adjacentCount, focusedSeatId, seatIndex],
  )

  return {
    adjacentCount,
    setAdjacentCount,
    helperMessage,
    setHelperMessage,
    findAdjacentSeats,
  }
}
