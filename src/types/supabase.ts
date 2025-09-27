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
          date_created: string
          date_modified: string
          name: string | null
          phone: string
          email: string | null
          password: string | null
          alt_phone: string[] | null
          auth_id: string | null
          profile_picture_url: string | null
          preferred_position: string | null
          is_admin: boolean | null
        }
        Insert: {
          id: string
          date_created: string
          date_modified: string
          name?: string | null
          phone: string
          email?: string | null
          password?: string | null
          alt_phone?: string[] | null
          auth_id?: string | null
          profile_picture_url?: string | null
          preferred_position?: string | null
          is_admin?: boolean | null
        }
        Update: {
          id?: string
          date_created?: string
          date_modified?: string
          name?: string | null
          phone?: string
          email?: string | null
          password?: string | null
          alt_phone?: string[] | null
          auth_id?: string | null
          profile_picture_url?: string | null
          preferred_position?: string | null
          is_admin?: boolean | null
        }
      }
      registrations: {
        Row: {
          id: number
          created_at: string
          player: string | null
          season: number | null
          status: string | null
        }
        Insert: {
          id: number
          created_at?: string
          player?: string | null
          season?: number | null
          status?: string | null
        }
        Update: {
          id?: number
          created_at?: string
          player?: string | null
          season?: number | null
          status?: string | null
        }
      }
      gyms: {
        Row: {
          id: number
          created_at: string
          gym: string | null
          address: string | null
      instructions: string | null
      active: boolean
      available_days: number[] | null
      available_sports: number[] | null
      facilitator_ids: string[] | null
    }
    Insert: {
      id: number
      created_at?: string
      gym?: string | null
      address?: string | null
      instructions?: string | null
      active?: boolean
      available_days?: number[] | null
      available_sports?: number[] | null
      facilitator_ids?: string[] | null
    }
    Update: {
      id?: number
      created_at?: string
      gym?: string | null
      address?: string | null
      instructions?: string | null
      active?: boolean
      available_days?: number[] | null
      available_sports?: number[] | null
      facilitator_ids?: string[] | null
    }
  }
      balances: {
        Row: {
          id: number
          created_at: string
          player: string | null
          paid: number | null
          bonus: number | null
        }
        Insert: {
          id: number
          created_at?: string
          player?: string | null
          paid?: number | null
          bonus?: number | null
        }
        Update: {
          id?: number
          created_at?: string
          player?: string | null
          paid?: number | null
          bonus?: number | null
        }
      }
      seasons: {
        Row: {
          id: number
          created_at: string
          season: string | null
          start_date: string | null
          end_date: string | null
          cost_gym_rental: number | null
          cost_full_time: number | null
          cost_drop_in: number | null
          gym_id: number | null
          blackout_dates: string[] | null
          active: boolean
          day_of_the_week: number | null
          whatsapp: string | null
          new: boolean | null
          notes: string | null
          max_players: number | null
        }
        Insert: {
          id: number
          created_at?: string
          season?: string | null
          start_date?: string | null
          end_date?: string | null
          cost_gym_rental?: number | null
          cost_full_time?: number | null
          cost_drop_in?: number | null
          gym_id?: number | null
          blackout_dates?: string[] | null
          active?: boolean
          day_of_the_week?: number | null
          whatsapp?: string | null
          new?: boolean | null
          notes?: string | null
          max_players?: number | null
        }
        Update: {
          id?: number
          created_at?: string
          season?: string | null
          start_date?: string | null
          end_date?: string | null
          cost_gym_rental?: number | null
          cost_full_time?: number | null
          cost_drop_in?: number | null
          gym_id?: number | null
          blackout_dates?: string[] | null
          active?: boolean
          day_of_the_week?: number | null
          whatsapp?: string | null
          new?: boolean | null
          notes?: string | null
          max_players?: number | null
        }
      }
      site_announcements: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          message: string
          link_text: string | null
          link_url: string | null
          is_active: boolean
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          message: string
          link_text?: string | null
          link_url?: string | null
          is_active?: boolean
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          message?: string
          link_text?: string | null
          link_url?: string | null
          is_active?: boolean
        }
      }
      attendance: {
        Row: {
          id: number
          timestamp: string
          player: string | null
          season: number | null
          is_waitlisted: boolean | null
        }
        Insert: {
          id: number
          timestamp?: string
          player?: string | null
          season?: number | null
          is_waitlisted?: boolean | null
        }
        Update: {
          id?: number
          timestamp?: string
          player?: string | null
          season?: number | null
          is_waitlisted?: boolean | null
        }
      }
    }
  }
}
