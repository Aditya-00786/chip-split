import { createClient } from '@/lib/supabase/server'
import { getAllUsersWithBalances } from '@/lib/queries/users'
import { formatMoney } from '@/lib/utils'
import { SettlementsList } from '@/components/SettlementsList'
import Link from 'next/link'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    // Redirect to login will be handled by middleware
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-500">Redirecting to login...</p>
        </div>
      </div>
    )
  }
  
  const { balances, settlements } = await getAllUsersWithBalances()
  const currentUserBalance = balances.find(b => b.userId === user.id)
  
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h1>
        <p className="text-gray-600">Track your poker game balances and settlements</p>
      </div>

      {/* Current User Balance */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Balance</h2>
        <div className="text-4xl font-bold">
          {currentUserBalance && (
            <span className={
              currentUserBalance.amount === 0 
                ? 'text-yellow-600' 
                : currentUserBalance.amount > 0 
                  ? 'text-red-600' 
                  : 'text-green-600'
            }>
              {formatMoney(Math.abs(currentUserBalance.amount))}
              <span className="text-lg ml-2 text-gray-600">
                {currentUserBalance.amount === 0 
                  ? 'settled' 
                  : currentUserBalance.amount > 0 
                    ? 'owed' 
                    : 'owed to you'}
              </span>
            </span>
          )}
        </div>
      </div>

      {/* Settlements */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Settlements</h2>
        <SettlementsList settlements={settlements} currentUserId={user.id} />
      </div>

      {/* All Balances */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">All Balances</h2>
        <div className="space-y-2">
          {balances.map((balance) => (
            <div
              key={balance.userId}
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
            >
              <span className="font-medium text-gray-900">{balance.userName}</span>
              <span
                className={
                  balance.amount === 0
                    ? 'text-yellow-600 font-semibold'
                    : balance.amount > 0
                      ? 'text-red-600 font-semibold'
                      : 'text-green-600 font-semibold'
                }
              >
                {balance.amount === 0
                  ? 'Settled'
                  : balance.amount > 0
                    ? `Owes ${formatMoney(balance.amount)}`
                    : `Owed ${formatMoney(Math.abs(balance.amount))}`}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 text-center">
        <Link
          href="/games"
          className="inline-block bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
        >
          View All Games →
        </Link>
      </div>
    </div>
  )
}
