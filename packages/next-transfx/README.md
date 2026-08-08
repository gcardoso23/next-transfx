# next-transfx

Page transitions for the Next.js App Router, in the spirit of [Barba.js](https://barba.js.org/).

The page on screen animates out **before** the router navigates, and the next page animates in once it is in the document. The back and forward buttons of the browser play the same transition as a link does.

- `leave` and `enter` hooks, for the whole page or for any component in it
- Works with the back and forward buttons, and with `router.back()`
- Scroll position of every history entry restored before the page enters
- `enter` runs before the first paint of the next page, so nothing flashes
- No animation library required, and any of them works

## Requirements

- Next.js 15.3 or later, with the **App Router**
- React 19 or later

Built and tested against Next.js 16.4 and React 19.3, in Chromium and WebKit. Earlier versions of Next.js, Firefox and Safari on a device have not been tried.

## Install

The package is not on npm yet. Until it is, pack it and install the tarball in the project that uses it:

```sh
# in this repository
bun run build
cd packages/next-transfx && bun pm pack

# in the Next.js project
bun add /path/to/next-transfx/packages/next-transfx/next-transfx-0.1.0.tgz
```

A tarball is better than a `file:` or linked folder here: a linked folder brings its own copy of React, and two copies of React break hooks and context.

## Setup

Handlers are functions, so the router goes in a client component of its own.

```tsx
// app/transitions.tsx
'use client'

import { TransitionRouter } from 'next-transfx'
import type { ReactNode } from 'react'

const fade = (opacity: [number, number]) =>
  document.querySelector('main')!.animate({ opacity }, { duration: 400, fill: 'forwards' }).finished

export function Transitions({ children }: { children: ReactNode }) {
  return (
    <TransitionRouter enter={() => fade([0, 1])} leave={() => fade([1, 0])}>
      {children}
    </TransitionRouter>
  )
}
```

```tsx
// app/layout.tsx
import type { ReactNode } from 'react'

import { Transitions } from './transitions'

export default function Layout({ children }: { children: ReactNode }) {
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

Then use `Link` from `next-transfx` in place of `next/link`. It takes the same props.

```tsx
import { Link } from 'next-transfx'

<Link href="/work">Work</Link>
```

That is all the back button needs as well: there is nothing to set up for it.

## Handlers

`leave` and `enter` are called with the same context, and whatever they return is awaited.

| Field       | Type                               | Description                                                             |
| ----------- | ---------------------------------- | ----------------------------------------------------------------------- |
| `from`      | `string`                           | Path and search of the page being left.                                 |
| `to`        | `string`                           | Path and search of the page being entered.                              |
| `trigger`   | `'push' \| 'replace' \| 'popstate'` | `popstate` is the back and forward buttons.                             |
| `direction` | `'forward' \| 'back'`               | Which way through the history. Always `forward` for a link.             |
| `signal`    | `AbortSignal`                      | Aborted when another navigation cuts the animation short.               |

A promise works, and so does anything else that can be awaited, such as a GSAP tween:

```tsx
<TransitionRouter
  enter={({ direction }) => gsap.fromTo('main', { xPercent: direction === 'forward' ? 100 : -100 }, { xPercent: 0 })}
  leave={({ direction }) => gsap.to('main', { xPercent: direction === 'forward' ? -100 : 100 })}
>
```

A handler that throws is reported to the console, and the navigation carries on.

## API

### `<TransitionRouter>`

| Prop                | Type      | Default | Description                                                                    |
| ------------------- | --------- | ------- | ------------------------------------------------------------------------------ |
| `leave`             | handler   |         | Runs on the page being left. The router is not told of the navigation until it resolves. |
| `enter`             | handler   |         | Runs once the next page is in the document, before it is painted.              |
| `scrollRestoration` | `boolean` | `true`  | Keeps the scroll position of every history entry. See [Scroll](#scroll).       |

Without a `TransitionRouter` above them, `Link` and the hooks below behave as plain Next.js does.

### `<Link>`

`next/link` with a transition. Clicks that Next.js would not navigate with itself, such as a new tab, a download or another origin, are left alone, and so is a link to the page already on screen.

### `usePageTransition({ leave, enter })`

Lets a component animate itself with the page. Every `leave` on screen is waited for, together with the one of the router, before the navigation. Every `enter` of the components that come in with the next page runs once it is in the document.

```tsx
'use client'

import { usePageTransition } from 'next-transfx'
import { useRef } from 'react'

const OPTIONS: KeyframeAnimationOptions = { duration: 600, fill: 'forwards' }

export function Title({ children }: { children: string }) {
  const text = useRef<HTMLSpanElement>(null)

  usePageTransition({
    enter: () => text.current!.animate({ translate: ['0 110%', '0 0'] }, OPTIONS).finished,
    leave: () => text.current!.animate({ translate: '0 -110%' }, OPTIONS).finished,
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

### `useTransitionRouter()`

`useRouter` from `next/navigation`, with a transition on `push` and `replace`. `back` and `forward` have one either way.

```tsx
const router = useTransitionRouter()

router.push('/work')
```

### `useTransitionState()`

The state of the transition, to disable a menu or show a loader while there is one.

```tsx
const state = useTransitionState()

// { phase: 'idle' }
// { phase: 'leaving' | 'loading' | 'entering', from, to, trigger, direction }
```

`loading` is the time between the end of `leave` and the next page being in the document.

## Back and forward

The browser changes the address the moment the back button is pressed, and tells the page afterwards. Next.js would then swap the page at once. `next-transfx` hears of it first and keeps it from the router, so the page on screen stays and plays `leave`. Next.js is then given the same event, restores the page as it always does, and `enter` runs.

During `leave`, the address bar already shows the page being gone to. That is the browser's doing and cannot be helped.

## Scroll

Left to itself, the browser scrolls to the position of the entry as soon as the back button is pressed, which is under the page that is still leaving. So `next-transfx` sets `history.scrollRestoration` to `manual`, keeps the position of every entry, and restores it between `leave` and `enter`, where it cannot be seen.

Positions are kept in `sessionStorage`, so they survive a reload. The scroll of the reload itself is left to the browser.

Pass `scrollRestoration={false}` to do it by other means, which is what a page that scrolls inside an element of its own needs. A link still scrolls to the top the way `next/link` does, and takes `scroll={false}` the same.

## Interruptions

The latest navigation always wins.

- **While the page leaves**, it takes the place of the one before it. The page leaves once.
- **While the next page loads**, it goes straight to the router, as it would without transitions.
- **While the next page enters**, `signal` is aborted and the page leaves again, from wherever it got to.

## Good to know

- Only `Link` from `next-transfx` and `useTransitionRouter` play a transition. A `next/link` navigates as usual, with none.
- The first page of a visit has no `enter`. It comes painted from the server, which is the job of a preloader.
- With a `loading.tsx`, `enter` runs as soon as the loading state is on screen, since that is when Next.js shows the route.
- With `cacheComponents`, Next.js hides the page that was left instead of removing it, and shows that very DOM again on the way back. Whatever `leave` did to an element has to be undone by its `enter`.
- `prefers-reduced-motion` is yours to honour, by returning early from the handlers.
- `basePath` is untested.

## How it holds up

`next-transfx` uses no private API of Next.js. It relies on two things the App Router does: it handles `popstate` on `window`, and it navigates inside a React transition. The browser tests in `examples/basic` cover both, along with scroll and every interruption above, and are worth running after upgrading Next.js:

```sh
bun run test:e2e
```
