import Image from 'next/image'
import Link from 'next/link'

import { STORE } from '../lib/store-info'
import { Newsletter } from './Newsletter'

export function SiteFooter() {
  return (
    <footer className="ftr theme-dark">
      <div className="wrap ftr-grid">
        <div>
          <b className="dsp ftr-title">
            Entre para
            <br />a party
          </b>
          <p className="ftr-sub">Drops de sexta, pré-vendas e cupons por nível. Um e-mail por semana, sem spam.</p>
          <Newsletter />
        </div>
        <div>
          <h4 className="px">Loja</h4>
          <ul>
            <li><Link href="/loja">Loja</Link></li>
            <li><Link href="/#plataformas">Plataformas</Link></li>
            <li><Link href="/drop">Drop de sexta</Link></li>
            <li><Link href="/#troca">Troca</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="px">Ajuda</h4>
          <ul>
            <li><Link href="/#laudo">Como funciona o laudo</Link></li>
            <li><Link href="/frete-e-prazos">Prazos e frete</Link></li>
            <li><Link href="/trocas-e-devolucoes">Trocas e devoluções</Link></li>
            <li><Link href="/rastreio">Rastrear pedido</Link></li>
            <li><Link href="/conta">Minha conta</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="px">Contato</h4>
          <ul>
            <li>{STORE.city}</li>
            <li>{STORE.hours}</li>
            <li>
              <a href={STORE.instagram} target="_blank" rel="noreferrer">
                Instagram
              </a>
            </li>
            <li>
              {STORE.whatsapp ? (
                <a href={`https://wa.me/${STORE.whatsapp}`} target="_blank" rel="noreferrer">
                  WhatsApp
                </a>
              ) : (
                'WhatsApp [a definir]'
              )}
            </li>
            <li>
              <a href={`mailto:${STORE.email}`}>{STORE.email}</a>
            </li>
          </ul>
        </div>
      </div>
      <div className="wrap ftr-brand">
        <Image src="/brand/logo.png" alt="Checkpoint Geek" width={150} height={150} />
        <p className="dsp">
          Uma paixão
          <br />
          que virou loja.
        </p>
      </div>
      <div className="wrap ftr-legal">
        <span>
          © {new Date().getFullYear()} Checkpoint Geek · CNPJ {STORE.cnpj} ·{' '}
          <Link href="/termos">Termos</Link> · <Link href="/privacidade">Privacidade</Link>
        </span>
        <div className="mono ftr-pay">
          <span className="is-pix">PIX</span>
          <span>VISA</span>
          <span>MASTER</span>
          <span>ELO</span>
        </div>
      </div>
    </footer>
  )
}
