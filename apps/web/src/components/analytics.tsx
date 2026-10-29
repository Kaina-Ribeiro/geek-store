'use client'

import Link from 'next/link'
import Script from 'next/script'
import { useSyncExternalStore } from 'react'

import type { OrderView } from '../lib/order-view'

// GA4 and Meta Pixel load only after the visitor accepts (LGPD). Without the
// IDs configured, nothing loads and no banner is shown.

const GA = process.env.NEXT_PUBLIC_GA_ID || ''
const PIXEL = process.env.NEXT_PUBLIC_META_PIXEL_ID || ''
const KEY = 'checkpoint-cookies'

type W = Window & { gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void }

const read = () => {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

// Consent lives in localStorage; components re-read it when it changes.
const listeners = new Set<() => void>()
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => listeners.delete(cb)
}
const save = (v: string) => {
  try {
    localStorage.setItem(KEY, v)
  } catch {
    // Private mode: the choice lasts for this page only.
  }
  memo = v
  listeners.forEach((l) => l())
}
let memo: string | null | undefined
const snapshot = () => (memo !== undefined ? memo : (memo = read()))

export function Analytics() {
  // undefined on the server: nothing renders until the browser knows.
  const choice = useSyncExternalStore(subscribe, snapshot, () => undefined)
  if (!GA && !PIXEL) return null
  const decide = (v: 'sim' | 'nao') => save(v)

  return (
    <>
      {choice === 'sim' && GA && (
        <>
          <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA}`} strategy="afterInteractive" />
          <Script id="ga" strategy="afterInteractive">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${GA}');`}
          </Script>
        </>
      )}
      {choice === 'sim' && PIXEL && (
        <Script id="pixel" strategy="afterInteractive">
          {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${PIXEL}');fbq('track','PageView');`}
        </Script>
      )}
      {choice === null && (
        <div className="cookie theme-dark" role="dialog" aria-label="Cookies">
          <p>
            Usamos cookies de medição para entender o que funciona na loja. Os essenciais (inventário e login) ficam
            sempre. <Link href="/privacidade">Saiba mais</Link>.
          </p>
          <div>
            <button className="btn btn-ghost" onClick={() => decide('nao')}>
              Só essenciais
            </button>
            <button className="btn btn-yellow" onClick={() => decide('sim')}>
              Aceitar
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export function trackPurchase(o: OrderView) {
  const w = window as W
  const value = o.total
  w.gtag?.('event', 'purchase', {
    transaction_id: o.number,
    value,
    currency: 'BRL',
    shipping: o.shipping.price,
    items: o.items.map((i) => ({ item_name: i.title, item_category: i.platform, price: i.unitPrice, quantity: i.qty })),
  })
  w.fbq?.('track', 'Purchase', { value, currency: 'BRL' })
}
