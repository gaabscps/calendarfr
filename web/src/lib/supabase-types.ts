export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      days: {
        Row: {
          user_id: string;
          date: string;
          intention: string | null;
          mood: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          date: string;
          intention?: string | null;
          mood?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          date?: string;
          intention?: string | null;
          mood?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      priorities: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          text: string;
          done: boolean;
          position: number;
        };
        Insert: {
          id: string;
          user_id: string;
          date: string;
          text: string;
          done?: boolean;
          position: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          text?: string;
          done?: boolean;
          position?: number;
        };
        Relationships: [];
      };
      agenda_slots: {
        Row: {
          user_id: string;
          date: string;
          hour: number;
          text: string;
          energy_emoji: string | null;
        };
        Insert: {
          user_id: string;
          date: string;
          hour: number;
          text?: string;
          energy_emoji?: string | null;
        };
        Update: {
          user_id?: string;
          date?: string;
          hour?: number;
          text?: string;
          energy_emoji?: string | null;
        };
        Relationships: [];
      };
      notes: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          prefix: string | null;
          text: string;
          position: number;
        };
        Insert: {
          id: string;
          user_id: string;
          date: string;
          prefix?: string | null;
          text: string;
          position: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          prefix?: string | null;
          text?: string;
          position?: number;
        };
        Relationships: [];
      };
      gratitude_items: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          text: string;
          position: number;
        };
        Insert: {
          id: string;
          user_id: string;
          date: string;
          text: string;
          position: number;
        };
        Update: {
          id?: string;
          user_id?: string;
          date?: string;
          text?: string;
          position?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
