import type { Payload, PayloadRequest } from 'payload'

import type { Order } from '../payload-types'
import { brl } from './catalog'
import { env } from './env'

// Transactional e-mails. Sent through Payload's e-mail adapter: Resend in
// production, the server log in development (see payload.config.ts).

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)

function layout(title: string, body: string, cta?: { href: string; label: string }) {
  return `<!doctype html><html lang="pt-BR"><body style="margin:0;background:#09090A;font-family:Helvetica,Arial,sans-serif;color:#F4F4F6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%">
<tr><td style="padding-bottom:24px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#FFC61A">Checkpoint Geek</td></tr>
<tr><td style="background:#141416;border-radius:20px;padding:28px">
<h1 style="margin:0 0 16px;font-size:26px;line-height:1.15;color:#fff">${esc(title)}</h1>
<div style="font-size:15px;line-height:1.55;color:#C9C9CF">${body}</div>
${cta ? `<p style="margin:24px 0 0"><a href="${cta.href}" style="display:inline-block;background:#FFC61A;color:#141000;text-decoration:none;font-weight:700;padding:14px 22px;border-radius:12px">${esc(cta.label)}</a></p>` : ''}
</td></tr>
<tr><td style="padding-top:20px;font-size:12px;color:#8E8E97">Checkpoint Geek · Taubaté-SP · Jogos com laudo de cada disco.</td></tr>
</table></td></tr></table></body></html>`
}

const itemsTable = (o: Order) =>
  `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;border-top:1px solid #26262B">${o.items
    .map(
      (i) =>
        `<tr><td style="padding:10px 0;border-bottom:1px solid #26262B;color:#fff">${esc(i.title)}<br><span style="color:#8E8E97;font-size:13px">${esc(
          [i.platform, i.condition].filter(Boolean).join(' · '),
        )} · ${i.qty}x</span></td><td align="right" style="padding:10px 0;border-bottom:1px solid #26262B;color:#fff;font-family:monospace">${brl(
          i.unitPrice * i.qty,
        )}</td></tr>`,
    )
    .join('')}
<tr><td style="padding:10px 0;color:#8E8E97">Frete (${esc(o.shipping?.method || '')})</td><td align="right" style="font-family:monospace">${
      o.shipping?.price ? brl(o.shipping.price) : 'Grátis'
    }</td></tr>
<tr><td style="padding:6px 0;color:#fff;font-weight:700">Total</td><td align="right" style="color:#fff;font-weight:700;font-family:monospace">${brl(o.total)}</td></tr></table>`

export const orderLink = (o: Pick<Order, 'id'> & { accessToken?: string | null }) =>
  `${env.siteUrl}/pedido/${o.id}${o.accessToken ? `?t=${o.accessToken}` : ''}`

async function send(payload: Payload, to: string, subject: string, html: string) {
  await payload.sendEmail({ to, subject, html })
}

export async function sendOrderCreatedEmail(payload: Payload, o: Order) {
  const pix = o.payment?.method === 'pix'
  await send(
    payload,
    o.email,
    `Pedido ${o.number} recebido`,
    layout(
      pix ? 'Falta só o Pix' : 'Recebemos seu pedido',
      `<p>Oi, ${esc(o.name.split(' ')[0])}! Separamos seus jogos por 30 minutos.</p>${itemsTable(o)}${
        pix ? '<p>Pague pelo QR Code ou pelo código copia e cola na página do pedido.</p>' : ''
      }`,
      { href: orderLink(o), label: pix ? 'Ver o Pix' : 'Ver pedido' },
    ),
  )
}

export async function sendPaidEmail(payload: Payload, o: Order) {
  const pickup = o.shipping?.methodId === 'retirada'
  await send(
    payload,
    o.email,
    `Pagamento confirmado · pedido ${o.number}`,
    layout(
      'Pagamento confirmado',
      `<p>Seu pedido ${esc(o.number || '')} está pago. Agora a gente confere o laudo de cada disco e embala.</p>${itemsTable(o)}<p>${
        pickup
          ? 'Avisamos por e-mail quando estiver pronto para retirar em Taubaté.'
          : 'Você recebe o código de rastreio por e-mail assim que postarmos.'
      }</p>${o.xp ? `<p style="color:#FFC61A">+${o.xp} XP no seu passe Checkpoint.</p>` : ''}`,
      { href: orderLink(o), label: 'Acompanhar pedido' },
    ),
  )
  if (env.storeNotify) {
    await send(
      payload,
      env.storeNotify,
      `Novo pedido pago ${o.number} · ${brl(o.total)}`,
      layout(
        `Pedido ${o.number} pago`,
        `<p>${esc(o.name)} · ${esc(o.email)}${o.phone ? ` · ${esc(o.phone)}` : ''}</p>${itemsTable(o)}<p>Entrega: ${esc(
          o.shipping?.method || '',
        )}${o.shipping?.cep ? ` · CEP ${esc(o.shipping.cep)}` : ''}</p>`,
        { href: `${env.siteUrl}/admin/collections/orders/${o.id}`, label: 'Abrir no painel' },
      ),
    )
  }
}

export async function sendShippedEmail(payload: Payload, doc: Order, req?: PayloadRequest) {
  // The admin request cannot read the guest access token; reload it.
  const o = doc.accessToken
    ? doc
    : await payload.findByID({ collection: 'orders', id: doc.id, depth: 0, overrideAccess: true, req })
  const pickup = o.status === 'pronto'
  const track = o.trackingCode
    ? `<p>Código de rastreio: <b style="color:#fff;font-family:monospace">${esc(o.trackingCode)}</b></p><p><a style="color:#FFC61A" href="https://rastreamento.correios.com.br/app/index.php?objetos=${encodeURIComponent(
        o.trackingCode,
      )}">Rastrear nos Correios</a> · <a style="color:#FFC61A" href="https://melhorrastreio.com.br/rastreio/${encodeURIComponent(o.trackingCode)}">Melhor Rastreio</a></p>`
    : ''
  await send(
    payload,
    o.email,
    pickup ? `Pedido ${o.number} pronto para retirar` : `Pedido ${o.number} a caminho`,
    layout(
      pickup ? 'Pronto para retirar' : 'Seu pedido saiu de Taubaté',
      pickup
        ? '<p>Seus jogos estão separados na loja. Retire de segunda a sábado, das 10h às 19h, com um documento.</p>'
        : `<p>Postamos seu pedido ${esc(o.number || '')}.</p>${track}`,
      { href: orderLink(o), label: 'Ver pedido' },
    ),
  )
}

export async function sendLoginEmail(payload: Payload, to: string, link: string) {
  await send(
    payload,
    to,
    'Seu link para entrar na Checkpoint Geek',
    layout(
      'Continue de onde parou',
      '<p>Toque no botão para entrar. O link vale por 15 minutos e só funciona uma vez.</p><p style="color:#8E8E97;font-size:13px">Se não foi você, é só ignorar este e-mail.</p>',
      { href: link, label: 'Entrar na minha conta' },
    ),
  )
}

export async function sendDropOpenEmail(payload: Payload, to: string, title: string, unsubscribe: string) {
  await send(
    payload,
    to,
    `O drop abriu: ${title}`,
    layout(
      'O drop abriu',
      `<p>${esc(title)} está no ar. Quando acaba, acaba.</p><p style="color:#8E8E97;font-size:12px">Não quer mais avisos? <a style="color:#8E8E97" href="${unsubscribe}">Descadastrar</a>.</p>`,
      { href: `${env.siteUrl}/drop`, label: 'Ver o drop' },
    ),
  )
}
