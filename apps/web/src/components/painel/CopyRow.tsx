'use client'

import Image from 'next/image'

import { CONDITIONS } from '../../lib/catalog'
import type { Img } from '../../lib/data'
import { LAUDO_DEFAULTS, type CopyDraft, type Laudo } from '../../lib/painel/game-form'
import { Stepper, Switch } from './controls'
import { TrashIcon, UndoIcon } from './icons'
import { ImageDrop } from './ImageDrop'
import { FieldError } from './ui'

const CHECKS: [keyof Pick<Laudo, 'boot' | 'capa' | 'manual' | 'higienizado'>, string][] = [
  ['boot', 'Roda do boot ao save'],
  ['capa', 'Capa original'],
  ['manual', 'Manual e encarte'],
  ['higienizado', 'Higienizado'],
]

// One copy line: state, price and quantity (sealed) or laudo (used).
export function CopyRow({
  n,
  copy,
  images,
  error,
  onChange,
  onRemove,
  onImage,
  gameTitle,
}: {
  n: number
  copy: CopyDraft
  images: Record<number, Img>
  error?: string
  onChange: (c: CopyDraft) => void
  onRemove: () => void
  onImage: (id: number, image: Img) => void
  gameTitle: string
}) {
  const label = `Cópia ${n}`
  const used = copy.condition !== 'lacrado'
  const laudo = copy.laudo ?? { ...LAUDO_DEFAULTS, photos: [] }
  const setLaudo = (p: Partial<Laudo>) => onChange({ ...copy, laudo: { ...laudo, ...p } })
  const off = !copy.active
  const locked = Boolean(copy.sold)

  return (
    <div className={`pn-cp${off ? ' off' : ''}${locked ? ' sold' : ''}`}>
      <div className="pn-cp-head">
        <b>{label}</b>
        {locked && <span className="pn-tagb">Vendida</span>}
        {off && !locked && <span className="pn-tagb grey">Fora da loja</span>}
        {copy.id == null ? (
          <button type="button" className="pn-ib danger" onClick={onRemove} aria-label={`Apagar ${label}`}>
            <TrashIcon />
          </button>
        ) : off ? (
          <button type="button" className="pn-chip sm" onClick={() => onChange({ ...copy, active: true })}>
            <UndoIcon />
            Voltar para a loja
          </button>
        ) : (
          <button type="button" className="pn-chip sm" onClick={() => onChange({ ...copy, active: false })}>
            Tirar da loja
          </button>
        )}
      </div>

      <fieldset className="pn-cp-body" disabled={locked || off}>
        <div role="group" aria-label={`Estado da ${label}`} className="pn-chips">
          {CONDITIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              className="pn-chip sm"
              aria-pressed={copy.condition === c.value}
              onClick={() =>
                onChange({
                  ...copy,
                  condition: c.value,
                  laudo: c.value === 'lacrado' ? undefined : (copy.laudo ?? { ...LAUDO_DEFAULTS, photos: [] }),
                  stock: c.value === 'lacrado' ? Math.max(1, copy.stock) : 1,
                })
              }
            >
              <i className="pn-dot" style={{ background: c.color }} />
              {c.label}
            </button>
          ))}
        </div>

        <div className="pn-cp-row">
          <div className="pn-fld pn-grow">
            <label className="pn-lbl" htmlFor={`pn-price-${n}`}>
              Preço
            </label>
            <div className="pn-money">
              <span className="mono">R$</span>
              <input
                id={`pn-price-${n}`}
                className="pn-inp mono"
                inputMode="decimal"
                placeholder="0,00"
                value={copy.price}
                aria-invalid={Boolean(error)}
                onChange={(e) => onChange({ ...copy, price: e.target.value })}
              />
            </div>
            <FieldError msg={error} />
          </div>
          {!used && (
            <div className="pn-fld">
              <span className="pn-lbl">Quantidade</span>
              <Stepper value={copy.stock} onChange={(v) => onChange({ ...copy, stock: v })} label={`Quantidade da ${label}`} />
            </div>
          )}
        </div>

        {used && (
          <div className="pn-laudo">
            <span className="pn-lbl">Laudo desta cópia</span>
            <p className="pn-hint">Usado é uma cópia por linha: cada uma tem o seu laudo e as suas fotos.</p>
            <div className="pn-checks">
              {CHECKS.map(([k, t]) => (
                <label key={k} className="pn-check">
                  <span>{t}</span>
                  <Switch on={laudo[k]} onChange={(v) => setLaudo({ [k]: v })} label={t} />
                </label>
              ))}
            </div>
            <div className="pn-fld">
              <span className="pn-lbl">Fotos reais (opcional)</span>
              {laudo.photos.length > 0 && (
                <div className="pn-photos">
                  {laudo.photos.map((id) =>
                    images[id] ? (
                      <span key={id} className="pn-photo">
                        <Image src={images[id].url} alt="" width={72} height={72} sizes="72px" />
                        <button
                          type="button"
                          className="pn-ib danger"
                          onClick={() => setLaudo({ photos: laudo.photos.filter((x) => x !== id) })}
                          aria-label="Tirar esta foto"
                        >
                          <TrashIcon size={16} />
                        </button>
                      </span>
                    ) : null,
                  )}
                </div>
              )}
              <ImageDrop
                compact
                image={null}
                alt={`Foto real de ${gameTitle || 'jogo'}`}
                label="Adicionar foto"
                sub="Disco, caixa e manual de verdade"
                onSaved={(id, image) => {
                  onImage(id, image)
                  setLaudo({ photos: [...laudo.photos, id] })
                }}
              />
            </div>
            <details className="pn-more">
              <summary>Detalhes (opcional)</summary>
              <div className="pn-cp-row">
                <div className="pn-fld pn-grow">
                  <label className="pn-lbl" htmlFor={`pn-surf-${n}`}>
                    Superfície do disco
                  </label>
                  <input
                    id={`pn-surf-${n}`}
                    className="pn-inp"
                    placeholder="2 riscos leves"
                    value={laudo.surface}
                    onChange={(e) => setLaudo({ surface: e.target.value })}
                  />
                </div>
                <div className="pn-fld pn-grow">
                  <label className="pn-lbl" htmlFor={`pn-test-${n}`}>
                    Testado em
                  </label>
                  <input
                    id={`pn-test-${n}`}
                    className="pn-inp"
                    placeholder="PS2 Slim"
                    value={laudo.testedOn}
                    onChange={(e) => setLaudo({ testedOn: e.target.value })}
                  />
                </div>
              </div>
            </details>
          </div>
        )}
      </fieldset>
    </div>
  )
}
