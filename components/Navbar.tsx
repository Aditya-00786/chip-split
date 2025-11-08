import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { LogoutButton } from './LogoutButton'

export async function Navbar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return null
  }

  return (
    <nav className="bg-green-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="flex items-center space-x-2">
              <span className="text-2xl">♠️</span>
              <span className="text-xl font-bold">ChipSplit</span>
            </Link>
            <div className="flex space-x-4">
              <Link
                href="/"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-green-800 transition-colors"
              >
                Dashboard
              </Link>
              <Link
                href="/games"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-green-800 transition-colors"
              >
                Games
              </Link>
              <Link
                href="/games/create"
                className="px-3 py-2 rounded-md text-sm font-medium hover:bg-green-800 transition-colors"
              >
                Create Game
              </Link>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <span className="text-sm">{user.email}</span>
            <LogoutButton />
          </div>
        </div>
      </div>
    </nav>
  )
}

