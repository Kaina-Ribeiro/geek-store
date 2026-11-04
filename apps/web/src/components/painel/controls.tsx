'use client'

import { MinusIcon, PlusIcon } from './icons'

// On/off switch (big, thumb-friendly).
export function Switch({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" className="pn-sw" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}>
      <i className="pn-knob" />
    </button>
  )
}

// − 2 + quantity control.
export function Stepper({ value, onChange, min = 1, max = 99, label }: { value: number; onChange: (v: number) => void; min?: number; max?: number; label: string }) {
  return (
    <div className="pn-stp" role="group" aria-label={label}>
      <button type="button" className="pn-stpb" onClick={() => onChange(Math.max(min, value - 1))} disabled={value <= min} aria-label="Menos uma">
        <MinusIcon />
      </button>
      <b className="mono" aria-live="polite">
        {value}
      </b>
      <button type="button" className="pn-stpb" onClick={() => onChange(Math.min(max, value + 1))} disabled={value >= max} aria-label="Mais uma">
        <PlusIcon />
      </button>
    </div>
  )
}
