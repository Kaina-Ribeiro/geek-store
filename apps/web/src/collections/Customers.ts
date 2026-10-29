import type { CollectionConfig } from 'payload'

import { donoOnly, isStaff } from '../access/roles'

// Store accounts (optional for buyers). Login, XP and save slots are wired in
// phase 4; the collection exists now so orders can point to it later.
export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: { singular: 'Cliente', plural: 'Clientes' },
  admin: { useAsTitle: 'email', defaultColumns: ['name', 'email', 'xp'], group: 'Vendas' },
  auth: { tokenExpiration: 60 * 60 * 24 * 30 },
  access: {
    read: ({ req }) => (isStaff(req.user) ? true : req.user ? { id: { equals: req.user.id } } : false),
    create: () => true,
    update: ({ req }) => (isStaff(req.user) ? true : req.user ? { id: { equals: req.user.id } } : false),
    delete: donoOnly,
    admin: () => false,
  },
  fields: [
    { name: 'name', label: 'Nome', type: 'text' },
    {
      name: 'xp',
      label: 'XP',
      type: 'number',
      defaultValue: 0,
      access: { update: ({ req }) => isStaff(req.user) },
    },
    { name: 'saves', label: 'Save slots', type: 'relationship', relationTo: 'games', hasMany: true },
  ],
}
