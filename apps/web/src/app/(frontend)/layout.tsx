import '@checkpoint/ui/styles.css'
import './site.css'
import './commerce.css'

import type { Metadata, Viewport } from 'next'
import { Archivo, Geist, Geist_Mono, Silkscreen } from 'next/font/google'
import type { ReactNode } from 'react'

import { Analytics } from '../../components/analytics'
import { Inventory } from '../../components/Inventory'
import { StoreHydrator } from '../../components/StoreHydrator'
import { Toast } from '../../components/Toast'

const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo', display: 'swap' })
const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' })
const silkscreen = Silkscreen({ subsets: ['latin'], weight: '400', variable: '--font-silkscreen', display: 'swap' })

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'),
  title: { default: 'Checkpoint Geek · Continue de onde você parou', template: '%s · Checkpoint Geek' },
  description:
    'Loja de games em Taubaté-SP. Lacrados e seminovos com laudo de cada disco, do PS2 ao Switch 2, com envio para todo o Brasil.',
  openGraph: { type: 'website', locale: 'pt_BR', siteName: 'Checkpoint Geek' },
}

export const viewport: Viewport = { themeColor: '#09090A' }

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className={`${archivo.variable} ${geist.variable} ${geistMono.variable} ${silkscreen.variable}`}>
      <body className="theme-dark">
        {children}
        <Inventory />
        <Toast />
        <StoreHydrator />
        <Analytics />
      </body>
    </html>
  )
}
