import type { CollectionConfig } from 'payload'

import { donoField, donoOnly, isDono, staffOnly } from '../access/roles'

// Painel administrativo: dono e equipe. Clientes da loja ficam em "customers".
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Pessoa da equipe', plural: 'Equipe' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['name', 'email', 'role'],
    group: 'Configurações',
  },
  auth: {
    tokenExpiration: 60 * 60 * 8,
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
  },
  access: {
    read: staffOnly,
    // The very first user (no one logged in yet) is created by Payload's
    // first-user screen; after that only the owner manages the team.
    create: donoOnly,
    update: ({ req, id }) => isDono(req.user) || req.user?.id === id,
    delete: donoOnly,
    admin: ({ req }) => Boolean(req.user && req.user.collection === 'users'),
  },
  fields: [
    { name: 'name', label: 'Nome', type: 'text', required: true },
    {
      name: 'role',
      label: 'Papel',
      type: 'select',
      required: true,
      defaultValue: 'dono',
      options: [
        { label: 'Dono (acesso total)', value: 'dono' },
        { label: 'Equipe (catálogo e pedidos)', value: 'equipe' },
      ],
      access: { update: donoField },
      admin: { description: 'A equipe não vê financeiro nem configurações.' },
    },
  ],
}
