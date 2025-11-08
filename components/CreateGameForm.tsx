'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function CreateGameForm({ userId }: { userId: string }) {
  const router = useRouter()
  const [chipsPerPlayer, setChipsPerPlayer] = useState('')
  const [multiplier, setMultiplier] = useState('5')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/games/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chipsPerPlayer: parseInt(chipsPerPlayer),
          multiplier: parseInt(multiplier) || 5,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create game')
      }

      router.push(`/games/${data.gameId}`)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="chipsPerPlayer" className="block text-sm font-medium text-gray-700 mb-2">
            Chips per Player
          </label>
          <input
            id="chipsPerPlayer"
            type="number"
            value={chipsPerPlayer}
            onChange={(e) => setChipsPerPlayer(e.target.value)}
            required
            min="1"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="e.g., 1000"
          />
          <p className="mt-1 text-sm text-gray-500">
            Amount of chips given to each player
          </p>
        </div>

        <div>
          <label htmlFor="multiplier" className="block text-sm font-medium text-gray-700 mb-2">
            Multiplier (Chips per Currency Unit)
          </label>
          <input
            id="multiplier"
            type="number"
            value={multiplier}
            onChange={(e) => setMultiplier(e.target.value)}
            required
            min="1"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            placeholder="5"
          />
          <p className="mt-1 text-sm text-gray-500">
            Number of chips equal to 1 Rupee
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex space-x-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Game'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}

