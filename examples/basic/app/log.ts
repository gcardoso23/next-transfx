import type { TransitionContext } from 'next-transfx'

export type Record = Omit<TransitionContext, 'signal'> & {
  hook: 'leave' | 'enter'
  id: number
  /** The title of the page on screen as the hook is called. */
  title: string
  /** The path in the address bar as the hook is called. */
  url: string
}

const listeners = new Set<() => void>()

let records: Array<Record> = []

export function record(hook: Record['hook'], { signal, ...details }: TransitionContext) {
  const title = Array.from(document.querySelectorAll('h1')).find((element) => element.checkVisibility())

  records = [
    ...records,
    {
      ...details,
      hook,
      id: records.length,
      title: title?.textContent ?? '',
      url: `${window.location.pathname}${window.location.search}`,
    },
  ]

  listeners.forEach((listener) => {
    listener()
  })
}

export function subscribe(listener: () => void) {
  listeners.add(listener)

  return () => {
    listeners.delete(listener)
  }
}

export const getRecords = () => records
