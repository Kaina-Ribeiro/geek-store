import type { CollectionConfig } from 'payload'

import { donoOnly, staffOnly } from '../access/roles'

// Newsletter and "me avise quando abrir" (drop alerts). Created only by the
// server action, with the consent date kept for LGPD.
export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  labels: { singular: 'Inscrito', plural: 'Newsletter e avisos' },
  admin: { useAsTitle: 'email', defaultColumns: ['email', 'newsletter', 'dropAlerts', 'createdAt'], group: 'Vendas' },
  access: { read: staffOnly, create: () => false, update: staffOnly, delete: donoOnly },
  fields: [
    { name: 'email', label: 'E-mail', type: 'email', required: true, unique: true },
    {
      type: 'row',
      fields: [
        { name: 'newsletter', label: 'Newsletter semanal', type: 'checkbox', defaultValue: false },
        { name: 'dropAlerts', label: 'Avisar quando o drop abrir', type: 'checkbox', defaultValue: false },
      ],
    },
    { name: 'source', label: 'Origem', type: 'text', admin: { readOnly: true } },
    { name: 'consentAt', label: 'Consentiu em', type: 'date', admin: { readOnly: true } },
    { name: 'unsubscribedAt', label: 'Descadastrou em', type: 'date', admin: { readOnly: true } },
  ],
}
