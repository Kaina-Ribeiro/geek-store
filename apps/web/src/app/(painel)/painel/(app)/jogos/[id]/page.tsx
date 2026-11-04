import { notFound } from 'next/navigation'

import { GameForm } from '../../../../../../components/painel/GameForm'
import { loadGameDraft } from '../../../../../../lib/painel/game-store'
import { requireStaff } from '../../../../../../lib/painel/session'
import { getClient } from '../../../../../../lib/payload'

export const metadata = { title: 'Editar jogo' }

export default async function EditarJogoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ salvo?: string }>
}) {
  const user = await requireStaff()
  const [{ id }, { salvo }] = await Promise.all([params, searchParams])
  if (!/^\d+$/.test(id)) notFound()
  const loaded = await loadGameDraft(await getClient(), user, Number(id))
  if (!loaded) notFound()
  // A fresh key after each save remounts the form with the saved copies.
  return <GameForm key={salvo || 'edit'} userId={user.id} initial={loaded.draft} images={loaded.images} saved={Boolean(salvo)} />
}
