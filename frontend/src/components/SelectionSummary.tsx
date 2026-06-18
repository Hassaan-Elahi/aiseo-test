import { formatCurrency, getSeatPrice } from '../lib/pricing'
import type { RenderSeat } from '../types'

interface SelectionSummaryProps {
  selectedSeats: RenderSeat[]
  maxSelection: number
}

export function SelectionSummary({ selectedSeats, maxSelection }: SelectionSummaryProps) {
  const subtotal = selectedSeats.reduce((total, seat) => total + getSeatPrice(seat.priceTier), 0)

  return (
    <section className="panel" aria-live="polite">
      <h2>Your Selection</h2>
      <p>
        {selectedSeats.length} / {maxSelection} seats selected
      </p>
      <p className="subtotal">Subtotal: {formatCurrency(subtotal)}</p>
      {selectedSeats.length > 0 ? (
        <ul className="selection-list">
          {selectedSeats.map((seat) => (
            <li key={seat.id}>
              {seat.id} ({formatCurrency(getSeatPrice(seat.priceTier))})
            </li>
          ))}
        </ul>
      ) : (
        <p>No seats selected yet.</p>
      )}
    </section>
  )
}
