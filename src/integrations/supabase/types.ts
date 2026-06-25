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
      ai_conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      ai_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ai_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
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
      arena_battles: {
        Row: {
          battle_type: string
          created_at: string
          created_by: string | null
          duration_minutes: number
          ends_at: string | null
          id: string
          max_participants: number
          question_count: number
          questions: Json
          starts_at: string
          status: string
          title: string
          updated_at: string
          zone: string | null
        }
        Insert: {
          battle_type: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          ends_at?: string | null
          id?: string
          max_participants?: number
          question_count?: number
          questions?: Json
          starts_at: string
          status?: string
          title: string
          updated_at?: string
          zone?: string | null
        }
        Update: {
          battle_type?: string
          created_at?: string
          created_by?: string | null
          duration_minutes?: number
          ends_at?: string | null
          id?: string
          max_participants?: number
          question_count?: number
          questions?: Json
          starts_at?: string
          status?: string
          title?: string
          updated_at?: string
          zone?: string | null
        }
        Relationships: []
      }
      arena_leaderboard: {
        Row: {
          duel_wins: number
          id: string
          math_sprint_best: number
          memory_best: number
          puzzle_score: number
          total_arena_xp: number
          user_id: string
          week_start: string
        }
        Insert: {
          duel_wins?: number
          id?: string
          math_sprint_best?: number
          memory_best?: number
          puzzle_score?: number
          total_arena_xp?: number
          user_id: string
          week_start: string
        }
        Update: {
          duel_wins?: number
          id?: string
          math_sprint_best?: number
          memory_best?: number
          puzzle_score?: number
          total_arena_xp?: number
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      arena_matches: {
        Row: {
          created_at: string
          created_by: string | null
          current_players: number
          current_question_index: number
          difficulty: string
          duration_seconds: number
          ended_at: string | null
          id: string
          invite_code: string | null
          is_public: boolean
          match_type: string
          max_players: number
          question_count: number
          question_started_at: string | null
          questions: Json
          started_at: string | null
          status: string
          topic: string
          xp_pool: number
          zone: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_players?: number
          current_question_index?: number
          difficulty?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          invite_code?: string | null
          is_public?: boolean
          match_type: string
          max_players: number
          question_count?: number
          question_started_at?: string | null
          questions?: Json
          started_at?: string | null
          status?: string
          topic?: string
          xp_pool?: number
          zone?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_players?: number
          current_question_index?: number
          difficulty?: string
          duration_seconds?: number
          ended_at?: string | null
          id?: string
          invite_code?: string | null
          is_public?: boolean
          match_type?: string
          max_players?: number
          question_count?: number
          question_started_at?: string | null
          questions?: Json
          started_at?: string | null
          status?: string
          topic?: string
          xp_pool?: number
          zone?: string | null
        }
        Relationships: []
      }
      arena_profiles: {
        Row: {
          arena_rank: string
          arena_xp: number
          best_score: number
          created_at: string
          current_win_streak: number
          id: string
          longest_win_streak: number
          season_rank: number | null
          season_xp: number
          total_matches: number
          total_wins: number
          updated_at: string
          user_id: string
          username: string
          win_rate: number
          zone: string | null
        }
        Insert: {
          arena_rank?: string
          arena_xp?: number
          best_score?: number
          created_at?: string
          current_win_streak?: number
          id?: string
          longest_win_streak?: number
          season_rank?: number | null
          season_xp?: number
          total_matches?: number
          total_wins?: number
          updated_at?: string
          user_id: string
          username: string
          win_rate?: number
          zone?: string | null
        }
        Update: {
          arena_rank?: string
          arena_xp?: number
          best_score?: number
          created_at?: string
          current_win_streak?: number
          id?: string
          longest_win_streak?: number
          season_rank?: number | null
          season_xp?: number
          total_matches?: number
          total_wins?: number
          updated_at?: string
          user_id?: string
          username?: string
          win_rate?: number
          zone?: string | null
        }
        Relationships: []
      }
      arena_questions: {
        Row: {
          avg_response_ms: number
          battle_eligible: boolean
          category: string
          correct_answer: string
          correct_rate: number
          created_at: string
          difficulty: string
          explanation: string | null
          id: string
          options: Json | null
          question: string
          topic: string | null
          type: string
        }
        Insert: {
          avg_response_ms?: number
          battle_eligible?: boolean
          category: string
          correct_answer: string
          correct_rate?: number
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          options?: Json | null
          question: string
          topic?: string | null
          type: string
        }
        Update: {
          avg_response_ms?: number
          battle_eligible?: boolean
          category?: string
          correct_answer?: string
          correct_rate?: number
          created_at?: string
          difficulty?: string
          explanation?: string | null
          id?: string
          options?: Json | null
          question?: string
          topic?: string | null
          type?: string
        }
        Relationships: []
      }
      arena_seasons: {
        Row: {
          created_at: string
          ends_at: string
          id: string
          is_active: boolean
          name: string
          season_number: number
          starts_at: string
        }
        Insert: {
          created_at?: string
          ends_at: string
          id?: string
          is_active?: boolean
          name: string
          season_number: number
          starts_at: string
        }
        Update: {
          created_at?: string
          ends_at?: string
          id?: string
          is_active?: boolean
          name?: string
          season_number?: number
          starts_at?: string
        }
        Relationships: []
      }
      battle_participants: {
        Row: {
          answers: Json
          battle_id: string
          id: string
          joined_at: string
          rank: number | null
          score: number
          updated_at: string
          user_id: string
          xp_earned: number
        }
        Insert: {
          answers?: Json
          battle_id: string
          id?: string
          joined_at?: string
          rank?: number | null
          score?: number
          updated_at?: string
          user_id: string
          xp_earned?: number
        }
        Update: {
          answers?: Json
          battle_id?: string
          id?: string
          joined_at?: string
          rank?: number | null
          score?: number
          updated_at?: string
          user_id?: string
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "battle_participants_battle_id_fkey"
            columns: ["battle_id"]
            isOneToOne: false
            referencedRelation: "arena_battles"
            referencedColumns: ["id"]
          },
        ]
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
      custom_track_questions: {
        Row: {
          created_at: string
          difficulty: string
          id: string
          my_answer: string | null
          question: string
          reviewed: boolean
          track_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          difficulty?: string
          id?: string
          my_answer?: string | null
          question: string
          reviewed?: boolean
          track_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          difficulty?: string
          id?: string
          my_answer?: string | null
          question?: string
          reviewed?: boolean
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_track_questions_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "custom_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_track_topics: {
        Row: {
          completed: boolean
          completed_at: string | null
          created_at: string
          id: string
          notes: string | null
          resource_url: string | null
          section_name: string
          sort_order: number
          status: string
          topic_name: string
          track_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          resource_url?: string | null
          section_name?: string
          sort_order?: number
          status?: string
          topic_name: string
          track_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          completed?: boolean
          completed_at?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          resource_url?: string | null
          section_name?: string
          sort_order?: number
          status?: string
          topic_name?: string
          track_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_track_topics_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "custom_tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_tracks: {
        Row: {
          color: string
          completion_pct: number
          created_at: string
          description: string | null
          icon: string
          id: string
          name: string
          notes: string | null
          notes_content: string | null
          skill_level: string
          target_role: string | null
          target_type: string | null
          updated_at: string
          user_id: string
          why_this_track: string | null
        }
        Insert: {
          color?: string
          completion_pct?: number
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name: string
          notes?: string | null
          notes_content?: string | null
          skill_level?: string
          target_role?: string | null
          target_type?: string | null
          updated_at?: string
          user_id: string
          why_this_track?: string | null
        }
        Update: {
          color?: string
          completion_pct?: number
          created_at?: string
          description?: string | null
          icon?: string
          id?: string
          name?: string
          notes?: string | null
          notes_content?: string | null
          skill_level?: string
          target_role?: string | null
          target_type?: string | null
          updated_at?: string
          user_id?: string
          why_this_track?: string | null
        }
        Relationships: []
      }
      daily_puzzle_attempts: {
        Row: {
          answered_at: string
          correct: boolean | null
          id: string
          puzzle_date: string
          question_id: string | null
          time_taken_sec: number | null
          user_id: string
        }
        Insert: {
          answered_at?: string
          correct?: boolean | null
          id?: string
          puzzle_date?: string
          question_id?: string | null
          time_taken_sec?: number | null
          user_id: string
        }
        Update: {
          answered_at?: string
          correct?: boolean | null
          id?: string
          puzzle_date?: string
          question_id?: string | null
          time_taken_sec?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_puzzle_attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "arena_questions"
            referencedColumns: ["id"]
          },
        ]
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
      distraction_logs: {
        Row: {
          duration_minutes: number
          id: string
          log_date: string
          logged_at: string
          notes: string | null
          reasons: string[]
          user_id: string
        }
        Insert: {
          duration_minutes?: number
          id?: string
          log_date?: string
          logged_at?: string
          notes?: string | null
          reasons?: string[]
          user_id: string
        }
        Update: {
          duration_minutes?: number
          id?: string
          log_date?: string
          logged_at?: string
          notes?: string | null
          reasons?: string[]
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          doc_type: string
          id: string
          mime_type: string | null
          name: string
          notes: string | null
          size_bytes: number | null
          status: string
          storage_path: string
          target_company: string | null
          target_role: string | null
          updated_at: string
          user_id: string
          version: number
        }
        Insert: {
          created_at?: string
          doc_type?: string
          id?: string
          mime_type?: string | null
          name: string
          notes?: string | null
          size_bytes?: number | null
          status?: string
          storage_path: string
          target_company?: string | null
          target_role?: string | null
          updated_at?: string
          user_id: string
          version?: number
        }
        Update: {
          created_at?: string
          doc_type?: string
          id?: string
          mime_type?: string | null
          name?: string
          notes?: string | null
          size_bytes?: number | null
          status?: string
          storage_path?: string
          target_company?: string | null
          target_role?: string | null
          updated_at?: string
          user_id?: string
          version?: number
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
      duels: {
        Row: {
          challenger_answers: Json
          challenger_id: string
          challenger_score: number
          created_at: string
          difficulty: string | null
          ended_at: string | null
          id: string
          invite_code: string
          opponent_answers: Json
          opponent_id: string | null
          opponent_score: number
          questions: Json | null
          started_at: string | null
          status: string
          topic: string | null
          winner_id: string | null
        }
        Insert: {
          challenger_answers?: Json
          challenger_id: string
          challenger_score?: number
          created_at?: string
          difficulty?: string | null
          ended_at?: string | null
          id?: string
          invite_code: string
          opponent_answers?: Json
          opponent_id?: string | null
          opponent_score?: number
          questions?: Json | null
          started_at?: string | null
          status?: string
          topic?: string | null
          winner_id?: string | null
        }
        Update: {
          challenger_answers?: Json
          challenger_id?: string
          challenger_score?: number
          created_at?: string
          difficulty?: string | null
          ended_at?: string | null
          id?: string
          invite_code?: string
          opponent_answers?: Json
          opponent_id?: string | null
          opponent_score?: number
          questions?: Json | null
          started_at?: string | null
          status?: string
          topic?: string | null
          winner_id?: string | null
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
      level_rewards: {
        Row: {
          active: boolean
          claimed_at: string
          created_at: string
          elite_until: string
          id: string
          level_reached: number
          reason: string
          user_id: string
        }
        Insert: {
          active?: boolean
          claimed_at?: string
          created_at?: string
          elite_until: string
          id?: string
          level_reached: number
          reason?: string
          user_id: string
        }
        Update: {
          active?: boolean
          claimed_at?: string
          created_at?: string
          elite_until?: string
          id?: string
          level_reached?: number
          reason?: string
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
      match_answers: {
        Row: {
          answered_at: string
          id: string
          is_correct: boolean
          match_id: string
          question_id: string | null
          question_index: number
          response_ms: number
          score_delta: number
          selected_answer: string
          user_id: string
        }
        Insert: {
          answered_at?: string
          id?: string
          is_correct: boolean
          match_id: string
          question_id?: string | null
          question_index: number
          response_ms: number
          score_delta?: number
          selected_answer: string
          user_id: string
        }
        Update: {
          answered_at?: string
          id?: string
          is_correct?: boolean
          match_id?: string
          question_id?: string | null
          question_index?: number
          response_ms?: number
          score_delta?: number
          selected_answer?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_answers_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "arena_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "arena_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      match_players: {
        Row: {
          arena_rank: string
          avg_response_ms: number
          correct_answers: number
          current_streak: number
          eliminated: boolean
          eliminated_at: string | null
          id: string
          joined_at: string
          last_answer_at: string | null
          match_id: string
          rank_in_match: number | null
          score: number
          user_id: string
          username: string
          wrong_answers: number
          xp_earned: number
        }
        Insert: {
          arena_rank?: string
          avg_response_ms?: number
          correct_answers?: number
          current_streak?: number
          eliminated?: boolean
          eliminated_at?: string | null
          id?: string
          joined_at?: string
          last_answer_at?: string | null
          match_id: string
          rank_in_match?: number | null
          score?: number
          user_id: string
          username: string
          wrong_answers?: number
          xp_earned?: number
        }
        Update: {
          arena_rank?: string
          avg_response_ms?: number
          correct_answers?: number
          current_streak?: number
          eliminated?: boolean
          eliminated_at?: string | null
          id?: string
          joined_at?: string
          last_answer_at?: string | null
          match_id?: string
          rank_in_match?: number | null
          score?: number
          user_id?: string
          username?: string
          wrong_answers?: number
          xp_earned?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_players_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "arena_matches"
            referencedColumns: ["id"]
          },
        ]
      }
      placement_events: {
        Row: {
          company: string | null
          created_at: string
          event_date: string
          event_name: string
          event_time: string | null
          event_type: string
          id: string
          notes: string | null
          registration_deadline: string | null
          registration_url: string | null
          reminder_set: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          company?: string | null
          created_at?: string
          event_date: string
          event_name: string
          event_time?: string | null
          event_type?: string
          id?: string
          notes?: string | null
          registration_deadline?: string | null
          registration_url?: string | null
          reminder_set?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          company?: string | null
          created_at?: string
          event_date?: string
          event_name?: string
          event_time?: string | null
          event_type?: string
          id?: string
          notes?: string | null
          registration_deadline?: string | null
          registration_url?: string | null
          reminder_set?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      pod_messages: {
        Row: {
          author_name: string
          content: string
          created_at: string
          id: string
          pod_code: string
          user_id: string
        }
        Insert: {
          author_name?: string
          content: string
          created_at?: string
          id?: string
          pod_code: string
          user_id: string
        }
        Update: {
          author_name?: string
          content?: string
          created_at?: string
          id?: string
          pod_code?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          city: string | null
          college_name: string | null
          created_at: string
          daily_application_target: number | null
          daily_deep_work_target: number | null
          daily_dsa_target: number | null
          full_name: string | null
          github_url: string | null
          graduation_year: number | null
          id: string
          leaderboard_opt_in: boolean | null
          linkedin_url: string | null
          notification_prefs: Json | null
          onboarded_at: string | null
          placement_start_date: string | null
          quick_links: Json | null
          sidebar_prepare_items: Json
          sidebar_section_order: Json
          study_windows: Json | null
          target_domains: string[] | null
          updated_at: string
          username: string | null
          zone: string | null
        }
        Insert: {
          city?: string | null
          college_name?: string | null
          created_at?: string
          daily_application_target?: number | null
          daily_deep_work_target?: number | null
          daily_dsa_target?: number | null
          full_name?: string | null
          github_url?: string | null
          graduation_year?: number | null
          id: string
          leaderboard_opt_in?: boolean | null
          linkedin_url?: string | null
          notification_prefs?: Json | null
          onboarded_at?: string | null
          placement_start_date?: string | null
          quick_links?: Json | null
          sidebar_prepare_items?: Json
          sidebar_section_order?: Json
          study_windows?: Json | null
          target_domains?: string[] | null
          updated_at?: string
          username?: string | null
          zone?: string | null
        }
        Update: {
          city?: string | null
          college_name?: string | null
          created_at?: string
          daily_application_target?: number | null
          daily_deep_work_target?: number | null
          daily_dsa_target?: number | null
          full_name?: string | null
          github_url?: string | null
          graduation_year?: number | null
          id?: string
          leaderboard_opt_in?: boolean | null
          linkedin_url?: string | null
          notification_prefs?: Json | null
          onboarded_at?: string | null
          placement_start_date?: string | null
          quick_links?: Json | null
          sidebar_prepare_items?: Json
          sidebar_section_order?: Json
          study_windows?: Json | null
          target_domains?: string[] | null
          updated_at?: string
          username?: string | null
          zone?: string | null
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
          track_id: string | null
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
          track_id?: string | null
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
          track_id?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "resources_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "custom_tracks"
            referencedColumns: ["id"]
          },
        ]
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
      sprints: {
        Row: {
          created_at: string
          end_date: string
          focus_areas: string[] | null
          goals: string | null
          id: string
          name: string
          outcomes: string | null
          start_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          focus_areas?: string[] | null
          goals?: string | null
          id?: string
          name: string
          outcomes?: string | null
          start_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          focus_areas?: string[] | null
          goals?: string | null
          id?: string
          name?: string
          outcomes?: string | null
          start_date?: string
          status?: string
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
      study_leaderboard: {
        Row: {
          apps_count: number
          college_name: string | null
          consistency_score: number
          dsa_count: number
          focus_sessions: number
          id: string
          mock_tests: number
          opt_in: boolean
          tracker_completion_pct: number
          user_id: string
          week_start: string
        }
        Insert: {
          apps_count?: number
          college_name?: string | null
          consistency_score?: number
          dsa_count?: number
          focus_sessions?: number
          id?: string
          mock_tests?: number
          opt_in?: boolean
          tracker_completion_pct?: number
          user_id: string
          week_start: string
        }
        Update: {
          apps_count?: number
          college_name?: string | null
          consistency_score?: number
          dsa_count?: number
          focus_sessions?: number
          id?: string
          mock_tests?: number
          opt_in?: boolean
          tracker_completion_pct?: number
          user_id?: string
          week_start?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          razorpay_subscription_id: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          razorpay_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          razorpay_subscription_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      system_events: {
        Row: {
          company: string | null
          created_at: string
          event_name: string
          event_type: string | null
          id: string
          notes: string | null
          source: string | null
          typical_month: number | null
          typical_window: string | null
        }
        Insert: {
          company?: string | null
          created_at?: string
          event_name: string
          event_type?: string | null
          id?: string
          notes?: string | null
          source?: string | null
          typical_month?: number | null
          typical_window?: string | null
        }
        Update: {
          company?: string | null
          created_at?: string
          event_name?: string
          event_type?: string | null
          id?: string
          notes?: string | null
          source?: string | null
          typical_month?: number | null
          typical_window?: string | null
        }
        Relationships: []
      }
      task_boards: {
        Row: {
          created_at: string
          icon: string
          id: string
          name: string
          project_id: string | null
          properties: Json
          scope: string
          sort_order: number
          statuses: Json
          updated_at: string
          user_id: string
          view_type: string
        }
        Insert: {
          created_at?: string
          icon?: string
          id?: string
          name?: string
          project_id?: string | null
          properties?: Json
          scope?: string
          sort_order?: number
          statuses?: Json
          updated_at?: string
          user_id: string
          view_type?: string
        }
        Update: {
          created_at?: string
          icon?: string
          id?: string
          name?: string
          project_id?: string | null
          properties?: Json
          scope?: string
          sort_order?: number
          statuses?: Json
          updated_at?: string
          user_id?: string
          view_type?: string
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
      tm_blocks: {
        Row: {
          content: Json
          created_at: string
          id: string
          sort_order: number
          task_id: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: Json
          created_at?: string
          id?: string
          sort_order?: number
          task_id: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: Json
          created_at?: string
          id?: string
          sort_order?: number
          task_id?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tm_blocks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tm_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tm_tasks: {
        Row: {
          assignee: string | null
          board_id: string
          created_at: string
          due_date: string | null
          emoji: string | null
          id: string
          progress: number
          properties: Json
          sort_order: number
          status_id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assignee?: string | null
          board_id: string
          created_at?: string
          due_date?: string | null
          emoji?: string | null
          id?: string
          progress?: number
          properties?: Json
          sort_order?: number
          status_id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assignee?: string | null
          board_id?: string
          created_at?: string
          due_date?: string | null
          emoji?: string | null
          id?: string
          progress?: number
          properties?: Json
          sort_order?: number
          status_id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tm_tasks_board_id_fkey"
            columns: ["board_id"]
            isOneToOne: false
            referencedRelation: "task_boards"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      user_challenge_progress: {
        Row: {
          challenge_id: string
          completed: boolean
          completed_at: string | null
          current_count: number
          id: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed?: boolean
          completed_at?: string | null
          current_count?: number
          id?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed?: boolean
          completed_at?: string | null
          current_count?: number
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_challenge_progress_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "weekly_challenges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          apply_current: number
          apply_last_date: string | null
          apply_longest: number
          daily_current: number
          daily_last_date: string | null
          daily_longest: number
          dsa_current: number
          dsa_last_date: string | null
          dsa_longest: number
          freeze_used_this_month: number
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          apply_current?: number
          apply_last_date?: string | null
          apply_longest?: number
          daily_current?: number
          daily_last_date?: string | null
          daily_longest?: number
          dsa_current?: number
          dsa_last_date?: string | null
          dsa_longest?: number
          freeze_used_this_month?: number
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          apply_current?: number
          apply_last_date?: string | null
          apply_longest?: number
          daily_current?: number
          daily_last_date?: string | null
          daily_longest?: number
          dsa_current?: number
          dsa_last_date?: string | null
          dsa_longest?: number
          freeze_used_this_month?: number
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      weekly_challenges: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          description: string | null
          id: string
          target_count: number
          title: string
          week_start_date: string
          xp_reward: number
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          target_count?: number
          title: string
          week_start_date: string
          xp_reward?: number
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          target_count?: number
          title?: string
          week_start_date?: string
          xp_reward?: number
        }
        Relationships: []
      }
      weekly_reviews: {
        Row: {
          blockers: string | null
          created_at: string
          energy_rating: number
          id: string
          lessons: string | null
          next_focus: string | null
          productivity_rating: number
          updated_at: string
          user_id: string
          week_start: string
          wins: string | null
        }
        Insert: {
          blockers?: string | null
          created_at?: string
          energy_rating?: number
          id?: string
          lessons?: string | null
          next_focus?: string | null
          productivity_rating?: number
          updated_at?: string
          user_id: string
          week_start: string
          wins?: string | null
        }
        Update: {
          blockers?: string | null
          created_at?: string
          energy_rating?: number
          id?: string
          lessons?: string | null
          next_focus?: string | null
          productivity_rating?: number
          updated_at?: string
          user_id?: string
          week_start?: string
          wins?: string | null
        }
        Relationships: []
      }
      xp_transactions: {
        Row: {
          action_type: string
          created_at: string
          id: string
          metadata: Json | null
          user_id: string
          xp_amount: number
        }
        Insert: {
          action_type: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id: string
          xp_amount: number
        }
        Update: {
          action_type?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          user_id?: string
          xp_amount?: number
        }
        Relationships: []
      }
      zone_rankings: {
        Row: {
          city_rank: number | null
          created_at: string
          id: string
          updated_at: string
          user_id: string
          week_start: string
          weekly_xp: number
          zone: string
          zone_rank: number | null
        }
        Insert: {
          city_rank?: number | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
          week_start: string
          weekly_xp?: number
          zone: string
          zone_rank?: number | null
        }
        Update: {
          city_rank?: number | null
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
          week_start?: string
          weekly_xp?: number
          zone?: string
          zone_rank?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_level: { Args: { p_xp: number }; Returns: Json }
      get_user_xp: { Args: { p_user_id: string }; Returns: number }
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
