import { Archivo, Geist, Geist_Mono, Silkscreen } from 'next/font/google'

// The site's four fonts, shared by the storefront and the owner panel.
const archivo = Archivo({ subsets: ['latin'], axes: ['wdth'], variable: '--font-archivo', display: 'swap' })
const geist = Geist({ subsets: ['latin'], variable: '--font-geist', display: 'swap' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono', display: 'swap' })
const silkscreen = Silkscreen({ subsets: ['latin'], weight: '400', variable: '--font-silkscreen', display: 'swap' })

export const fontVars = `${archivo.variable} ${geist.variable} ${geistMono.variable} ${silkscreen.variable}`
