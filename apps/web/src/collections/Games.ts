import type { CollectionConfig } from 'payload'

import { anyone, donoOnly, staffOnly } from '../access/roles'
import { PLATFORMS } from '../lib/catalog'

const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

// A game title on one platform. Each physical unit for sale is a Copy.
export const Games: CollectionConfig = {
  slug: 'games',
  labels: { singular: 'Jogo', plural: 'Jogos' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'platform', 'year', 'featured'],
    group: 'Catálogo',
  },
  access: { read: anyone, create: staffOnly, update: staffOnly, delete: donoOnly },
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
      admin: { description: 'Hex usado no brilho atrás da capa, ex.: #8C6A2B' },
    },
    {
      name: 'featured',
      label: 'Destaque da semana (hero)',
      type: 'checkbox',
      defaultValue: false,
      admin: { position: 'sidebar' },
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
