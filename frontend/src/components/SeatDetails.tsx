import { formatCurrency, getSeatPrice } from '../lib/pricing'
import type { RenderSeat } from '../types'

interface SeatDetailsProps {
  seat: RenderSeat | null
}

export function SeatDetails({ seat }: SeatDetailsProps) {
  if (!seat) {
    return (
      <section className="panel" aria-live="polite">
        <h2>Seat Details</h2>
        <p>Focus or click a seat to inspect details.</p>
      </section>
    )
  }

  return (
    <section className="panel" aria-live="polite">
      <h2>Seat Details</h2>
      <dl className="details-list">
        <div>
          <dt>Section</dt>
          <dd>{seat.sectionLabel}</dd>
        </div>
        <div>
          <dt>Row</dt>
          <dd>{seat.rowIndex}</dd>
        </div>
        <div>
          <dt>Seat</dt>
          <dd>{seat.col}</dd>
        </div>
        <div>
          <dt>Price</dt>
          <dd>{formatCurrency(getSeatPrice(seat.priceTier))}</dd>
        </div>
        <div>
          <dt>Status</dt>
          <dd className={`status-badge status-badge--${seat.status}`}>{seat.status}</dd>
        </div>
      </dl>
    </section>
  )
}
