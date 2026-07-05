# next-transfx

Page transitions for the Next.js App Router: the page animates out before the router navigates, the next one animates in, and the back and forward buttons of the browser do the same.

- [`packages/next-transfx`](packages/next-transfx) is the library. Its [README](packages/next-transfx/README.md) has the setup and the API.
- [`examples/basic`](examples/basic) is a Next.js app that uses all of it, and holds the browser tests.

## Development

Requires [Bun](https://bun.sh) 1.3.14 or later.

```sh
bun install

bun run dev          # the library in watch mode, and the example on http://localhost:3000
bun run build        # the library, to packages/next-transfx/dist
bun run test         # unit tests of the transition state machine
bun run test:e2e     # browser tests of the example, in Chromium and WebKit
bun run check-types
bun run lint
```

The browser tests need the browsers of Playwright once: `bunx playwright install chromium webkit`, from `examples/basic`.
