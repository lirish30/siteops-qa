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
      baselines: {
        Row: {
          broken_links: Json
          canonical_url: string | null
          console_errors: Json
          created_at: string
          ctas: Json
          desktop_screenshot_path: string | null
          error_message: string | null
          forms: Json
          h1: string | null
          html_hash: string | null
          http_status: number | null
          id: string
          is_current: boolean
          meta_description: string | null
          mobile_screenshot_path: string | null
          page_id: string
          page_title: string | null
          site_id: string
          status: string
          wp_signals: Json
        }
        Insert: {
          broken_links?: Json
          canonical_url?: string | null
          console_errors?: Json
          created_at?: string
          ctas?: Json
          desktop_screenshot_path?: string | null
          error_message?: string | null
          forms?: Json
          h1?: string | null
          html_hash?: string | null
          http_status?: number | null
          id?: string
          is_current?: boolean
          meta_description?: string | null
          mobile_screenshot_path?: string | null
          page_id: string
          page_title?: string | null
          site_id: string
          status?: string
          wp_signals?: Json
        }
        Update: {
          broken_links?: Json
          canonical_url?: string | null
          console_errors?: Json
          created_at?: string
          ctas?: Json
          desktop_screenshot_path?: string | null
          error_message?: string | null
          forms?: Json
          h1?: string | null
          html_hash?: string | null
          http_status?: number | null
          id?: string
          is_current?: boolean
          meta_description?: string | null
          mobile_screenshot_path?: string | null
          page_id?: string
          page_title?: string | null
          site_id?: string
          status?: string
          wp_signals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "baselines_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "monitored_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "baselines_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          created_at: string
          description: string
          evidence: Json
          human_notes: string | null
          id: string
          needs_review: boolean
          page_id: string | null
          recommendation: string | null
          scan_id: string
          severity: string
          status: string
          title: string
          type: string
        }
        Insert: {
          created_at?: string
          description: string
          evidence?: Json
          human_notes?: string | null
          id?: string
          needs_review?: boolean
          page_id?: string | null
          recommendation?: string | null
          scan_id: string
          severity: string
          status?: string
          title: string
          type: string
        }
        Update: {
          created_at?: string
          description?: string
          evidence?: Json
          human_notes?: string | null
          id?: string
          needs_review?: boolean
          page_id?: string | null
          recommendation?: string | null
          scan_id?: string
          severity?: string
          status?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "issues_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "monitored_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      monitored_pages: {
        Row: {
          id: string
          ignored_regions: Json
          importance: string
          is_active: boolean
          label: string | null
          page_type: string
          site_id: string
          url: string
        }
        Insert: {
          id?: string
          ignored_regions?: Json
          importance?: string
          is_active?: boolean
          label?: string | null
          page_type?: string
          site_id: string
          url: string
        }
        Update: {
          id?: string
          ignored_regions?: Json
          importance?: string
          is_active?: boolean
          label?: string | null
          page_type?: string
          site_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "monitored_pages_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          org_id: string
          role?: string
          user_id: string
        }
        Update: {
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          billing_status: string
          created_at: string
          id: string
          name: string
          plan: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string
        }
        Insert: {
          billing_status?: string
          created_at?: string
          id?: string
          name: string
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string
        }
        Update: {
          billing_status?: string
          created_at?: string
          id?: string
          name?: string
          plan?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_ends_at?: string
        }
        Relationships: []
      }
      page_scan_results: {
        Row: {
          baseline_id: string | null
          broken_links: Json
          console_errors: Json
          created_at: string
          ctas: Json
          desktop_diff_path: string | null
          desktop_diff_ratio: number | null
          desktop_screenshot_path: string | null
          error_message: string | null
          forms: Json
          http_status: number | null
          id: string
          metadata_snapshot: Json
          mobile_diff_path: string | null
          mobile_diff_ratio: number | null
          mobile_screenshot_path: string | null
          page_id: string
          scan_id: string
          severity: string | null
          status: string
        }
        Insert: {
          baseline_id?: string | null
          broken_links?: Json
          console_errors?: Json
          created_at?: string
          ctas?: Json
          desktop_diff_path?: string | null
          desktop_diff_ratio?: number | null
          desktop_screenshot_path?: string | null
          error_message?: string | null
          forms?: Json
          http_status?: number | null
          id?: string
          metadata_snapshot?: Json
          mobile_diff_path?: string | null
          mobile_diff_ratio?: number | null
          mobile_screenshot_path?: string | null
          page_id: string
          scan_id: string
          severity?: string | null
          status?: string
        }
        Update: {
          baseline_id?: string | null
          broken_links?: Json
          console_errors?: Json
          created_at?: string
          ctas?: Json
          desktop_diff_path?: string | null
          desktop_diff_ratio?: number | null
          desktop_screenshot_path?: string | null
          error_message?: string | null
          forms?: Json
          http_status?: number | null
          id?: string
          metadata_snapshot?: Json
          mobile_diff_path?: string | null
          mobile_diff_ratio?: number | null
          mobile_screenshot_path?: string | null
          page_id?: string
          scan_id?: string
          severity?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_scan_results_baseline_id_fkey"
            columns: ["baseline_id"]
            isOneToOne: false
            referencedRelation: "baselines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_scan_results_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "monitored_pages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "page_scan_results_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          agency_notes: string | null
          content: Json
          created_at: string
          created_by: string | null
          id: string
          next_steps: string | null
          org_id: string
          scan_id: string
          share_enabled: boolean
          share_token: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          agency_notes?: string | null
          content: Json
          created_at?: string
          created_by?: string | null
          id?: string
          next_steps?: string | null
          org_id: string
          scan_id: string
          share_enabled?: boolean
          share_token?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          agency_notes?: string | null
          content?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          next_steps?: string | null
          org_id?: string
          scan_id?: string
          share_enabled?: boolean
          share_token?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reports_scan_id_fkey"
            columns: ["scan_id"]
            isOneToOne: false
            referencedRelation: "scans"
            referencedColumns: ["id"]
          },
        ]
      }
      scans: {
        Row: {
          ai_client_summary: string | null
          ai_internal_summary: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          overall_severity: string | null
          pages_done: number
          pages_total: number
          site_id: string
          started_at: string | null
          status: string
          trigger_type: string
          user_note: string | null
        }
        Insert: {
          ai_client_summary?: string | null
          ai_internal_summary?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          overall_severity?: string | null
          pages_done?: number
          pages_total?: number
          site_id: string
          started_at?: string | null
          status?: string
          trigger_type?: string
          user_note?: string | null
        }
        Update: {
          ai_client_summary?: string | null
          ai_internal_summary?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          overall_severity?: string | null
          pages_done?: number
          pages_total?: number
          site_id?: string
          started_at?: string | null
          status?: string
          trigger_type?: string
          user_note?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "scans_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scans_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          created_at: string
          id: string
          last_scan_at: string | null
          name: string
          org_id: string
          status: string
          url: string
          wp_detection: string
          wp_signals: Json
        }
        Insert: {
          created_at?: string
          id?: string
          last_scan_at?: string | null
          name: string
          org_id: string
          status?: string
          url: string
          wp_detection?: string
          wp_signals?: Json
        }
        Update: {
          created_at?: string
          id?: string
          last_scan_at?: string | null
          name?: string
          org_id?: string
          status?: string
          url?: string
          wp_detection?: string
          wp_signals?: Json
        }
        Relationships: [
          {
            foreignKeyName: "sites_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      stripe_events: {
        Row: {
          id: string
          processed_at: string
        }
        Insert: {
          id: string
          processed_at?: string
        }
        Update: {
          id?: string
          processed_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_organization: {
        Args: { org_name: string }
        Returns: {
          billing_status: string
          created_at: string
          id: string
          name: string
          plan: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_ends_at: string
        }
        SetofOptions: {
          from: "*"
          to: "organizations"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_org_ids: { Args: never; Returns: string[] }
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const

