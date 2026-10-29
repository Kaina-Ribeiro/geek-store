'use client'

import { ProductCard } from '@checkpoint/ui'
import Image from 'next/image'
import Link from 'next/link'

import type { CardItem } from '../lib/data'
import { useCart } from '../store/cart'

export const toLine = (i: CardItem) => ({
  id: i.id,
  title: i.title,
  platform: i.platform,
  condition: i.condition,
  pixValue: i.pixValue,
  price: i.price,
  cover: i.cover.url,
  href: i.href,
  maxQty: i.stock,
})

export function ShopCard({ item, priority = false }: { item: CardItem; priority?: boolean }) {
  const inCart = useCart((s) => Boolean(s.lines[item.id]))
  const saved = useCart((s) => Boolean(s.saves[item.gameId]))
  const add = useCart((s) => s.add)
  const toggleSave = useCart((s) => s.toggleSave)

  return (
    <ProductCard
      item={item}
      Link={Link}
      inCart={inCart}
      saved={saved}
      onAdd={() => add(toLine(item))}
      onSave={() => toggleSave(item.gameId)}
      image={
        <Image
          src={item.cover.url}
          alt=""
          width={item.cover.width}
          height={item.cover.height}
          sizes="(max-width: 640px) 50vw, (max-width: 1280px) 25vw, 220px"
          priority={priority}
        />
      }
    />
  )
}
