import '@checkpoint/ui/styles.css'
// The live previews render the real storefront components, with their CSS.
import '../(frontend)/site.css'
import '../(frontend)/commerce.css'
import './painel.css'

import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

import { fontVars } from '../fonts'

export const metadata: Metadata = {
  title: { default: 'Painel da loja · Checkpoint Geek', template: '%s · Painel · Checkpoint Geek' },
  robots: { index: false, follow: false },
}

export const viewport: Viewport = { themeColor: '#09090A' }

// Root layout of the owner panel (its own <html>, apart from the storefront's).
export default function PainelRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={fontVars}>
      <body className="pn-body">{children}</body>
    </html>
  )
}
