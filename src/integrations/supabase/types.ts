export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      daily_tracker: {
        Row: {
          applications_count: number | null
          aptitude_done: boolean | null
          created_at: string
          date: string
          deep_work_hours: number | null
          devops_done: boolean | null
          dsa_done: boolean | null
          id: string
          linkedin_post: boolean | null
          mock_done: boolean | null
          mood: string | null
          notes: string | null
          productivity_score: number | null
          qa_done: boolean | null
          revision_done: boolean | null
          sleep_time: string | null
          sql_done: boolean | null
          updated_at: string
          user_id: string
          wake_time: string | null
        }
        Insert: {
          applications_count?: number | null
          aptitude_done?: boolean | null
          created_at?: string
          date: string
          deep_work_hours?: number | null
          devops_done?: boolean | null
          dsa_done?: boolean | null
          id?: string
          linkedin_post?: boolean | null
          mock_done?: boolean | null
          mood?: string | null
          notes?: string | null
          productivity_score?: number | null
          qa_done?: boolean | null
          revision_done?: boolean | null
          sleep_time?: string | null
          sql_done?: boolean | null
          updated_at?: string
          user_id: string
          wake_time?: string | null
        }
        Update: {
          applications_count?: number | null
          aptitude_done?: boolean | null
          created_at?: string
          date?: string
          deep_work_hours?: number | null
          devops_done?: boolean | null
          dsa_done?: boolean | null
          id?: string
          linkedin_post?: boolean | null
          mock_done?: boolean | null
          mood?: string | null
          notes?: string | null
          productivity_score?: number | null
          qa_done?: boolean | null
          revision_done?: boolean | null
          sleep_time?: string | null
          sql_done?: boolean | null
          updated_at?: string
          user_id?: string
          wake_time?: string | null
        }
        Relationships: []
      }
      focus_sessions: {
        Row: {
          category: string | null
          completed: boolean | null
          created_at: string
          duration_minutes: number
          id: string
          mode: string
          started_at: string
          task: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          completed?: boolean | null
          created_at?: string
          duration_minutes: number
          id?: string
          mode: string
          started_at?: string
          task?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          completed?: boolean | null
          created_at?: string
          duration_minutes?: number
          id?: string
          mode?: string
          started_at?: string
          task?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          college_name: string | null
          created_at: string
          daily_application_target: number | null
          daily_deep_work_target: number | null
          daily_dsa_target: number | null
          full_name: string | null
          github_url: string | null
          graduation_year: number | null
          id: string
          linkedin_url: string | null
          notification_prefs: Json | null
          placement_start_date: string | null
          quick_links: Json | null
          target_domains: string[] | null
          updated_at: string
        }
        Insert: {
          college_name?: string | null
          created_at?: string
          daily_application_target?: number | null
          daily_deep_work_target?: number | null
          daily_dsa_target?: number | null
          full_name?: string | null
          github_url?: string | null
          graduation_year?: number | null
          id: string
          linkedin_url?: string | null
          notification_prefs?: Json | null
          placement_start_date?: string | null
          quick_links?: Json | null
          target_domains?: string[] | null
          updated_at?: string
        }
        Update: {
          college_name?: string | null
          created_at?: string
          daily_application_target?: number | null
          daily_deep_work_target?: number | null
          daily_dsa_target?: number | null
          full_name?: string | null
          github_url?: string | null
          graduation_year?: number | null
          id?: string
          linkedin_url?: string | null
          notification_prefs?: Json | null
          placement_start_date?: string | null
          quick_links?: Json | null
          target_domains?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      time_blocks: {
        Row: {
          category: string | null
          created_at: string
          date: string
          end_time: string
          id: string
          start_time: string
          status: string
          task: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          date: string
          end_time: string
          id?: string
          start_time: string
          status?: string
          task: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          date?: string
          end_time?: string
          id?: string
          start_time?: string
          status?: string
          task?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
