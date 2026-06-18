import { SeatCircle } from './SeatCircle'
import type { RenderSeat, VenueData } from '../types'

interface MapViewportProps {
  venue: VenueData
  visibleSeats: RenderSeat[]
  selectedSeatSet: Set<string>
  focusedSeatId: string | null
  showHeatmap: boolean
  zoom: number
  pan: { x: number; y: number }
  onSeatActivate: (seatId: string) => void
  onFocusSeat: (seatId: string) => void
  onSeatMove: (seatId: string, direction: 'up' | 'down' | 'left' | 'right') => void
  onRegisterSeatRef: (seatId: string, node: SVGCircleElement | null) => void
  onSeatMapClick: (event: React.MouseEvent<SVGSVGElement>) => void
  onWheel: (event: React.WheelEvent<HTMLDivElement>) => void
  onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void
  onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void
}

export function MapViewport({
  venue,
  visibleSeats,
  selectedSeatSet,
  focusedSeatId,
  showHeatmap,
  zoom,
  pan,
  onSeatActivate,
  onFocusSeat,
  onSeatMove,
  onRegisterSeatRef,
  onSeatMapClick,
  onWheel,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: MapViewportProps) {
  return (
    <section className="map-card" aria-label="Seating map area">
      <p className="map-hint">Scroll or pinch to zoom, drag empty space to pan, and use arrow keys plus Enter/Space on focused seats.</p>
      <div
        className="map-viewport"
        style={{ aspectRatio: `${venue.map.width} / ${venue.map.height}` }}
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
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
                onActivate={onSeatActivate}
                onFocusSeat={onFocusSeat}
                onMove={onSeatMove}
                registerRef={onRegisterSeatRef}
              />
            ))}
          </g>
        </svg>
      </div>
    </section>
  )
}
