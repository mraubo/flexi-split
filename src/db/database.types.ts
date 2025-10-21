export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  graphql_public: {
    Tables: Record<never, never>;
    Views: Record<never, never>;
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
  public: {
    Tables: {
      events: {
        Row: {
          actor_id: string | null;
          created_at: string;
          event_type: string;
          id: string;
          payload: Json;
          settlement_id: string | null;
        };
        Insert: {
          actor_id?: string | null;
          created_at?: string;
          event_type: string;
          id?: string;
          payload: Json;
          settlement_id?: string | null;
        };
        Update: {
          actor_id?: string | null;
          created_at?: string;
          event_type?: string;
          id?: string;
          payload?: Json;
          settlement_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "events_settlement_id_fkey";
            columns: ["settlement_id"];
            isOneToOne: false;
            referencedRelation: "settlements";
            referencedColumns: ["id"];
          },
        ];
      };
      expense_participants: {
        Row: {
          created_at: string;
          expense_id: string;
          participant_id: string;
          settlement_id: string;
        };
        Insert: {
          created_at?: string;
          expense_id: string;
          participant_id: string;
          settlement_id: string;
        };
        Update: {
          created_at?: string;
          expense_id?: string;
          participant_id?: string;
          settlement_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expense_participants_expense_fk";
            columns: ["expense_id", "settlement_id"];
            isOneToOne: false;
            referencedRelation: "expenses";
            referencedColumns: ["id", "settlement_id"];
          },
          {
            foreignKeyName: "expense_participants_participant_fk";
            columns: ["participant_id", "settlement_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["id", "settlement_id"];
          },
        ];
      };
      expenses: {
        Row: {
          amount_cents: number;
          created_at: string;
          description: string | null;
          expense_date: string;
          id: string;
          last_edited_by: string | null;
          payer_participant_id: string;
          settlement_id: string;
          share_count: number;
          updated_at: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          description?: string | null;
          expense_date: string;
          id?: string;
          last_edited_by?: string | null;
          payer_participant_id: string;
          settlement_id: string;
          share_count?: number;
          updated_at?: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          description?: string | null;
          expense_date?: string;
          id?: string;
          last_edited_by?: string | null;
          payer_participant_id?: string;
          settlement_id?: string;
          share_count?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "expenses_payer_consistency";
            columns: ["settlement_id", "payer_participant_id"];
            isOneToOne: false;
            referencedRelation: "participants";
            referencedColumns: ["settlement_id", "id"];
          },
          {
            foreignKeyName: "expenses_settlement_id_fkey";
            columns: ["settlement_id"];
            isOneToOne: false;
            referencedRelation: "settlements";
            referencedColumns: ["id"];
          },
        ];
      };
      participants: {
        Row: {
          created_at: string;
          id: string;
          is_owner: boolean;
          last_edited_by: string | null;
          nickname: string;
          nickname_norm: string | null;
          settlement_id: string;
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          is_owner?: boolean;
          last_edited_by?: string | null;
          nickname: string;
          nickname_norm?: string | null;
          settlement_id: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          is_owner?: boolean;
          last_edited_by?: string | null;
          nickname?: string;
          nickname_norm?: string | null;
          settlement_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "participants_settlement_id_fkey";
            columns: ["settlement_id"];
            isOneToOne: false;
            referencedRelation: "settlements";
            referencedColumns: ["id"];
          },
        ];
      };
      settlement_snapshots: {
        Row: {
          algorithm_version: number;
          balances: Json;
          created_at: string;
          id: string;
          settlement_id: string;
          transfers: Json;
        };
        Insert: {
          algorithm_version?: number;
          balances: Json;
          created_at?: string;
          id?: string;
          settlement_id: string;
          transfers: Json;
        };
        Update: {
          algorithm_version?: number;
          balances?: Json;
          created_at?: string;
          id?: string;
          settlement_id?: string;
          transfers?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "settlement_snapshots_settlement_id_fkey";
            columns: ["settlement_id"];
            isOneToOne: false;
            referencedRelation: "settlements";
            referencedColumns: ["id"];
          },
        ];
      };
      settlements: {
        Row: {
          closed_at: string | null;
          created_at: string;
          currency: string;
          deleted_at: string | null;
          expenses_count: number;
          id: string;
          last_edited_by: string | null;
          owner_id: string;
          participants_count: number;
          status: string;
          title: string;
          updated_at: string;
        };
        Insert: {
          closed_at?: string | null;
          created_at?: string;
          currency?: string;
          deleted_at?: string | null;
          expenses_count?: number;
          id?: string;
          last_edited_by?: string | null;
          owner_id: string;
          participants_count?: number;
          status?: string;
          title: string;
          updated_at?: string;
        };
        Update: {
          closed_at?: string | null;
          created_at?: string;
          currency?: string;
          deleted_at?: string | null;
          expenses_count?: number;
          id?: string;
          last_edited_by?: string | null;
          owner_id?: string;
          participants_count?: number;
          status?: string;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<never, never>;
    Functions: {
      assert_expense_has_participants: {
        Args: { p_expense_id: string };
        Returns: undefined;
      };
      assert_expense_limit: {
        Args: { p_settlement_id: string };
        Returns: undefined;
      };
      assert_open_settlements_limit: {
        Args: { p_owner_id: string };
        Returns: undefined;
      };
      assert_participant_limit: {
        Args: { p_settlement_id: string };
        Returns: undefined;
      };
      check_settlement_access: {
        Args: { p_settlement_id: string; p_user_id: string };
        Returns: Json;
      };
      finalize_settlement: {
        Args: { p_settlement_id: string };
        Returns: undefined;
      };
      refresh_expense_share_count: {
        Args: { p_expense_id: string };
        Returns: undefined;
      };
      refresh_expenses_count: {
        Args: { p_settlement_id: string };
        Returns: undefined;
      };
      refresh_participants_count: {
        Args: { p_settlement_id: string };
        Returns: undefined;
      };
    };
    Enums: Record<never, never>;
    CompositeTypes: Record<never, never>;
  };
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
