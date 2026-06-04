'use client'

import { useRouter } from 'next/navigation'
import { useContext, useMemo, useSyncExternalStore } from 'react'

import { TransfxContext, useHandlers } from './context.js'
import { IDLE } from './controller.js'
import type { TransitionHandlers, TransitionState } from './types.js'

const getIdle = () => IDLE
const subscribeToNothing = () => () => {}

/**
 * `useRouter`, with a transition on `push` and `replace`. `back` and `forward`
 * have one either way, as the buttons of the browser do.
 */
export function useTransitionRouter(): ReturnType<typeof useRouter> {
  const router = useRouter()
  const transfx = useContext(TransfxContext)

  return useMemo(() => {
    if (!transfx) {
      return router
    }

    return {
      ...router,
      push(href, options) {
        if (!transfx.navigate(href, 'push', options)) {
          router.push(href, options)
        }
      },
      replace(href, options) {
        if (!transfx.navigate(href, 'replace', options)) {
          router.replace(href, options)
        }
      },
    }
  }, [transfx, router])
}

/**
 * Lets a component animate itself with the page. Every `leave` on screen is
 * waited for before the navigation, and every `enter` of the next page runs
 * once it is in the document.
 */
export function usePageTransition(handlers: TransitionHandlers) {
  useHandlers(useContext(TransfxContext)?.controller, handlers)
}

/**
 * The phase of the transition, and where it goes from and to while there is one.
 */
export function useTransitionState(): TransitionState {
  const controller = useContext(TransfxContext)?.controller

  return useSyncExternalStore(controller?.subscribe ?? subscribeToNothing, controller?.getState ?? getIdle, getIdle)
}
