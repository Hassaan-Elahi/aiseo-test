import { memo } from 'react'
import type { KeyboardEvent } from 'react'

import { formatCurrency, getSeatPrice } from '../lib/pricing'
import type { RenderSeat } from '../types'

interface SeatCircleProps {
  seat: RenderSeat
  isSelected: boolean
  isFocused: boolean
  onActivate: (seatId: string) => void
  onFocusSeat: (seatId: string) => void
  onMove: (seatId: string, direction: 'left' | 'right' | 'up' | 'down') => void
  registerRef: (seatId: string, node: SVGCircleElement | null) => void
}

function SeatCircleComponent({
  seat,
  isSelected,
  isFocused,
  onActivate,
  onFocusSeat,
  onMove,
  registerRef,
}: SeatCircleProps) {
  const disabled = seat.status !== 'available'
  const price = formatCurrency(getSeatPrice(seat.priceTier))
  const label = `${seat.sectionLabel} Row ${seat.rowIndex} Seat ${seat.col}, ${seat.status}, ${price}`

  const onKeyDown = (event: KeyboardEvent<SVGCircleElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onActivate(seat.id)
      return
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      onMove(seat.id, 'left')
      return
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault()
      onMove(seat.id, 'right')
      return
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault()
      onMove(seat.id, 'up')
      return
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault()
      onMove(seat.id, 'down')
    }
  }

  return (
    <circle
      ref={(node) => registerRef(seat.id, node)}
      className={`seat seat--${seat.status}${isSelected ? ' seat--selected' : ''}${isFocused ? ' seat--focused' : ''}`}
      cx={seat.x}
      cy={seat.y}
      r={10}
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      aria-pressed={isSelected}
      tabIndex={isFocused ? 0 : -1}
      onFocus={() => onFocusSeat(seat.id)}
      onClick={() => onActivate(seat.id)}
      onKeyDown={onKeyDown}
    />
  )
}

export const SeatCircle = memo(SeatCircleComponent)
