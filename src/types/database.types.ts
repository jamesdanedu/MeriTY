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
      teachers: {
        Row: {
          id: number
          name: string
          email: string
          hashed_password: string
          is_admin: boolean
          is_active: boolean
          password_changed: boolean
          last_login: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          email: string
          hashed_password: string
          is_admin?: boolean
          is_active?: boolean
          password_changed?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          email?: string
          hashed_password?: string
          is_admin?: boolean
          is_active?: boolean
          password_changed?: boolean
          last_login?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      academic_years: {
        Row: {
          id: number
          name: string
          start_date: string
          end_date: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          start_date: string
          end_date: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          start_date?: string
          end_date?: string
          created_at?: string
          updated_at?: string
        }
      }
      class_groups: {
        Row: {
          id: number
          name: string
          academic_year_id: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          academic_year_id: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          academic_year_id?: number
          created_at?: string
          updated_at?: string
        }
      }
      students: {
        Row: {
          id: number
          name: string
          email: string
          class_group_id: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          email: string
          class_group_id?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          email?: string
          class_group_id?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      subjects: {
        Row: {
          id: number
          name: string
          credit_value: number
          type: "core" | "optional" | "short" | "other"
          academic_year_id: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          name: string
          credit_value: number
          type: "core" | "optional" | "short" | "other"
          academic_year_id: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          name?: string
          credit_value?: number
          type?: "core" | "optional" | "short" | "other"
          academic_year_id?: number
          created_at?: string
          updated_at?: string
        }
      }
      enrollments: {
        Row: {
          id: number
          student_id: number
          subject_id: number
          credits_earned: number
          teacher_id: number | null
          term: "Term 1" | "Term 2" | "Full Year"
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          student_id: number
          subject_id: number
          credits_earned?: number
          teacher_id?: number | null
          term?: "Term 1" | "Term 2" | "Full Year"
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          student_id?: number
          subject_id?: number
          credits_earned?: number
          teacher_id?: number | null
          term?: "Term 1" | "Term 2" | "Full Year"
          created_at?: string
          updated_at?: string
        }
      }
      work_experience: {
        Row: {
          id: number
          student_id: number
          business: string
          start_date: string
          end_date: string
          credits_earned: number
          teacher_id: number | null
          comments: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          student_id: number
          business: string
          start_date: string
          end_date: string
          credits_earned?: number
          teacher_id?: number | null
          comments?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          student_id?: number
          business?: string
          start_date?: string
          end_date?: string
          credits_earned?: number
          teacher_id?: number | null
          comments?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      portfolios: {
        Row: {
          id: number
          student_id: number
          period: "Term 1" | "Term 2" | "Full Year"
          credits_earned: number
          teacher_id: number | null
          interview_comments: string | null
          feedback: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          student_id: number
          period: "Term 1" | "Term 2" | "Full Year"
          credits_earned?: number
          teacher_id?: number | null
          interview_comments?: string | null
          feedback?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          student_id?: number
          period?: "Term 1" | "Term 2" | "Full Year"
          credits_earned?: number
          teacher_id?: number | null
          interview_comments?: string | null
          feedback?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      attendance: {
        Row: {
          id: number
          student_id: number
          period: "Term 1" | "Term 2"
          credits_earned: number
          teacher_id: number | null
          comments: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: number
          student_id: number
          period: "Term 1" | "Term 2"
          credits_earned?: number
          teacher_id?: number | null
          comments?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: number
          student_id?: number
          period?: "Term 1" | "Term 2"
          credits_earned?: number
          teacher_id?: number | null
          comments?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      password_resets: {
        Row: {
          id: number
          teacher_id: number
          token: string
          expires_at: string
          created_at: string
        }
        Insert: {
          id?: number
          teacher_id: number
          token: string
          expires_at: string
          created_at?: string
        }
        Update: {
          id?: number
          teacher_id?: number
          token?: string
          expires_at?: string
          created_at?: string
        }
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
  }
}
