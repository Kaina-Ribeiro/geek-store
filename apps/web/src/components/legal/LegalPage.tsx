import Link from 'next/link'
import type { ReactNode } from 'react'

import { SiteFooter } from '../SiteFooter'
import { SiteHeader } from '../SiteHeader'

const PAGES = [
  { href: '/frete-e-prazos', label: 'Frete e prazos' },
  { href: '/trocas-e-devolucoes', label: 'Trocas e devoluções' },
  { href: '/termos', label: 'Termos de uso' },
  { href: '/privacidade', label: 'Privacidade' },
]

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="theme-light">
        <div className="wrap legal">
          <nav className="legal-nav" aria-label="Ajuda">
            {PAGES.map((p) => (
              <Link key={p.href} href={p.href} className="chip">
                {p.label}
              </Link>
            ))}
          </nav>
          <h1 className="dsp legal-title">{title}</h1>
          <p className="px legal-date">Atualizado em {updated}</p>
          <div className="legal-body">{children}</div>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
