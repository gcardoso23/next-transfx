import { expect, type Page, test } from '@playwright/test'

type Entry = {
  direction: string
  from: string
  hook: string
  /** The title of the page that was on screen as the hook was called. */
  title: string
  to: string
  trigger: string
  /** The path that was in the address bar as the hook was called. */
  url: string
}

type Frame = {
  /** How far down its own `enter` still has the title. */
  offset: number
  phase: string
  scroll: number
  title: string
}

declare global {
  interface Window {
    frames_: Array<Frame>
  }
}

// What the demo logged from `leave` and `enter`, oldest first.
function getLog(page: Page) {
  return page.locator('.status__log li').evaluateAll((items) => items.map((item) => ({ ...item.dataset }) as Entry))
}

// Waits for the page with this title to have come in, and the transition to be over.
async function entered(page: Page, title: string) {
  const last = page.locator('.status__log li').last()

  await expect(last).toHaveAttribute('data-hook', 'enter')
  await expect(last).toHaveAttribute('data-title', title)
  await expect(page.locator('.status')).toHaveAttribute('data-phase', 'idle')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title)
}

async function follow(page: Page, name: string | RegExp, title: string) {
  await page.getByRole('link', { exact: true, name }).click()

  await entered(page, title)
}

async function scrollTo(page: Page, top: number) {
  await page.evaluate((top) => window.scrollTo(0, top), top)

  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(top)

  // The position is kept from a scroll event, which comes with the next frame.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))))
}

// Notes what every frame is about to paint, from now on.
function recordFrames(page: Page) {
  return page.evaluate(() => {
    window.frames_ = []

    const tick = () => {
      const title = Array.from(document.querySelectorAll('h1')).find((element) => element.checkVisibility())
      const text = title?.querySelector('span')

      window.frames_.push({
        offset: text ? new DOMMatrix(getComputedStyle(text).transform).m42 : 0,
        phase: document.querySelector<HTMLElement>('.status')?.dataset.phase ?? '',
        scroll: Math.round(window.scrollY),
        title: title?.textContent ?? '',
      })

      requestAnimationFrame(tick)
    }

    tick()
  })
}

const getFrames = (page: Page) => page.evaluate(() => window.frames_)

// Calls `history.back()` at the very moment the transition gets to a phase.
function goBackOn(page: Page, phase: string) {
  return page.evaluate((phase) => {
    const status = document.querySelector<HTMLElement>('.status')!

    const observer = new MutationObserver(() => {
      if (status.dataset.phase === phase) {
        observer.disconnect()

        window.history.back()
      }
    })

    observer.observe(status, { attributes: true })
  }, phase)
}

