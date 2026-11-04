'use client'

import { useEffect, useRef, type ReactNode } from 'react'

// Small shared pieces of the panel: confirm dialog, toast, letter counter.

export function Confirm({
  open,
  title,
  text,
  children,
  onClose,
}: {
  open: boolean
  title: string
  text?: string
  children: ReactNode
  onClose: () => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog ref={ref} className="pn-dialog" onClose={onClose} onCancel={onClose}>
      <div className="pn-dialog-in">
        <h2>{title}</h2>
        {text && <p>{text}</p>}
        <div className="pn-dialog-acts">{children}</div>
      </div>
    </dialog>
  )
}

export function Toast({ msg, tone, onDone }: { msg: string | null; tone?: 'red'; onDone: () => void }) {
  useEffect(() => {
    if (!msg) return
    const t = setTimeout(onDone, 6000)
    return () => clearTimeout(t)
  }, [msg, onDone])
  if (!msg) return null
  return (
    <div className={`pn-toast${tone === 'red' ? ' red' : ''}`} role={tone === 'red' ? 'alert' : 'status'}>
      {msg}
    </div>
  )
}

export function Counter({ value, max }: { value: string; max: number }) {
  const n = value.length
  const cls = n > max ? ' over' : n >= max * 0.85 ? ' near' : ''
  return (
    <span className={`pn-count${cls}`} aria-live="polite">
      {n}/{max}
    </span>
  )
}

export function FieldError({ msg, id }: { msg?: string; id?: string }) {
  return msg ? (
    <p className="pn-err" id={id} role="alert">
      {msg}
    </p>
  ) : null
}
