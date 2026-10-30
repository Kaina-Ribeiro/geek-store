'use client'

import { useEffect, useRef } from 'react'

// Sliding white pill for a `.seg` control: it glides from the old option to the
// new one instead of the highlight jumping. Drop it as the first child of the
// `.seg`. It follows aria-pressed / aria-current, and moves on tap right away
// so links that wait for the server still feel instant. Until it mounts, the
// active option keeps its own background (no flash before hydration).

const ACTIVE = '[aria-pressed="true"], [aria-current="true"], [aria-current="page"]'

export function SegPill() {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const pill = ref.current
    const seg = pill?.parentElement
    if (!pill || !seg) return

    let first = true
    const place = (el: Element | null) => {
      if (!(el instanceof HTMLElement)) return
      pill.style.transform = `translateX(${el.offsetLeft}px)`
      pill.style.width = `${el.offsetWidth}px`
      pill.style.height = `${el.offsetHeight}px`
      pill.style.top = `${el.offsetTop}px`
      const behavior = first ? 'instant' : 'smooth'
      if (first) {
        // Land on the initial option without sliding in from the left.
        pill.style.transition = 'none'
        void pill.offsetWidth
        pill.style.transition = ''
        first = false
      }
      // Keep the chosen option visible when the control scrolls sideways.
      const left = el.offsetLeft - 12
      const right = el.offsetLeft + el.offsetWidth + 12 - seg.clientWidth
      if (left < seg.scrollLeft) seg.scrollTo({ left, behavior })
      else if (right > seg.scrollLeft) seg.scrollTo({ left: right, behavior })
    }
    const sync = () => place(seg.querySelector(ACTIVE))

    seg.classList.add('has-pill')
    sync()

    const onTap = (e: Event) => {
      const el = (e.target as Element).closest('a, button')
      if (el && seg.contains(el)) place(el)
    }
    seg.addEventListener('click', onTap)
    const mo = new MutationObserver(sync)
    mo.observe(seg, { subtree: true, attributes: true, attributeFilter: ['aria-pressed', 'aria-current'] })
    const ro = new ResizeObserver(sync)
    ro.observe(seg)

    return () => {
      seg.classList.remove('has-pill')
      seg.removeEventListener('click', onTap)
      mo.disconnect()
      ro.disconnect()
    }
  }, [])

  return <i ref={ref} className="seg-pill" aria-hidden="true" />
}
