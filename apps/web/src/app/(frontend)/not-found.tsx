import Link from 'next/link'

import { SiteHeader } from '../../components/SiteHeader'

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main className="nf theme-dark">
        <span className="px">Erro 404</span>
        <h1 className="dsp">Game over</h1>
        <p>Essa página não existe ou o jogo já foi vendido.</p>
        <Link href="/loja" className="btn btn-yellow">
          Continuar na loja
        </Link>
      </main>
    </>
  )
}
