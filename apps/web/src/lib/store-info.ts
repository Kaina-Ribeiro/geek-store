// Store facts shown on the site. They come from environment variables so the
// client can fill them in without code changes; missing ones read "[a definir]".

const v = (s: string | undefined) => s?.trim() || '[a definir]'

export const STORE = {
  name: 'Checkpoint Geek',
  legalName: v(process.env.NEXT_PUBLIC_STORE_LEGAL_NAME),
  cnpj: v(process.env.NEXT_PUBLIC_STORE_CNPJ),
  address: v(process.env.NEXT_PUBLIC_STORE_ADDRESS),
  city: 'Taubaté · SP',
  hours: process.env.NEXT_PUBLIC_STORE_HOURS?.trim() || 'Seg a sáb · 10h às 19h',
  email: process.env.NEXT_PUBLIC_STORE_EMAIL?.trim() || 'contato@checkpointgeek.com.br',
  // Digits only, with country code: 5512999999999
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP?.replace(/\D/g, '') || '',
  instagram: 'https://www.instagram.com/_checkpoint_geek_/',
}

export const whatsappLink = (text?: string) =>
  `https://wa.me/${STORE.whatsapp}${text ? `?text=${encodeURIComponent(text)}` : ''}`
