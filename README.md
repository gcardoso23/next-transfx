# next-transfx

Page transitions for the Next.js App Router.

Out of the box, Next.js replaces the page as soon as the next one is ready, so the old page never gets to animate out. The back and forward buttons are worse: the page changes the instant they are pressed.

next-transfx holds the navigation until your `leave` animation has finished, lets Next.js render the next page, then runs your `enter` animation before that page is ever painted. The back and forward buttons play the same transition as a link.

- **`leave` and `enter` hooks**, for the whole page or for any component on it
- **Back and forward buttons** animate like links, with no setup
- **Scroll position restored** on back and forward, hidden between `leave` and `enter`
- **No flash**: `enter` runs before the first paint of the next page
- **Any animation library**: the Web Animations API, GSAP, Motion, anime.js, or anything that returns a promise
- **Interruptions handled**: click again or press back mid-animation and the latest navigation wins

## Contents

- [Requirements](#requirements)
- [Install](#install)
- [Quick start](#quick-start)
- [Recipes](#recipes)
- [API](#api)
- [How it works](#how-it-works)
- [Good to know](#good-to-know)
- [Development](#development)

## Requirements

- Next.js 15.3 or later, with the **App Router**
- React 19 or later

Built and tested against Next.js 16.4 and React 19.3, in Chromium and WebKit. Earlier versions of Next.js, Firefox, and Safari on a real device have not been tested yet.

## Install

```sh
npm install next-transfx
```

Or `bun add next-transfx`, `pnpm add next-transfx`, `yarn add next-transfx`.

## Quick start

**1. Describe the transition.** Handlers are functions, which can't be passed from a server component, so the router lives in a client component of its own:

```tsx
// app/transitions.tsx
'use client'

import { TransitionRouter } from 'next-transfx'
import type { ReactNode } from 'react'

const main = () => document.querySelector('main')!
const timing: KeyframeAnimationOptions = { duration: 400, easing: 'ease-in-out', fill: 'forwards' }

export function Transitions({ children }: { children: ReactNode }) {
  return (
    <TransitionRouter
      leave={() => main().animate({ opacity: 0 }, timing).finished}
      enter={() => main().animate({ opacity: [0, 1] }, timing).finished}
    >
      {children}
    </TransitionRouter>
  )
}
```

**2. Wrap your root layout with it:**

```tsx
// app/layout.tsx
import type { ReactNode } from 'react'

import { Transitions } from './transitions'

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Transitions>
          <main>{children}</main>
        </Transitions>
      </body>
    </html>
  )
}
```

**3. Use `Link` from next-transfx** instead of `next/link`. It takes exactly the same props, and works in server components too.

```tsx
import { Link } from 'next-transfx'

export default function Page() {
  return <Link href="/work">Work</Link>
}
```

That's it. Click a link and the page fades out, then the next one fades in. The browser's back and forward buttons play the same transition.

## Recipes

### Slide in the direction of travel

Every handler is told which way the visitor is going, so back can undo forward:

```tsx
<TransitionRouter
  leave={({ direction }) =>
    main().animate({ opacity: 0, translate: direction === 'back' ? '4rem 0' : '-4rem 0' }, timing).finished
  }
  enter={({ direction }) =>
    main().animate({ opacity: [0, 1], translate: [direction === 'back' ? '-4rem 0' : '4rem 0', '0 0'] }, timing)
      .finished
  }
>
```

`leave` animates *to* a state, without a starting point, so a page that is interrupted while entering leaves from wherever it got to. `enter` animates *from* a fixed start, because the page has never been seen.

### Curtain

A panel that covers the screen on `leave` and uncovers it on `enter`, so the page swap happens behind it:

```tsx
// app/transitions.tsx
'use client'

import { TransitionRouter } from 'next-transfx'
import { type ReactNode, useRef } from 'react'

const timing: KeyframeAnimationOptions = { duration: 600, easing: 'cubic-bezier(0.7, 0, 0.2, 1)', fill: 'forwards' }

export function Transitions({ children }: { children: ReactNode }) {
  const curtain = useRef<HTMLDivElement>(null)

  return (
    <TransitionRouter
      leave={() => curtain.current?.animate({ translate: ['0 100%', '0 0'] }, timing).finished}
      enter={() => curtain.current?.animate({ translate: ['0 0', '0 -100%'] }, timing).finished}
    >
      {children}
      <div className="curtain" ref={curtain} />
    </TransitionRouter>
  )
}
```

```css
.curtain {
  background: #111;
  inset: 0;
  pointer-events: none;
  position: fixed;
  translate: 0 100%;
  z-index: 100;
}
```

### GSAP, or any other library

Whatever a handler returns is awaited, so a GSAP tween works as well as a promise:

```tsx
<TransitionRouter
  leave={() => gsap.to('main', { autoAlpha: 0, y: -40, duration: 0.5 })}
  enter={() => gsap.fromTo('main', { autoAlpha: 0, y: 40 }, { autoAlpha: 1, y: 0, duration: 0.5 })}
>
```

The same goes for anything with a `then` method, such as an anime.js animation.

### Animate a component with its page

`usePageTransition` gives any client component its own `leave` and `enter`. They run alongside the ones of the router, and the navigation waits for all of them.

```tsx
'use client'

import { usePageTransition } from 'next-transfx'
import { useRef } from 'react'

const timing: KeyframeAnimationOptions = { duration: 600, fill: 'forwards' }

export function Title({ children }: { children: string }) {
  const text = useRef<HTMLSpanElement>(null)

  usePageTransition({
    leave: () => text.current?.animate({ translate: '0 -110%' }, timing).finished,
    enter: () => text.current?.animate({ translate: ['0 110%', '0 0'] }, timing).finished,
  })

  return (
    <h1 style={{ overflow: 'hidden' }}>
      <span ref={text} style={{ display: 'block' }}>
        {children}
      </span>
    </h1>
  )
}
```

A component that comes in with the next page has its `enter` called before that page is painted, so it can start hidden without a flash.

### Navigate from code

```tsx
'use client'

import { useTransitionRouter } from 'next-transfx'

export function Close() {
  const router = useTransitionRouter()

  return (
    <button onClick={() => router.push('/work')} type="button">
      Close
    </button>
  )
}
```

`push` and `replace` play the transition. `back` and `forward` play it too, because they are the browser's buttons.

### Show a loader during a transition

`useTransitionState` tells you where the transition is. Putting its phase on `<html>` lets CSS do the rest:

```tsx
'use client'

import { useTransitionState } from 'next-transfx'
import { useEffect } from 'react'

export function TransitionPhase() {
  const { phase } = useTransitionState()

  useEffect(() => {
    document.documentElement.dataset.phase = phase
  }, [phase])

  return null
}
```

```css
html:not([data-phase='idle']) {
  cursor: progress;
}

html[data-phase='loading'] .loader {
  opacity: 1;
}
```

Render it anywhere inside `<Transitions>`. `loading` lasts from the end of `leave` until the next page is ready, which is usually only as long as the server takes to render it.

### Respect reduced motion

next-transfx doesn't decide this for you. Return early, and the navigation goes through at once:

```tsx
const reduced = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

<TransitionRouter
  leave={() => (reduced() ? undefined : main().animate({ opacity: 0 }, timing).finished)}
  enter={() => (reduced() ? undefined : main().animate({ opacity: [0, 1] }, timing).finished)}
>
```

### Pages that scroll inside an element

next-transfx restores the scroll position of the window. If your pages scroll inside an element of their own, turn that off and restore their scroll yourself in `enter`:

```tsx
<TransitionRouter scrollRestoration={false}>
```

## API

### `<TransitionRouter>`

Wraps your app, once, in the root layout.

| Prop                | Type       | Default | Description                                                                              |
| ------------------- | ---------- | ------- | ---------------------------------------------------------------------------------------- |
| `leave`             | `function` |         | Runs on the page being left. Next.js isn't told about the navigation until it resolves. |
| `enter`             | `function` |         | Runs once the next page is in the document, before it is painted.                       |
| `scrollRestoration` | `boolean`  | `true`  | Saves the scroll position of every history entry, and restores it on back and forward. |

### Handler context

`leave` and `enter`, on the router or in `usePageTransition`, are called with:

| Field       | Type                                | Description                                                      |
| ----------- | ----------------------------------- | ---------------------------------------------------------------- |
| `from`      | `string`                            | Path and search of the page being left, such as `/work?page=2`. |
| `to`        | `string`                            | Path and search of the page being entered.                      |
| `trigger`   | `'push' \| 'replace' \| 'popstate'` | `popstate` means the back or forward button, or `router.back()`. |
| `direction` | `'forward' \| 'back'`               | Which way through the history. Links always go `forward`.       |
| `signal`    | `AbortSignal`                       | Aborted when a new navigation cuts an `enter` short.            |

Whatever a handler returns is awaited. A handler that throws is logged to the console and the navigation carries on, so a bug in an animation never leaves the visitor stuck.

### `<Link>`

A drop-in replacement for `next/link`, with every one of its props. Clicks that Next.js wouldn't handle itself, such as a new tab, a download or another site, behave as usual. So does a link to the page already on screen.

### `usePageTransition({ leave, enter })`

Adds `leave` and `enter` handlers for as long as the component is mounted. Write them inline: the latest ones are always used.

### `useTransitionRouter()`

`useRouter` from `next/navigation`, with transitions on `push` and `replace`. Everything else, like `refresh` and `prefetch`, is unchanged.

### `useTransitionState()`

```ts
type TransitionState =
  | { phase: 'idle' }
  | { phase: 'leaving' | 'loading' | 'entering'; from: string; to: string; trigger: Trigger; direction: Direction }
```

Without a `TransitionRouter` above them, `Link` and the hooks behave exactly like plain Next.js, so shared components keep working outside it.

## How it works

**A link** runs `leave` on the page on screen, and only then calls `router.push`. Next.js renders the next page, and next-transfx learns it is in the document in the same commit, before the browser paints it. Scroll is set, then `enter` runs.

**The back button** is harder. The browser changes the URL first, then fires `popstate`, and Next.js would swap the page right away. next-transfx catches that event before Next.js does and holds on to it, so the old page stays on screen and plays `leave`. Then it hands the very same event to Next.js, which restores the page as usual, and `enter` runs.

During that `leave`, the address bar already shows the page being gone to. That's the browser, and it can't be avoided.

**Scroll.** Left alone, the browser jumps to the saved position the moment back is pressed, under the page that is still leaving. So next-transfx sets `history.scrollRestoration` to `manual`, saves the position of every entry, and restores it between `leave` and `enter`. Positions live in `sessionStorage`, so they survive a reload. Links still scroll to the top like `next/link`, and take `scroll={false}` the same way.

**Interruptions.** The latest navigation always wins:

- **During `leave`**, it replaces the one before. The page only leaves once.
- **While the next page loads**, it goes straight to Next.js, as it would without transitions.
- **During `enter`**, `signal` is aborted and the page leaves again, from wherever it got to.

next-transfx uses no private Next.js API. It relies on two things the App Router does: it listens to `popstate` on `window`, and it navigates inside a React transition. The browser tests in the [repository](https://github.com/gcardoso23/next-transfx) cover both, and are worth running after upgrading Next.js.

## Good to know

- **Links need `Link` from next-transfx**, or `useTransitionRouter`. A plain `next/link` still works, with no transition. The back and forward buttons always animate.
- **The first page load has no `enter`.** It arrives already painted from the server. Use a preloader for that.
- **With a `loading.tsx`**, `enter` runs as soon as the loading state shows, since that is when Next.js swaps the route.
- **With `cacheComponents`**, Next.js keeps the page you left in the DOM, hidden, and shows that same DOM again on the way back. Whatever `leave` does to an element, its `enter` must undo.
- **`basePath`** has not been tested.

## Development

The repository is a [Bun](https://bun.sh) workspace (1.3.14 or later):

- `packages/next-transfx`: the library
- `examples/basic`: a Next.js app that uses every feature, and holds the browser tests

```sh
bun install

bun run dev          # the library in watch mode, and the example on http://localhost:3200
bun run build        # the library, to packages/next-transfx/dist
bun run test         # unit tests of the transition state machine
bun run test:e2e     # browser tests of the example, in Chromium and WebKit
bun run check-types
bun run lint
```

The browser tests need Playwright's browsers once: run `bunx playwright install chromium webkit` from `examples/basic`.

### Trying a local build in another project

Pack the package, and install the tarball in the other project:

```sh
cd packages/next-transfx && bun pm pack

# in the other project
bun add /path/to/next-transfx/packages/next-transfx/next-transfx-0.1.0.tgz
```

Use the tarball rather than a `file:` or `link:` dependency. A linked folder brings its own copy of React, and two copies of React break hooks and context.
