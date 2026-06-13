'use client'

import { usePageTransition } from 'next-transfx'
import { useRef } from 'react'

import { animate } from '../animate'

// A component of the page with a transition of its own, beside the one of the
// page as a whole.
export function Title({ children }: { children: string }) {
  const text = useRef<HTMLSpanElement>(null)

  usePageTransition({
    enter: ({ signal }) => animate(text.current, { transform: ['translateY(110%)', 'none'] }, signal),
    leave: ({ signal }) => animate(text.current, { transform: 'translateY(-110%)' }, signal),
  })

  return (
    <h1 className="title">
      <span ref={text}>{children}</span>
    </h1>
  )
}
