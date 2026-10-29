'use client'

import { HeartIcon } from '@checkpoint/ui'

import { useCart } from '../../store/cart'

export function SoldOut({ gameId }: { gameId: number }) {
  const saved = useCart((s) => Boolean(s.saves[gameId]))
  const toggle = useCart((s) => s.toggleSave)
  return (
    <div className="pdp-out">
      <b>Esgotado por enquanto</b>
      <p>Cópias usadas são únicas e esta já tem dono. Salve nos save slots para achar fácil quando chegar outra.</p>
      <button className="btn btn-solid" aria-pressed={saved} onClick={() => toggle(gameId)}>
        <HeartIcon size={18} filled={saved} />
        {saved ? 'Nos seus save slots' : 'Salvar nos save slots'}
      </button>
    </div>
  )
}
