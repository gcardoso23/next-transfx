'use client'

import { useTransitionRouter } from 'next-transfx'

export function Back() {
  const router = useTransitionRouter()

  return (
    <button className="link" onClick={() => router.back()} type="button">
      ← Back
    </button>
  )
}
