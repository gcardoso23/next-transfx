export type Trigger = 'push' | 'replace' | 'popstate'

export type Direction = 'forward' | 'back'

export type Phase = 'idle' | 'leaving' | 'loading' | 'entering'

export type TransitionDetails = {
  /** Path and search of the page being left. */
  from: string
  /** Path and search of the page being entered. */
  to: string
  /** `popstate` is the back and forward buttons of the browser. */
  trigger: Trigger
  /** Always `forward` for `push` and `replace`. */
  direction: Direction
}

export type TransitionContext = TransitionDetails & {
  /** Aborted when another navigation cuts the animation short. */
  signal: AbortSignal
}

/**
 * Whatever it returns is awaited, so a promise works as well as the tween of
 * an animation library that can be awaited.
 */
export type TransitionHandler = (context: TransitionContext) => unknown

export type TransitionHandlers = {
  /** Runs on the page being left, which stays on screen until it resolves. */
  leave?: TransitionHandler
  /** Runs once the next page is in the document, before it is painted. */
  enter?: TransitionHandler
}

export type TransitionState = { phase: 'idle' } | ({ phase: Exclude<Phase, 'idle'> } & TransitionDetails)
