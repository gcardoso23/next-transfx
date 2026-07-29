'use client'

import { useTransitionState } from 'next-transfx'
import { useSyncExternalStore } from 'react'

import { getRecords, subscribe } from '../log'

export function Status() {
  const state = useTransitionState()
  const records = useSyncExternalStore(subscribe, getRecords, getRecords)

  return (
    <aside className="status" data-phase={state.phase}>
      <p className="status__phase">{state.phase}</p>

      <ol className="status__log">
        {records.slice(-6).map((entry) => (
          <li
            data-direction={entry.direction}
            data-from={entry.from}
            data-hook={entry.hook}
            data-title={entry.title}
            data-to={entry.to}
            data-trigger={entry.trigger}
            data-url={entry.url}
            key={entry.id}
          >
            {entry.hook} · {entry.trigger} {entry.direction} · {entry.from} → {entry.to}
          </li>
        ))}
      </ol>
    </aside>
  )
}
