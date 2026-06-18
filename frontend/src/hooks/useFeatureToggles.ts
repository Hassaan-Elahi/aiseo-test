import { useEffect, useState } from 'react'

const HEATMAP_STORAGE_KEY = 'ds-assessment:show-heatmap'

export function useFeatureToggles() {
  const [showHeatmap, setShowHeatmap] = useState(() => localStorage.getItem(HEATMAP_STORAGE_KEY) === '1')

  useEffect(() => {
    localStorage.setItem(HEATMAP_STORAGE_KEY, showHeatmap ? '1' : '0')
  }, [showHeatmap])

  return { showHeatmap, setShowHeatmap }
}
