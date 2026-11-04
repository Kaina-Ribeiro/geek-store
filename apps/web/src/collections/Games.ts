import fs from 'fs'
import path from 'path'
import type { CollectionBeforeChangeHook, CollectionConfig } from 'payload'

import { anyone, donoOnly, staffOnly } from '../access/roles'
import { PLATFORMS } from '../lib/catalog'
import { dominantGlow } from '../lib/painel/glow'

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// The glow behind the cover is computed from the cover itself when empty, so
// the owner never has to pick a colour. Never blocks saving the game.
const autoGlow: CollectionBeforeChangeHook = async ({ data, req }) => {
  if (data.glow || !data.cover) return data
  try {
    const id = typeof data.cover === 'object' ? data.cover.id : data.cover
    const media = await req.payload.findByID({ collection: 'media', id, depth: 0, req, overrideAccess: true })
    const file = media.sizes?.thumb?.filename || media.filename
    const dir = req.payload.collections.media.config.upload.staticDir
    const local = file && dir ? path.resolve(dir, file) : ''
    let input: Buffer | string | null = local && fs.existsSync(local) ? local : null
    if (!input) {
      const url = media.sizes?.thumb?.url || media.url || ''
      const base = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
      const res = await fetch(url.startsWith('http') ? url : `${base}${url}`)
      if (res.ok) input = Buffer.from(await res.arrayBuffer())
    }
    if (input) data.glow = await dominantGlow(input)
  } catch (err) {
    req.payload.logger.warn({ err }, '[games] não deu para calcular a cor da capa')
  }
  return data
}

// A game title on one platform. Each physical unit for sale is a Copy.
export const Games: CollectionConfig = {
  slug: 'games',
  labels: { singular: 'Jogo', plural: 'Jogos' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'platform', 'year'],
    group: 'Catálogo',
  },
  access: { read: anyone, create: staffOnly, update: staffOnly, delete: donoOnly },
  hooks: { beforeChange: [autoGlow] },
  fields: [
    { name: 'title', label: 'Título', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      unique: true,
      index: true,
      admin: { position: 'sidebar', description: 'Gerado a partir do título e da plataforma.' },
      hooks: {
        beforeValidate: [
          ({ value, data }) => value || (data?.title ? slugify(`${data.title} ${data.platform ?? ''}`) : value),
        ],
      },
    },
    {
      name: 'platform',
      label: 'Plataforma',
      type: 'select',
      required: true,
      options: PLATFORMS.map((p) => ({ label: p.label, value: p.value })),
    },
    { name: 'cover', label: 'Capa', type: 'upload', relationTo: 'media', required: true },
    {
      type: 'row',
      fields: [
        { name: 'year', label: 'Ano', type: 'number' },
        { name: 'ageRating', label: 'Classificação', type: 'text', admin: { placeholder: '16 anos' } },
        { name: 'genre', label: 'Gênero', type: 'text' },
      ],
    },
    { name: 'description', label: 'Descrição', type: 'textarea' },
    {
      name: 'glow',
      label: 'Cor de destaque',
      type: 'text',
      admin: { description: 'Hex usado no brilho atrás da capa, ex.: #8C6A2B. Vazio = calculado pela capa.' },
    },
    {
      name: 'copies',
      label: 'Cópias à venda',
      type: 'join',
      collection: 'copies',
      on: 'game',
    },
  ],
}
