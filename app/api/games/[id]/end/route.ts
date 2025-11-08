import { createClient } from '@/lib/supabase/server'
import { endGame } from '@/lib/queries/games'
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

    const { finalChips } = await request.json()

    if (!finalChips || typeof finalChips !== 'object') {
      return NextResponse.json(
        { error: 'Final chips must be provided for all players' },
        { status: 400 }
      )
    }

    await endGame(id, user.id, finalChips)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to end game' },
      { status: 500 }
    )
  }
}

