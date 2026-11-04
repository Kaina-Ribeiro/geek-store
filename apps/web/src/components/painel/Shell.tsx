'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { ReactNode } from 'react'

import { logoutAction } from '../../app/(painel)/painel/actions'
import { BannerIcon, BoxIcon, ChatIcon, ExternalIcon, HomeIcon, LogoutIcon, PadIcon } from './icons'

const NAV = [
  { href: '/painel', label: 'Início', short: 'Início', Icon: HomeIcon },
  { href: '/painel/banner', label: 'Banner da home', short: 'Banner', Icon: BannerIcon },
  { href: '/painel/jogos', label: 'Jogos', short: 'Jogos', Icon: PadIcon },
  { href: '/painel/pedidos', label: 'Pedidos', short: 'Pedidos', Icon: BoxIcon },
] as const

export const firstName = (name: string) => name.trim().split(/\s+/)[0] || 'Mestre'

export function HelpCard({ url, className = 'pn-help' }: { url: string; className?: string }) {
  return (
    <div className={className}>
      <b>Travou em alguma coisa?</b>
      <p>Nada que você mexer aqui quebra o site. Tudo tem botão de desfazer.</p>
      <a href={url} target="_blank" rel="noopener noreferrer">
        <ChatIcon />
        Chamar o Gabriel
      </a>
    </div>
  )
}

export function Shell({
  user,
  pending,
  helpUrl,
  children,
}: {
  user: { name: string }
  pending: number
  helpUrl: string | null
  children: ReactNode
}) {
  const path = usePathname()
  const active = (href: string) => (href === '/painel' ? path === href : path === href || path.startsWith(`${href}/`))
  const name = firstName(user.name)

  return (
    <>
      <header className="pn-top">
        <div className="pn-top-in">
          <Link href="/painel" className="pn-brand">
            <Image src="/brand/logo.png" alt="" width={46} height={46} priority />
            <span>
              <b className="dsp">Checkpoint Geek</b>
              <small className="px">Painel da loja</small>
            </span>
          </Link>
          <div className="pn-top-actions">
            <a className="pn-ghost-dark" href="/" target="_blank" rel="noopener">
              <ExternalIcon />
              <span className="pn-hide-sm">Ver o site</span>
            </a>
            <span className="pn-me">
              <span className="pn-avatar" aria-hidden="true">
                {name[0]?.toUpperCase()}
              </span>
              <span className="pn-me-name">{name}</span>
            </span>
            <form action={logoutAction}>
              <button className="pn-ghost-dark" type="submit" aria-label="Sair do painel">
                <LogoutIcon />
                <span className="pn-hide-sm">Sair</span>
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="pn-frame">
        <aside className="pn-side">
          <nav aria-label="Painel" className="pn-nav">
            {NAV.map(({ href, label, Icon }) => (
              <Link key={href} href={href} className="pn-nv" aria-current={active(href) ? 'page' : undefined}>
                <Icon />
                {label}
                {href === '/painel/pedidos' && pending > 0 && <b className="pn-badge">{pending}</b>}
              </Link>
            ))}
          </nav>
          {helpUrl && <HelpCard url={helpUrl} />}
        </aside>
        <main className="pn-main">{children}</main>
      </div>

      <nav aria-label="Painel" className="pn-tabs">
        {NAV.map(({ href, short, Icon }) => (
          <Link key={href} href={href} className="pn-tab" aria-current={active(href) ? 'page' : undefined}>
            <Icon size={22} />
            {short}
            {href === '/painel/pedidos' && pending > 0 && <b className="pn-badge">{pending}</b>}
          </Link>
        ))}
      </nav>
    </>
  )
}
