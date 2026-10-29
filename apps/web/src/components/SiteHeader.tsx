'use client'

import { BagIcon, HomeIcon, SearchIcon, StoreIcon, UserIcon } from '@checkpoint/ui'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect } from 'react'

import { cartCount, useCart } from '../store/cart'

const NAV = [
  { href: '/loja', label: 'Loja' },
  { href: '/#plataformas', label: 'Plataformas' },
  { href: '/#laudo', label: 'Laudo' },
  { href: '/#drop', label: 'Drop de sexta' },
  { href: '/#troca', label: 'Troca' },
]

// `overlay` sits inside the dark hero on the Home; `bar` is the sticky glass
// header used on every other page.
export function SiteHeader({ variant = 'bar' }: { variant?: 'overlay' | 'bar' }) {
  const count = useCart(cartCount)
  const openDrawer = useCart((s) => s.openDrawer)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        router.push('/loja?busca=1')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [router])

  return (
    <>
      <header className={`hdr hdr-${variant} theme-dark`}>
        <div className="wrap hdr-in">
          <Link href="/" className="hdr-brand" aria-label="Checkpoint Geek, início">
            <Image src="/brand/logo.png" alt="" width={56} height={56} priority />
            <span>
              <b className="dsp">Checkpoint Geek</b>
              <small className="px">Taubaté · SP</small>
            </span>
          </Link>
          <nav aria-label="Principal" className="hdr-nav">
            {NAV.map((n) => (
              <Link key={n.href} href={n.href} aria-current={pathname === n.href ? 'page' : undefined}>
                {n.label}
              </Link>
            ))}
          </nav>
          <Link href="/loja?busca=1" className="hdr-search glass-dark">
            <SearchIcon />
            <span>Buscar jogo, console…</span>
            <kbd className="mono">Ctrl K</kbd>
          </Link>
          <button
            className="icon-btn"
            aria-label={`Abrir inventário, ${count === 1 ? '1 item' : `${count} itens`}`}
            onClick={() => openDrawer(true)}
          >
            <BagIcon size={19} />
            {count > 0 && <span className="badge-count mono">{count}</span>}
          </button>
        </div>
      </header>

      <nav className="tabbar theme-dark" aria-label="Navegação do app">
        <Link href="/" aria-current={pathname === '/' ? 'page' : undefined}>
          <HomeIcon />
          Início
        </Link>
        <Link href="/loja" aria-current={pathname === '/loja' ? 'page' : undefined}>
          <StoreIcon />
          Loja
        </Link>
        <Link href="/loja?busca=1">
          <SearchIcon size={22} />
          Buscar
        </Link>
        <button onClick={() => openDrawer(true)}>
          <span className="tabbar-bag">
            <BagIcon size={22} />
            {count > 0 && <b className="badge-count mono">{count}</b>}
          </span>
          Inventário
        </button>
        <Link href="/#xp">
          <UserIcon />
          Perfil
        </Link>
      </nav>
    </>
  )
}
