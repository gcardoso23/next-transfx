'use client'

import { TransitionRouter } from 'next-transfx'
import type { ReactNode } from 'react'

import { animate } from './animate'
import { record } from './log'

const getPage = () => document.querySelector<HTMLElement>('.page')

// The page goes the way the visitor does: up and out going forward, and back
// down the way it came with the back button.
export function Transitions({ children }: { children: ReactNode }) {
  return (
    <TransitionRouter
      enter={async (context) => {
        const offset = context.direction === 'forward' ? 4 : -4

        record('enter', context)

        await animate(getPage(), { opacity: [0, 1], transform: [`translateY(${offset}rem)`, 'none'] }, context.signal)
      }}
      leave={async (context) => {
        const offset = context.direction === 'forward' ? -4 : 4

        record('leave', context)

        await animate(getPage(), { opacity: 0, transform: `translateY(${offset}rem)` }, context.signal)
      }}
    >
      {children}
    </TransitionRouter>
  )
}
