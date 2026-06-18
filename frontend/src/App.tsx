import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { SeatCircle } from './components/SeatCircle'
import { SeatDetails } from './components/SeatDetails'
import { SelectionSummary } from './components/SelectionSummary'
import { clamp, buildSeatIndex, findNearestSelectableSeatIds, getDirectionalNeighbor, isSeatSelectable, readVenueData } from './lib/venue'
import type { Direction, VenueData } from './types'
import './App.css'

const STORAGE_KEY = 'ds-assessment:selected-seats'
const HEATMAP_STORAGE_KEY = 'ds-assessment:show-heatmap'
const THEME_STORAGE_KEY = 'ds-assessment:theme'
const MAX_SELECTION = 8
const DEFAULT_ZOOM = 1
const MIN_ZOOM = 1
const MAX_ZOOM = 8

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
  const [showHeatmap, setShowHeatmap] = useState(() => localStorage.getItem(HEATMAP_STORAGE_KEY) === '1')
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const persistedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    if (persistedTheme === 'dark') {
      return true
    }

    if (persistedTheme === 'light') {
      return false
    }

    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false
  })

  const [venue, setVenue] = useState<VenueData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedSeatIds, setSelectedSeatIds] = useState<string[]>([])
  const [focusedSeatId, setFocusedSeatId] = useState<string | null>(null)
  const [adjacentCount, setAdjacentCount] = useState(3)
  const [helperMessage, setHelperMessage] = useState<string | null>(null)
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)

  const seatRefs = useRef<Map<string, SVGCircleElement>>(new Map())
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const hasHydratedSelection = useRef(false)
  const panRafId = useRef<number | null>(null)
  const pendingPan = useRef<{ x: number; y: number } | null>(null)
  const zoomRafId = useRef<number | null>(null)
  const pendingZoomDelta = useRef(0)

  useEffect(() => {
    let canceled = false

    async function loadVenue(): Promise<void> {
      try {
        // const response = await fetch('/venue.json')
        // const response = await fetch('/venue.test.json')
        // const response = await fetch('/venue.stress.json')
        const response = await fetch('/venue.stadium.json')

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

  useEffect(() => {
    localStorage.setItem(HEATMAP_STORAGE_KEY, showHeatmap ? '1' : '0')
  }, [showHeatmap])

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, isDarkMode ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  useEffect(() => {
    return () => {
      if (panRafId.current !== null) {
        cancelAnimationFrame(panRafId.current)
      }

      if (zoomRafId.current !== null) {
        cancelAnimationFrame(zoomRafId.current)
      }
    }
  }, [])

  const selectedSeatSet = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds])

  const visibleSeats = useMemo(() => {
    if (!seatIndex || !venue) {
      return []
    }

    // Culling must use SVG viewBox units, not DOM pixels.
    // The visible world at zoom=1 is exactly the venue map dimensions.
    const buffer = 80 / zoom
    const left = -pan.x / zoom - buffer
    const top = -pan.y / zoom - buffer
    const right = (venue.map.width - pan.x) / zoom + buffer
    const bottom = (venue.map.height - pan.y) / zoom + buffer

    return seatIndex.allSeats.filter((seat) => seat.x >= left && seat.x <= right && seat.y >= top && seat.y <= bottom)
  }, [pan.x, pan.y, seatIndex, venue, zoom])

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

  const findAdjacentSeats = useCallback(() => {
    if (!seatIndex || !focusedSeatId) {
      setHelperMessage('Focus a seat first to find nearby seats.')
      return
    }

    let nextMessage = ''

    setSelectedSeatIds((current) => {
      const selectedSet = new Set(current)
      const remainingCapacity = MAX_SELECTION - current.length

      if (remainingCapacity <= 0) {
        nextMessage = `Maximum of ${MAX_SELECTION} seats already selected.`
        return current
      }

      const targetCount = Math.max(1, Math.min(adjacentCount, remainingCapacity))
      const nearestSeatIds = findNearestSelectableSeatIds(focusedSeatId, targetCount, seatIndex, selectedSet)

      if (nearestSeatIds.length === 0) {
        nextMessage = 'No nearby available seats found.'
        return current
      }

      nextMessage = `Added ${nearestSeatIds.length} nearby seat${nearestSeatIds.length === 1 ? '' : 's'}.`
      return [...current, ...nearestSeatIds]
    })

    if (nextMessage) {
      setHelperMessage(nextMessage)
    }
  }, [adjacentCount, focusedSeatId, seatIndex])

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
    setZoom(DEFAULT_ZOOM)
    setPan({ x: 0, y: 0 })
  }, [])

  const onSeatMapClick = useCallback((event: React.MouseEvent<SVGSVGElement>) => {
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
  }, [toggleSeat])

  const onWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const delta = event.deltaY > 0 ? -0.12 : 0.12
    pendingZoomDelta.current += delta

    if (zoomRafId.current !== null) {
      return
    }

    zoomRafId.current = requestAnimationFrame(() => {
      zoomRafId.current = null
      const bufferedDelta = pendingZoomDelta.current
      pendingZoomDelta.current = 0

      setZoom((current) => clamp(Number((current + bufferedDelta).toFixed(2)), MIN_ZOOM, MAX_ZOOM))
    })
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

    pendingPan.current = {
      x: panStart.current.panX + (event.clientX - panStart.current.x),
      y: panStart.current.panY + (event.clientY - panStart.current.y),
    }

    if (panRafId.current !== null) {
      return
    }

    panRafId.current = requestAnimationFrame(() => {
      panRafId.current = null
      if (pendingPan.current) {
        setPan(pendingPan.current)
      }
    })
  }, [isPanning])

  const onPointerEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    setIsPanning(false)

    if (panRafId.current !== null) {
      cancelAnimationFrame(panRafId.current)
      panRafId.current = null
    }

    if (pendingPan.current) {
      setPan(pendingPan.current)
      pendingPan.current = null
    }

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
        <div className="topbar-actions">
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
          <div className="feature-controls">
            <button
              type="button"
              onClick={() => setShowHeatmap((current) => !current)}
              aria-pressed={showHeatmap}
              aria-label="Toggle seat price heat map"
            >
              Heat Map: {showHeatmap ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              onClick={() => setIsDarkMode((current) => !current)}
              aria-pressed={isDarkMode}
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            </button>
            <label className="adjacent-label">
              Nearby
              <input
                type="number"
                min={1}
                max={MAX_SELECTION}
                value={adjacentCount}
                onChange={(event) => {
                  const value = Number.parseInt(event.target.value, 10)
                  if (!Number.isFinite(value)) {
                    return
                  }

                  setAdjacentCount(clamp(value, 1, MAX_SELECTION))
                }}
              />
            </label>
            <button type="button" onClick={findAdjacentSeats} aria-label="Find nearest adjacent seats">
              Find N Adjacent
            </button>
          </div>
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
              onClick={onSeatMapClick}
            >
              <defs>
                <pattern id="seat-unavailable-zigzag" width="8" height="8" patternUnits="userSpaceOnUse">
                  <path d="M0 6 L2 2 L4 6 L6 2 L8 6" fill="none" stroke="rgba(255, 255, 255, 0.8)" strokeWidth="1.2" />
                </pattern>
              </defs>
              <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
                {visibleSeats.map((seat) => (
                  <SeatCircle
                    key={seat.id}
                    seat={seat}
                    isSelected={selectedSeatSet.has(seat.id)}
                    isFocused={focusedSeatId === seat.id}
                    showHeatmap={showHeatmap}
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
          {showHeatmap ? (
            <section className="panel">
              <h2>Price Heat Map</h2>
              <ul className="heatmap-legend">
                <li><span className="legend-dot legend-dot--tier-1" /> Tier 1</li>
                <li><span className="legend-dot legend-dot--tier-2" /> Tier 2</li>
                <li><span className="legend-dot legend-dot--tier-3" /> Tier 3</li>
                <li><span className="legend-dot legend-dot--tier-4" /> Tier 4</li>
              </ul>
              <h3 className="legend-subtitle">Disabled Seat Key</h3>
              <ul className="disabled-legend">
                <li><span className="legend-dot legend-dot--reserved legend-dot--pattern" /> Reserved</li>
                <li><span className="legend-dot legend-dot--held legend-dot--pattern" /> Held</li>
                <li><span className="legend-dot legend-dot--sold legend-dot--pattern" /> Sold</li>
              </ul>
            </section>
          ) : null}
          <SeatDetails seat={focusedSeat} />
          <SelectionSummary selectedSeats={selectedSeats} maxSelection={MAX_SELECTION} />
          {selectedSeatIds.length >= MAX_SELECTION ? (
            <p className="limit-note" role="status">Maximum of {MAX_SELECTION} seats reached.</p>
          ) : null}
          {helperMessage ? (
            <p className="helper-note" role="status">{helperMessage}</p>
          ) : null}
        </aside>
      </section>
    </main>
  )
}

export default App
