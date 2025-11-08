import { createClient } from '@/lib/supabase/server'
import { rebuyChips } from '@/lib/queries/games'
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

    const { chipAmount } = await request.json()

    if (!chipAmount || chipAmount < 1) {
      return NextResponse.json(
        { error: 'Chip amount must be at least 1' },
        { status: 400 }
      )
    }

    await rebuyChips(id, user.id, chipAmount)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to rebuy chips' },
      { status: 500 }
    )
  }
}

