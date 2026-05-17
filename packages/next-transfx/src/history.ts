export type Entry = {
  /** Place of the entry in the history, to tell back from forward. */
  index: number
  /** Tells the entry from any other, to keep its scroll position. */
  key: string
  /** Path and search. Two entries that differ only by their hash show the same page. */
  url: string
}

const STORAGE_KEY = 'next-transfx:scroll'

// Browsers without the Navigation API (Safari before 26.2, Firefox before 147)
// do not say where an entry sits in the history, so the order is kept here from
// the navigations seen, and an entry is told from another by its URL alone.
const stack: Array<string> = []

let cursor = 0

function follow(url: string, isTraversal: boolean) {
  if (stack.length === 0) {
    stack.push(url)
  }

  if (stack[cursor] === url) {
    return
  }

  if (!isTraversal) {
    stack.splice(cursor + 1, Number.POSITIVE_INFINITY, url)
    cursor += 1
  } else if (stack[cursor - 1] === url) {
    cursor -= 1
  } else if (stack[cursor + 1] === url) {
    cursor += 1
  } else {
    // An entry from before the document was loaded. Going back to it is the
    // likeliest, so it is placed before the one being left.
    stack.splice(cursor, 0, url)
  }
}

export function readEntry(isTraversal = false): Entry {
  const url = `${window.location.pathname}${window.location.search}`
  const entry = window.navigation?.currentEntry

  if (entry) {
    return { index: entry.index, key: entry.key, url }
  }

  follow(url, isTraversal)

  return { index: cursor, key: url, url }
}

type Positions = Record<string, [x: number, y: number]>

let positions: Positions | undefined

// Kept for the session, so that a reload does not lose the position of the
// entries the visitor can still go back to.
function readPositions() {
  if (!positions) {
    try {
      positions = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) ?? '{}') as Positions
    } catch {
      positions = {}
    }
  }

  return positions
}

export function saveScroll({ key }: Entry) {
  readPositions()[key] = [window.scrollX, window.scrollY]
}

export function restoreScroll({ key }: Entry) {
  const [left, top] = readPositions()[key] ?? [0, 0]

  // Instant, whatever `scroll-behavior` the page sets.
  window.scrollTo({ behavior: 'instant', left, top })
}

export function persistScroll() {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(readPositions()))
  } catch {
    // Storage may be full or blocked. The positions are then kept until a reload.
  }
}
