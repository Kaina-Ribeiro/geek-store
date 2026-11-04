import { HeroEditor } from '../../../../../components/painel/HeroEditor'
import { loadHero } from '../../../../../lib/painel/hero-store'
import { requireStaff } from '../../../../../lib/painel/session'
import { getClient } from '../../../../../lib/payload'

export const metadata = { title: 'Banner da home' }

export default async function BannerPage() {
  const user = await requireStaff()
  const initial = await loadHero(await getClient(), user)
  return <HeroEditor userId={user.id} initial={initial} />
}
