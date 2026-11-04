'use client'

import type { ReactNode } from 'react'

import { ArrowRight, CheckIcon, UndoIcon } from './icons'

export type BarStatus = 'clean' | 'dirty' | 'published'

const COLOR: Record<BarStatus, string> = { clean: '#8E8E97', dirty: '#FFC61A', published: '#22B04B' }

// Sticky bar at the bottom of editing screens: status + undo + publish.
export function PublishBar({
  status,
  text,
  onReset,
  resetLabel = 'Voltar como estava',
  onPublish,
  publishLabel = 'Publicar no site',
  busy,
  extra,
}: {
  status: BarStatus
  text: string
  onReset: () => void
  resetLabel?: string
  onPublish: () => void
  publishLabel?: string
  busy: boolean
  extra?: ReactNode
}) {
  return (
    <div className="pn-bar">
      <span className="pn-stat" aria-live="polite">
        <i className="pn-sdot" style={{ background: COLOR[status] }} />
        {text}
      </span>
      <div className="pn-acts">
        {extra}
        <button type="button" className="pn-btn outline" onClick={onReset} disabled={busy}>
          {resetLabel === 'Voltar como estava' && <UndoIcon />}
          {resetLabel}
        </button>
        {status === 'published' ? (
          <button type="button" className="pn-btn green" onClick={onPublish} disabled={busy}>
            <CheckIcon />
            Publicado
          </button>
        ) : (
          <button type="button" className="pn-btn yellow" onClick={onPublish} disabled={busy}>
            {busy ? 'Publicando…' : publishLabel}
            {!busy && <ArrowRight />}
          </button>
        )}
      </div>
    </div>
  )
}
