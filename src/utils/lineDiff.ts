export type LineDiffOp =
  | { type: 'equal'; line: string }
  | { type: 'insert'; line: string }
  | { type: 'delete'; line: string }

/**
 * Myers diff (line-based).
 * Returns a unified sequence of operations to transform oldText -> newText.
 */
export function diffLines(oldText: string, newText: string): LineDiffOp[] {
  const a = splitLines(oldText)
  const b = splitLines(newText)

  const n = a.length
  const m = b.length
  const max = n + m

  let v = new Map<number, number>()
  v.set(1, 0)

  const trace: Array<Map<number, number>> = []

  for (let d = 0; d <= max; d++) {
    trace.push(new Map(v))

    for (let k = -d; k <= d; k += 2) {
      let x: number
      const vKMinus = v.get(k - 1)
      const vKPlus = v.get(k + 1)

      if (k === -d || (k !== d && (vKMinus ?? -1) < (vKPlus ?? -1))) {
        x = vKPlus ?? 0
      } else {
        x = (vKMinus ?? 0) + 1
      }

      let y = x - k

      while (x < n && y < m && a[x] === b[y]) {
        x++
        y++
      }

      v.set(k, x)

      if (x >= n && y >= m) {
        return backtrack(trace, a, b)
      }
    }
  }

  return backtrack(trace, a, b)
}

function backtrack(trace: Array<Map<number, number>>, a: string[], b: string[]): LineDiffOp[] {
  let x = a.length
  let y = b.length
  const ops: LineDiffOp[] = []

  for (let d = trace.length - 1; d >= 0; d--) {
    const v = trace[d]
    const k = x - y

    let prevK: number
    const vKMinus = v.get(k - 1)
    const vKPlus = v.get(k + 1)

    if (k === -d || (k !== d && (vKMinus ?? -1) < (vKPlus ?? -1))) {
      prevK = k + 1
    } else {
      prevK = k - 1
    }

    const prevX = v.get(prevK) ?? 0
    const prevY = prevX - prevK

    while (x > prevX && y > prevY) {
      ops.push({ type: 'equal', line: a[x - 1] })
      x--
      y--
    }

    if (d === 0) break

    if (x === prevX) {
      ops.push({ type: 'insert', line: b[y - 1] })
      y--
    } else {
      ops.push({ type: 'delete', line: a[x - 1] })
      x--
    }
  }

  return ops.reverse()
}

function splitLines(text: string): string[] {
  if (!text) return []
  const normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
  return normalized.split('\n')
}

