import type { CollectionConfig } from 'payload'

import { donoField, donoOnly, isStaff, staffOnly } from '../access/roles'
import { orderNumber } from '../lib/checkout-math'
import { sendShippedEmail } from '../lib/emails'

export const ORDER_STATUS = [
  { value: 'aguardando', label: 'Aguardando pagamento' },
  { value: 'pago', label: 'Pago · separar' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'pronto', label: 'Pronto para retirar' },
  { value: 'entregue', label: 'Entregue' },
  { value: 'expirado', label: 'Expirado (não pago)' },
  { value: 'cancelado', label: 'Cancelado / estornado' },
] as const

export type OrderStatus = (typeof ORDER_STATUS)[number]['value']

// Orders are created only by the server (checkout action); prices are locked
// per item at that moment. The team works them from here: separate, ship,
// paste the tracking code (the customer gets an e-mail automatically).
export const Orders: CollectionConfig = {
  slug: 'orders',
  labels: { singular: 'Pedido', plural: 'Pedidos' },
  admin: {
    useAsTitle: 'number',
    defaultColumns: ['number', 'name', 'status', 'total', 'createdAt'],
    group: 'Vendas',
    listSearchableFields: ['email', 'name', 'number'],
  },
  access: {
    read: ({ req }) =>
      isStaff(req.user)
        ? true
        : req.user?.collection === 'customers'
          ? { customer: { equals: req.user.id } }
          : false,
    create: () => false,
    update: staffOnly,
    delete: donoOnly,
  },
  defaultSort: '-createdAt',
  hooks: {
    afterChange: [
      async ({ doc, previousDoc, operation, req }) => {
        // Human-friendly number (#1042) derived from the id.
        if (operation === 'create' && !doc.number) {
          const number = orderNumber(doc.id)
          await req.payload.update({ collection: 'orders', id: doc.id, data: { number }, req, overrideAccess: true })
          return { ...doc, number }
        }
        if (operation !== 'update') return doc
        if (doc.status !== previousDoc?.status && (doc.status === 'enviado' || doc.status === 'pronto')) {
          await sendShippedEmail(req.payload, doc, req).catch((e) => req.payload.logger.error(e))
        }
        return doc
      },
    ],
  },
  fields: [
    {
      name: 'number',
      label: 'Número',
      type: 'text',
      admin: { readOnly: true, position: 'sidebar' },
      index: true,
    },
    {
      name: 'status',
      label: 'Status',
      type: 'select',
      required: true,
      defaultValue: 'aguardando',
      options: ORDER_STATUS.map((s) => ({ ...s })),
      admin: { position: 'sidebar' },
      index: true,
    },
    {
      name: 'trackingCode',
      label: 'Código de rastreio',
      type: 'text',
      admin: {
        position: 'sidebar',
        description: 'Cole o código ao mudar para "Enviado": o cliente recebe por e-mail.',
      },
    },
    { name: 'customer', label: 'Conta do cliente', type: 'relationship', relationTo: 'customers', index: true },
    {
      type: 'row',
      fields: [
        { name: 'name', label: 'Nome', type: 'text', required: true },
        { name: 'email', label: 'E-mail', type: 'email', required: true, index: true },
        { name: 'phone', label: 'WhatsApp', type: 'text' },
        { name: 'cpf', label: 'CPF', type: 'text', access: { read: ({ req }) => isStaff(req.user) } },
      ],
    },
    {
      name: 'items',
      label: 'Itens',
      type: 'array',
      required: true,
      minRows: 1,
      admin: { initCollapsed: false },
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'copy', label: 'Cópia', type: 'relationship', relationTo: 'copies', required: true },
            { name: 'title', label: 'Jogo', type: 'text', required: true },
            { name: 'platform', label: 'Plataforma', type: 'text' },
            { name: 'group', label: 'Grupo', type: 'text', admin: { hidden: true } },
            { name: 'condition', label: 'Estado', type: 'text' },
            { name: 'unitPrice', label: 'Preço unitário', type: 'number', required: true },
            { name: 'qty', label: 'Qtd', type: 'number', required: true, min: 1 },
          ],
        },
        { name: 'cover', type: 'text', admin: { hidden: true } },
      ],
    },
    {
      name: 'shipping',
      label: 'Entrega',
      type: 'group',
      fields: [
        {
          type: 'row',
          fields: [
            { name: 'method', label: 'Serviço', type: 'text' },
            { name: 'methodId', type: 'text', admin: { hidden: true } },
            { name: 'price', label: 'Frete cobrado', type: 'number', defaultValue: 0 },
            { name: 'days', label: 'Prazo (dias úteis)', type: 'number' },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'cep', label: 'CEP', type: 'text' },
            { name: 'street', label: 'Rua', type: 'text' },
            { name: 'number', label: 'Número', type: 'text' },
            { name: 'complement', label: 'Complemento', type: 'text' },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'district', label: 'Bairro', type: 'text' },
            { name: 'city', label: 'Cidade', type: 'text' },
            { name: 'uf', label: 'UF', type: 'text' },
          ],
        },
      ],
    },
    {
      name: 'payment',
      label: 'Pagamento',
      type: 'group',
      access: { update: donoField },
      fields: [
        {
          type: 'row',
          fields: [
            {
              name: 'method',
              label: 'Forma',
              type: 'select',
              options: [
                { label: 'Pix', value: 'pix' },
                { label: 'Cartão', value: 'card' },
              ],
            },
            {
              name: 'status',
              label: 'Status no Mercado Pago',
              type: 'text',
              defaultValue: 'pending',
            },
            { name: 'statusDetail', label: 'Detalhe', type: 'text' },
            { name: 'mpId', label: 'ID no Mercado Pago', type: 'text', index: true },
          ],
        },
        {
          type: 'row',
          fields: [
            { name: 'installments', label: 'Parcelas', type: 'number' },
            { name: 'attempts', label: 'Tentativas no cartão', type: 'number', defaultValue: 0 },
            { name: 'expiresAt', label: 'Expira em', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
            { name: 'paidAt', label: 'Pago em', type: 'date', admin: { date: { pickerAppearance: 'dayAndTime' } } },
          ],
        },
        { name: 'qrCode', label: 'Pix copia e cola', type: 'textarea', admin: { readOnly: true } },
        { name: 'qrBase64', type: 'textarea', admin: { hidden: true } },
        { name: 'simulated', label: 'Pagamento simulado (desenvolvimento)', type: 'checkbox', admin: { readOnly: true } },
      ],
    },
    {
      type: 'row',
      fields: [
        { name: 'subtotal', label: 'Subtotal', type: 'number', required: true },
        { name: 'discount', label: 'Desconto Pix', type: 'number', defaultValue: 0 },
        { name: 'total', label: 'Total', type: 'number', required: true },
        { name: 'xp', label: 'XP do pedido', type: 'number', defaultValue: 0 },
      ],
    },
    {
      name: 'drop',
      label: 'Drop',
      type: 'relationship',
      relationTo: 'drops',
      admin: { position: 'sidebar', readOnly: true },
    },
    // Internal bookkeeping (idempotent stock and XP updates).
    { name: 'accessToken', type: 'text', admin: { hidden: true }, access: { read: () => false } },
    { name: 'stockReleased', type: 'checkbox', defaultValue: false, admin: { hidden: true } },
    { name: 'xpCredited', type: 'checkbox', defaultValue: false, admin: { hidden: true } },
  ],
}
