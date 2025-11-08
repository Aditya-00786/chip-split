import { createClient } from '@/lib/supabase/server'
import { joinGame, joinGameMidGame } from '@/lib/queries/games'
import { ensureUser } from '@/lib/queries/users'
import { NextResponse } from 'next/server'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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

    // Check game status
    const { data: game } = await supabase
      .from('games')
      .select('status')
      .eq('id', id)
      .single()

    if (!game) {
      return NextResponse.json({ error: 'Game not found' }, { status: 404 })
    }

    const { buyInChips } = await request.json()

    if (game.status === 'pending') {
      await joinGame(id, user.id)
    } else if (game.status === 'active') {
      if (!buyInChips || buyInChips < 1) {
        return NextResponse.json(
          { error: 'Buy-in chips must be at least 1 for active games' },
          { status: 400 }
        )
      }
      await joinGameMidGame(id, user.id, buyInChips)
    } else {
      return NextResponse.json(
        { error: 'Cannot join a game that has ended' },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to join game' },
      { status: 500 }
    )
  }
}

