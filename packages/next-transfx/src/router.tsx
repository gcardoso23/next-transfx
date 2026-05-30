'use client'

import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  type ReactNode,
  Suspense,
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'

import { type Transfx, TransfxContext, useHandlers } from './context.js'
import { createController } from './controller.js'
import { type Entry, persistScroll, readEntry, restoreScroll, saveScroll } from './history.js'
import type { TransitionHandlers } from './types.js'

export type TransitionRouterProps = TransitionHandlers & {
  children: ReactNode
  /**
   * Keeps the scroll position of every history entry, and restores it before
   * `enter` on back and forward. Turn it off to scroll by other means.
   *
   * @default true
   */
  scrollRestoration?: boolean
}

function Location({ onChange }: { onChange: () => void }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // biome-ignore lint/correctness/useExhaustiveDependencies: these two are what tells a new page is on screen.
  useLayoutEffect(onChange, [onChange, pathname, searchParams])

  return null
}

export function TransitionRouter({ children, enter, leave, scrollRestoration = true }: TransitionRouterProps) {
  const router = useRouter()

  // The entry of the page on screen. After the back button, and until that
  // page has left, the browser is already on another one.
  const displayed = useRef<Entry | null>(null)

  const getDisplayed = useCallback(() => {
    displayed.current ??= readEntry()

    return displayed.current
  }, [])

  const setDisplayed = useCallback(() => {
    displayed.current = readEntry()
  }, [])

  const [controller] = useState(() => createController(() => getDisplayed().url))

  useHandlers(controller, { enter, leave })

  //
  // Commit.
  //
  // The router does not say when the page it was asked for is on screen. So a
  // state of this component is set in the same transition as the router sets
  // its own, which makes React commit both at once, and the effect of that
  // state is the signal. It runs before the browser paints the new page, which
  // is what lets `enter` start from a page that was never seen.
  //
  const [committed, setCommitted] = useState(0)

  const commits = useRef(new Map<number, () => void>())
  const count = useRef(0)

  const commit = useCallback((navigate: () => void) => {
    return new Promise<void>((resolve) => {
      const id = ++count.current

      commits.current.set(id, resolve)

      startTransition(() => {
        try {
          navigate()
        } finally {
          setCommitted(id)
        }
      })
    })
  }, [])

  useLayoutEffect(() => {
    commits.current.forEach((resolve, id) => {
      if (id <= committed) {
        commits.current.delete(id)

        resolve()
      }
    })
  }, [committed])

  //
  // Links and `useTransitionRouter`.
  //
  const transfx = useMemo<Transfx>(
    () => ({
      controller,

      navigate(href, trigger, options) {
        const url = new URL(href, window.location.href)
        const to = `${url.pathname}${url.search}`

        // Another origin is another document, and a page has nowhere to leave
        // for when it is asked for itself.
        if (url.origin !== window.location.origin) {
          return false
        }

        if (to === getDisplayed().url && controller.getState().phase === 'idle') {
          return false
        }

        controller.navigate({
          commit: () => commit(() => router[trigger](href, options)),
          direction: 'forward',
          to,
          trigger,
        })

        return true
      },
    }),
    [commit, controller, getDisplayed, router],
  )

  //
  // Back and forward.
  //
  // The browser has changed the URL by the time it says so, and the router
  // would swap the page at once. The event is kept from it instead, the page on
  // screen leaves, and the router is then given the same event again.
  //
  useEffect(() => {
    let replayed: PopStateEvent | undefined

    const onPopState = (event: PopStateEvent) => {
      if (event === replayed) {
        return
      }

      const from = getDisplayed()
      const entry = readEntry(true)

      // Only the hash differs, so the page stays.
      if (entry.url === from.url && controller.getState().phase === 'idle') {
        displayed.current = entry

        if (scrollRestoration) {
          restoreScroll(entry)
        }

        return
      }

      event.stopImmediatePropagation()

      controller.navigate({
        async commit() {
          await commit(() => {
            // By now the visitor may have gone further back, so the event tells
            // of the entry the browser is on, not of the one it was first on.
            replayed = new PopStateEvent('popstate', { state: window.history.state })

            window.dispatchEvent(replayed)
          })

          if (scrollRestoration) {
            restoreScroll(readEntry())
          }
        },
        direction: entry.index > from.index ? 'forward' : 'back',
        to: entry.url,
        trigger: 'popstate',
      })
    }

    // Capturing, to hear of it before the router does.
    window.addEventListener('popstate', onPopState, true)

    return () => {
      window.removeEventListener('popstate', onPopState, true)
    }
  }, [commit, controller, getDisplayed, scrollRestoration])

  //
  // Scroll.
  //
  // Left to itself, the browser scrolls to the position of the entry as soon
  // as the back button is pressed, which is under the page that is leaving.
  //
  useEffect(() => {
    if (!scrollRestoration) {
      return
    }

    const onScroll = () => {
      const { phase } = controller.getState()

      // From the moment a page starts to leave, the position it was left at is
      // the one to come back to.
      if (phase === 'idle' || phase === 'entering') {
        saveScroll(readEntry())
      }
    }

    const onPageShow = () => {
      window.history.scrollRestoration = 'manual'
    }

    // A reload starts from a new document, and its scroll is the browser's to
    // restore.
    const onPageHide = () => {
      window.history.scrollRestoration = 'auto'

      persistScroll()
    }

    onPageShow()

    window.addEventListener('pagehide', onPageHide)
    window.addEventListener('pageshow', onPageShow)
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      onPageHide()

      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('pageshow', onPageShow)
      window.removeEventListener('scroll', onScroll)
    }
  }, [controller, scrollRestoration])

  return (
    <TransfxContext value={transfx}>
      <Suspense>
        <Location onChange={setDisplayed} />
      </Suspense>

      {children}
    </TransfxContext>
  )
}
