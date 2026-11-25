/** Smooth monotone-cubic path through points (no overshoot below the baseline). */
export function smoothPath(pts: [number, number][]): string {
  const n = pts.length
  if (n === 0) return ''
  if (n === 1) return `M${pts[0][0]} ${pts[0][1]}`
  const dx: number[] = []
  const m: number[] = []
  for (let i = 0; i < n - 1; i++) {
    dx.push(pts[i + 1][0] - pts[i][0])
    m.push((pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0] || 1))
  }
  const t: number[] = [m[0]]
  for (let i = 1; i < n - 1; i++) t.push(m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2)
  t.push(m[n - 2])
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = 0
      t[i + 1] = 0
      continue
    }
    const a = t[i] / m[i]
    const b = t[i + 1] / m[i]
    const h = Math.hypot(a, b)
    if (h > 3) {
      t[i] = (3 * a * m[i]) / h
      t[i + 1] = (3 * b * m[i]) / h
    }
  }
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const x0 = pts[i][0], y0 = pts[i][1], x1 = pts[i + 1][0], y1 = pts[i + 1][1]
    const c = dx[i] / 3
    d += ` C${(x0 + c).toFixed(1)} ${(y0 + t[i] * c).toFixed(1)} ${(x1 - c).toFixed(1)} ${(y1 - t[i + 1] * c).toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`
  }
  return d
}
