import type { Access, FieldAccess } from 'payload'

// Admin roles (collection "users"): the store owner (dono) can do everything,
// staff (equipe) handles catalog and orders but not team or settings.
type AdminUser = { collection?: string; role?: 'dono' | 'equipe' } | null | undefined

const asAdmin = (user: unknown): AdminUser =>
  user && (user as { collection?: string }).collection === 'users' ? (user as AdminUser) : null

export const isDono = (user: unknown) => asAdmin(user)?.role === 'dono'
export const isStaff = (user: unknown) => Boolean(asAdmin(user))

export const anyone: Access = () => true
export const staffOnly: Access = ({ req }) => isStaff(req.user)
export const donoOnly: Access = ({ req }) => isDono(req.user)
export const donoField: FieldAccess = ({ req }) => isDono(req.user)
