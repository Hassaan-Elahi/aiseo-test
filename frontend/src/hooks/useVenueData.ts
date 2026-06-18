import { useEffect, useState } from 'react'

import { readVenueData, isSeatSelectable } from '../lib/venue'
import type { VenueData } from '../types'

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

export function useVenueData(dataSource: string) {
  const [venue, setVenue] = useState<VenueData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [initialFocusedSeatId, setInitialFocusedSeatId] = useState<string | null>(null)

  useEffect(() => {
    let canceled = false

    async function loadVenue(): Promise<void> {
      try {
        const response = await fetch(dataSource)

        if (!response.ok) {
          throw new Error(`Unable to load venue data (${response.status})`)
        }

        const payload = await response.json()
        const parsed = readVenueData(payload)

        if (!canceled) {
          setVenue(parsed)
          setInitialFocusedSeatId(getFirstSelectableSeatId(parsed))
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
  }, [dataSource])

  return { venue, error, loading, initialFocusedSeatId }
}
