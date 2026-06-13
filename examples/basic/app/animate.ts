const OPTIONS: KeyframeAnimationOptions = {
  duration: 600,
  easing: 'cubic-bezier(0.7, 0, 0.2, 1)',
  fill: 'forwards',
}

// Leaves the element as the animation left it, whether it got to the end or was
// cut short, so that the next one carries on from there.
export async function animate(element: HTMLElement | null, keyframes: PropertyIndexedKeyframes, signal: AbortSignal) {
  if (!element || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return
  }

  const animation = element.animate(keyframes, OPTIONS)

  const settle = () => {
    animation.commitStyles()
    animation.cancel()
  }

  signal.addEventListener('abort', settle, { once: true })

  await animation.finished.then(settle, () => {})

  signal.removeEventListener('abort', settle)
}
