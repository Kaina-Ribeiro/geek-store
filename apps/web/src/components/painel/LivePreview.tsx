'use client'

import Image from 'next/image'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { DesktopIcon, PhoneIcon } from './icons'

export type Device = 'desk' | 'cel'
const FRAME = { desk: 1100, cel: 390 } as const

// Dark box with the site drawn at real size (1100 px "Computador" or 390 px
// "Celular") and shrunk with CSS zoom to the room available. The site inside
// does not react to clicks (inert).
export function LivePreview({
  device,
  onDevice,
  title = 'Prévia ao vivo',
  note = 'Só você vê até publicar',
  badge,
  children,
}: {
  device: Device
  onDevice: (d: Device) => void
  title?: string
  note?: string
  badge?: string | null
  children: ReactNode
}) {
  const box = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(700)
  useEffect(() => {
    const el = box.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setW(Math.round(e.contentRect.width)))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const frame = FRAME[device]
  const zoom = Math.min(1, w / frame)

  return (
    <div className="pn-pv">
      <div className="pn-pv-head">
        <span className="pn-pv-title">
          <i className="pn-sdot" style={{ background: '#22B04B' }} />
          {title}
        </span>
        <span className="pn-pv-note">{note}</span>
        <div className="pn-seg" role="group" aria-label="Tamanho da prévia">
          <button type="button" className="pn-segb" aria-pressed={device === 'desk'} onClick={() => onDevice('desk')}>
            <DesktopIcon />
            Computador
          </button>
          <button type="button" className="pn-segb" aria-pressed={device === 'cel'} onClick={() => onDevice('cel')}>
            <PhoneIcon />
            Celular
          </button>
        </div>
      </div>
      <div ref={box} className="pn-pv-box">
        <div className="pn-pv-site theme-dark" style={{ width: frame, zoom }} aria-label="Prévia do topo do site" inert>
          <div className="pn-pv-hdr">
            <Image src="/brand/logo.png" alt="" width={30} height={30} />
            <b className="dsp">Checkpoint Geek</b>
            {device === 'desk' && (
              <span>
                <span>Loja</span>
                <span>Plataformas</span>
                <span>Drop de sexta</span>
                <span>Troca</span>
              </span>
            )}
          </div>
          {badge && <span className="px pn-pv-badge">{badge}</span>}
          {children}
        </div>
      </div>
    </div>
  )
}
