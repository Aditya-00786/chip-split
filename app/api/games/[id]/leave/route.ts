import { createClient } from '@/lib/supabase/server'
import { leaveGame } from '@/lib/queries/games'
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

    const { currentChips } = await request.json()

    if (currentChips === undefined || currentChips < 0) {
      return NextResponse.json(
        { error: 'Current chips must be a valid number' },
        { status: 400 }
      )
    }

    await leaveGame(id, user.id, currentChips)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to leave game' },
      { status: 500 }
    )
  }
}

