import type { MetadataRoute } from 'next'

import { env } from '../../lib/env'
import { getClient } from '../../lib/payload'

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const payload = await getClient()
  const games = await payload.find({ collection: 'games', depth: 0, limit: 5000, select: { slug: true, updatedAt: true } })
  const base = env.siteUrl
  const pages = ['', '/loja', '/drop', '/frete-e-prazos', '/trocas-e-devolucoes', '/termos', '/privacidade']
  return [
    ...pages.map((p) => ({ url: `${base}${p}`, changeFrequency: 'daily' as const, priority: p === '' ? 1 : 0.6 })),
    ...games.docs.map((g) => ({
      url: `${base}/jogo/${g.slug}`,
      lastModified: g.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
