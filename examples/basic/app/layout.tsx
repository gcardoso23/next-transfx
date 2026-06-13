import './globals.css'

import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import { Navigation } from './components/Navigation'
import { Status } from './components/Status'
import { Transitions } from './transitions'

export const metadata: Metadata = {
  description: 'Page transitions for the Next.js App Router.',
  title: 'next-transfx',
}

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Transitions>
          <Navigation />

          <main className="page">{children}</main>

          <Status />
        </Transitions>
      </body>
    </html>
  )
}
