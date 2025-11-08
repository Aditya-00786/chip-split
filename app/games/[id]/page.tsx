import { createClient } from '@/lib/supabase/server'
import { getGame } from '@/lib/queries/games'
import { formatChips, formatMoney, chipsToMoney } from '@/lib/utils'
import { format } from 'date-fns'
import { GameDetailsClient } from '@/components/GameDetailsClient'
import { notFound } from 'next/navigation'

export default async function GameDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  let game
  try {
    game = await getGame(id)
  } catch (error) {
    notFound()
  }

  const isHost = game.host_id === user.id
  const currentParticipant = game.participants?.find(
    (p: any) => p.user_id === user.id
  )

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <GameDetailsClient
        game={game}
        userId={user.id}
        isHost={isHost}
        currentParticipant={currentParticipant}
      />
    </div>
  )
}

