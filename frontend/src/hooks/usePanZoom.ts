import { useCallback, useEffect, useRef, useState } from 'react'

import { clamp } from '../lib/venue'

const DEFAULT_ZOOM = 1
const MIN_ZOOM = 1
const MAX_ZOOM = 8

export function usePanZoom() {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)

  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 })
  const panRafId = useRef<number | null>(null)
  const pendingPan = useRef<{ x: number; y: number } | null>(null)
  const zoomRafId = useRef<number | null>(null)
  const pendingZoomDelta = useRef(0)

  useEffect(() => {
    return () => {
      if (panRafId.current !== null) {
        cancelAnimationFrame(panRafId.current)
      }

      if (zoomRafId.current !== null) {
        cancelAnimationFrame(zoomRafId.current)
      }
    }
  }, [])

  const zoomIn = useCallback(() => {
    setZoom((current) => clamp(Number((current + 0.2).toFixed(2)), MIN_ZOOM, MAX_ZOOM))
  }, [])

  const zoomOut = useCallback(() => {
    setZoom((current) => clamp(Number((current - 0.2).toFixed(2)), MIN_ZOOM, MAX_ZOOM))
  }, [])

  const resetView = useCallback(() => {
    setZoom(DEFAULT_ZOOM)
    setPan({ x: 0, y: 0 })
  }, [])

  const onWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const delta = event.deltaY > 0 ? -0.12 : 0.12
    pendingZoomDelta.current += delta

    if (zoomRafId.current !== null) {
      return
    }

    zoomRafId.current = requestAnimationFrame(() => {
      zoomRafId.current = null
      const bufferedDelta = pendingZoomDelta.current
      pendingZoomDelta.current = 0

      setZoom((current) => clamp(Number((current + bufferedDelta).toFixed(2)), MIN_ZOOM, MAX_ZOOM))
    })
  }, [])

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const target = event.target as Element
      if (target.closest('.seat')) {
        return
      }

      setIsPanning(true)
      panStart.current = {
        x: event.clientX,
        y: event.clientY,
        panX: pan.x,
        panY: pan.y,
      }
      event.currentTarget.setPointerCapture(event.pointerId)
    },
    [pan.x, pan.y],
  )

  const onPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!isPanning) {
      return
    }

    pendingPan.current = {
      x: panStart.current.panX + (event.clientX - panStart.current.x),
      y: panStart.current.panY + (event.clientY - panStart.current.y),
    }

    if (panRafId.current !== null) {
      return
    }

    panRafId.current = requestAnimationFrame(() => {
      panRafId.current = null
      if (pendingPan.current) {
        setPan(pendingPan.current)
      }
    })
  }, [isPanning])

  const onPointerEnd = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    setIsPanning(false)

    if (panRafId.current !== null) {
      cancelAnimationFrame(panRafId.current)
      panRafId.current = null
    }

    if (pendingPan.current) {
      setPan(pendingPan.current)
      pendingPan.current = null
    }

    const target = event.currentTarget as HTMLDivElement & {
      hasPointerCapture?: (pointerId: number) => boolean
      releasePointerCapture?: (pointerId: number) => void
    }

    if (target.hasPointerCapture?.(event.pointerId)) {
      target.releasePointerCapture?.(event.pointerId)
    }
  }, [])

  return {
    zoom,
    pan,
    isPanning,
    zoomIn,
    zoomOut,
    resetView,
    onWheel,
    onPointerDown,
    onPointerMove,
    onPointerEnd,
  }
}
