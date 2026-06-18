import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { getDirectionalNeighbor, isSeatSelectable, type SeatIndex } from '../lib/venue'
import type { Direction, VenueData } from '../types'

const STORAGE_KEY = 'ds-assessment:selected-seats'
const MAX_SELECTION = 8

export function useSeatSelection(seatIndex: SeatIndex | null, _venue: VenueData | null, initialFocusedSeatId: string | null) {
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([])
  const [focusedSeatId, setFocusedSeatId] = useState<string | null>(initialFocusedSeatId)
  const seatRefs = useRef<Map<string, SVGCircleElement>>(new Map())
  const hasHydratedSelection = useRef(false)

  // Hydrate selected seats from localStorage
  useEffect(() => {
    if (!seatIndex) {
      return
    }

    const serialized = localStorage.getItem(STORAGE_KEY)
    if (!serialized) {
      hasHydratedSelection.current = true
      return
    }

    try {
      const parsed = JSON.parse(serialized) as string[]
      const valid = parsed.filter((seatId) => {
        const seat = seatIndex.seatById.get(seatId)
        return Boolean(seat && isSeatSelectable(seat.status))
      })
      setSelectedSeatIds(valid.slice(0, MAX_SELECTION))
    } catch {
      setSelectedSeatIds([])
    } finally {
      hasHydratedSelection.current = true
    }
  }, [seatIndex])

  // Persist selected seats to localStorage
  useEffect(() => {
    if (!hasHydratedSelection.current) {
      return
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedSeatIds))
  }, [selectedSeatIds])

  const selectedSeatSet = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds])

  const selectedSeats = useMemo(() => {
    if (!seatIndex) {
      return []
    }

    return selectedSeatIds
      .map((seatId) => seatIndex.seatById.get(seatId))
      .filter((seat): seat is NonNullable<typeof seat> => Boolean(seat))
  }, [seatIndex, selectedSeatIds])

  const focusedSeat = useMemo(() => {
    if (!seatIndex || !focusedSeatId) {
      return null
    }

    return seatIndex.seatById.get(focusedSeatId) ?? null
  }, [focusedSeatId, seatIndex])

  const toggleSeat = useCallback(
    (seatId: string) => {
      if (!seatIndex) {
        return
      }

      const seat = seatIndex.seatById.get(seatId)
      if (!seat) {
        return
      }

      // Always allow focusing a seat to inspect details, even if it is unavailable.
      setFocusedSeatId(seatId)

      if (!isSeatSelectable(seat.status)) {
        return
      }

      setSelectedSeatIds((current) => {
        if (current.includes(seatId)) {
          return current.filter((id) => id !== seatId)
        }

        if (current.length >= MAX_SELECTION) {
          return current
        }

        return [...current, seatId]
      })
    },
    [seatIndex],
  )

  const focusSeat = useCallback((seatId: string) => {
    setFocusedSeatId(seatId)
  }, [])

  const moveFocus = useCallback(
    (seatId: string, direction: Direction) => {
      if (!seatIndex) {
        return
      }

      const sourceSeat = seatIndex.seatById.get(seatId)
      if (!sourceSeat) {
        return
      }

      let currentSeat = sourceSeat

      for (let attempts = 0; attempts < seatIndex.allSeats.length; attempts += 1) {
        const neighborId = getDirectionalNeighbor(currentSeat, direction, seatIndex)
        if (!neighborId) {
          return
        }

        const candidateSeat = seatIndex.seatById.get(neighborId)
        if (!candidateSeat) {
          return
        }

        if (isSeatSelectable(candidateSeat.status)) {
          const targetNode = seatRefs.current.get(neighborId)
          targetNode?.focus()
          setFocusedSeatId(neighborId)
          return
        }

        currentSeat = candidateSeat
      }
    },
    [seatIndex],
  )

  const registerSeatRef = useCallback((seatId: string, node: SVGCircleElement | null) => {
    if (node) {
      seatRefs.current.set(seatId, node)
      return
    }

    seatRefs.current.delete(seatId)
  }, [])

  const onSeatMapClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      const target = event.target as Element
      const seatNode = target.closest('.seat')
      if (!seatNode) {
        return
      }

      const seatId = seatNode.getAttribute('data-seat-id')
      if (!seatId) {
        return
      }

      toggleSeat(seatId)
    },
    [toggleSeat],
  )

  return {
    selectedSeatIds,
    setSelectedSeatIds,
    selectedSeatSet,
    selectedSeats,
    focusedSeatId,
    setFocusedSeatId,
    focusedSeat,
    toggleSeat,
    focusSeat,
    moveFocus,
    registerSeatRef,
    onSeatMapClick,
    maxSelection: MAX_SELECTION,
  }
}
