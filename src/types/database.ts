export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          ip_hash: string | null
          metadata: Json
          target_id: string | null
          target_type: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          ip_hash?: string | null
          metadata?: Json
          target_id?: string | null
          target_type?: string | null
        }
        Relationships: []
      }
      employer_profiles: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_name: string
          contact_email: string | null
          contact_person: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          must_change_password: boolean
          status: Database["public"]["Enums"]["employer_status"]
          trade_license_no: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_name?: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          must_change_password?: boolean
          status?: Database["public"]["Enums"]["employer_status"]
          trade_license_no?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_name?: string
          contact_email?: string | null
          contact_person?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          must_change_password?: boolean
          status?: Database["public"]["Enums"]["employer_status"]
          trade_license_no?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employer_profiles_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          address: string | null
          area_label: string
          category: Database["public"]["Enums"]["job_category"]
          city_emirate: string
          created_at: string
          currency: string
          description: string
          employer_id: string
          expires_at: string
          id: string
          lat: number
          lng: number
          pay_max: number | null
          pay_min: number
          pay_period: Database["public"]["Enums"]["pay_period"]
          public_lat: number
          public_lng: number
          schedule: Database["public"]["Enums"]["availability"][]
          spots: number
          starts_on: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          area_label: string
          category: Database["public"]["Enums"]["job_category"]
          city_emirate: string
          created_at?: string
          currency?: string
          description: string
          employer_id: string
          expires_at?: string
          id?: string
          lat: number
          lng: number
          pay_max?: number | null
          pay_min: number
          pay_period: Database["public"]["Enums"]["pay_period"]
          public_lat?: number
          public_lng?: number
          schedule: Database["public"]["Enums"]["availability"][]
          spots?: number
          starts_on?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          area_label?: string
          category?: Database["public"]["Enums"]["job_category"]
          city_emirate?: string
          created_at?: string
          currency?: string
          description?: string
          employer_id?: string
          expires_at?: string
          id?: string
          lat?: number
          lng?: number
          pay_max?: number | null
          pay_min?: number
          pay_period?: Database["public"]["Enums"]["pay_period"]
          public_lat?: number
          public_lng?: number
          schedule?: Database["public"]["Enums"]["availability"][]
          spots?: number
          starts_on?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employer_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string
          id: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      survey_questions: {
        Row: {
          created_at: string
          id: string
          options: Json
          position: number
          prompt: string
          required: boolean
          survey_id: string
          type: Database["public"]["Enums"]["question_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          options?: Json
          position: number
          prompt: string
          required?: boolean
          survey_id: string
          type: Database["public"]["Enums"]["question_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          options?: Json
          position?: number
          prompt?: string
          required?: boolean
          survey_id?: string
          type?: Database["public"]["Enums"]["question_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      surveys: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      test_answer_keys: {
        Row: {
          correct_option: number
          question_id: string
        }
        Insert: {
          correct_option: number
          question_id: string
        }
        Update: {
          correct_option?: number
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_answer_keys_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: true
            referencedRelation: "test_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      test_questions: {
        Row: {
          created_at: string
          id: string
          options: Json
          position: number
          prompt: string
          test_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          options: Json
          position: number
          prompt: string
          test_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          options?: Json
          position?: number
          prompt?: string
          test_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_questions_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
        ]
      }
      tests: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          pass_score: number
          time_limit_seconds: number
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          pass_score: number
          time_limit_seconds: number
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          pass_score?: number
          time_limit_seconds?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      video_prompts: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          max_seconds: number
          position: number
          prompt: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_seconds?: number
          position?: number
          prompt: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_seconds?: number
          position?: number
          prompt?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_prompts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_activate_survey: {
        Args: { p_survey_id: string }
        Returns: undefined
      }
      admin_activate_test: { Args: { p_test_id: string }; Returns: undefined }
      admin_get_answer_keys: {
        Args: { p_test_id: string }
        Returns: {
          correct_option: number
          question_id: string
        }[]
      }
      admin_set_answer_key: {
        Args: { p_correct_option: number; p_question_id: string }
        Returns: undefined
      }
      admin_set_employer_status: {
        Args: {
          p_employer_id: string
          p_status: Database["public"]["Enums"]["employer_status"]
        }
        Returns: undefined
      }
      admin_set_job_status: {
        Args: {
          p_job_id: string
          p_status: Database["public"]["Enums"]["job_status"]
        }
        Returns: undefined
      }
      admin_swap_survey_questions: {
        Args: { p_a: string; p_b: string }
        Returns: undefined
      }
      admin_swap_test_questions: {
        Args: { p_a: string; p_b: string }
        Returns: undefined
      }
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      complete_password_change: { Args: never; Returns: undefined }
      record_account_deletion: { Args: never; Returns: undefined }
    }
    Enums: {
      application_status: "pending" | "accepted" | "declined" | "withdrawn"
      availability:
        | "evenings"
        | "weekends"
        | "part_time"
        | "full_time"
        | "flexible"
      employer_status: "pending" | "approved" | "suspended"
      job_category:
        | "hospitality"
        | "retail"
        | "delivery"
        | "cleaning"
        | "construction"
        | "office"
        | "tech"
        | "care"
        | "events"
        | "beauty"
        | "other"
      job_status: "open" | "paused" | "closed" | "removed"
      pay_period: "hour" | "day" | "week" | "month" | "fixed"
      question_type:
        | "single_choice"
        | "multi_choice"
        | "short_text"
        | "long_text"
        | "number"
        | "scale"
      user_role: "employee" | "employer" | "admin"
      video_provider: "supabase" | "mux"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      application_status: ["pending", "accepted", "declined", "withdrawn"],
      availability: [
        "evenings",
        "weekends",
        "part_time",
        "full_time",
        "flexible",
      ],
      employer_status: ["pending", "approved", "suspended"],
      job_category: [
        "hospitality",
        "retail",
        "delivery",
        "cleaning",
        "construction",
        "office",
        "tech",
        "care",
        "events",
        "beauty",
        "other",
      ],
      job_status: ["open", "paused", "closed", "removed"],
      pay_period: ["hour", "day", "week", "month", "fixed"],
      question_type: [
        "single_choice",
        "multi_choice",
        "short_text",
        "long_text",
        "number",
        "scale",
      ],
      user_role: ["employee", "employer", "admin"],
      video_provider: ["supabase", "mux"],
    },
  },
} as const

