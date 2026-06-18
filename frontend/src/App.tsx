import { useMemo } from 'react'

import { Topbar } from './components/Topbar'
import { MapViewport } from './components/MapViewport'
import { Sidebar } from './components/Sidebar'
import { buildSeatIndex } from './lib/venue'
import {
  useAdjacentSeatsHelper,
  useFeatureToggles,
  usePanZoom,
  useSeatSelection,
  useTheme,
  useVenueData,
} from './hooks'
import './App.css'

const VENUE_DATA_SOURCE = '/venue.stadium.json'
// const VENUE_DATA_SOURCE = '/venue.test.json'


function App() {
  // Feature toggles
  const [isDarkMode, setIsDarkMode] = useTheme()
  const { showHeatmap, setShowHeatmap } = useFeatureToggles()

  // Venue data loading
  const { venue, error, loading, initialFocusedSeatId } = useVenueData(VENUE_DATA_SOURCE)

  // Pan/zoom controls
  const panZoom = usePanZoom()

  // Build seat index
  const seatIndex = useMemo(() => {
    if (!venue) {
      return null
    }

    return buildSeatIndex(venue)
  }, [venue])

  // Seat selection and navigation
  const seatSelection = useSeatSelection(seatIndex, venue, initialFocusedSeatId)

  // Adjacent seats helper
  const adjacentHelper = useAdjacentSeatsHelper(seatSelection.focusedSeatId, seatIndex)

  // Viewport culling: only render visible seats
  const visibleSeats = useMemo(() => {
    if (!seatIndex || !venue) {
      return []
    }

    // Culling must use SVG viewBox units, not DOM pixels.
    // The visible world at zoom=1 is exactly the venue map dimensions.
    const buffer = 80 / panZoom.zoom
    const left = -panZoom.pan.x / panZoom.zoom - buffer
    const top = -panZoom.pan.y / panZoom.zoom - buffer
    const right = (venue.map.width - panZoom.pan.x) / panZoom.zoom + buffer
    const bottom = (venue.map.height - panZoom.pan.y) / panZoom.zoom + buffer

    return seatIndex.allSeats.filter(
      (seat) => seat.x >= left && seat.x <= right && seat.y >= top && seat.y <= bottom,
    )
  }, [panZoom.pan.x, panZoom.pan.y, seatIndex, venue, panZoom.zoom])

  // Handle finding adjacent seats
  const handleFindAdjacentSeats = () => {
    adjacentHelper.findAdjacentSeats(seatSelection.selectedSeatIds, (newSeatIds) => {
      seatSelection.setSelectedSeatIds((current) => [...current, ...newSeatIds])
    })
  }

  const handleResetAll = () => {
    panZoom.resetView()
    seatSelection.setSelectedSeatIds([])
    adjacentHelper.setHelperMessage(null)
  }

  // Loading state
  if (loading) {
    return <main className="shell">Loading venue...</main>
  }

  // Error state
  if (error || !venue || !seatIndex) {
    return <main className="shell">Failed to load venue: {error ?? 'Invalid venue data.'}</main>
  }

  return (
    <main className="shell">
      <Topbar
        venueName={venue.name}
        showHeatmap={showHeatmap}
        onToggleHeatmap={() => setShowHeatmap((current) => !current)}
        isDarkMode={isDarkMode}
        onToggleDarkMode={() => setIsDarkMode((current) => !current)}
        adjacentCount={adjacentHelper.adjacentCount}
        onAdjacentCountChange={adjacentHelper.setAdjacentCount}
        onFindAdjacent={handleFindAdjacentSeats}
        zoomIn={panZoom.zoomIn}
        zoomOut={panZoom.zoomOut}
        onResetView={handleResetAll}
      />

      <section className="layout">
        <MapViewport
          venue={venue}
          visibleSeats={visibleSeats}
          selectedSeatSet={seatSelection.selectedSeatSet}
          focusedSeatId={seatSelection.focusedSeatId}
          showHeatmap={showHeatmap}
          zoom={panZoom.zoom}
          pan={panZoom.pan}
          onSeatActivate={seatSelection.toggleSeat}
          onFocusSeat={seatSelection.focusSeat}
          onSeatMove={seatSelection.moveFocus}
          onRegisterSeatRef={seatSelection.registerSeatRef}
          onSeatMapClick={seatSelection.onSeatMapClick}
          onWheel={panZoom.onWheel}
          onPointerDown={panZoom.onPointerDown}
          onPointerMove={panZoom.onPointerMove}
          onPointerUp={panZoom.onPointerEnd}
        />

        <Sidebar
          focusedSeat={seatSelection.focusedSeat}
          selectedSeats={seatSelection.selectedSeats}
          maxSelection={seatSelection.maxSelection}
          selectedSeatCount={seatSelection.selectedSeatIds.length}
          showHeatmap={showHeatmap}
          helperMessage={adjacentHelper.helperMessage}
        />
      </section>
    </main>
  )
}

export default App
