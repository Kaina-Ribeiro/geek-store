import type { ReactNode } from 'react'

import { Shell } from '../../../../components/painel/Shell'
import { helpUrl } from '../../../../lib/painel/help'
import { requireStaff } from '../../../../lib/painel/session'
import { panelSummary } from '../../../../lib/painel/summary'
import { getClient } from '../../../../lib/payload'

// Every panel page needs a team login; the session is read on each request.
export const dynamic = 'force-dynamic'

export default async function PainelAppLayout({ children }: { children: ReactNode }) {
  const user = await requireStaff()
  const { pendingOrders } = await panelSummary(await getClient(), user)
  return (
    <Shell user={{ name: user.name }} pending={pendingOrders} helpUrl={helpUrl()}>
      {children}
    </Shell>
  )
}
