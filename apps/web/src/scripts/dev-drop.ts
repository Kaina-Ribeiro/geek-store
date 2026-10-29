/* Dev helper: moves the latest drop to open in N minutes (negative = already
 * open) and optionally sets a customer's XP. Usage:
 *   pnpm --filter web payload run src/scripts/dev-drop.ts -- 10 cliente@x.com 2000 */
import { getPayload } from 'payload'

import config from '../payload.config'

const [mins = '10', email, xp] = process.argv.slice(2).filter((a) => a !== '--')
const payload = await getPayload({ config })
const drop = (await payload.find({ collection: 'drops', sort: '-opensAt', limit: 1 })).docs[0]
const opensAt = new Date(Date.now() + Number(mins) * 60_000).toISOString()
await payload.update({ collection: 'drops', id: drop.id, data: { opensAt, alertSentAt: null }, overrideAccess: true })
console.log(`drop "${drop.title}" abre em ${opensAt}`)
if (email && xp) {
  const c = (await payload.find({ collection: 'customers', where: { email: { equals: email } }, limit: 1, overrideAccess: true })).docs[0]
  if (c) {
    await payload.update({ collection: 'customers', id: c.id, data: { xp: Number(xp) }, overrideAccess: true })
    console.log(`${email} agora tem ${xp} XP`)
  }
}
process.exit(0)
