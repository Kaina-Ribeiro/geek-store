import type { CollectionConfig } from 'payload'

import { anyone, donoOnly, staffOnly } from '../access/roles'

export const Media: CollectionConfig = {
  slug: 'media',
  labels: { singular: 'Imagem', plural: 'Imagens' },
  admin: { group: 'Catálogo' },
  access: { read: anyone, create: staffOnly, update: staffOnly, delete: donoOnly },
  fields: [{ name: 'alt', label: 'Texto alternativo', type: 'text', required: true }],
  upload: {
    mimeTypes: ['image/*'],
    imageSizes: [
      { name: 'thumb', width: 240 },
      { name: 'card', width: 600 },
      { name: 'large', width: 1200 },
    ],
    formatOptions: { format: 'webp', options: { quality: 82 } },
  },
}
