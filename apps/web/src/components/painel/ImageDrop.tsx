'use client'

import Image from 'next/image'
import { useRef, useState } from 'react'

import type { Img } from '../../lib/data'
import type { SaveImageResult } from '../../lib/painel/media'
import { UploadIcon } from './icons'

const MAX = 8 * 1024 * 1024

// Drag a photo here, or tap to pick one (camera on phones). Sends it right
// away and hands back the saved image.
export function ImageDrop({
  image,
  alt,
  label = 'Arraste a imagem aqui',
  sub = 'ou toque para escolher (no celular, pode tirar uma foto)',
  onSaved,
  onRemove,
  compact = false,
}: {
  image: Img | null
  alt: string
  label?: string
  sub?: string
  onSaved: (id: number, image: Img) => void
  onRemove?: () => void
  compact?: boolean
}) {
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [over, setOver] = useState(false)

  const send = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    if (file.size > MAX) return setError('Foto grande demais (máx. 8 MB)')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) return setError('Use uma foto JPG, PNG ou WebP')
    setBusy(true)
    try {
      const form = new FormData()
      form.set('file', file)
      form.set('alt', alt)
      const res = await fetch('/painel/foto', { method: 'POST', body: form })
      const r = (await res.json()) as SaveImageResult
      if (r.ok) onSaved(r.id, r.image)
      else setError(r.error)
    } catch {
      setError('Não deu para enviar a foto. Confira a internet e tente de novo.')
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className={`pn-imgdrop${compact ? ' compact' : ''}`}>
      {image && (
        <div className="pn-imgdrop-thumb">
          <Image src={image.url} alt="" width={image.width} height={image.height} sizes="120px" />
          {onRemove && (
            <button type="button" className="pn-link" onClick={onRemove}>
              Tirar a foto
            </button>
          )}
        </div>
      )}
      <button
        type="button"
        className={`pn-drop${over ? ' over' : ''}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setOver(false)
          void send(e.dataTransfer.files?.[0])
        }}
        disabled={busy}
        aria-describedby={error ? 'pn-imgdrop-err' : undefined}
      >
        <UploadIcon size={compact ? 22 : 26} />
        <b>{busy ? 'Enviando…' : image ? 'Trocar foto' : label}</b>
        <span>{sub}</span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        hidden
        onChange={(e) => void send(e.target.files?.[0])}
      />
      {error && (
        <p className="pn-err" id="pn-imgdrop-err" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
