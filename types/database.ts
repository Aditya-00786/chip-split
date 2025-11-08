export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string | null
          total_net_balance_money: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          name?: string | null
          total_net_balance_money?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string | null
          total_net_balance_money?: number
          created_at?: string
          updated_at?: string
        }
      }
      games: {
        Row: {
          id: string
          host_id: string
          chips_per_player: number
          pot_chips: number | null
          multiplier: number
          status: 'pending' | 'active' | 'ended'
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          host_id: string
          chips_per_player: number
          pot_chips?: number | null
          multiplier?: number
          status?: 'pending' | 'active' | 'ended'
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          host_id?: string
          chips_per_player?: number
          pot_chips?: number | null
          multiplier?: number
          status?: 'pending' | 'active' | 'ended'
          created_at?: string
          updated_at?: string
        }
      }
      game_participants: {
        Row: {
          id: string
          game_id: string
          user_id: string
          initial_chips: number
          total_rebuys_chips: number
          final_chips: number | null
          is_active: boolean
          net_balance_money: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          game_id: string
          user_id: string
          initial_chips?: number
          total_rebuys_chips?: number
          final_chips?: number | null
          is_active?: boolean
          net_balance_money?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          user_id?: string
          initial_chips?: number
          total_rebuys_chips?: number
          final_chips?: number | null
          is_active?: boolean
          net_balance_money?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      game_transactions: {
        Row: {
          id: string
          game_id: string
          user_id: string
          type: 'buy_in' | 'rebuy' | 'leave' | 'payout'
          amount_chips: number
          amount_money: number
          created_at: string
        }
        Insert: {
          id?: string
          game_id: string
          user_id: string
          type: 'buy_in' | 'rebuy' | 'leave' | 'payout'
          amount_chips: number
          amount_money: number
          created_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          user_id?: string
          type?: 'buy_in' | 'rebuy' | 'leave' | 'payout'
          amount_chips?: number
          amount_money?: number
          created_at?: string
        }
      }
    }
  }
}

export type User = Database['public']['Tables']['users']['Row']
export type Game = Database['public']['Tables']['games']['Row']
export type GameParticipant = Database['public']['Tables']['game_participants']['Row']
export type GameTransaction = Database['public']['Tables']['game_transactions']['Row']

