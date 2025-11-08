import { createClient } from '@/lib/supabase/server'
import { calculateSettlements, type Balance } from '@/lib/settlement'

export async function getUser(userId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) throw error
  return data
}

export async function ensureUser(userId: string, email: string, name?: string) {
  const supabase = await createClient()
  
  // Check if user exists
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', userId)
    .single()
  
  if (!existing) {
    // Create user if doesn't exist
    const { error } = await supabase
      .from('users')
      .insert({
        id: userId,
        name: name || email.split('@')[0],
        total_net_balance_money: 0,
      })
    
    if (error) throw error
  }
}

export async function getAllUsersWithBalances() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('users')
    .select('id, name, total_net_balance_money')
    .order('name')
  
  if (error) throw error
  
  // Use database balances directly (they're already updated when settlements are confirmed)
  const balances: Balance[] = (data || []).map(user => ({
    userId: user.id,
    userName: user.name || 'Unknown',
    amount: user.total_net_balance_money || 0,
  }))
  
  const settlements = calculateSettlements(balances)
  
  // Get all existing settlements from database (both confirmed and unconfirmed)
  const { data: existingSettlements } = await supabase
    .from('settlements')
    .select('id, from_user_id, to_user_id, amount, is_confirmed')
  
  // Match calculated settlements with existing ones
  const settlementsWithIds = settlements.map(settlement => {
    const existing = existingSettlements?.find(
      s => s.from_user_id === settlement.from && 
           s.to_user_id === settlement.to &&
           Math.abs(Number(s.amount) - settlement.amount) < 0.01
    )
    return {
      ...settlement,
      id: existing?.id,
      isConfirmed: existing?.is_confirmed || false,
    }
  })
  
  // Create new settlements in database if they don't exist (only unconfirmed ones)
  for (const settlement of settlementsWithIds) {
    if (!settlement.id && !settlement.isConfirmed) {
      const { data: newSettlement } = await supabase
        .from('settlements')
        .insert({
          from_user_id: settlement.from,
          to_user_id: settlement.to,
          amount: settlement.amount,
          is_confirmed: false,
        })
        .select('id')
        .single()
      
      if (newSettlement) {
        settlement.id = newSettlement.id
      }
    }
  }
  
  // Filter out confirmed settlements from display (only show pending ones)
  const pendingSettlements = settlementsWithIds.filter(s => !s.isConfirmed)
  
  return {
    balances,
    settlements: pendingSettlements,
    users: data || [],
  }
}
