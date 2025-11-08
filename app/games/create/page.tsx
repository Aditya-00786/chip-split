import { createClient } from '@/lib/supabase/server'
import { CreateGameForm } from '@/components/CreateGameForm'
import { redirect } from 'next/navigation'

export default async function CreateGamePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    redirect('/login')
  }
  
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Create New Game</h1>
        <p className="text-gray-600">Set up a new poker game session</p>
      </div>

      <CreateGameForm userId={user.id} />
    </div>
  )
}

