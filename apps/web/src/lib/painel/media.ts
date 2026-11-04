import 'server-only'

import type { Payload } from 'payload'
import sharp from 'sharp'

import type { User } from '../../payload-types'
import { heroImage, type Img } from '../data'

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const TYPES = ['image/jpeg', 'image/png', 'image/webp']
const FORMATS = ['jpeg', 'png', 'webp']
const BAD_TYPE = 'Use uma foto JPG, PNG ou WebP'

export type SaveImageResult = { ok: true; id: number; url: string; image: Img } | { ok: false; error: string }

// Photo sent from the panel (campaign art, game cover, laudo photos). The real
// format is checked with sharp: a renamed PDF or a HEIC from an iPhone is
// refused with a clear message and nothing is saved.
export async function saveImage(payload: Payload, user: User | null, file: File, alt: string): Promise<SaveImageResult> {
  if (!user) return { ok: false, error: 'Sua sessão acabou. Entre de novo.' }
  if (!file || typeof file.arrayBuffer !== 'function' || !file.size) return { ok: false, error: 'Escolha uma foto.' }
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'Foto grande demais (máx. 8 MB)' }
  if (!TYPES.includes(file.type)) return { ok: false, error: BAD_TYPE }

  const data = Buffer.from(await file.arrayBuffer())
  const format = await sharp(data)
    .metadata()
    .then((m) => m.format)
    .catch(() => null)
  if (!format || !FORMATS.includes(format)) return { ok: false, error: BAD_TYPE }

  try {
    const media = await payload.create({
      collection: 'media',
      data: { alt: alt.trim().slice(0, 120) || 'Foto da loja' },
      file: { data, mimetype: `image/${format}`, name: file.name || `foto.${format}`, size: data.length },
      user,
      overrideAccess: false,
    })
    const image = heroImage(media)
    return { ok: true, id: media.id, url: image.url, image }
  } catch (err) {
    const status = (err as { status?: number })?.status
    if (status === 401 || status === 403) return { ok: false, error: 'Sua sessão acabou. Entre de novo.' }
    payload.logger.error({ err }, '[painel] falha ao gravar a foto')
    return { ok: false, error: 'Não deu para enviar a foto. Tente de novo.' }
  }
}
