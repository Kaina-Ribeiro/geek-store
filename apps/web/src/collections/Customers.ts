import type { CollectionConfig } from 'payload'

import { donoOnly, isStaff, staffOnly } from '../access/roles'

// Store accounts (optional for buyers). Login is passwordless: the customer
// gets a one-time link by e-mail (see lib/auth.ts); the session it opens is a
// standard Payload session (same JWT and cookie as the admin login).
export const Customers: CollectionConfig = {
  slug: 'customers',
  labels: { singular: 'Cliente', plural: 'Clientes' },
  admin: { useAsTitle: 'email', defaultColumns: ['name', 'email', 'xp', 'createdAt'], group: 'Vendas' },
  auth: {
    tokenExpiration: 60 * 60 * 24 * 30,
    maxLoginAttempts: 10,
    lockTime: 15 * 60 * 1000,
  },
  hooks: {
    // Customers never log in with a password (it is random and unknown); this
    // closes the REST/GraphQL password login for them entirely.
    beforeLogin: [
      () => {
        throw new Error('Entre pelo link enviado ao seu e-mail.')
      },
    ],
  },
  access: {
    read: ({ req }) => (isStaff(req.user) ? true : req.user ? { id: { equals: req.user.id } } : false),
    // Accounts are created by the server when someone asks for a login link.
    create: staffOnly,
    update: ({ req }) => (isStaff(req.user) ? true : req.user ? { id: { equals: req.user.id } } : false),
    delete: donoOnly,
    admin: () => false,
  },
  fields: [
    { name: 'name', label: 'Nome', type: 'text' },
    { name: 'phone', label: 'WhatsApp', type: 'text' },
    {
      name: 'xp',
      label: 'XP',
      type: 'number',
      defaultValue: 0,
      access: { update: ({ req }) => isStaff(req.user) },
    },
    { name: 'saves', label: 'Save slots', type: 'relationship', relationTo: 'games', hasMany: true },
    {
      name: 'address',
      label: 'Último endereço',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'cep', type: 'text' },
            { name: 'street', type: 'text' },
            { name: 'number', type: 'text' },
            { name: 'complement', type: 'text' },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'district', type: 'text' },
            { name: 'city', type: 'text' },
            { name: 'uf', type: 'text' },
          ],
        },
      ],
    },
    {
      name: 'loginLink',
      type: 'group',
      admin: { hidden: true },
      access: { read: () => false, update: () => false },
      fields: [
        { name: 'hash', type: 'text' },
        { name: 'expiresAt', type: 'date' },
        { name: 'sentAt', type: 'date' },
      ],
    },
  ],
}
