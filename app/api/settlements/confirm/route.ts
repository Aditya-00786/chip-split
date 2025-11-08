import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { settlementId } = await request.json()

    if (!settlementId) {
      return NextResponse.json({ error: 'Settlement ID is required' }, { status: 400 })
    }

    // Get the settlement to verify the user is the receiver
    const { data: settlement, error: fetchError } = await supabase
      .from('settlements')
      .select('*')
      .eq('id', settlementId)
      .single()

    if (fetchError || !settlement) {
      return NextResponse.json({ error: 'Settlement not found' }, { status: 404 })
    }

    if (settlement.to_user_id !== user.id) {
      return NextResponse.json({ error: 'Only the receiver can confirm this settlement' }, { status: 403 })
    }

    if (settlement.is_confirmed) {
      return NextResponse.json({ error: 'Settlement already confirmed' }, { status: 400 })
    }

    // Confirm the settlement
    const { error: updateError } = await supabase
      .from('settlements')
      .update({
        is_confirmed: true,
        confirmed_at: new Date().toISOString(),
      })
      .eq('id', settlementId)

    if (updateError) {
      return NextResponse.json({ error: 'Failed to confirm settlement' }, { status: 500 })
    }

    // Update balances: reduce from_user's debt and to_user's credit
    const { error: fromUserError } = await supabase.rpc('update_user_balance', {
      user_id: settlement.from_user_id,
      amount_change: -settlement.amount
    }).catch(async () => {
      // If RPC doesn't exist, use direct update
      const { data: fromUser } = await supabase
        .from('users')
        .select('total_net_balance_money')
        .eq('id', settlement.from_user_id)
        .single()

      if (fromUser) {
        await supabase
          .from('users')
          .update({
            total_net_balance_money: (fromUser.total_net_balance_money || 0) - settlement.amount
          })
          .eq('id', settlement.from_user_id)
      }
    })

    const { error: toUserError } = await supabase.rpc('update_user_balance', {
      user_id: settlement.to_user_id,
      amount_change: settlement.amount
    }).catch(async () => {
      // If RPC doesn't exist, use direct update
      const { data: toUser } = await supabase
        .from('users')
        .select('total_net_balance_money')
        .eq('id', settlement.to_user_id)
        .single()

      if (toUser) {
        await supabase
          .from('users')
          .update({
            total_net_balance_money: (toUser.total_net_balance_money || 0) + settlement.amount
          })
          .eq('id', settlement.to_user_id)
      }
    })

    // Update balances: 
    // - Payer's balance decreases (they paid, so they owe less)
    // - Receiver's balance increases (they received, so they're owed less, meaning negative becomes less negative)
    const { data: fromUser } = await supabase
      .from('users')
      .select('total_net_balance_money')
      .eq('id', settlement.from_user_id)
      .single()

    if (fromUser) {
      const newBalance = (fromUser.total_net_balance_money || 0) - Number(settlement.amount)
      await supabase
        .from('users')
        .update({
          total_net_balance_money: newBalance
        })
        .eq('id', settlement.from_user_id)
    }

    const { data: toUser } = await supabase
      .from('users')
      .select('total_net_balance_money')
      .eq('id', settlement.to_user_id)
      .single()

    if (toUser) {
      const newBalance = (toUser.total_net_balance_money || 0) + Number(settlement.amount)
      await supabase
        .from('users')
        .update({
          total_net_balance_money: newBalance
        })
        .eq('id', settlement.to_user_id)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to confirm settlement' },
      { status: 500 }
    )
  }
}

