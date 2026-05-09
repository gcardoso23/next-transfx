import { afterEach, beforeEach, describe, expect, spyOn, test } from 'bun:test'

import { createController, type Navigation } from './controller.js'
import type { TransitionContext } from './types.js'

function deferred() {
  let resolve!: () => void

  const promise = new Promise<void>((done) => {
    resolve = done
  })

  return { promise, resolve }
}

// Lets the controller run up to its next pending promise.
const tick = () => new Promise((resolve) => setTimeout(resolve))

function setup() {
  const log: Array<string> = []
  const page = { current: '/' }
  const controller = createController(() => page.current)

  const gates = {
    commit: new Map<string, ReturnType<typeof deferred>>(),
    enter: [] as Array<ReturnType<typeof deferred>>,
    leave: [] as Array<ReturnType<typeof deferred>>,
  }

  const contexts: Array<TransitionContext> = []

  function gate(name: 'leave' | 'enter') {
    return (context: TransitionContext) => {
      const next = deferred()

      contexts.push(context)
      gates[name].push(next)
      log.push(`${name} ${context.from} > ${context.to}`)

      return next.promise
    }
  }

  controller.register(() => ({ enter: gate('enter'), leave: gate('leave') }))
  controller.subscribe(() => log.push(`(${controller.getState().phase})`))

  function navigation(to: string, trigger: Navigation['trigger'] = 'push'): Navigation {
    return {
      commit() {
        const next = deferred()

        gates.commit.set(to, next)
        log.push(`commit ${to}`)

        return next.promise.then(() => {
          page.current = to
        })
      },
      direction: trigger === 'popstate' ? 'back' : 'forward',
      to,
      trigger,
    }
  }

  return { contexts, controller, gates, log, navigation }
}

describe('controller', () => {
  test('leaves the page, commits the navigation, then enters the next one', async () => {
    const { controller, gates, log, navigation } = setup()

    controller.navigate(navigation('/work'))

    await tick()

    expect(log).toEqual(['(leaving)', 'leave / > /work'])

    gates.leave[0]!.resolve()

    await tick()

    expect(log.slice(2)).toEqual(['(loading)', 'commit /work'])

    gates.commit.get('/work')!.resolve()

    await tick()

    expect(log.slice(4)).toEqual(['(entering)', 'enter / > /work'])
    expect(controller.getState()).toEqual({
      direction: 'forward',
      from: '/',
      phase: 'entering',
      to: '/work',
      trigger: 'push',
    })

    gates.enter[0]!.resolve()

    await tick()

    expect(log.slice(6)).toEqual(['(idle)'])
  })

  test('a navigation asked for while the page leaves takes the place of the first', async () => {
    const { controller, gates, log, navigation } = setup()

    controller.navigate(navigation('/work'))

    await tick()

    controller.navigate(navigation('/about', 'popstate'))

    expect(controller.getState()).toMatchObject({ phase: 'leaving', to: '/about', trigger: 'popstate' })

    gates.leave[0]!.resolve()

    await tick()

    gates.commit.get('/about')!.resolve()

    await tick()

    expect(log).toEqual([
      '(leaving)',
      'leave / > /work',
      '(leaving)',
      '(loading)',
      'commit /about',
      '(entering)',
      'enter / > /about',
    ])
  })

  test('a navigation asked for while the next page loads is committed at once', async () => {
    const { controller, gates, log, navigation } = setup()

    controller.navigate(navigation('/work'))

    await tick()

    gates.leave[0]!.resolve()

    await tick()

    controller.navigate(navigation('/about'))

    expect(log.at(-1)).toBe('commit /about')

    // The first one landing is not the end of it.
    gates.commit.get('/work')!.resolve()

    await tick()

    expect(controller.getState()).toMatchObject({ phase: 'loading', to: '/about' })

    gates.commit.get('/about')!.resolve()

    await tick()

    expect(log.at(-1)).toBe('enter / > /about')
    expect(gates.leave).toHaveLength(1)
  })

  test('a navigation asked for while the page enters cuts it short and leaves again', async () => {
    const { contexts, controller, gates, log, navigation } = setup()

    controller.navigate(navigation('/work'))

    await tick()

    gates.leave[0]!.resolve()

    await tick()

    gates.commit.get('/work')!.resolve()

    await tick()

    const entering = contexts.at(-1)!

    expect(entering.signal.aborted).toBe(false)

    controller.navigate(navigation('/', 'popstate'))

    await tick()

    expect(entering.signal.aborted).toBe(true)
    expect(log.slice(-2)).toEqual(['(leaving)', 'leave /work > /'])
    expect(contexts.at(-1)!.signal.aborted).toBe(false)
  })

  test('stops calling the handlers of a component that is gone', async () => {
    const { controller, gates, navigation } = setup()

    let calls = 0

    const unregister = controller.register(() => ({
      leave() {
        calls += 1
      },
    }))

    controller.navigate(navigation('/work'))

    await tick()

    unregister()

    gates.leave[0]!.resolve()

    await tick()

    gates.commit.get('/work')!.resolve()

    await tick()

    gates.enter[0]!.resolve()

    await tick()

    controller.navigate(navigation('/about'))

    await tick()

    expect(calls).toBe(1)
  })

  describe('with a handler that throws', () => {
    let error: ReturnType<typeof spyOn>

    beforeEach(() => {
      error = spyOn(console, 'error').mockImplementation(() => {})
    })

    afterEach(() => {
      error.mockRestore()
    })

    test('reports it and carries on with the navigation', async () => {
      const controller = createController(() => '/')

      let committed = false

      controller.register(() => ({
        leave() {
          throw new Error('leave')
        },
      }))

      controller.navigate({
        async commit() {
          committed = true
        },
        direction: 'forward',
        to: '/work',
        trigger: 'push',
      })

      await tick()

      expect(committed).toBe(true)
      expect(error).toHaveBeenCalledTimes(1)
      expect(controller.getState()).toEqual({ phase: 'idle' })
    })
  })
})
