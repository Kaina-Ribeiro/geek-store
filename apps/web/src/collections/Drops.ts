import type { CollectionConfig } from 'payload'

import { anyone, donoOnly, staffOnly } from '../access/roles'

// "Drop de sexta": a curated batch that opens at a fixed time.
export const Drops: CollectionConfig = {
  slug: 'drops',
  labels: { singular: 'Drop', plural: 'Drops de sexta' },
  admin: { useAsTitle: 'title', defaultColumns: ['title', 'opensAt', 'slots'], group: 'Vendas' },
  access: { read: anyone, create: staffOnly, update: staffOnly, delete: donoOnly },
  defaultSort: '-opensAt',
  fields: [
    { name: 'title', label: 'Título', type: 'text', required: true, admin: { placeholder: 'Lote retrô japonês' } },
    { name: 'blurb', label: 'Texto curto', type: 'textarea' },
    {
      type: 'row',
      fields: [
        {
          name: 'opensAt',
          label: 'Abre em',
          type: 'date',
          required: true,
          admin: { date: { pickerAppearance: 'dayAndTime' } },
        },
        { name: 'slots', label: 'Vagas', type: 'number', defaultValue: 9 },
        { name: 'reserved', label: 'Já reservados', type: 'number', defaultValue: 0 },
        { name: 'earlyLevel', label: 'Acesso antecipado a partir do nível', type: 'number', defaultValue: 4 },
      ],
    },
    {
      name: 'teasers',
      label: 'Blocos surpresa',
      type: 'array',
      maxRows: 9,
      fields: [
        { name: 'name', label: 'Nome', type: 'text', required: true },
        { name: 'detail', label: 'Detalhe', type: 'text' },
      ],
    },
    { name: 'items', label: 'Cópias do drop', type: 'relationship', relationTo: 'copies', hasMany: true },
  ],
}
