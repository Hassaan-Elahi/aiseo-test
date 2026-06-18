import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'
import type { VenueData } from './types'

const venueFixture: VenueData = {
  venueId: 'arena-01',
  name: 'Metropolis Arena',
  map: { width: 1024, height: 768 },
  sections: [
    {
      id: 'A',
      label: 'Lower Bowl A',
      transform: { x: 0, y: 0, scale: 1 },
      rows: [
        {
          index: 1,
          seats: [
            { id: 'A-1-01', col: 1, x: 40, y: 40, priceTier: 1, status: 'available' },
            { id: 'A-1-02', col: 2, x: 80, y: 40, priceTier: 1, status: 'available' },
          ],
        },
      ],
    },
  ],
}

describe('App', () => {
  beforeEach(() => {
    vi.spyOn(window, 'fetch').mockResolvedValue(
      new Response(JSON.stringify(venueFixture), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('selects a seat and updates summary/subtotal', async () => {
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('heading', { name: /Metropolis Arena/i })

    const seat = screen.getByRole('button', {
      name: /A-1-01 \(Lower Bowl A Row 1 Seat 1\), available/i,
    })

    await user.click(seat)

    await waitFor(() => {
      expect(screen.getByText(/1 \/ 8 seats selected/i)).toBeInTheDocument()
      expect(screen.getByText(/Subtotal: \$75/i)).toBeInTheDocument()
    })
  })
})
