export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      applicants: {
        Row: {
          created_at: string
          email: string | null
          full_name: string
          id: string
          phone_e164: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          phone_e164: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          phone_e164?: string
          updated_at?: string
        }
        Relationships: []
      }
      application_survey_answers: {
        Row: {
          answer: Json
          application_id: string
          question_id: string
        }
        Insert: {
          answer: Json
          application_id: string
          question_id: string
        }
        Update: {
          answer?: Json
          application_id?: string
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_survey_answers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_survey_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      application_test_answers: {
        Row: {
          answer: Json
          answered_at: string
          application_id: string
          graded_by: string | null
          is_correct: boolean | null
          points_awarded: number | null
          question_id: string
        }
        Insert: {
          answer: Json
          answered_at?: string
          application_id: string
          graded_by?: string | null
          is_correct?: boolean | null
          points_awarded?: number | null
          question_id: string
        }
        Update: {
          answer?: Json
          answered_at?: string
          application_id?: string
          graded_by?: string | null
          is_correct?: boolean | null
          points_awarded?: number | null
          question_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_test_answers_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_test_answers_graded_by_fkey"
            columns: ["graded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_test_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "test_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      application_videos: {
        Row: {
          application_id: string
          duration_seconds: number
          id: string
          mime_type: string
          question_id: string | null
          size_bytes: number
          storage_path: string
          uploaded_at: string
        }
        Insert: {
          application_id: string
          duration_seconds: number
          id?: string
          mime_type: string
          question_id?: string | null
          size_bytes: number
          storage_path: string
          uploaded_at?: string
        }
        Update: {
          application_id?: string
          duration_seconds?: number
          id?: string
          mime_type?: string
          question_id?: string | null
          size_bytes?: number
          storage_path?: string
          uploaded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "application_videos_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "application_videos_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "video_questions"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          admin_notes: string | null
          applicant_id: string | null
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          current_step: Database["public"]["Enums"]["application_step"]
          cv_path: string | null
          draft_expires_at: string
          draft_token_hash: string | null
          id: string
          ip_hash: string | null
          job_id: string
          profile: Json | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["application_status"]
          submitted_at: string | null
          survey_id: string | null
          survey_started_at: string | null
          task_started_at: string | null
          test_id: string | null
          test_max_score: number | null
          test_percent: number | null
          test_score: number | null
          test_started_at: string | null
          test_submitted_at: string | null
          updated_at: string
          video_set_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          applicant_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          current_step?: Database["public"]["Enums"]["application_step"]
          cv_path?: string | null
          draft_expires_at?: string
          draft_token_hash?: string | null
          id?: string
          ip_hash?: string | null
          job_id: string
          profile?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          survey_id?: string | null
          survey_started_at?: string | null
          task_started_at?: string | null
          test_id?: string | null
          test_max_score?: number | null
          test_percent?: number | null
          test_score?: number | null
          test_started_at?: string | null
          test_submitted_at?: string | null
          updated_at?: string
          video_set_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          applicant_id?: string | null
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          current_step?: Database["public"]["Enums"]["application_step"]
          cv_path?: string | null
          draft_expires_at?: string
          draft_token_hash?: string | null
          id?: string
          ip_hash?: string | null
          job_id?: string
          profile?: Json | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          submitted_at?: string | null
          survey_id?: string | null
          survey_started_at?: string | null
          task_started_at?: string | null
          test_id?: string | null
          test_max_score?: number | null
          test_percent?: number | null
          test_score?: number | null
          test_started_at?: string | null
          test_submitted_at?: string | null
          updated_at?: string
          video_set_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_applicant_id_fkey"
            columns: ["applicant_id"]
            isOneToOne: false
            referencedRelation: "applicants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_video_set_id_fkey"
            columns: ["video_set_id"]
            isOneToOne: false
            referencedRelation: "video_question_sets"
            referencedColumns: ["id"]
          },
        ]
      }
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
      candidate_unlocks: {
        Row: {
          application_id: string
          employer_id: string
          unlocked_at: string
        }
        Insert: {
          application_id: string
          employer_id: string
          unlocked_at?: string
        }
        Update: {
          application_id?: string
          employer_id?: string
          unlocked_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_unlocks_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: true
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_unlocks_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employer_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      consents: {
        Row: {
          accepted_at: string
          application_id: string
          id: string
          ip_hash: string | null
          text_version: string
        }
        Insert: {
          accepted_at?: string
          application_id: string
          id?: string
          ip_hash?: string | null
          text_version: string
        }
        Update: {
          accepted_at?: string
          application_id?: string
          id?: string
          ip_hash?: string | null
          text_version?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
        ]
      }
      ecoin_ledger: {
        Row: {
          application_id: string | null
          created_at: string
          created_by: string | null
          delta: number
          employer_id: string
          id: string
          note: string | null
          reason: string
        }
        Insert: {
          application_id?: string | null
          created_at?: string
          created_by?: string | null
          delta: number
          employer_id: string
          id?: string
          note?: string | null
          reason: string
        }
        Update: {
          application_id?: string | null
          created_at?: string
          created_by?: string | null
          delta?: number
          employer_id?: string
          id?: string
          note?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecoin_ledger_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecoin_ledger_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecoin_ledger_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employer_profiles"
            referencedColumns: ["user_id"]
          },
        ]
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
          ecoin_balance: number
          logo_path: string | null
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
          ecoin_balance?: number
          logo_path?: string | null
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
          ecoin_balance?: number
          logo_path?: string | null
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
          city: string | null
          closed_at: string | null
          country_code: string | null
          country_name: string | null
          created_at: string
          description: string
          display_company: string | null
          employer_id: string
          full_profile: boolean
          id: string
          lat: number
          lng: number
          location_label: string
          public_lat: number
          public_lng: number
          published_at: string | null
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["job_status"]
          survey_id: string | null
          test_id: string | null
          title: string
          updated_at: string
          video_set_id: string | null
        }
        Insert: {
          city?: string | null
          closed_at?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          description: string
          display_company?: string | null
          employer_id: string
          full_profile?: boolean
          id?: string
          lat: number
          lng: number
          location_label: string
          public_lat?: number
          public_lng?: number
          published_at?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          survey_id?: string | null
          test_id?: string | null
          title: string
          updated_at?: string
          video_set_id?: string | null
        }
        Update: {
          city?: string | null
          closed_at?: string | null
          country_code?: string | null
          country_name?: string | null
          created_at?: string
          description?: string
          display_company?: string | null
          employer_id?: string
          full_profile?: boolean
          id?: string
          lat?: number
          lng?: number
          location_label?: string
          public_lat?: number
          public_lng?: number
          published_at?: string | null
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          survey_id?: string | null
          test_id?: string | null
          title?: string
          updated_at?: string
          video_set_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "jobs_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employer_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "jobs_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_video_set_id_fkey"
            columns: ["video_set_id"]
            isOneToOne: false
            referencedRelation: "video_question_sets"
            referencedColumns: ["id"]
          },
        ]
      }
      phone_verifications: {
        Row: {
          application_id: string
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          phone_e164: string
          verified_at: string | null
        }
        Insert: {
          application_id: string
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at: string
          id?: string
          phone_e164: string
          verified_at?: string | null
        }
        Update: {
          application_id?: string
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone_e164?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "phone_verifications_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "applications"
            referencedColumns: ["id"]
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
          time_limit_seconds: number | null
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          time_limit_seconds?: number | null
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          time_limit_seconds?: number | null
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      test_answer_keys: {
        Row: {
          correct_options: number[]
          question_id: string
        }
        Insert: {
          correct_options: number[]
          question_id: string
        }
        Update: {
          correct_options?: number[]
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
          points: number
          position: number
          prompt: string
          test_id: string
          time_limit_seconds: number | null
          type: Database["public"]["Enums"]["test_question_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          options: Json
          points?: number
          position: number
          prompt: string
          test_id: string
          time_limit_seconds?: number | null
          type?: Database["public"]["Enums"]["test_question_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          options?: Json
          points?: number
          position?: number
          prompt?: string
          test_id?: string
          time_limit_seconds?: number | null
          type?: Database["public"]["Enums"]["test_question_type"]
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
          time_limit_seconds: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          pass_score: number
          time_limit_seconds?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          pass_score?: number
          time_limit_seconds?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      video_question_sets: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          time_limit_seconds: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          time_limit_seconds?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          time_limit_seconds?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      video_questions: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          max_seconds: number
          position: number
          prompt: string
          set_id: string
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
          set_id: string
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
          set_id?: string
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
          {
            foreignKeyName: "video_questions_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "video_question_sets"
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
      admin_activate_video_set: {
        Args: { p_set_id: string }
        Returns: undefined
      }
      admin_add_ecoins: {
        Args: { p_amount: number; p_employer_id: string; p_note: string }
        Returns: number
      }
      admin_get_answer_keys: {
        Args: { p_test_id: string }
        Returns: {
          correct_options: number[]
          question_id: string
        }[]
      }
      admin_grade_answer: {
        Args: {
          p_application_id: string
          p_points: number
          p_question_id: string
        }
        Returns: undefined
      }
      admin_review_application: {
        Args: {
          p_application_id: string
          p_decision: Database["public"]["Enums"]["application_status"]
          p_notes: string
        }
        Returns: undefined
      }
      admin_review_job: {
        Args: { p_approve: boolean; p_job_id: string; p_note: string }
        Returns: undefined
      }
      admin_revoke_sessions: { Args: { p_user_id: string }; Returns: undefined }
      admin_set_answer_key: {
        Args: { p_correct_options: number[]; p_question_id: string }
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
      admin_swap_video_questions: {
        Args: { p_a: string; p_b: string }
        Returns: undefined
      }
      app_cleanup: { Args: { p_application_ids: string[] }; Returns: number }
      app_cleanup_candidates: {
        Args: { p_hours: number }
        Returns: {
          application_id: string
          storage_path: string
        }[]
      }
      app_finish_videos: {
        Args: { p_job_id: string; p_token_hash: string }
        Returns: undefined
      }
      app_record_cv: {
        Args: { p_job_id: string; p_storage_path: string; p_token_hash: string }
        Returns: string
      }
      app_record_question_video: {
        Args: {
          p_duration_seconds: number
          p_job_id: string
          p_mime_type: string
          p_question_id: string
          p_size_bytes: number
          p_storage_path: string
          p_token_hash: string
        }
        Returns: string
      }
      app_record_video: {
        Args: {
          p_duration_seconds: number
          p_job_id: string
          p_mime_type: string
          p_size_bytes: number
          p_storage_path: string
          p_token_hash: string
        }
        Returns: string[]
      }
      app_save_profile: {
        Args: { p_job_id: string; p_profile: Json; p_token_hash: string }
        Returns: undefined
      }
      app_save_test_answer: {
        Args: {
          p_answer: Json
          p_job_id: string
          p_question_id: string
          p_token_hash: string
        }
        Returns: undefined
      }
      app_start: {
        Args: { p_ip_hash: string; p_job_id: string; p_token_hash: string }
        Returns: string
      }
      app_start_test: {
        Args: { p_job_id: string; p_token_hash: string }
        Returns: string
      }
      app_submit: {
        Args: {
          p_answers: Json
          p_consent_version: string
          p_email: string
          p_full_name: string
          p_ip_hash: string
          p_job_id: string
          p_phone_e164: string
          p_phone_verified: boolean
          p_token_hash: string
        }
        Returns: string
      }
      app_submit_test: {
        Args: { p_job_id: string; p_token_hash: string }
        Returns: undefined
      }
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      complete_password_change: { Args: never; Returns: undefined }
      get_public_jobs: {
        Args: {
          max_lat: number
          max_lng: number
          min_lat: number
          min_lng: number
        }
        Returns: {
          city: string
          country_code: string
          country_name: string
          description: string
          id: string
          location_label: string
          public_lat: number
          public_lng: number
          published_at: string
          sponsor_logo: string
          sponsor_name: string
          title: string
        }[]
      }
      log_admin_export: {
        Args: { p_kind: string; p_rows: number }
        Returns: undefined
      }
      log_cv_view: { Args: { p_application_id: string }; Returns: string }
      log_sponsor_change: {
        Args: { p_change: string; p_employer_id: string }
        Returns: undefined
      }
      log_video_view: { Args: { p_video_id: string }; Returns: string }
      record_account_deletion: { Args: never; Returns: undefined }
      sponsor_all_candidates: {
        Args: { p_page?: number }
        Returns: {
          application_id: string
          full_name: string
          job_id: string
          job_title: string
          locked_total: number
          reviewed_at: string
          total: number
          unlocked: boolean
        }[]
      }
      sponsor_candidate_summary: {
        Args: { p_application_id: string }
        Returns: {
          application_id: string
          full_name: string
          job_id: string
          job_title: string
          reviewed_at: string
          unlocked: boolean
        }[]
      }
      sponsor_get_candidate: {
        Args: { p_application_id: string }
        Returns: Json
      }
      sponsor_list_candidates: {
        Args: { p_job_id: string; p_page?: number }
        Returns: {
          application_id: string
          full_name: string
          reviewed_at: string
          total: number
          unlocked: boolean
        }[]
      }
      sponsor_unlock_candidate: {
        Args: { p_application_id: string }
        Returns: number
      }
    }
    Enums: {
      application_status: "in_progress" | "submitted" | "approved" | "rejected"
      application_step: "test" | "video" | "survey" | "submitted"
      availability:
        | "evenings"
        | "weekends"
        | "part_time"
        | "full_time"
        | "flexible"
      employer_status: "pending" | "approved" | "suspended"
      job_status:
        | "pending"
        | "published"
        | "hidden"
        | "closed"
        | "removed"
        | "rejected"
      question_type:
        | "single_choice"
        | "multi_choice"
        | "short_text"
        | "long_text"
        | "number"
        | "scale"
      test_question_type:
        | "single_choice"
        | "multi_choice"
        | "short_text"
        | "long_text"
        | "typing"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      application_status: ["in_progress", "submitted", "approved", "rejected"],
      application_step: ["test", "video", "survey", "submitted"],
      availability: [
        "evenings",
        "weekends",
        "part_time",
        "full_time",
        "flexible",
      ],
      employer_status: ["pending", "approved", "suspended"],
      job_status: [
        "pending",
        "published",
        "hidden",
        "closed",
        "removed",
        "rejected",
      ],
      question_type: [
        "single_choice",
        "multi_choice",
        "short_text",
        "long_text",
        "number",
        "scale",
      ],
      test_question_type: [
        "single_choice",
        "multi_choice",
        "short_text",
        "long_text",
        "typing",
      ],
      user_role: ["employee", "employer", "admin"],
      video_provider: ["supabase", "mux"],
    },
  },
} as const

