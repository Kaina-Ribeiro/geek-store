import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'

import { LoginForm } from '../../../../components/painel/LoginForm'
import { safeReturn } from '../../../../lib/painel/paths'
import { getStaffUser } from '../../../../lib/painel/session'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Entrar' }

export default async function EntrarPage({ searchParams }: { searchParams: Promise<{ volta?: string }> }) {
  const { volta } = await searchParams
  const back = safeReturn(volta)
  if (await getStaffUser()) redirect(back)

  return (
    <div className="pn-login">
      <header className="pn-top">
        <div className="pn-top-in">
          <span className="pn-brand">
            <Image src="/brand/logo.png" alt="" width={46} height={46} priority />
            <span>
              <b className="dsp">Checkpoint Geek</b>
              <small className="px">Painel da loja</small>
            </span>
          </span>
        </div>
      </header>
      <main className="pn-login-main">
        <section className="pn-card pn-login-card pn-page">
          <div className="pn-head">
            <span className="px pn-crumb">Painel da loja</span>
            <h1 className="dsp">Entrar</h1>
            <p className="pn-lead">Use o e-mail e a senha da loja.</p>
          </div>
          <LoginForm volta={back} />
          <Link className="pn-link" href="/admin/forgot">
            Esqueci a senha
          </Link>
        </section>
      </main>
    </div>
  )
}
