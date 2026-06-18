import { SeatDetails } from './SeatDetails'
import { SelectionSummary } from './SelectionSummary'
import type { RenderSeat } from '../types'

interface SidebarProps {
  focusedSeat: RenderSeat | null
  selectedSeats: RenderSeat[]
  maxSelection: number
  selectedSeatCount: number
  showHeatmap: boolean
  helperMessage: string | null
}

export function Sidebar({
  focusedSeat,
  selectedSeats,
  maxSelection,
  selectedSeatCount,
  showHeatmap,
  helperMessage,
}: SidebarProps) {
  return (
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
      <SelectionSummary selectedSeats={selectedSeats} maxSelection={maxSelection} />
      {selectedSeatCount >= maxSelection ? (
        <p className="limit-note" role="status">Maximum of {maxSelection} seats reached.</p>
      ) : null}
      {helperMessage ? (
        <p className="helper-note" role="status">{helperMessage}</p>
      ) : null}
    </aside>
  )
}
