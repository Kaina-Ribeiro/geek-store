import Image from 'next/image'
import Link from 'next/link'

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
            <li><Link href="/#drop">Drop de sexta</Link></li>
            <li><Link href="/#troca">Troca</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="px">Ajuda</h4>
          <ul>
            <li><Link href="/#laudo">Como funciona o laudo</Link></li>
            <li>Prazos e frete</li>
            <li>Trocas e devoluções</li>
            <li>Rastrear pedido</li>
          </ul>
        </div>
        <div>
          <h4 className="px">Contato</h4>
          <ul>
            <li>Taubaté · SP</li>
            <li>Seg a sáb · 10h às 19h</li>
            <li>
              <a href="https://www.instagram.com/_checkpoint_geek_/" target="_blank" rel="noreferrer">
                Instagram
              </a>
            </li>
            <li>WhatsApp [a definir]</li>
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
        <span>© {new Date().getFullYear()} Checkpoint Geek · CNPJ [a definir]</span>
        <div className="mono ftr-pay">
          <span className="is-pix">PIX</span>
          <span>VISA</span>
          <span>MASTER</span>
          <span>ELO</span>
          <span>BOLETO</span>
        </div>
      </div>
    </footer>
  )
}
