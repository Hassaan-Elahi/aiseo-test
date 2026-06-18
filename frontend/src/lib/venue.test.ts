import { describe, expect, it } from 'vitest'

import { buildSeatIndex, getDirectionalNeighbor, readVenueData } from './venue'
import type { VenueData } from '../types'

const venueFixture: VenueData = {
  venueId: 'arena-01',
  name: 'Fixture Arena',
  map: { width: 500, height: 400 },
  sections: [
    {
      id: 'A',
      label: 'Section A',
      transform: { x: 0, y: 0, scale: 1 },
      rows: [
        {
          index: 1,
          seats: [
            { id: 'A-1-01', col: 1, x: 10, y: 10, priceTier: 1, status: 'available' },
            { id: 'A-1-02', col: 2, x: 30, y: 10, priceTier: 1, status: 'available' },
          ],
        },
        {
          index: 2,
          seats: [
            { id: 'A-2-01', col: 1, x: 10, y: 30, priceTier: 2, status: 'available' },
            { id: 'A-2-02', col: 2, x: 30, y: 30, priceTier: 2, status: 'sold' },
          ],
        },
      ],
    },
    {
      id: 'B',
      label: 'Section B',
      transform: { x: 100, y: 0, scale: 1 },
      rows: [
        {
          index: 1,
          seats: [
            { id: 'B-1-01', col: 1, x: 10, y: 10, priceTier: 1, status: 'available' },
            { id: 'B-1-02', col: 2, x: 30, y: 10, priceTier: 1, status: 'available' },
          ],
        },
      ],
    },
  ],
}

describe('venue helpers', () => {
  it('validates and returns venue data', () => {
    const parsed = readVenueData(venueFixture)

    expect(parsed.venueId).toBe('arena-01')
    expect(parsed.sections[0].rows.length).toBe(2)
  })

  it('builds seat index and supports directional keyboard navigation', () => {
    const index = buildSeatIndex(venueFixture)
    const source = index.seatById.get('A-1-01')
    const rightEdgeSeat = index.seatById.get('A-1-02')
    const leftEdgeSeat = index.seatById.get('B-1-01')

    expect(index.allSeats).toHaveLength(6)
    expect(source).toBeDefined()
    expect(rightEdgeSeat).toBeDefined()
    expect(leftEdgeSeat).toBeDefined()

    if (!source || !rightEdgeSeat || !leftEdgeSeat) {
      throw new Error('source seat missing')
    }

    expect(getDirectionalNeighbor(source, 'right', index)).toBe('A-1-02')
    expect(getDirectionalNeighbor(source, 'down', index)).toBe('A-2-01')
    expect(getDirectionalNeighbor(source, 'left', index)).toBe('B-1-02')
    expect(getDirectionalNeighbor(rightEdgeSeat, 'right', index)).toBe('B-1-01')
    expect(getDirectionalNeighbor(leftEdgeSeat, 'left', index)).toBe('A-1-02')
  })
})
