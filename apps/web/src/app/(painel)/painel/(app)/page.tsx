import Link from 'next/link'

import { BannerIcon, BoxIcon, PadIcon, ArrowRight } from '../../../../components/painel/icons'
import { HelpCard } from '../../../../components/painel/Shell'
import { firstName } from '../../../../lib/painel/text'
import { helpUrl } from '../../../../lib/painel/help'
import { requireStaff } from '../../../../lib/painel/session'
import { greeting, panelSummary } from '../../../../lib/painel/summary'
import { getClient } from '../../../../lib/payload'

export const metadata = { title: 'Início' }

export default async function InicioPage() {
  const user = await requireStaff()
  const s = await panelSummary(await getClient(), user)
  const help = helpUrl()
  const pendingTxt = s.pendingOrders
    ? `${s.pendingOrders} ${s.pendingOrders === 1 ? 'pedido esperando' : 'pedidos esperando'} você enviar ou entregar.`
    : 'Tudo em dia. Nenhum pedido esperando.'

  return (
    <div className="pn-page">
      <div className="pn-head pn-hello">
        <span className="px pn-crumb">{greeting()}</span>
        <h1 className="dsp pn-h1 pn-h1-xl">Olá, {firstName(user.name)}</h1>
        <p className="pn-lead">O que você quer fazer hoje?</p>
      </div>

      <div className="pn-bigs">
        <Link className="pn-big" href="/painel/banner">
          <span className="pn-tile" style={{ background: '#FFC61A', color: '#141000' }}>
            <BannerIcon size={32} />
          </span>
          <b className="dsp">Trocar o banner da home</b>
          <span className="pn-big-txt">Mude o que aparece no topo do site: textos, jogos em destaque e campanhas.</span>
          <span className="pn-go">
            Começar <ArrowRight />
          </span>
        </Link>
        <Link className="pn-big" href="/painel/jogos/novo">
          <span className="pn-tile" style={{ background: '#2D6BF0', color: '#fff' }}>
            <PadIcon size={32} />
          </span>
          <b className="dsp">Adicionar um jogo</b>
          <span className="pn-big-txt">Foto, nome, preço e quantidade. Aparece na loja assim que você publicar.</span>
          <span className="pn-go">
            Começar <ArrowRight />
          </span>
        </Link>
        <Link className="pn-big" href="/painel/pedidos">
          <span className="pn-tile" style={{ background: '#22B04B', color: '#fff' }}>
            <BoxIcon size={32} />
          </span>
          <b className="dsp">Ver pedidos</b>
          <span className="pn-big-txt">{pendingTxt}</span>
          <span className="pn-go">
            Abrir <ArrowRight />
          </span>
        </Link>
      </div>

      <div className="pn-card pn-stats">
        <div>
          <span className="px">Pedidos em aberto</span>
          <b className="mono">{s.pendingOrders}</b>
        </div>
        <div>
          <span className="px">Jogos à venda</span>
          <b className="mono">{s.gamesInStock}</b>
        </div>
        <div>
          <span className="px">Slides no banner</span>
          <b className="mono">{s.visibleSlides}</b>
        </div>
      </div>

      {help && <HelpCard url={help} className="pn-help pn-help-mobile" />}
    </div>
  )
}
