export interface HeatmapPoint {
  lat: number
  lng: number
  weight: number
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

export function lerpHeatmapPoints(
  oldPoints: HeatmapPoint[],
  newPoints: HeatmapPoint[],
  t: number
): HeatmapPoint[] {
  const result: HeatmapPoint[] = []
  const maxLen = Math.max(oldPoints.length, newPoints.length)

  for (let i = 0; i < maxLen; i++) {
    const oldPt = oldPoints[i] ?? { lat: 0, lng: 0, weight: 0 }
    const newPt = newPoints[i] ?? { lat: 0, lng: 0, weight: 0 }

    result.push({
      lat: lerp(oldPt.lat, newPt.lat, t),
      lng: lerp(oldPt.lng, newPt.lng, t),
      weight: lerp(oldPt.weight, newPt.weight, t),
    })
  }

  return result
}

export function sensorValueToWeight(value: number, min: number, max: number): number {
  const clamped = Math.max(min, Math.min(max, value))
  return (clamped - min) / (max - min)
}

export function animateHeatmapTransition(
  oldPoints: HeatmapPoint[],
  newPoints: HeatmapPoint[],
  duration: number,
  onUpdate: (points: HeatmapPoint[]) => void,
  onComplete: () => void
): () => void {
  const startTime = performance.now()
  let cancelled = false

  function frame(now: number) {
    if (cancelled) return

    const elapsed = now - startTime
    const t = Math.min(elapsed / duration, 1)
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2

    const interpolated = lerpHeatmapPoints(oldPoints, newPoints, eased)
    onUpdate(interpolated)

    if (t < 1) {
      requestAnimationFrame(frame)
    } else {
      onComplete()
    }
  }

  requestAnimationFrame(frame)

  return () => {
    cancelled = true
  }
}
