export type Database = {
  public: {
    Tables: {
      tickets: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: string;
          priority: string;
          type: string;
          customer_id: string;
          customer_name: string;
          customer_email: string;
          assignee_id: string | null;
          department: string | null;
          has_media: boolean;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          status?: string;
          priority?: string;
          type?: string;
          customer_id: string;
          customer_name: string;
          customer_email: string;
          assignee_id?: string | null;
          department?: string | null;
          has_media?: boolean;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          title?: string;
          description?: string | null;
          status?: string;
          priority?: string;
          type?: string;
          customer_id?: string;
          customer_name?: string;
          customer_email?: string;
          assignee_id?: string | null;
          department?: string | null;
          has_media?: boolean;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
        };
      };
      messages: {
        Row: {
          id: string;
          ticket_id: string;
          user_id: string;
          content: string;
          has_media: boolean;
          is_internal: boolean;
          channel: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          user_id: string;
          content: string;
          has_media?: boolean;
          is_internal?: boolean;
          channel?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          ticket_id?: string;
          user_id?: string;
          content?: string;
          has_media?: boolean;
          is_internal?: boolean;
          channel?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: string;
          department: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          department?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          department?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};

export type Ticket = Database['public']['Tables']['tickets']['Row'];
export type TicketInsert = Database['public']['Tables']['tickets']['Insert'];
export type TicketUpdate = Database['public']['Tables']['tickets']['Update'];

export type Message = Database['public']['Tables']['messages']['Row'];
export type MessageInsert = Database['public']['Tables']['messages']['Insert'];
export type MessageUpdate = Database['public']['Tables']['messages']['Update'];

export type Profile = Database['public']['Tables']['profiles']['Row'];
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert'];
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update'];
