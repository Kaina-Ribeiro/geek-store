import type { CollectionConfig } from 'payload'

import { anyone, donoOnly, isStaff, staffOnly } from '../access/roles'
import { CONDITIONS, conditionOf } from '../lib/catalog'

// One sellable unit (or a batch of identical sealed units) of a game.
// Used games are unique: stock 1, their own price and their own laudo photos.
export const Copies: CollectionConfig = {
  slug: 'copies',
  labels: { singular: 'Cópia', plural: 'Cópias (estoque)' },
  admin: {
    useAsTitle: 'label',
    defaultColumns: ['label', 'condition', 'price', 'stock', 'active'],
    group: 'Catálogo',
  },
  access: {
    // Shoppers only see active copies; the team sees everything.
    read: ({ req }) => (isStaff(req.user) ? true : { active: { equals: true } }),
    create: staffOnly,
    update: staffOnly,
    delete: donoOnly,
  },
  defaultSort: '-createdAt',
  fields: [
    { name: 'game', label: 'Jogo', type: 'relationship', relationTo: 'games', required: true, index: true },
    {
      name: 'label',
      type: 'text',
      admin: { hidden: true },
      hooks: {
        beforeChange: [
          async ({ data, req }) => {
            if (!data?.game) return data?.label
            const id = typeof data.game === 'object' ? data.game.id : data.game
            const game = await req.payload.findByID({ collection: 'games', id, depth: 0, req })
            return `${game.title} · ${conditionOf(data.condition).label}`
          },
        ],
      },
    },
    {
      type: 'row',
      fields: [
        {
          name: 'condition',
          label: 'Estado',
          type: 'select',
          required: true,
          options: CONDITIONS.map((c) => ({ label: c.label, value: c.value })),
        },
        { name: 'price', label: 'Preço cheio (R$)', type: 'number', required: true, min: 0 },
        { name: 'stock', label: 'Estoque', type: 'number', required: true, defaultValue: 1, min: 0 },
      ],
    },
    {
      name: 'laudo',
      label: 'Laudo Checkpoint',
      type: 'group',
      admin: { condition: (data) => data?.condition !== 'lacrado' },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'boot', label: 'Roda do boot ao save', type: 'checkbox', defaultValue: true },
            { name: 'capa', label: 'Capa original', type: 'checkbox', defaultValue: true },
            { name: 'manual', label: 'Manual e encarte', type: 'checkbox', defaultValue: false },
            { name: 'higienizado', label: 'Higienizado', type: 'checkbox', defaultValue: true },
          ],
        },
        { name: 'surface', label: 'Superfície do disco', type: 'text', admin: { placeholder: '2 riscos leves' } },
        { name: 'testedOn', label: 'Testado em', type: 'text', admin: { placeholder: 'PS2 Slim' } },
        { name: 'photos', label: 'Fotos reais', type: 'upload', relationTo: 'media', hasMany: true },
      ],
    },
    {
      name: 'active',
      label: 'Visível na loja',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
}
