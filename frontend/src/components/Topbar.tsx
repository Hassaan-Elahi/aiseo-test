import { clamp } from '../lib/venue'

interface TopbarProps {
  venueName: string
  showHeatmap: boolean
  onToggleHeatmap: () => void
  isDarkMode: boolean
  onToggleDarkMode: () => void
  adjacentCount: number
  onAdjacentCountChange: (value: number) => void
  onFindAdjacent: () => void
  zoomIn: () => void
  zoomOut: () => void
  onResetView: () => void
}

export function Topbar({
  venueName,
  showHeatmap,
  onToggleHeatmap,
  isDarkMode,
  onToggleDarkMode,
  adjacentCount,
  onAdjacentCountChange,
  onFindAdjacent,
  zoomIn,
  zoomOut,
  onResetView,
}: TopbarProps) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">Interactive Seating Map</p>
        <h1>{venueName}</h1>
      </div>
      <div className="topbar-actions">
        <div className="zoom-controls">
          <button type="button" onClick={zoomOut} aria-label="Zoom out map">
            -
          </button>
          <button type="button" onClick={zoomIn} aria-label="Zoom in map">
            +
          </button>
          <button type="button" onClick={onResetView} aria-label="Reset map position and zoom">
            Reset
          </button>
        </div>
        <div className="feature-controls">
          <button
            type="button"
            onClick={onToggleHeatmap}
            aria-pressed={showHeatmap}
            aria-label="Toggle seat price heat map"
          >
            Heat Map: {showHeatmap ? 'On' : 'Off'}
          </button>
          <button
            type="button"
            onClick={onToggleDarkMode}
            aria-pressed={isDarkMode}
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
          <label className="adjacent-label">
            Nearby
            <input
              type="number"
              min={1}
              max={8}
              value={adjacentCount}
              onChange={(event) => {
                const value = Number.parseInt(event.target.value, 10)
                if (!Number.isFinite(value)) {
                  return
                }

                onAdjacentCountChange(clamp(value, 1, 8))
              }}
            />
          </label>
          <button type="button" onClick={onFindAdjacent} aria-label="Find nearest adjacent seats">
            Find N Adjacent
          </button>
        </div>
      </div>
    </header>
  )
}
