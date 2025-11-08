'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatChips, formatMoney, chipsToMoney } from '@/lib/utils'
import { format } from 'date-fns'

interface GameDetailsClientProps {
  game: any
  userId: string
  isHost: boolean
  currentParticipant: any
}

export function GameDetailsClient({
  game,
  userId,
  isHost,
  currentParticipant,
}: GameDetailsClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRebuyModal, setShowRebuyModal] = useState(false)
  const [showLeaveModal, setShowLeaveModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [showEndGameModal, setShowEndGameModal] = useState(false)
  const [rebuyAmount, setRebuyAmount] = useState('')
  const [leaveChips, setLeaveChips] = useState('')
  const [joinChips, setJoinChips] = useState('')
  const [finalChips, setFinalChips] = useState<Record<string, string>>({})

  const handleStartGame = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/games/${game.id}/start`, {
        method: 'POST',
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to start game')
      }
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleRebuy = async () => {
    if (!rebuyAmount || parseInt(rebuyAmount) < 1) {
      setError('Please enter a valid chip amount')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/games/${game.id}/rebuy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chipAmount: parseInt(rebuyAmount) }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to rebuy')
      }
      setShowRebuyModal(false)
      setRebuyAmount('')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLeave = async () => {
    if (!leaveChips || parseInt(leaveChips) < 0) {
      setError('Please enter a valid chip count')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/games/${game.id}/leave`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentChips: parseInt(leaveChips) }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to leave game')
      }
      setShowLeaveModal(false)
      setLeaveChips('')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    // For pending games, no buy-in needed (will be set when game starts)
    // For active games, buy-in is required
    if (game.status === 'active' && (!joinChips || parseInt(joinChips) < 1)) {
      setError('Please enter a valid chip amount')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(`/api/games/${game.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyInChips: joinChips ? parseInt(joinChips) : undefined }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to join game')
      }
      setShowJoinModal(false)
      setJoinChips('')
      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEndGame = async () => {
    const activeParticipants = game.participants?.filter((p: any) => p.is_active)
    if (!activeParticipants || activeParticipants.length === 0) {
      setError('No active participants')
      return
    }

    // Validate all final chips are provided
    for (const p of activeParticipants) {
      if (!finalChips[p.user_id] || parseInt(finalChips[p.user_id]) < 0) {
        setError(`Please enter final chips for ${p.user?.name || 'all players'}`)
        return
      }
    }

    setLoading(true)
    setError(null)
    try {
      const finalChipsData: Record<string, number> = {}
      for (const [userId, chips] of Object.entries(finalChips)) {
        finalChipsData[userId] = parseInt(chips as string)
      }

      const response = await fetch(`/api/games/${game.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ finalChips: finalChipsData }),
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to end game')
      }
      setShowEndGameModal(false)
      setFinalChips({})
      router.push('/games')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

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
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Game #{game.id.slice(0, 8)}
            </h1>
            <p className="text-gray-500">
              Created {format(new Date(game.created_at), 'MMM d, yyyy h:mm a')}
            </p>
          </div>
          <span
            className={`px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(
              game.status
            )}`}
          >
            {game.status.toUpperCase()}
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">
              {game.status === 'pending' ? 'Chips per Player' : 'Pot'}
            </p>
            <p className="text-2xl font-bold text-gray-900">
              {game.status === 'pending' 
                ? `${formatChips(game.chips_per_player)} chips`
                : `${formatChips(game.pot_chips || 0)} chips`
              }
            </p>
            {game.status === 'pending' ? (
              <p className="text-sm text-gray-500">
                {formatMoney(chipsToMoney(game.chips_per_player, game.multiplier))} per player
              </p>
            ) : (
              <p className="text-sm text-gray-500">
                {formatMoney(chipsToMoney(game.pot_chips || 0, game.multiplier))}
              </p>
            )}
          </div>
          <div>
            <p className="text-sm text-gray-600">Multiplier</p>
            <p className="text-2xl font-bold text-gray-900">{game.multiplier}x</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Host</p>
            <p className="text-lg font-semibold text-gray-900">
              {game.host?.name || 'Unknown'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Players</p>
            <p className="text-2xl font-bold text-gray-900">
              {game.participants?.length || 0}
            </p>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-6 flex flex-wrap gap-3">
          {game.status === 'pending' && isHost && (
            <button
              onClick={handleStartGame}
              disabled={loading || (game.participants?.length || 0) < 2}
              className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Start Game
            </button>
          )}
          {game.status === 'pending' && !currentParticipant && (
            <button
              onClick={() => setShowJoinModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
            >
              Join Game
            </button>
          )}
          {game.status === 'active' && currentParticipant && currentParticipant.is_active && (
            <>
              <button
                onClick={() => setShowRebuyModal(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
              >
                Rebuy Chips
              </button>
              <button
                onClick={() => setShowLeaveModal(true)}
                className="bg-orange-600 hover:bg-orange-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
              >
                Leave Game
              </button>
            </>
          )}
          {game.status === 'active' && !currentParticipant && (
            <button
              onClick={() => setShowJoinModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
            >
              Join Mid-Game
            </button>
          )}
          {game.status === 'active' && isHost && (
            <button
              onClick={() => {
                const activeParticipants = game.participants?.filter((p: any) => p.is_active)
                const chips: Record<string, string> = {}
                activeParticipants?.forEach((p: any) => {
                  chips[p.user_id] = ''
                })
                setFinalChips(chips)
                setShowEndGameModal(true)
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
            >
              End Game
            </button>
          )}
        </div>
      </div>

      {/* Participants */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Participants</h2>
        <div className="space-y-3">
          {game.participants?.map((participant: any) => {
            const totalInvested =
              Math.abs(participant.initial_chips) + (participant.total_rebuys_chips || 0)
            const currentBalance =
              participant.final_chips !== null
                ? participant.final_chips
                : participant.initial_chips + (participant.total_rebuys_chips || 0)

            return (
              <div
                key={participant.id}
                className={`p-4 rounded-lg border ${
                  participant.is_active
                    ? 'bg-green-50 border-green-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-semibold text-gray-900">
                      {participant.user?.name || 'Unknown'}
                      {!participant.is_active && (
                        <span className="ml-2 text-sm text-gray-500">(Left)</span>
                      )}
                    </p>
                    <div className="text-sm text-gray-600 mt-1">
                      <span>Initial: {formatChips(Math.abs(participant.initial_chips))} chips</span>
                      {participant.total_rebuys_chips > 0 && (
                        <span className="ml-3">
                          Rebuys: {formatChips(participant.total_rebuys_chips)} chips
                        </span>
                      )}
                      {participant.final_chips !== null && (
                        <span className="ml-3">
                          Final: {formatChips(participant.final_chips)} chips
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    {participant.net_balance_money !== null && (
                      <p
                        className={`text-lg font-semibold ${
                          participant.net_balance_money >= 0
                            ? 'text-green-600'
                            : 'text-red-600'
                        }`}
                      >
                        {formatMoney(participant.net_balance_money)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Transactions */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Transaction History</h2>
        <div className="space-y-2">
          {game.transactions?.length === 0 ? (
            <p className="text-gray-500">No transactions yet</p>
          ) : (
            game.transactions
              ?.sort(
                (a: any, b: any) =>
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
              )
              .map((transaction: any) => (
                <div
                  key={transaction.id}
                  className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {transaction.user?.name || 'Unknown'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {format(new Date(transaction.created_at), 'MMM d, h:mm a')}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        transaction.type === 'buy_in' || transaction.type === 'rebuy'
                          ? 'bg-blue-100 text-blue-800'
                          : transaction.type === 'leave'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                      }`}
                    >
                      {transaction.type.replace('_', ' ')}
                    </span>
                    <p className="mt-1 text-sm font-medium text-gray-900">
                      {formatChips(transaction.amount_chips)} chips
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatMoney(transaction.amount_money)}
                    </p>
                  </div>
                </div>
              ))
          )}
        </div>
      </div>

      {/* Modals */}
      {showRebuyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Rebuy Chips</h3>
            <input
              type="number"
              value={rebuyAmount}
              onChange={(e) => setRebuyAmount(e.target.value)}
              placeholder="Chip amount"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
            />
            <div className="flex space-x-3">
              <button
                onClick={handleRebuy}
                disabled={loading}
                className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 rounded-lg"
              >
                {loading ? 'Processing...' : 'Rebuy'}
              </button>
              <button
                onClick={() => {
                  setShowRebuyModal(false)
                  setRebuyAmount('')
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showLeaveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Leave Game</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter your current chip count
            </p>
            <input
              type="number"
              value={leaveChips}
              onChange={(e) => setLeaveChips(e.target.value)}
              placeholder="Current chips"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
            />
            <div className="flex space-x-3">
              <button
                onClick={handleLeave}
                disabled={loading}
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 rounded-lg"
              >
                {loading ? 'Processing...' : 'Leave'}
              </button>
              <button
                onClick={() => {
                  setShowLeaveModal(false)
                  setLeaveChips('')
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showJoinModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-semibold mb-4">Join Game</h3>
            {game.status === 'pending' ? (
              <p className="text-sm text-gray-600 mb-4">
                You'll be added to the game. Buy-in will be set when the host starts the game.
              </p>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-4">
                  Enter your buy-in chip amount
                </p>
                <input
                  type="number"
                  value={joinChips}
                  onChange={(e) => setJoinChips(e.target.value)}
                  placeholder="Buy-in chips"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4"
                />
              </>
            )}
            <div className="flex space-x-3">
              <button
                onClick={handleJoin}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg"
              >
                {loading ? 'Processing...' : 'Join'}
              </button>
              <button
                onClick={() => {
                  setShowJoinModal(false)
                  setJoinChips('')
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showEndGameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[80vh] overflow-y-auto">
            <h3 className="text-xl font-semibold mb-4">End Game</h3>
            <p className="text-sm text-gray-600 mb-4">
              Enter final chip counts for all active players
            </p>
            <div className="space-y-3 mb-4">
              {game.participants
                ?.filter((p: any) => p.is_active)
                .map((participant: any) => (
                  <div key={participant.id}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {participant.user?.name || 'Unknown'}
                    </label>
                    <input
                      type="number"
                      value={finalChips[participant.user_id] || ''}
                      onChange={(e) =>
                        setFinalChips({
                          ...finalChips,
                          [participant.user_id]: e.target.value,
                        })
                      }
                      placeholder="Final chips"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                ))}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleEndGame}
                disabled={loading}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg"
              >
                {loading ? 'Processing...' : 'End Game'}
              </button>
              <button
                onClick={() => {
                  setShowEndGameModal(false)
                  setFinalChips({})
                }}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

