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
      admin_activity_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_label: string | null
          created_at: string
          details: string | null
          id: string
          ip_address: string | null
          target_label: string | null
          target_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          target_label?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_label?: string | null
          created_at?: string
          details?: string | null
          id?: string
          ip_address?: string | null
          target_label?: string | null
          target_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      admin_permissions: {
        Row: {
          granted_at: string
          granted_by: string | null
          permission: string
          user_id: string
        }
        Insert: {
          granted_at?: string
          granted_by?: string | null
          permission: string
          user_id: string
        }
        Update: {
          granted_at?: string
          granted_by?: string | null
          permission?: string
          user_id?: string
        }
        Relationships: []
      }
      admin_profiles: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          sessions_valid_from: string
          status: string
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          sessions_valid_from?: string
          status?: string
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          sessions_valid_from?: string
          status?: string
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      blessing_versions: {
        Row: {
          blessing_id: string
          change_type: string
          created_at: string
          edited_by: string | null
          edited_by_label: string | null
          id: string
          name: string
          note: string
          status: string
          version: number
        }
        Insert: {
          blessing_id: string
          change_type: string
          created_at?: string
          edited_by?: string | null
          edited_by_label?: string | null
          id?: string
          name: string
          note: string
          status: string
          version: number
        }
        Update: {
          blessing_id?: string
          change_type?: string
          created_at?: string
          edited_by?: string | null
          edited_by_label?: string | null
          id?: string
          name?: string
          note?: string
          status?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "blessing_versions_blessing_id_fkey"
            columns: ["blessing_id"]
            isOneToOne: false
            referencedRelation: "blessings"
            referencedColumns: ["id"]
          },
        ]
      }
      blessings: {
        Row: {
          ai_probability: number | null
          analysis: Json | null
          analyzed_at: string | null
          approved: boolean
          approved_at: string | null
          created_at: string
          email_sent: boolean
          hidden: boolean
          id: string
          last_edited_at: string | null
          last_edited_by: string | null
          moderation_token: string
          name: string
          note: string
          quality_score: number | null
          recipient_email: string
          rejected: boolean
          rejected_at: string | null
          rejection_reason: string | null
          sort_order: number | null
        }
        Insert: {
          ai_probability?: number | null
          analysis?: Json | null
          analyzed_at?: string | null
          approved?: boolean
          approved_at?: string | null
          created_at?: string
          email_sent?: boolean
          hidden?: boolean
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          moderation_token: string
          name: string
          note: string
          quality_score?: number | null
          recipient_email?: string
          rejected?: boolean
          rejected_at?: string | null
          rejection_reason?: string | null
          sort_order?: number | null
        }
        Update: {
          ai_probability?: number | null
          analysis?: Json | null
          analyzed_at?: string | null
          approved?: boolean
          approved_at?: string | null
          created_at?: string
          email_sent?: boolean
          hidden?: boolean
          id?: string
          last_edited_at?: string | null
          last_edited_by?: string | null
          moderation_token?: string
          name?: string
          note?: string
          quality_score?: number | null
          recipient_email?: string
          rejected?: boolean
          rejected_at?: string | null
          rejection_reason?: string | null
          sort_order?: number | null
        }
        Relationships: []
      }
      gallery_media: {
        Row: {
          approval_status: string
          bucket_public: string
          bytes_original: number
          bytes_poster: number
          bytes_public: number
          caption: string
          category: string
          created_at: string
          duration_seconds: number | null
          error: string | null
          height: number | null
          id: string
          kind: string
          original_path: string | null
          poster_path: string | null
          public_path: string | null
          published: boolean
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          reviewed_by_label: string | null
          sort_order: number | null
          source: string
          status: string
          submitted_at: string
          submitter_ip: string | null
          submitter_name: string | null
          submitter_ua: string | null
          updated_at: string
          uploaded_by: string | null
          uploaded_by_label: string | null
          width: number | null
        }
        Insert: {
          approval_status?: string
          bucket_public?: string
          bytes_original?: number
          bytes_poster?: number
          bytes_public?: number
          caption?: string
          category?: string
          created_at?: string
          duration_seconds?: number | null
          error?: string | null
          height?: number | null
          id?: string
          kind: string
          original_path?: string | null
          poster_path?: string | null
          public_path?: string | null
          published?: boolean
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_label?: string | null
          sort_order?: number | null
          source?: string
          status?: string
          submitted_at?: string
          submitter_ip?: string | null
          submitter_name?: string | null
          submitter_ua?: string | null
          updated_at?: string
          uploaded_by?: string | null
          uploaded_by_label?: string | null
          width?: number | null
        }
        Update: {
          approval_status?: string
          bucket_public?: string
          bytes_original?: number
          bytes_poster?: number
          bytes_public?: number
          caption?: string
          category?: string
          created_at?: string
          duration_seconds?: number | null
          error?: string | null
          height?: number | null
          id?: string
          kind?: string
          original_path?: string | null
          poster_path?: string | null
          public_path?: string | null
          published?: boolean
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          reviewed_by_label?: string | null
          sort_order?: number | null
          source?: string
          status?: string
          submitted_at?: string
          submitter_ip?: string | null
          submitter_name?: string | null
          submitter_ua?: string | null
          updated_at?: string
          uploaded_by?: string | null
          uploaded_by_label?: string | null
          width?: number | null
        }
        Relationships: []
      }
      moderation_logs: {
        Row: {
          action: string
          administrator: string | null
          administrator_id: string | null
          blessing_id: string | null
          created_at: string
          guest_name: string | null
          id: string
          new_status: string | null
          previous_status: string | null
          reason: string | null
        }
        Insert: {
          action: string
          administrator?: string | null
          administrator_id?: string | null
          blessing_id?: string | null
          created_at?: string
          guest_name?: string | null
          id?: string
          new_status?: string | null
          previous_status?: string | null
          reason?: string | null
        }
        Update: {
          action?: string
          administrator?: string | null
          administrator_id?: string | null
          blessing_id?: string | null
          created_at?: string
          guest_name?: string | null
          id?: string
          new_status?: string | null
          previous_status?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "moderation_logs_blessing_id_fkey"
            columns: ["blessing_id"]
            isOneToOne: false
            referencedRelation: "blessings"
            referencedColumns: ["id"]
          },
        ]
      }
      site_settings: {
        Row: {
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
      is_moderator_user: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role:
        | "admin"
        | "super_admin"
        | "administrator"
        | "moderator"
        | "viewer"
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
    Enums: {
      app_role: [
        "admin",
        "super_admin",
        "administrator",
        "moderator",
        "viewer",
      ],
    },
  },
} as const
