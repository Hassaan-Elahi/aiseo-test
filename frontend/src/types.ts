export type SeatStatus = 'available' | 'reserved' | 'sold' | 'held'

export interface SeatData {
  id: string
  col: number
  x: number
  y: number
  priceTier: number
  status: SeatStatus
}

export interface RowData {
  index: number
  seats: SeatData[]
}

export interface SectionTransform {
  x: number
  y: number
  scale: number
}

export interface SectionData {
  id: string
  label: string
  transform: SectionTransform
  rows: RowData[]
}

export interface VenueData {
  venueId: string
  name: string
  map: {
    width: number
    height: number
  }
  sections: SectionData[]
}

export interface RenderSeat {
  id: string
  sectionId: string
  sectionLabel: string
  rowIndex: number
  col: number
  x: number
  y: number
  priceTier: number
  status: SeatStatus
}

export type Direction = 'left' | 'right' | 'up' | 'down'
