import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { SeatCircle } from './components/SeatCircle'
import { SeatDetails } from './components/SeatDetails'
import { SelectionSummary } from './components/SelectionSummary'
import { clamp, buildSeatIndex, getDirectionalNeighbor, isSeatSelectable, readVenueData } from './lib/venue'
import type { Direction, VenueData } from './types'
import './App.css'

const STORAGE_KEY = 'ds-assessment:selected-seats'
const MAX_SELECTION = 8
const MIN_ZOOM = 0.6
const MAX_ZOOM = 4

function getFirstSelectableSeatId(venue: VenueData): string | null {
  for (const section of venue.sections) {
    for (const row of section.rows) {
      for (const seat of row.seats) {
        if (isSeatSelectable(seat.status)) {
          return seat.id
        }
      }
    }
  }

  return null
}

function App() {
  const [venue, setVenue] = useState<VenueData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([])
  const [focusedSeatId, setFocusedSeatId] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)

  const seatRefs = useRef<Map<string, SVGCircleElement>>(new Map())
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const hasHydratedSelection = useRef(false)

  useEffect(() => {
    let canceled = false

    async function loadVenue(): Promise<void> {
      try {
        const response = await fetch('/venue.json')
        if (!response.ok) {
          throw new Error(`Unable to load venue.json (${response.status})`)
        }

        const payload = await response.json()
        const parsed = readVenueData(payload)

        if (!canceled) {
          setVenue(parsed)
          setFocusedSeatId(getFirstSelectableSeatId(parsed))
          setError(null)
        }
      } catch (loadError) {
        if (!canceled) {
          setError(loadError instanceof Error ? loadError.message : 'Unknown error while loading venue data.')
        }
      } finally {
        if (!canceled) {
          setLoading(false)
        }
      }
    }

    void loadVenue()

    return () => {
      canceled = true
    }
  }, [])

  const seatIndex = useMemo(() => {
    if (!venue) {
      return null
    }

    return buildSeatIndex(venue)
  }, [venue])

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
      if (!seat || !isSeatSelectable(seat.status)) {
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
      setFocusedSeatId(seatId)
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

  const zoomIn = useCallback(() => {
    setZoom((current) => clamp(Number((current + 0.2).toFixed(2)), MIN_ZOOM, MAX_ZOOM))
  }, [])

  const zoomOut = useCallback(() => {
    setZoom((current) => clamp(Number((current - 0.2).toFixed(2)), MIN_ZOOM, MAX_ZOOM))
  }, [])

  const resetView = useCallback(() => {
    setZoom(1)
    setPan({ x: 0, y: 0 })
  }, [])

  const onWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const delta = event.deltaY > 0 ? -0.12 : 0.12
    setZoom((current) => clamp(Number((current + delta).toFixed(2)), MIN_ZOOM, MAX_ZOOM))
  }, [])

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as Element
    if (target.closest('.seat')) {
      return
    }

    setIsPanning(true)
    panStart.current = {
      x: event.clientX,
      y: event.clientY,
      panX: pan.x,
      panY: pan.y,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [pan.x, pan.y])

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) {
      return
    }

    setPan({
      x: panStart.current.panX + (event.clientX - panStart.current.x),
      y: panStart.current.panY + (event.clientY - panStart.current.y),
    })
  }, [isPanning])

  const onPointerEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    setIsPanning(false)

    const target = event.currentTarget as HTMLDivElement & {
      hasPointerCapture?: (pointerId: number) => boolean
      releasePointerCapture?: (pointerId: number) => void
    }

    if (target.hasPointerCapture?.(event.pointerId)) {
      target.releasePointerCapture?.(event.pointerId)
    }
  }, [])

  if (loading) {
    return <main className="shell">Loading venue...</main>
  }

  if (error || !venue || !seatIndex) {
    return <main className="shell">Failed to load venue: {error ?? 'Invalid venue data.'}</main>
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Interactive Seating Map</p>
          <h1>{venue.name}</h1>
        </div>
        <div className="zoom-controls">
          <button type="button" onClick={zoomOut} aria-label="Zoom out map">
            -
          </button>
          <button type="button" onClick={zoomIn} aria-label="Zoom in map">
            +
          </button>
          <button type="button" onClick={resetView} aria-label="Reset map position and zoom">
            Reset
          </button>
        </div>
      </header>

      <section className="layout">
        <section className="map-card" aria-label="Seating map area">
          <p className="map-hint">Scroll to zoom, drag empty space to pan, and use arrow keys plus Enter/Space on focused seats.</p>
          <div
            className="map-viewport"
            style={{ aspectRatio: `${venue.map.width} / ${venue.map.height}` }}
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
          >
            <svg
              className="venue-map"
              viewBox={`0 0 ${venue.map.width} ${venue.map.height}`}
              role="img"
              aria-label={`${venue.name} seating map`}
            >
              <defs>
                <pattern id="seat-unavailable-zigzag" width="8" height="8" patternUnits="userSpaceOnUse">
                  <path d="M0 6 L2 2 L4 6 L6 2 L8 6" fill="none" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="1.2" />
                </pattern>
              </defs>
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {seatIndex.allSeats.map((seat) => (
                  <SeatCircle
                    key={seat.id}
                    seat={seat}
                    isSelected={selectedSeatSet.has(seat.id)}
                    isFocused={focusedSeatId === seat.id}
                    onActivate={toggleSeat}
                    onFocusSeat={focusSeat}
                    onMove={moveFocus}
                    registerRef={registerSeatRef}
                  />
                ))}
              </g>
            </svg>
          </div>
        </section>

        <aside className="sidebar">
          <SeatDetails seat={focusedSeat} />
          <SelectionSummary selectedSeats={selectedSeats} maxSelection={MAX_SELECTION} />
          {selectedSeatIds.length >= MAX_SELECTION ? (
            <p className="limit-note" role="status">Maximum of {MAX_SELECTION} seats reached.</p>
          ) : null}
        </aside>
      </section>
    </main>
  )
}

export default App
