'use client'

import Image from 'next/image'
import { useState } from 'react'

import type { Img } from '../../lib/data'

type View = { key: string; label: string; img?: Img; kind: 'cover' | 'disc' | 'photo' }

export function Gallery({
  title,
  cover,
  photos,
  glow,
  caption,
}: {
  title: string
  cover: Img
  photos: Img[]
  glow: string
  caption: string
}) {
  const views: View[] = [
    { key: 'capa', label: 'Capa', img: cover, kind: 'cover' },
    { key: 'disco', label: 'Disco', kind: 'disc' },
    ...photos.map((p, i) => ({ key: `foto-${i}`, label: `Foto ${i + 1}`, img: p, kind: 'photo' as const })),
  ]
  const [cur, setCur] = useState(0)
  const v = views[cur]

  return (
    <div className="gallery">
      <div className="thumbs" role="tablist" aria-label="Imagens do produto">
        {views.map((t, i) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={i === cur}
            className="thumb"
            onClick={() => setCur(i)}
          >
            {t.kind === 'disc' ? <span className="thumb-disc" /> : <Image src={t.img!.url} alt="" width={84} height={112} />}
            <b className="px">{t.label}</b>
          </button>
        ))}
        {photos.length === 0 && (
          <span className="thumb is-empty">
            <b className="px">Fotos reais</b>
          </span>
        )}
      </div>
      <div className="stage" style={{ ['--glow' as string]: glow }}>
        <div className="stage-bg" aria-hidden="true" style={{ backgroundImage: `url(${cover.url})` }} />
        <span className="stage-chip">{v.label}</span>
        <div className="stage-view" key={v.key}>
          {v.kind === 'disc' ? (
            <div className="stage-disc" role="img" aria-label={`Disco de ${title}`} />
          ) : (
            <Image
              src={v.img!.url}
              alt={v.kind === 'cover' ? `Capa de ${title}` : `${title}, ${v.label}`}
              width={v.img!.width}
              height={v.img!.height}
              priority
              sizes="(max-width: 900px) 80vw, 420px"
            />
          )}
        </div>
        <span className="stage-caption">
          <i />
          {caption}
        </span>
      </div>
    </div>
  )
}
