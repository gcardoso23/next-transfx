'use client'

import type { useRouter } from 'next/navigation'
import { createContext, useLayoutEffect, useRef } from 'react'

import type { Controller } from './controller.js'
import type { TransitionHandlers } from './types.js'

export type NavigateOptions = Parameters<ReturnType<typeof useRouter>['push']>[1]

export type Transfx = {
  controller: Controller
  /** Takes a navigation over to run it with a transition. `false` leaves it to the router. */
  navigate: (href: string, trigger: 'push' | 'replace', options?: NavigateOptions) => boolean
}

// Without a `TransitionRouter` above, everything behaves as plain Next.js.
export const TransfxContext = createContext<Transfx | null>(null)

export function useHandlers(controller: Controller | undefined, handlers: TransitionHandlers) {
  const latest = useRef(handlers)

  // Handlers are mostly written inline, so the ones of the last render are the
  // ones to call.
  useLayoutEffect(() => {
    latest.current = handlers
  })

  // A layout effect, so that a page is already registered when it comes in and
  // `enter` is called for it.
  useLayoutEffect(() => controller?.register(() => latest.current), [controller])
}
