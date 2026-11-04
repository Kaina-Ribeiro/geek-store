import { NextResponse } from 'next/server'

import { saveImage } from '../../../../lib/painel/media'
import { getStaffUser } from '../../../../lib/painel/session'
import { getClient } from '../../../../lib/payload'

export const dynamic = 'force-dynamic'

// Photo upload of the panel. A route (not a server action): server actions
// refuse bodies over 1 MB, and a phone photo is usually 2 to 6 MB. saveImage
// enforces the 8 MB limit and the real format.
export async function POST(req: Request) {
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'Escolha uma foto.' })
  const result = await saveImage(await getClient(), await getStaffUser(), file, String(form?.get('alt') || ''))
  return NextResponse.json(result)
}
