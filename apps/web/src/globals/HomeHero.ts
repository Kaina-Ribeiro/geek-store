import type { GlobalConfig } from 'payload'

import { anyone, staffOnly } from '../access/roles'
import { HERO_DEFAULTS, HERO_LIMITS } from '../lib/painel/hero'

const isInternal = (v: unknown) =>
  typeof v === 'string' && v.startsWith('/') && v[1] !== '/' && v[1] !== '\\'

// The banner at the top of the home page. Edited by the store owner in
// /painel/banner (with a live preview); the /admin keeps the version history.
export const HomeHero: GlobalConfig = {
  slug: 'home-hero',
  label: 'Banner da home',
  admin: { group: 'Site' },
  access: { read: anyone, update: staffOnly },
  versions: { max: 20 },
  fields: [
    {
      name: 'title',
      label: 'Título',
      type: 'textarea',
      required: true,
      maxLength: HERO_LIMITS.title,
      defaultValue: HERO_DEFAULTS.title,
      admin: { description: 'Cada linha vira uma linha no site. A última ganha o sublinhado amarelo.' },
    },
    {
      name: 'subtitle',
      label: 'Frase',
      type: 'textarea',
      maxLength: HERO_LIMITS.subtitle,
      defaultValue: HERO_DEFAULTS.subtitle,
    },
    {
      name: 'ctaLabel',
      label: 'Texto do botão',
      type: 'text',
      required: true,
      maxLength: HERO_LIMITS.ctaLabel,
      defaultValue: HERO_DEFAULTS.ctaLabel,
    },
    {
      name: 'slides',
      label: 'Slides',
      type: 'array',
      maxRows: HERO_LIMITS.slides,
      labels: { singular: 'Slide', plural: 'Slides' },
      fields: [
        {
          name: 'kind',
          label: 'Tipo',
          type: 'select',
          required: true,
          defaultValue: 'game',
          options: [
            { label: 'Jogo da loja', value: 'game' },
            { label: 'Campanha', value: 'campaign' },
          ],
        },
        {
          name: 'game',
          label: 'Jogo',
          type: 'relationship',
          relationTo: 'games',
          admin: { condition: (_, s) => s?.kind === 'game' },
          validate: (v: unknown, { siblingData }: { siblingData: { kind?: string } }) =>
            siblingData?.kind !== 'game' || v ? true : 'Escolha um jogo',
        },
        {
          name: 'campaignTitle',
          label: 'Texto da campanha',
          type: 'text',
          admin: { condition: (_, s) => s?.kind === 'campaign' },
          validate: (v: unknown, { siblingData }: { siblingData: { kind?: string } }) => {
            if (siblingData?.kind !== 'campaign') return true
            if (typeof v !== 'string' || !v.trim()) return 'A campanha precisa de um texto'
            return v.length <= HERO_LIMITS.campaignTitle || `Até ${HERO_LIMITS.campaignTitle} letras`
          },
        },
        {
          name: 'campaignImage',
          label: 'Imagem da campanha',
          type: 'upload',
          relationTo: 'media',
          admin: { condition: (_, s) => s?.kind === 'campaign' },
        },
        {
          name: 'campaignLink',
          label: 'Destino do botão',
          type: 'text',
          defaultValue: '/loja',
          admin: { condition: (_, s) => s?.kind === 'campaign' },
          validate: (v: unknown) => v == null || v === '' || isInternal(v) || 'Use um caminho do site, como /loja',
        },
        { name: 'visible', label: 'Aparece no site', type: 'checkbox', defaultValue: true },
      ],
    },
  ],
}
