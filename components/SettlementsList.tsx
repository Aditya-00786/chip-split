'use client'

import { useState } from 'react'
import { formatMoney } from '@/lib/utils'
import { useRouter } from 'next/navigation'

interface Settlement {
  id?: string
  from: string
  fromName: string
  to: string
  toName: string
  amount: number
  isConfirmed: boolean
}

interface SettlementsListProps {
  settlements: Settlement[]
  currentUserId: string
}

export function SettlementsList({ settlements, currentUserId }: SettlementsListProps) {
  const router = useRouter()
  const [confirming, setConfirming] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleConfirm = async (settlementId: string) => {
    if (!settlementId) {
      setError('Settlement ID is missing')
      return
    }

    setConfirming(settlementId)
    setError(null)

    try {
      const response = await fetch('/api/settlements/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settlementId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to confirm settlement')
      }

      // Refresh the page to show updated balances
      router.refresh()
    } catch (err: any) {
      setError(err.message)
      setConfirming(null)
    }
  }

  if (settlements.length === 0) {
    return <p className="text-gray-500">All balances are settled! 🎉</p>
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-2">
        Minimum {settlements.length} transaction{settlements.length !== 1 ? 's' : ''} needed to settle all accounts
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}
      {settlements.map((settlement, idx) => {
        const isReceiver = settlement.to === currentUserId
        const canConfirm = isReceiver && !settlement.isConfirmed && settlement.id

        return (
          <div
            key={settlement.id || idx}
            className={`flex items-center justify-between p-4 rounded-lg border ${
              settlement.isConfirmed
                ? 'bg-green-50 border-green-200'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                settlement.isConfirmed ? 'bg-green-100' : 'bg-green-100'
              }`}>
                <span className={`font-semibold ${
                  settlement.isConfirmed ? 'text-green-700' : 'text-green-600'
                }`}>
                  {settlement.fromName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900">{settlement.fromName}</p>
                <p className="text-sm text-gray-500">
                  {settlement.isConfirmed ? 'paid' : 'owes'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <div className="text-right">
                <p className="font-medium text-gray-900">{settlement.toName}</p>
                <p className="text-sm text-gray-500">
                  {formatMoney(settlement.amount)}
                </p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                settlement.isConfirmed ? 'bg-green-100' : 'bg-blue-100'
              }`}>
                <span className={`font-semibold ${
                  settlement.isConfirmed ? 'text-green-700' : 'text-blue-600'
                }`}>
                  {settlement.toName.charAt(0).toUpperCase()}
                </span>
              </div>
              {canConfirm && (
                <button
                  onClick={() => handleConfirm(settlement.id!)}
                  disabled={confirming === settlement.id}
                  className="ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {confirming === settlement.id ? 'Confirming...' : 'Confirm Received'}
                </button>
              )}
              {settlement.isConfirmed && (
                <div className="ml-4 px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-lg">
                  ✓ Confirmed
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}

