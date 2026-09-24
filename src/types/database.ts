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
      access_grants: {
        Row: {
          created_at: string
          employee_id: string
          employer_id: string
          expires_at: string | null
          granted_by: string | null
          id: string
          note: string | null
          revoked_at: string | null
          revoked_by: string | null
          scopes: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          employer_id: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          note?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          scopes: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          employer_id?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          note?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          scopes?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "access_grants_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "access_grants_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employer_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "access_grants_granted_by_fkey"
            columns: ["granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "access_grants_revoked_by_fkey"
            columns: ["revoked_by"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      consents: {
        Row: {
          accepted_at: string
          id: string
          ip_hash: string | null
          type: Database["public"]["Enums"]["consent_type"]
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          ip_hash?: string | null
          type: Database["public"]["Enums"]["consent_type"]
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          id?: string
          ip_hash?: string | null
          type?: Database["public"]["Enums"]["consent_type"]
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "consents_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      cv_documents: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          mime_type: string
          size_bytes: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          mime_type: string
          size_bytes: number
          storage_path: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          mime_type?: string
          size_bytes?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "cv_documents_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: true
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      employee_contacts: {
        Row: {
          created_at: string
          email: string | null
          phone: string | null
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      employee_profiles: {
        Row: {
          availability: Database["public"]["Enums"]["availability"][]
          city_emirate: string | null
          created_at: string
          expected_pay_range: string | null
          headline: string | null
          languages: string[]
          onboarding_step: number
          skills: string[]
          status: Database["public"]["Enums"]["employee_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: Database["public"]["Enums"]["availability"][]
          city_emirate?: string | null
          created_at?: string
          expected_pay_range?: string | null
          headline?: string | null
          languages?: string[]
          onboarding_step?: number
          skills?: string[]
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?: Database["public"]["Enums"]["availability"][]
          city_emirate?: string | null
          created_at?: string
          expected_pay_range?: string | null
          headline?: string | null
          languages?: string[]
          onboarding_step?: number
          skills?: string[]
          status?: Database["public"]["Enums"]["employee_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
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
      job_applications: {
        Row: {
          created_at: string
          employee_id: string
          employer_id: string
          id: string
          job_id: string
          message: string | null
          responded_at: string | null
          status: Database["public"]["Enums"]["application_status"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          employer_id: string
          id?: string
          job_id: string
          message?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          employer_id?: string
          id?: string
          job_id?: string
          message?: string | null
          responded_at?: string | null
          status?: Database["public"]["Enums"]["application_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_applications_employer_id_fkey"
            columns: ["employer_id"]
            isOneToOne: false
            referencedRelation: "employer_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
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
      meeting_requests: {
        Row: {
          chosen_slot: number | null
          created_at: string
          employee_id: string
          employer_id: string
          id: string
          meeting_link: string | null
          proposed_slots: Json
          responded_at: string | null
          status: Database["public"]["Enums"]["meeting_status"]
          updated_at: string
        }
        Insert: {
          chosen_slot?: number | null
          created_at?: string
          employee_id: string
          employer_id: string
          id?: string
          meeting_link?: string | null
          proposed_slots: Json
          responded_at?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          updated_at?: string
        }
        Update: {
          chosen_slot?: number | null
          created_at?: string
          employee_id?: string
          employer_id?: string
          id?: string
          meeting_link?: string | null
          proposed_slots?: Json
          responded_at?: string | null
          status?: Database["public"]["Enums"]["meeting_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "meeting_requests_employer_id_fkey"
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
      survey_answers: {
        Row: {
          answer: Json
          created_at: string
          question_id: string
          response_id: string
          updated_at: string
        }
        Insert: {
          answer: Json
          created_at?: string
          question_id: string
          response_id: string
          updated_at?: string
        }
        Update: {
          answer?: Json
          created_at?: string
          question_id?: string
          response_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_answers_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "survey_questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_answers_response_id_fkey"
            columns: ["response_id"]
            isOneToOne: false
            referencedRelation: "survey_responses"
            referencedColumns: ["id"]
          },
        ]
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
      survey_responses: {
        Row: {
          created_at: string
          employee_id: string
          id: string
          submitted_at: string | null
          survey_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          employee_id: string
          id?: string
          submitted_at?: string | null
          survey_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          employee_id?: string
          id?: string
          submitted_at?: string | null
          survey_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_responses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "survey_responses_survey_id_fkey"
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
      test_attempts: {
        Row: {
          answers: Json
          created_at: string
          employee_id: string
          id: string
          score: number | null
          started_at: string
          submitted_at: string | null
          test_id: string
          updated_at: string
        }
        Insert: {
          answers?: Json
          created_at?: string
          employee_id: string
          id?: string
          score?: number | null
          started_at?: string
          submitted_at?: string | null
          test_id: string
          updated_at?: string
        }
        Update: {
          answers?: Json
          created_at?: string
          employee_id?: string
          id?: string
          score?: number | null
          started_at?: string
          submitted_at?: string | null
          test_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_attempts_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "test_attempts_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "tests"
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
      video_resumes: {
        Row: {
          created_at: string
          duration_seconds: number | null
          employee_id: string
          id: string
          prompt_id: string
          provider: Database["public"]["Enums"]["video_provider"]
          status: Database["public"]["Enums"]["video_status"]
          storage_path: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          employee_id: string
          id?: string
          prompt_id: string
          provider?: Database["public"]["Enums"]["video_provider"]
          status?: Database["public"]["Enums"]["video_status"]
          storage_path: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          employee_id?: string
          id?: string
          prompt_id?: string
          provider?: Database["public"]["Enums"]["video_provider"]
          status?: Database["public"]["Enums"]["video_status"]
          storage_path?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "video_resumes_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employee_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "video_resumes_prompt_id_fkey"
            columns: ["prompt_id"]
            isOneToOne: false
            referencedRelation: "video_prompts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_get_answer_keys: {
        Args: { p_test_id: string }
        Returns: {
          correct_option: number
          question_id: string
        }[]
      }
      admin_grant_access: {
        Args: {
          p_employee_ids: string[]
          p_employer_id: string
          p_expires_at?: string
          p_note?: string
          p_scopes: string[]
        }
        Returns: number
      }
      admin_revoke_grant: { Args: { p_grant_id: string }; Returns: undefined }
      admin_set_answer_key: {
        Args: { p_correct_option: number; p_question_id: string }
        Returns: undefined
      }
      admin_set_employee_status: {
        Args: {
          p_employee_id: string
          p_status: Database["public"]["Enums"]["employee_status"]
        }
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
      check_rate_limit: {
        Args: { p_key: string; p_max: number; p_window_seconds: number }
        Returns: boolean
      }
      complete_password_change: { Args: never; Returns: undefined }
      employee_list_job_requests: {
        Args: never
        Returns: {
          area_label: string
          category: Database["public"]["Enums"]["job_category"]
          city_emirate: string
          company_name: string
          created_at: string
          id: string
          job_id: string
          job_status: Database["public"]["Enums"]["job_status"]
          responded_at: string
          status: Database["public"]["Enums"]["application_status"]
          title: string
        }[]
      }
      employee_list_meeting_requests: {
        Args: never
        Returns: {
          chosen_slot: number
          company_name: string
          created_at: string
          id: string
          meeting_link: string
          proposed_slots: Json
          status: Database["public"]["Enums"]["meeting_status"]
        }[]
      }
      employer_list_applications: {
        Args: { p_job_id: string }
        Returns: {
          availability: Database["public"]["Enums"]["availability"][]
          city_emirate: string
          created_at: string
          email: string
          employee_id: string
          full_name: string
          headline: string
          id: string
          languages: string[]
          message: string
          phone: string
          skills: string[]
          status: Database["public"]["Enums"]["application_status"]
          test_score: number
          video_count: number
          whatsapp: string
        }[]
      }
      employer_list_candidates: {
        Args: { p_page?: number }
        Returns: {
          availability: Database["public"]["Enums"]["availability"][]
          city_emirate: string
          employee_id: string
          expires_at: string
          granted_at: string
          headline: string
          scopes: string[]
          skills: string[]
          test_score: number
          total_count: number
        }[]
      }
      employer_respond_to_application: {
        Args: { p_accept: boolean; p_application_id: string }
        Returns: undefined
      }
      employer_update_meeting_request: {
        Args: {
          p_meeting_link?: string
          p_request_id: string
          p_status?: Database["public"]["Enums"]["meeting_status"]
        }
        Returns: undefined
      }
      get_job: {
        Args: { p_job_id: string }
        Returns: {
          area_label: string
          category: Database["public"]["Enums"]["job_category"]
          city_emirate: string
          company_name: string
          currency: string
          description: string
          exact_address: string
          exact_lat: number
          exact_lng: number
          expires_at: string
          id: string
          lat: number
          lng: number
          my_request_id: string
          my_request_status: Database["public"]["Enums"]["application_status"]
          pay_max: number
          pay_min: number
          pay_period: Database["public"]["Enums"]["pay_period"]
          schedule: Database["public"]["Enums"]["availability"][]
          spots: number
          starts_on: string
          title: string
        }[]
      }
      list_open_jobs: {
        Args: {
          p_east?: number
          p_north?: number
          p_south?: number
          p_west?: number
        }
        Returns: {
          area_label: string
          category: Database["public"]["Enums"]["job_category"]
          city_emirate: string
          company_name: string
          created_at: string
          currency: string
          id: string
          lat: number
          lng: number
          my_request_status: Database["public"]["Enums"]["application_status"]
          pay_max: number
          pay_min: number
          pay_period: Database["public"]["Enums"]["pay_period"]
          schedule: Database["public"]["Enums"]["availability"][]
          spots: number
          starts_on: string
          title: string
        }[]
      }
      log_candidate_access: {
        Args: { p_employee_id: string; p_ip_hash?: string; p_scope: string }
        Returns: undefined
      }
      request_job: {
        Args: { p_job_id: string; p_message?: string }
        Returns: string
      }
      respond_to_meeting_request: {
        Args: { p_accept: boolean; p_request_id: string; p_slot?: number }
        Returns: undefined
      }
      save_test_answer: {
        Args: { p_attempt_id: string; p_option: number; p_question_id: string }
        Returns: undefined
      }
      start_test_attempt: { Args: { p_test_id: string }; Returns: string }
      submit_employee_profile: { Args: never; Returns: undefined }
      submit_survey_response: {
        Args: { p_response_id: string }
        Returns: undefined
      }
      submit_test_attempt: {
        Args: { p_attempt_id: string }
        Returns: undefined
      }
      test_question_count: { Args: { p_test_id: string }; Returns: number }
      withdraw_job_request: {
        Args: { p_application_id: string }
        Returns: undefined
      }
    }
    Enums: {
      application_status: "pending" | "accepted" | "declined" | "withdrawn"
      availability:
        | "evenings"
        | "weekends"
        | "part_time"
        | "full_time"
        | "flexible"
      consent_type: "terms" | "privacy" | "data_sharing"
      employee_status: "draft" | "submitted" | "approved" | "hidden"
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
      meeting_status:
        | "requested"
        | "accepted"
        | "declined"
        | "cancelled"
        | "completed"
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
      video_status: "uploaded" | "approved" | "rejected"
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
      consent_type: ["terms", "privacy", "data_sharing"],
      employee_status: ["draft", "submitted", "approved", "hidden"],
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
      meeting_status: [
        "requested",
        "accepted",
        "declined",
        "cancelled",
        "completed",
      ],
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
      video_status: ["uploaded", "approved", "rejected"],
    },
  },
} as const

