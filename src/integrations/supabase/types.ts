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
      aptitude_log: {
        Row: {
          category: string
          created_at: string
          date: string
          difficulty: string | null
          id: string
          notes: string | null
          questions_attempted: number
          questions_correct: number
          time_minutes: number
          topic: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          created_at?: string
          date?: string
          difficulty?: string | null
          id?: string
          notes?: string | null
          questions_attempted?: number
          questions_correct?: number
          time_minutes?: number
          topic?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          date?: string
          difficulty?: string | null
          id?: string
          notes?: string | null
          questions_attempted?: number
          questions_correct?: number
          time_minutes?: number
          topic?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      companies: {
        Row: {
          created_at: string
          ctc: string | null
          id: string
          last_contact: string | null
          location: string | null
          name: string
          notes: string | null
          priority: string
          role_focus: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ctc?: string | null
          id?: string
          last_contact?: string | null
          location?: string | null
          name: string
          notes?: string | null
          priority?: string
          role_focus?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ctc?: string | null
          id?: string
          last_contact?: string | null
          location?: string | null
          name?: string
          notes?: string | null
          priority?: string
          role_focus?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string | null
          id: string
          last_contact_at: string | null
          linkedin_url: string | null
          name: string
          notes: string | null
          relation: string
          role: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact_at?: string | null
          linkedin_url?: string | null
          name: string
          notes?: string | null
          relation?: string
          role?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          last_contact_at?: string | null
          linkedin_url?: string | null
          name?: string
          notes?: string | null
          relation?: string
          role?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
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
      devops_items: {
        Row: {
          category: string | null
          created_at: string
          hours: number
          id: string
          notes: string | null
          status: string
          title: string
          tool: string | null
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          hours?: number
          id?: string
          notes?: string | null
          status?: string
          title: string
          tool?: string | null
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          hours?: number
          id?: string
          notes?: string | null
          status?: string
          title?: string
          tool?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      dsa_problems: {
        Row: {
          attempts: number
          created_at: string
          difficulty: string | null
          id: string
          last_revised_at: string | null
          notes: string | null
          platform: string | null
          starred: boolean
          status: string
          title: string
          topic: string | null
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          difficulty?: string | null
          id?: string
          last_revised_at?: string | null
          notes?: string | null
          platform?: string | null
          starred?: boolean
          status?: string
          title: string
          topic?: string | null
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          difficulty?: string | null
          id?: string
          last_revised_at?: string | null
          notes?: string | null
          platform?: string | null
          starred?: boolean
          status?: string
          title?: string
          topic?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string
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
      interview_prep: {
        Row: {
          answer: string | null
          category: string
          company: string | null
          confidence: number
          created_at: string
          id: string
          last_practiced_at: string | null
          question: string
          starred: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          category?: string
          company?: string | null
          confidence?: number
          created_at?: string
          id?: string
          last_practiced_at?: string | null
          question: string
          starred?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          answer?: string | null
          category?: string
          company?: string | null
          confidence?: number
          created_at?: string
          id?: string
          last_practiced_at?: string | null
          question?: string
          starred?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      jobs: {
        Row: {
          applied_at: string | null
          company: string
          created_at: string
          deadline: string | null
          id: string
          job_type: string | null
          link: string | null
          location: string | null
          notes: string | null
          role: string
          salary: string | null
          source: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          applied_at?: string | null
          company: string
          created_at?: string
          deadline?: string | null
          id?: string
          job_type?: string | null
          link?: string | null
          location?: string | null
          notes?: string | null
          role: string
          salary?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          applied_at?: string | null
          company?: string
          created_at?: string
          deadline?: string | null
          id?: string
          job_type?: string | null
          link?: string | null
          location?: string | null
          notes?: string | null
          role?: string
          salary?: string | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      linkedin_posts: {
        Row: {
          body: string | null
          comments: number | null
          created_at: string
          hook: string | null
          id: string
          impressions: number | null
          likes: number | null
          post_type: string | null
          posted_at: string | null
          scheduled_for: string | null
          status: string
          topic: string
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          body?: string | null
          comments?: number | null
          created_at?: string
          hook?: string | null
          id?: string
          impressions?: number | null
          likes?: number | null
          post_type?: string | null
          posted_at?: string | null
          scheduled_for?: string | null
          status?: string
          topic: string
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          body?: string | null
          comments?: number | null
          created_at?: string
          hook?: string | null
          id?: string
          impressions?: number | null
          likes?: number | null
          post_type?: string | null
          posted_at?: string | null
          scheduled_for?: string | null
          status?: string
          topic?: string
          updated_at?: string
          url?: string | null
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
      projects: {
        Row: {
          created_at: string
          demo_url: string | null
          description: string | null
          highlights: string | null
          id: string
          repo_url: string | null
          shipped_at: string | null
          started_at: string | null
          status: string
          tech_stack: string[] | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          demo_url?: string | null
          description?: string | null
          highlights?: string | null
          id?: string
          repo_url?: string | null
          shipped_at?: string | null
          started_at?: string | null
          status?: string
          tech_stack?: string[] | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          demo_url?: string | null
          description?: string | null
          highlights?: string | null
          id?: string
          repo_url?: string | null
          shipped_at?: string | null
          started_at?: string | null
          status?: string
          tech_stack?: string[] | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      qa_items: {
        Row: {
          category: string | null
          created_at: string
          hours: number
          id: string
          notes: string | null
          status: string
          test_type: string
          title: string
          tool: string | null
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          hours?: number
          id?: string
          notes?: string | null
          status?: string
          test_type?: string
          title: string
          tool?: string | null
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          hours?: number
          id?: string
          notes?: string | null
          status?: string
          test_type?: string
          title?: string
          tool?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      resources: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          rating: number | null
          resource_type: string | null
          status: string
          title: string
          topic: string | null
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          rating?: number | null
          resource_type?: string | null
          status?: string
          title: string
          topic?: string | null
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          rating?: number | null
          resource_type?: string | null
          status?: string
          title?: string
          topic?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      resumes: {
        Row: {
          created_at: string
          file_url: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          target_role: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          file_url?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          target_role?: string | null
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          file_url?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          target_role?: string | null
          updated_at?: string
          user_id?: string
          version?: number
        }
        Relationships: []
      }
      skills: {
        Row: {
          category: string
          created_at: string
          current_level: number
          id: string
          name: string
          notes: string | null
          priority: string
          target_level: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          created_at?: string
          current_level?: number
          id?: string
          name: string
          notes?: string | null
          priority?: string
          target_level?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          created_at?: string
          current_level?: number
          id?: string
          name?: string
          notes?: string | null
          priority?: string
          target_level?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sql_problems: {
        Row: {
          attempts: number
          created_at: string
          difficulty: string | null
          id: string
          last_revised_at: string | null
          notes: string | null
          platform: string | null
          starred: boolean
          status: string
          title: string
          topic: string | null
          updated_at: string
          url: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          created_at?: string
          difficulty?: string | null
          id?: string
          last_revised_at?: string | null
          notes?: string | null
          platform?: string | null
          starred?: boolean
          status?: string
          title: string
          topic?: string | null
          updated_at?: string
          url?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          created_at?: string
          difficulty?: string | null
          id?: string
          last_revised_at?: string | null
          notes?: string | null
          platform?: string | null
          starred?: boolean
          status?: string
          title?: string
          topic?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string
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
