import { createClient } from '@/lib/supabase/server'
import { Game, GameParticipant, GameTransaction, User } from '@/types/database'
import { chipsToMoney } from '@/lib/utils'

export async function getGames() {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      host:users!games_host_id_fkey(id, name),
      participants:game_participants(
        *,
        user:users!game_participants_user_id_fkey(id, name)
      )
    `)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function getGame(gameId: string) {
  const supabase = await createClient()
  
  const { data, error } = await supabase
    .from('games')
    .select(`
      *,
      host:users!games_host_id_fkey(id, name),
      participants:game_participants(
        *,
        user:users!game_participants_user_id_fkey(id, name)
      ),
      transactions:game_transactions(
        *,
        user:users!game_transactions_user_id_fkey(id, name)
      )
    `)
    .eq('id', gameId)
    .single()
  
  if (error) throw error
  return data
}

export async function createGame(hostId: string, chipsPerPlayer: number, multiplier: number = 5) {
  const supabase = await createClient()
  
  const { data: game, error: gameError } = await supabase
    .from('games')
    .insert({
      host_id: hostId,
      chips_per_player: chipsPerPlayer,
      pot_chips: 0, // Will be calculated when game starts
      multiplier,
      status: 'pending',
    })
    .select()
    .single()
  
  if (gameError) throw gameError
  return game
}

export async function joinGame(gameId: string, userId: string) {
  const supabase = await createClient()
  
  // Check if user already joined
  const { data: existing } = await supabase
    .from('game_participants')
    .select('id')
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .single()
  
  if (existing) {
    throw new Error('User already joined this game')
  }
  
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()
  
  if (!game) throw new Error('Game not found')
  
  // If game is pending, initial balance will be set when game starts
  // Each player will get chips_per_player chips (negative balance)
  // For now set to 0
  const { data: participant, error } = await supabase
    .from('game_participants')
    .insert({
      game_id: gameId,
      user_id: userId,
      initial_chips: 0,
      total_rebuys_chips: 0,
      is_active: true,
    })
    .select()
    .single()
  
  if (error) throw error
  return participant
}

export async function startGame(gameId: string, hostId: string) {
  const supabase = await createClient()
  
  // Verify host
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()
  
  if (!game || game.host_id !== hostId) {
    throw new Error('Only the host can start the game')
  }
  
  if (game.status !== 'pending') {
    throw new Error('Game already started')
  }
  
  // Get all active participants who have joined the game
  const { data: participants, error: participantsError } = await supabase
    .from('game_participants')
    .select('*')
    .eq('game_id', gameId)
    .eq('is_active', true)
  
  if (participantsError) throw participantsError
  
  if (!participants || participants.length < 2) {
    throw new Error('Need at least 2 active players to start')
  }
  
  // Calculate pot from chips per player × number of participants
  const potChips = game.chips_per_player * participants.length
  
  // Each player gets chips_per_player chips, so they owe that amount (negative)
  const initialChips = -game.chips_per_player
  const chipsPerPlayer = game.chips_per_player
  
  // Ensure all participants receive their initial chips
  const updatedParticipants: string[] = []
  
  for (const participant of participants) {
    // Update participant with initial chips
    const { error: updateError } = await supabase
      .from('game_participants')
      .update({
        initial_chips: initialChips,
      })
      .eq('id', participant.id)
      .eq('is_active', true)
    
    if (updateError) {
      throw new Error(`Failed to give initial chips to participant ${participant.user_id}: ${updateError.message}`)
    }
    
    updatedParticipants.push(participant.id)
    
    // Create buy_in transaction to record that the player received chips
    const { error: txError } = await supabase
      .from('game_transactions')
      .insert({
        game_id: gameId,
        user_id: participant.user_id,
        type: 'buy_in',
        amount_chips: chipsPerPlayer,
        amount_money: chipsToMoney(chipsPerPlayer, game.multiplier),
      })
    
    if (txError) {
      throw new Error(`Failed to create transaction for participant ${participant.user_id}: ${txError.message}`)
    }
  }
  
  // Verify all participants were updated
  if (updatedParticipants.length !== participants.length) {
    throw new Error(`Failed to update all participants. Expected ${participants.length}, updated ${updatedParticipants.length}`)
  }
  
  // Update game status and pot_chips
  const { data: updatedGame, error: updateError } = await supabase
    .from('games')
    .update({ 
      status: 'active',
      pot_chips: potChips
    })
    .eq('id', gameId)
    .select()
    .single()
  
  if (updateError) throw updateError
  return updatedGame
}

export async function rebuyChips(gameId: string, userId: string, chipAmount: number) {
  const supabase = await createClient()
  
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()
  
  if (!game || game.status !== 'active') {
    throw new Error('Game is not active')
  }
  
  // Get participant
  const { data: participant } = await supabase
    .from('game_participants')
    .select('*')
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .single()
  
  if (!participant || !participant.is_active) {
    throw new Error('Participant not found or inactive')
  }
  
  // Update participant
  const { error: updateError } = await supabase
    .from('game_participants')
    .update({
      total_rebuys_chips: (participant.total_rebuys_chips || 0) + chipAmount,
    })
    .eq('id', participant.id)
  
  if (updateError) throw updateError
  
  // Update pot
  const { error: potError } = await supabase
    .from('games')
    .update({
      pot_chips: game.pot_chips + chipAmount,
    })
    .eq('id', gameId)
  
  if (potError) throw potError
  
  // Create transaction
  const { error: txError } = await supabase
    .from('game_transactions')
    .insert({
      game_id: gameId,
      user_id: userId,
      type: 'rebuy',
      amount_chips: chipAmount,
      amount_money: chipsToMoney(chipAmount, game.multiplier),
    })
  
  if (txError) throw txError
}

export async function leaveGame(gameId: string, userId: string, currentChips: number) {
  const supabase = await createClient()
  
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()
  
  if (!game || game.status !== 'active') {
    throw new Error('Game is not active')
  }
  
  // Get participant
  const { data: participant } = await supabase
    .from('game_participants')
    .select('*')
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .single()
  
  if (!participant || !participant.is_active) {
    throw new Error('Participant not found or already left')
  }
  
  // Calculate net balance
  const totalInvested = Math.abs(participant.initial_chips) + (participant.total_rebuys_chips || 0)
  const netBalanceChips = currentChips - totalInvested
  const netBalanceMoney = chipsToMoney(netBalanceChips, game.multiplier)
  
  // Update participant
  const { error: updateError } = await supabase
    .from('game_participants')
    .update({
      final_chips: currentChips,
      is_active: false,
      net_balance_money: netBalanceMoney,
    })
    .eq('id', participant.id)
  
  if (updateError) throw updateError
  
  // Update user's total balance
  const { data: user } = await supabase
    .from('users')
    .select('total_net_balance_money')
    .eq('id', userId)
    .single()
  
  if (user) {
    await supabase
      .from('users')
      .update({
        total_net_balance_money: (user.total_net_balance_money || 0) + netBalanceMoney,
      })
      .eq('id', userId)
  }
  
  // Create transaction
  const { error: txError } = await supabase
    .from('game_transactions')
    .insert({
      game_id: gameId,
      user_id: userId,
      type: 'leave',
      amount_chips: currentChips,
      amount_money: chipsToMoney(currentChips, game.multiplier),
    })
  
  if (txError) throw txError
}

export async function endGame(
  gameId: string,
  hostId: string,
  finalChips: Record<string, number>
) {
  const supabase = await createClient()
  
  // Verify host
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()
  
  if (!game || game.host_id !== hostId) {
    throw new Error('Only the host can end the game')
  }
  
  if (game.status !== 'active') {
    throw new Error('Game is not active')
  }
  
  // Get all active participants
  const { data: participants } = await supabase
    .from('game_participants')
    .select('*')
    .eq('game_id', gameId)
    .eq('is_active', true)
  
  if (!participants) throw new Error('No participants found')
  
  // Update each participant with final chips and calculate net balance
  for (const participant of participants) {
    const chips = finalChips[participant.user_id]
    if (chips === undefined) {
      throw new Error(`Final chips not provided for user ${participant.user_id}`)
    }
    
    const totalInvested = Math.abs(participant.initial_chips) + (participant.total_rebuys_chips || 0)
    const netBalanceChips = chips - totalInvested
    const netBalanceMoney = chipsToMoney(netBalanceChips, game.multiplier)
    
    // Update participant
    const { error: updateError } = await supabase
      .from('game_participants')
      .update({
        final_chips: chips,
        net_balance_money: netBalanceMoney,
        is_active: false,
      })
      .eq('id', participant.id)
    
    if (updateError) throw updateError
    
    // Update user's total balance
    const { data: user } = await supabase
      .from('users')
      .select('total_net_balance_money')
      .eq('id', participant.user_id)
      .single()
    
    if (user) {
      await supabase
        .from('users')
        .update({
          total_net_balance_money: (user.total_net_balance_money || 0) + netBalanceMoney,
        })
        .eq('id', participant.user_id)
    }
    
    // Create payout transaction
    const { error: txError } = await supabase
      .from('game_transactions')
      .insert({
        game_id: gameId,
        user_id: participant.user_id,
        type: 'payout',
        amount_chips: chips,
        amount_money: chipsToMoney(chips, game.multiplier),
      })
    
    if (txError) throw txError
  }
  
  // Update game status
  const { data: updatedGame, error: updateError } = await supabase
    .from('games')
    .update({ status: 'ended' })
    .eq('id', gameId)
    .select()
    .single()
  
  if (updateError) throw updateError
  return updatedGame
}

export async function joinGameMidGame(
  gameId: string,
  userId: string,
  buyInChips: number
) {
  const supabase = await createClient()
  
  const { data: game } = await supabase
    .from('games')
    .select('*')
    .eq('id', gameId)
    .single()
  
  if (!game || game.status !== 'active') {
    throw new Error('Game is not active')
  }
  
  // Check if user already joined
  const { data: existing } = await supabase
    .from('game_participants')
    .select('id')
    .eq('game_id', gameId)
    .eq('user_id', userId)
    .single()
  
  if (existing) {
    throw new Error('User already joined this game')
  }
  
  // Create participant with negative initial chips
  const { data: participant, error: participantError } = await supabase
    .from('game_participants')
    .insert({
      game_id: gameId,
      user_id: userId,
      initial_chips: -buyInChips,
      total_rebuys_chips: 0,
      is_active: true,
    })
    .select()
    .single()
  
  if (participantError) throw participantError
  
  // Update pot
  const { error: potError } = await supabase
    .from('games')
    .update({
      pot_chips: game.pot_chips + buyInChips,
    })
    .eq('id', gameId)
  
  if (potError) throw potError
  
  // Create transaction
  const { error: txError } = await supabase
    .from('game_transactions')
    .insert({
      game_id: gameId,
      user_id: userId,
      type: 'buy_in',
      amount_chips: buyInChips,
      amount_money: chipsToMoney(buyInChips, game.multiplier),
    })
  
  if (txError) throw txError
  
  return participant
}

