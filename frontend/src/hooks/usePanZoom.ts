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
  const activePointers = useRef(new Map<number, { x: number; y: number }>())
  const pinchStartDistance = useRef<number | null>(null)
  const pinchStartZoom = useRef(DEFAULT_ZOOM)
  const panRafId = useRef<number | null>(null)
  const pendingPan = useRef<{ x: number; y: number } | null>(null)
  const zoomRafId = useRef<number | null>(null)
  const pendingZoomDelta = useRef(0)

  const startPinch = useCallback((currentZoom: number) => {
    const pointers = Array.from(activePointers.current.values())
    if (pointers.length < 2) {
      pinchStartDistance.current = null
      return
    }

    const [first, second] = pointers
    pinchStartDistance.current = Math.hypot(second.x - first.x, second.y - first.y)
    pinchStartZoom.current = currentZoom
  }, [])

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
    setIsPanning(false)
    activePointers.current.clear()
    pinchStartDistance.current = null
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

      activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
      event.currentTarget.setPointerCapture(event.pointerId)

      if (activePointers.current.size >= 2) {
        setIsPanning(false)
        startPinch(zoom)
        return
      }

      setIsPanning(true)
      panStart.current = {
        x: event.clientX,
        y: event.clientY,
        panX: pan.x,
        panY: pan.y,
      }
    },
    [pan.x, pan.y, startPinch, zoom],
  )

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!activePointers.current.has(event.pointerId)) {
        return
      }

      activePointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY })

      if (activePointers.current.size >= 2) {
        if (pinchStartDistance.current === null) {
          startPinch(zoom)
        }

        const pointers = Array.from(activePointers.current.values())
        if (pointers.length < 2 || !pinchStartDistance.current || pinchStartDistance.current <= 0) {
          return
        }

        const [first, second] = pointers
        const currentDistance = Math.hypot(second.x - first.x, second.y - first.y)
        const scale = currentDistance / pinchStartDistance.current
        const nextZoom = clamp(Number((pinchStartZoom.current * scale).toFixed(2)), MIN_ZOOM, MAX_ZOOM)
        setZoom(nextZoom)
        return
      }

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
    },
    [isPanning, startPinch, zoom],
  )

  const onPointerEnd = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      activePointers.current.delete(event.pointerId)

      const target = event.currentTarget as HTMLDivElement & {
        hasPointerCapture?: (pointerId: number) => boolean
        releasePointerCapture?: (pointerId: number) => void
      }

      if (target.hasPointerCapture?.(event.pointerId)) {
        target.releasePointerCapture?.(event.pointerId)
      }

      if (activePointers.current.size < 2) {
        pinchStartDistance.current = null
      }

      if (activePointers.current.size === 1) {
        const [remainingPointer] = Array.from(activePointers.current.values())
        setIsPanning(true)
        panStart.current = {
          x: remainingPointer.x,
          y: remainingPointer.y,
          panX: pan.x,
          panY: pan.y,
        }
        return
      }

      setIsPanning(false)

      if (panRafId.current !== null) {
        cancelAnimationFrame(panRafId.current)
        panRafId.current = null
      }

      if (pendingPan.current) {
        setPan(pendingPan.current)
        pendingPan.current = null
      }
    },
    [pan.x, pan.y],
  )

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
