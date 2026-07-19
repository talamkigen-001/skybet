export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      deposit_requests: {
        Row: {
          admin_note: string | null;
          amount: number;
          created_at: string;
          crypto_address: string | null;
          currency: string;
          id: string;
          method: Database["public"]["Enums"]["deposit_method"];
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["tx_status"];
          stripe_session_id: string | null;
          tx_hash: string | null;
          user_id: string;
        };
        Insert: {
          admin_note?: string | null;
          amount: number;
          created_at?: string;
          crypto_address?: string | null;
          currency?: string;
          id?: string;
          method: Database["public"]["Enums"]["deposit_method"];
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["tx_status"];
          stripe_session_id?: string | null;
          tx_hash?: string | null;
          user_id: string;
        };
        Update: {
          admin_note?: string | null;
          amount?: number;
          created_at?: string;
          crypto_address?: string | null;
          currency?: string;
          id?: string;
          method?: Database["public"]["Enums"]["deposit_method"];
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["tx_status"];
          stripe_session_id?: string | null;
          tx_hash?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      login_activity: {
        Row: {
          created_at: string;
          id: string;
          ip: string | null;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          ip?: string | null;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          ip?: string | null;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          country: string | null;
          created_at: string;
          display_name: string | null;
          email: string | null;
          id: string;
          is_suspended: boolean;
          kyc_status: Database["public"]["Enums"]["kyc_status"];
          last_sign_in_at: string | null;
          last_sign_in_ip: string | null;
          referral_code: string | null;
          referred_by: string | null;
          updated_at: string;
          username: string | null;
        };
        Insert: {
          avatar_url?: string | null;
          country?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id: string;
          is_suspended?: boolean;
          kyc_status?: Database["public"]["Enums"]["kyc_status"];
          last_sign_in_at?: string | null;
          last_sign_in_ip?: string | null;
          referral_code?: string | null;
          referred_by?: string | null;
          updated_at?: string;
          username?: string | null;
        };
        Update: {
          avatar_url?: string | null;
          country?: string | null;
          created_at?: string;
          display_name?: string | null;
          email?: string | null;
          id?: string;
          is_suspended?: boolean;
          kyc_status?: Database["public"]["Enums"]["kyc_status"];
          last_sign_in_at?: string | null;
          last_sign_in_ip?: string | null;
          referral_code?: string | null;
          referred_by?: string | null;
          updated_at?: string;
          username?: string | null;
        };
        Relationships: [];
      };
      transactions: {
        Row: {
          amount: number;
          created_at: string;
          currency: string;
          id: string;
          meta: Json;
          reference: string | null;
          status: Database["public"]["Enums"]["tx_status"];
          type: Database["public"]["Enums"]["tx_type"];
          user_id: string;
        };
        Insert: {
          amount: number;
          created_at?: string;
          currency?: string;
          id?: string;
          meta?: Json;
          reference?: string | null;
          status?: Database["public"]["Enums"]["tx_status"];
          type: Database["public"]["Enums"]["tx_type"];
          user_id: string;
        };
        Update: {
          amount?: number;
          created_at?: string;
          currency?: string;
          id?: string;
          meta?: Json;
          reference?: string | null;
          status?: Database["public"]["Enums"]["tx_status"];
          type?: Database["public"]["Enums"]["tx_type"];
          user_id?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
      wallets: {
        Row: {
          balance: number;
          bonus_balance: number;
          currency: string;
          total_deposited: number;
          total_withdrawn: number;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          balance?: number;
          bonus_balance?: number;
          currency?: string;
          total_deposited?: number;
          total_withdrawn?: number;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          balance?: number;
          bonus_balance?: number;
          currency?: string;
          total_deposited?: number;
          total_withdrawn?: number;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: "admin" | "user";
      deposit_method:
        "card" | "btc" | "eth" | "usdt_trc20" | "usdt_erc20" | "bnb" | "ltc" | "binance_pay";
      kyc_status: "unverified" | "pending" | "verified" | "rejected";
      tx_status: "pending" | "processing" | "completed" | "failed" | "rejected" | "cancelled";
      tx_type: "deposit" | "withdrawal" | "bet" | "win" | "bonus" | "adjustment" | "refund";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user"],
      deposit_method: [
        "card",
        "btc",
        "eth",
        "usdt_trc20",
        "usdt_erc20",
        "bnb",
        "ltc",
        "binance_pay",
      ],
      kyc_status: ["unverified", "pending", "verified", "rejected"],
      tx_status: ["pending", "processing", "completed", "failed", "rejected", "cancelled"],
      tx_type: ["deposit", "withdrawal", "bet", "win", "bonus", "adjustment", "refund"],
    },
  },
} as const;
