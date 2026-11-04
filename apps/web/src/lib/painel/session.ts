import 'server-only'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { cache } from 'react'

import type { User } from '../../payload-types'
import { getClient } from '../payload'
import { safeReturn } from './paths'

export type StaffUser = User & { collection: 'users' }

// Person of the team (owner or staff) signed in with the payload-token cookie,
// the same session the /admin uses. Store customers are not staff.
export const getStaffUser = cache(async (): Promise<StaffUser | null> => {
  const payload = await getClient()
  const { user } = await payload.auth({ headers: await headers() })
  return user && user.collection === 'users' ? (user as StaffUser) : null
})

// For panel pages: the signed-in staff user, or a redirect to the login that
// comes back to the same page (path from the x-pathname header set in proxy.ts).
export async function requireStaff(): Promise<StaffUser> {
  const user = await getStaffUser()
  if (user) return user
  const path = (await headers()).get('x-pathname') || '/painel'
  redirect(`/painel/entrar?volta=${encodeURIComponent(safeReturn(path))}`)
}
