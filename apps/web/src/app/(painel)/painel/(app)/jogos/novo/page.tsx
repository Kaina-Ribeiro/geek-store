import { GameForm } from '../../../../../../components/painel/GameForm'
import { requireStaff } from '../../../../../../lib/painel/session'

export const metadata = { title: 'Adicionar jogo' }

export default async function NovoJogoPage() {
  const user = await requireStaff()
  return <GameForm userId={user.id} />
}