function suite() {
  test('a link has the page leave before the router is told, then the next one enter', async ({ page }) => {
    await page.goto('/')
    await follow(page, 'Work', 'Work')

    await expect(page).toHaveURL('/work')

    expect(await getLog(page)).toEqual([
      { direction: 'forward', from: '/', hook: 'leave', title: 'Home', to: '/work', trigger: 'push', url: '/' },
      { direction: 'forward', from: '/', hook: 'enter', title: 'Work', to: '/work', trigger: 'push', url: '/work' },
    ])
  })

  test('back and forward play the transition, with the page they leave still on screen', async ({ page }) => {
    await page.goto('/')
    await follow(page, 'Work', 'Work')

    await page.goBack()
    await entered(page, 'Home')

    // The address had changed already, and the page had not.
    expect((await getLog(page)).slice(2)).toEqual([
      { direction: 'back', from: '/work', hook: 'leave', title: 'Work', to: '/', trigger: 'popstate', url: '/' },
      { direction: 'back', from: '/work', hook: 'enter', title: 'Home', to: '/', trigger: 'popstate', url: '/' },
    ])

    await page.goForward()
    await entered(page, 'Work')

    expect((await getLog(page)).slice(4)).toEqual([
      { direction: 'forward', from: '/', hook: 'leave', title: 'Home', to: '/work', trigger: 'popstate', url: '/work' },
      { direction: 'forward', from: '/', hook: 'enter', title: 'Work', to: '/work', trigger: 'popstate', url: '/work' },
    ])
  })

  test('`back` of `useTransitionRouter` plays it too', async ({ page }) => {
    await page.goto('/work')
    await follow(page, /Low Tide/, 'Low Tide')

    await page.getByRole('button', { name: 'Back' }).click()
    await entered(page, 'Work')

    expect((await getLog(page)).at(-2)).toMatchObject({ hook: 'leave', title: 'Low Tide', trigger: 'popstate' })
  })

  test('nothing of the next page is painted before it enters', async ({ page }) => {
    await page.goto('/')
    await recordFrames(page)
    await follow(page, 'Work', 'Work')

    await page.goBack()
    await entered(page, 'Home')

    const frames = await getFrames(page)

    for (const title of ['Work', 'Home']) {
      const first = frames.findLast((frame, index) => frame.title === title && frames[index - 1]?.title !== title)!

      // The title has an `enter` of its own, which has it start below its line.
      expect(first.phase).toBe('entering')
      expect(first.offset).toBeGreaterThan(100)
    }
  })

  test('the scroll of an entry stays while the page leaves, and is back before the other enters', async ({ page }) => {
    await page.goto('/about')
    await scrollTo(page, 900)
    await follow(page, 'Work', 'Work')

    expect(await page.evaluate(() => window.scrollY)).toBe(0)

    await scrollTo(page, 120)
    await recordFrames(page)

    await page.goBack()
    await entered(page, 'About')

    await page.goForward()
    await entered(page, 'Work')

    const frames = await getFrames(page)
    const positions = { About: 900, Work: 120 }

    expect(frames.some((frame) => frame.title === 'About' && frame.phase === 'entering')).toBe(true)

    // Every frame of a page has it where it was left, leaving or entering.
    for (const frame of frames) {
      expect(frame.scroll, `${frame.title} while ${frame.phase}`).toBe(positions[frame.title as keyof typeof positions])
    }
  })

  test('going back twice in a row is one transition, and the history is kept', async ({ page }) => {
    await page.goto('/')
    await follow(page, 'Work', 'Work')
    await follow(page, /Low Tide/, 'Low Tide')
    await follow(page, /Next: Switchboard/, 'Switchboard')

    // The second one comes while the page is leaving for the first.
    await page.evaluate(() => {
      window.history.back()

      setTimeout(() => window.history.back(), 200)
    })

    await entered(page, 'Work')

    expect((await getLog(page)).slice(-2)).toMatchObject([
      { from: '/work/switchboard', hook: 'leave', title: 'Switchboard', to: '/work/low-tide' },
      { from: '/work/switchboard', hook: 'enter', title: 'Work', to: '/work' },
    ])

    await page.goForward()
    await entered(page, 'Low Tide')

    await page.goForward()
    await entered(page, 'Switchboard')

    await expect(page).toHaveURL('/work/switchboard')
  })

  test('going back while the next page loads gives the navigation up', async ({ page }) => {
    await page.goto('/')
    await follow(page, 'Work', 'Work')

    await goBackOn(page, 'loading')
    await page.getByRole('link', { name: /Low Tide/ }).click()
    await entered(page, 'Home')

    await expect(page).toHaveURL('/')

    expect((await getLog(page)).slice(2)).toMatchObject([
      { hook: 'leave', title: 'Work', to: '/work/low-tide', trigger: 'push' },
      { hook: 'enter', title: 'Home', to: '/', trigger: 'popstate' },
    ])

    // The page that was given up never made it to the history.
    await page.goForward()
    await entered(page, 'Work')

    await expect(page).toHaveURL('/work')
  })

  test('going back while the next page enters has it leave again', async ({ page }) => {
    await page.goto('/')
    await follow(page, 'Work', 'Work')

    await goBackOn(page, 'entering')
    await page.getByRole('link', { name: /Low Tide/ }).click()
    await entered(page, 'Work')

    await expect(page).toHaveURL('/work')

    expect((await getLog(page)).slice(2)).toMatchObject([
      { hook: 'leave', title: 'Work', trigger: 'push' },
      { hook: 'enter', title: 'Low Tide', trigger: 'push' },
      { hook: 'leave', title: 'Low Tide', trigger: 'popstate' },
      { hook: 'enter', title: 'Work', trigger: 'popstate' },
    ])
  })

  test('after a reload, back fetches the page again and puts it where it was', async ({ page }) => {
    await page.goto('/about')
    await scrollTo(page, 900)
    await follow(page, 'Work', 'Work')
    await follow(page, /Low Tide/, 'Low Tide')

    await page.reload()
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Low Tide')

    // Wait for the router to be there to hear of it.
    await expect(page.locator('.status')).toHaveAttribute('data-phase', 'idle')
    await page.waitForLoadState('networkidle')

    await page.goBack()
    await entered(page, 'Work')

    await page.goBack()
    await entered(page, 'About')

    expect(await page.evaluate(() => window.scrollY)).toBe(900)
  })

  test('a link to the page on screen is left to Next.js', async ({ page }) => {
    await page.goto('/work')
    await page.getByRole('link', { exact: true, name: 'Work' }).click()

    await expect(page.locator('.status')).toHaveAttribute('data-phase', 'idle')

    expect(await getLog(page)).toEqual([])
  })
}

test.describe('transitions', suite)

// Safari before 26.2 and Firefox before 147, where the order of the history and
// the scroll of its entries are kept from the navigations seen.
test.describe('transitions, without the Navigation API', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, 'navigation', { value: undefined })
    })
  })

  test('there is no Navigation API', async ({ page }) => {
    await page.goto('/')

    expect(await page.evaluate(() => typeof window.navigation)).toBe('undefined')
  })

  suite()
})
