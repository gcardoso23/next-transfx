'use client'

import NextLink from 'next/link'
import { type ComponentProps, useContext } from 'react'

import { TransfxContext } from './context.js'

export type LinkProps = ComponentProps<typeof NextLink>

function formatHref(href: LinkProps['href']) {
  if (typeof href === 'string') {
    return href
  }

  // Another origin is another document, which the link opens by itself.
  if (href.protocol || href.host || href.hostname) {
    return null
  }

  const { hash, pathname, query } = href

  const search =
    href.search ??
    (typeof query === 'string'
      ? query
      : new URLSearchParams(
          Object.entries(query ?? {}).flatMap(([key, value]) => [value].flat().map((item) => [key, `${item ?? ''}`])),
        ).toString())

  return `${pathname ?? ''}${search ? search.replace(/^\??/, '?') : ''}${hash ? hash.replace(/^#?/, '#') : ''}`
}

/**
 * `next/link`, with a transition between the page it is on and the one it leads to.
 */
export function Link({ href, onNavigate, replace, scroll, transitionTypes, ...props }: LinkProps) {
  const transfx = useContext(TransfxContext)

  return (
    <NextLink
      {...props}
      href={href}
      // Called only for the clicks that Next.js would navigate with itself, which
      // leaves out new tabs, downloads and other origins.
      onNavigate={(event) => {
        let isPrevented = false

        onNavigate?.({
          preventDefault() {
            isPrevented = true

            event.preventDefault()
          },
        })

        if (isPrevented) {
          return
        }

        const to = formatHref(href)

        if (to !== null && transfx?.navigate(to, replace ? 'replace' : 'push', { scroll, transitionTypes })) {
          event.preventDefault()
        }
      }}
      replace={replace}
      scroll={scroll}
      transitionTypes={transitionTypes}
    />
  )
}
