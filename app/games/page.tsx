import { createClient } from '@/lib/supabase/server'
import { getGames } from '@/lib/queries/games'
import { formatChips, formatMoney, chipsToMoney } from '@/lib/utils'
import Link from 'next/link'
import { format } from 'date-fns'

export default async function GamesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    return null
  }
  
  const games = await getGames()
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'ended':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Games</h1>
          <p className="text-gray-600">View and manage all poker games</p>
        </div>
        <Link
          href="/games/create"
          className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          Create Game
        </Link>
      </div>

      {games.length === 0 ? (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <p className="text-gray-500 text-lg mb-4">No games yet</p>
          <Link
            href="/games/create"
            className="text-green-600 hover:text-green-700 font-medium"
          >
            Create your first game →
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {games.map((game: any) => (
            <Link
              key={game.id}
              href={`/games/${game.id}`}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Game #{game.id.slice(0, 8)}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {format(new Date(game.created_at), 'MMM d, yyyy h:mm a')}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                    game.status
                  )}`}
                >
                  {game.status}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Host:</span>
                  <span className="font-medium text-gray-900">
                    {game.host?.name || 'Unknown'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    {game.status === 'pending' ? 'Chips/Player:' : 'Pot:'}
                  </span>
                  <span className="font-medium text-gray-900">
                    {game.status === 'pending' 
                      ? `${formatChips(game.chips_per_player)} chips/player`
                      : `${formatChips(game.pot_chips || 0)} chips`
                    }
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Multiplier:</span>
                  <span className="font-medium text-gray-900">{game.multiplier}x</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Players:</span>
                  <span className="font-medium text-gray-900">
                    {game.participants?.length || 0}
                  </span>
                </div>
              </div>

              {game.status === 'ended' && game.participants && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-500 mb-2">Final Results:</p>
                  <div className="space-y-1">
                    {game.participants
                      .filter((p: any) => p.final_chips !== null)
                      .slice(0, 3)
                      .map((participant: any) => (
                        <div
                          key={participant.id}
                          className="flex justify-between text-xs"
                        >
                          <span className="text-gray-600">
                            {participant.user?.name || 'Unknown'}
                          </span>
                          <span
                            className={
                              (participant.net_balance_money || 0) >= 0
                                ? 'text-green-600 font-medium'
                                : 'text-red-600 font-medium'
                            }
                          >
                            {formatMoney(participant.net_balance_money || 0)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}

