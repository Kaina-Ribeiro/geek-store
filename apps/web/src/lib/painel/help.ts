import 'server-only'

// "Chamar o Gabriel" link from PAINEL_HELP_WHATSAPP: a full https URL
// (https://wa.me/55...) or just the phone number. Unset = no help card.
export function helpUrl(): string | null {
  const v = process.env.PAINEL_HELP_WHATSAPP?.trim()
  if (!v) return null
  if (v.startsWith('https://')) return v
  const digits = v.replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : null
}
