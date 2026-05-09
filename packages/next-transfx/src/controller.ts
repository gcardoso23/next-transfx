import type { Direction, TransitionContext, TransitionHandlers, TransitionState, Trigger } from './types.js'

export type Navigation = {
  to: string
  trigger: Trigger
  direction: Direction
  /** Hands the navigation to the router, and resolves once the next page is in the document. */
  commit: () => Promise<void>
}

export type Controller = ReturnType<typeof createController>

export const IDLE: TransitionState = { phase: 'idle' }

function aborted(signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    signal.addEventListener('abort', () => resolve(), { once: true })
  })
}

// Runs a navigation as leave, commit, enter. It knows nothing of the router:
// `location` tells it which page is on screen, and each navigation brings its
// own way to commit.
export function createController(location: () => string) {
  const handlers = new Set<() => TransitionHandlers>()
  const listeners = new Set<() => void>()

  let state = IDLE
  let navigation: Navigation | null = null
  let commit = Promise.resolve()
  let abort = new AbortController()

  function setState(next: TransitionState) {
    state = next

    listeners.forEach((listener) => {
      listener()
    })
  }

  // A handler that throws must not leave the visitor on a page that never changes.
  async function call(name: keyof TransitionHandlers, context: TransitionContext) {
    await Promise.all(
      Array.from(handlers, async (handler) => {
        try {
          await handler()[name]?.(context)
        } catch (error) {
          console.error(error)
        }
      }),
    )
  }

  async function run() {
    while (navigation) {
      abort = new AbortController()

      const { signal } = abort
      const from = location()
      const details = ({ to, trigger, direction }: Navigation) => ({ from, to, trigger, direction })

      setState({ phase: 'leaving', ...details(navigation) })

      await call('leave', { ...details(navigation), signal })

      setState({ phase: 'loading', ...details(navigation) })

      commit = navigation.commit()

      // A navigation asked for while this one loads is committed at once, so
      // wait for the last of them.
      let settled: Promise<void>

      do {
        settled = commit

        await settled.catch(console.error)
      } while (settled !== commit)

      const entered = navigation

      navigation = null

      setState({ phase: 'entering', ...details(entered) })

      await Promise.race([call('enter', { ...details(entered), signal }), aborted(signal)])
    }

    setState(IDLE)
  }

  return {
    getState: () => state,

    subscribe(listener: () => void) {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },

    register(handler: () => TransitionHandlers) {
      handlers.add(handler)

      return () => {
        handlers.delete(handler)
      }
    },

    // The latest navigation always wins, and what that takes depends on how far
    // the one before it has got.
    navigate(next: Navigation) {
      const current = state

      navigation = next

      if (current.phase === 'idle') {
        void run()
      } else if (current.phase === 'entering') {
        // The page on screen has to leave again, starting from where it got to.
        abort.abort()
      } else {
        const { to, trigger, direction } = next

        setState({ ...current, to, trigger, direction })

        // While the page leaves, the router has not heard of the navigation it
        // replaces. Once it has, the new one goes straight to it, as it would
        // without transitions.
        if (current.phase === 'loading') {
          commit = next.commit()
        }
      }
    },
  }
}
