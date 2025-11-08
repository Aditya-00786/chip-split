import { createClient } from '@/lib/supabase/server'
import { createGame } from '@/lib/queries/games'
import { ensureUser } from '@/lib/queries/users'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Ensure user exists in users table (required for foreign key constraint)
    const name = 
      user.user_metadata?.full_name || 
      user.user_metadata?.name ||
      user.email?.split('@')[0] ||
      'User'

    try {
      await ensureUser(user.id, user.email || '', name)
    } catch (error: any) {
      console.error('Error ensuring user exists:', error)
      return NextResponse.json(
        { error: 'Failed to create user record. Please try logging out and back in.' },
        { status: 500 }
      )
    }

    const { chipsPerPlayer, multiplier } = await request.json()

    if (!chipsPerPlayer || chipsPerPlayer < 1) {
      return NextResponse.json(
        { error: 'Chips per player must be at least 1' },
        { status: 400 }
      )
    }

    const game = await createGame(user.id, chipsPerPlayer, multiplier || 5)

    // Auto-join the host
    const { error: joinError } = await supabase
      .from('game_participants')
      .insert({
        game_id: game.id,
        user_id: user.id,
        initial_chips: 0,
        total_rebuys_chips: 0,
        is_active: true,
      })

    if (joinError) {
      console.error('Error joining host to game:', joinError)
    }

    return NextResponse.json({ gameId: game.id })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to create game' },
      { status: 500 }
    )
  }
}

