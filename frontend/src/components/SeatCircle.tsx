import { memo } from 'react'
import type { KeyboardEvent } from 'react'

import { formatCurrency, getSeatPrice } from '../lib/pricing'
import type { RenderSeat } from '../types'

interface SeatCircleProps {
  seat: RenderSeat
  isSelected: boolean
  isFocused: boolean
  zoom: number
  showHeatmap: boolean
  onActivate: (seatId: string) => void
  onFocusSeat: (seatId: string) => void
  onMove: (seatId: string, direction: 'left' | 'right' | 'up' | 'down') => void
  registerRef: (seatId: string, node: SVGCircleElement | null) => void
}

function SeatCircleComponent({
  seat,
  isSelected,
  isFocused,
  zoom,
  showHeatmap,
  onActivate,
  onFocusSeat,
  onMove,
  registerRef,
}: SeatCircleProps) {
  const disabled = seat.status !== 'available'
  const showFocusRing = isFocused && !disabled
  const showPatternOverlay = disabled && zoom >= 1.15
  const heatmapClass = showHeatmap && !disabled ? ` seat--tier-${seat.priceTier}` : ''
  const price = formatCurrency(getSeatPrice(seat.priceTier))
  const seatName = `${seat.sectionId}-${seat.rowIndex}-${String(seat.col).padStart(2, '0')}`
  const label = `${seatName} (${seat.sectionLabel} Row ${seat.rowIndex} Seat ${seat.col}), ${seat.status}, ${price}`

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
    <g>
      <circle
        ref={(node) => registerRef(seat.id, node)}
        className={`seat seat--${seat.status}${disabled ? ' seat--unavailable' : ''}${isSelected ? ' seat--selected' : ''}${showFocusRing ? ' seat--focused' : ''}${heatmapClass}`}
        data-seat-id={seat.id}
        cx={seat.x}
        cy={seat.y}
        r={10}
        role="button"
        aria-label={label}
        aria-disabled={disabled}
        aria-pressed={disabled ? undefined : isSelected}
        tabIndex={!disabled && isFocused ? 0 : -1}
        onFocus={() => {
          if (!disabled) {
            onFocusSeat(seat.id)
          }
        }}
        onKeyDown={onKeyDown}
      />
      {showPatternOverlay ? (
        <circle
          className="seat-pattern-overlay"
          cx={seat.x}
          cy={seat.y}
          r={10}
          aria-hidden="true"
          pointerEvents="none"
          fill="url(#seat-unavailable-zigzag)"
        />
      ) : null}
    </g>
  )
}

export const SeatCircle = memo(SeatCircleComponent)
