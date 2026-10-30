// Integration switches. Every external service is optional in development:
// without its keys the store falls back to a local simulation, so the whole
// purchase flow can be exercised before the client opens the accounts.

const val = (k: string) => process.env[k]?.trim() || ''

export const env = {
  siteUrl: (val('NEXT_PUBLIC_SITE_URL') || 'http://localhost:3000').replace(/\/$/, ''),
  isProd: process.env.NODE_ENV === 'production',
  // Public preview deploy (DEMO_MODE=1): keeps the simulations of development
  // on in production while the integration accounts do not exist yet.
  demo: val('DEMO_MODE') === '1',

  // Mercado Pago (Pix + cartão). Test credentials start with TEST-.
  mpAccessToken: val('MP_ACCESS_TOKEN'),
  mpPublicKey: val('NEXT_PUBLIC_MP_PUBLIC_KEY'),
  mpWebhookSecret: val('MP_WEBHOOK_SECRET'),

  // Melhor Envio (frete). MELHOR_ENVIO_SANDBOX=1 uses the sandbox host.
  meToken: val('MELHOR_ENVIO_TOKEN'),
  meSandbox: val('MELHOR_ENVIO_SANDBOX') === '1',
  originCep: val('STORE_ORIGIN_CEP') || '12010000',

  // E-mail (Resend). Without a key, e-mails are printed in the server log.
  resendKey: val('RESEND_API_KEY'),
  emailFrom: val('EMAIL_FROM') || 'pedidos@checkpointgeek.com.br',
  storeNotify: val('STORE_NOTIFY_EMAIL'),

  // Shared secret for the scheduled job (expire Pix, drop alerts).
  cronSecret: val('CRON_SECRET'),
}

export const payments = {
  live: Boolean(env.mpAccessToken),
  // The card form (Mercado Pago Bricks) needs the public key in the browser.
  cardLive: Boolean(env.mpAccessToken && env.mpPublicKey),
}

// Simulation buttons ("simular pagamento") only exist outside production (or
// in a demo deploy) and only while Mercado Pago is not configured.
export const simulationEnabled = (!env.isProd || env.demo) && !payments.live

// The login link is shown on screen in development when no e-mail provider is
// configured, so accounts can be tested locally (and in a demo deploy).
export const showDevLoginLink = (!env.isProd || env.demo) && !env.resendKey
