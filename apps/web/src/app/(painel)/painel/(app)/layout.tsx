import type { ReactNode } from 'react'

import { Shell } from '../../../../components/painel/Shell'
import { helpUrl } from '../../../../lib/painel/help'
import { requireStaff } from '../../../../lib/painel/session'

// Every panel page needs a team login; the session is read on each request.
export const dynamic = 'force-dynamic'

export default async function PainelAppLayout({ children }: { children: ReactNode }) {
  const user = await requireStaff()
  return (
    <Shell user={{ name: user.name }} pending={0} helpUrl={helpUrl()}>
      {children}
    </Shell>
  )
}
