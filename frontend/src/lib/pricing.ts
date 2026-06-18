export const PRICE_BY_TIER: Record<number, number> = {
  1: 75,
  2: 120,
  3: 180,
  4: 240,
}

export function getSeatPrice(priceTier: number): number {
  return PRICE_BY_TIER[priceTier] ?? 100
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}
