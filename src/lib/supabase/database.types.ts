
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "announcements": {
                  Row: {
                    "audience": Database["public"]['Enums']["announcement_audience"],"author_id": string,"body": string,"created_at": string,"id": string,"pinned": boolean,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "audience"?: Database["public"]['Enums']["announcement_audience"],"author_id"?: string,"body": string,"created_at"?: string,"id"?: string,"pinned"?: boolean,"title": string
                  }
                  Update: {
                    "audience"?: Database["public"]['Enums']["announcement_audience"],"author_id"?: string,"body"?: string,"created_at"?: string,"id"?: string,"pinned"?: boolean,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "announcements_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"appointments": {
                  Row: {
                    "cancel_reason": string | null,"cancelled_by": string | null,"counselor_id": string,"created_at": string,"id": string,"reason": string | null,"slot_id": string,"status": Database["public"]['Enums']["appointment_status"],"student_id": string,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "cancel_reason"?: string | null,"cancelled_by"?: string | null,"counselor_id": string,"created_at"?: string,"id"?: string,"reason"?: string | null,"slot_id": string,"status"?: Database["public"]['Enums']["appointment_status"],"student_id": string,"updated_at"?: string
                  }
                  Update: {
                    "cancel_reason"?: string | null,"cancelled_by"?: string | null,"counselor_id"?: string,"created_at"?: string,"id"?: string,"reason"?: string | null,"slot_id"?: string,"status"?: Database["public"]['Enums']["appointment_status"],"student_id"?: string,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "appointments_cancelled_by_fkey"
      columns: ["cancelled_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_counselor_id_fkey"
      columns: ["counselor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_slot_id_fkey"
      columns: ["slot_id"]
isOneToOne: false
      referencedRelation: "availability_slots"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "appointments_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"availability_slots": {
                  Row: {
                    "counselor_id": string,"created_at": string,"ends_at": string,"id": string,"location": string | null,"mode": Database["public"]['Enums']["appointment_mode"],"starts_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "counselor_id"?: string,"created_at"?: string,"ends_at": string,"id"?: string,"location"?: string | null,"mode"?: Database["public"]['Enums']["appointment_mode"],"starts_at": string
                  }
                  Update: {
                    "counselor_id"?: string,"created_at"?: string,"ends_at"?: string,"id"?: string,"location"?: string | null,"mode"?: Database["public"]['Enums']["appointment_mode"],"starts_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "availability_slots_counselor_id_fkey"
      columns: ["counselor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"case_notes": {
                  Row: {
                    "author_id": string,"body": string,"created_at": string,"id": string,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "author_id"?: string,"body": string,"created_at"?: string,"id"?: string,"student_id": string
                  }
                  Update: {
                    "author_id"?: string,"body"?: string,"created_at"?: string,"id"?: string,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "case_notes_author_id_fkey"
      columns: ["author_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "case_notes_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"conversations": {
                  Row: {
                    "category": Database["public"]['Enums']["request_category"],"counselor_id": string | null,"counselor_last_read_at": string | null,"created_at": string,"first_response_at": string | null,"id": string,"last_message_at": string,"last_message_preview": string | null,"last_message_sender": string | null,"resolved_at": string | null,"status": Database["public"]['Enums']["request_status"],"student_id": string,"student_last_read_at": string,"subject": string,"updated_at": string,"urgency": Database["public"]['Enums']["request_urgency"]
                  }
                  ComputedFields: never
                  Insert: {
                    "category"?: Database["public"]['Enums']["request_category"],"counselor_id"?: string | null,"counselor_last_read_at"?: string | null,"created_at"?: string,"first_response_at"?: string | null,"id"?: string,"last_message_at"?: string,"last_message_preview"?: string | null,"last_message_sender"?: string | null,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["request_status"],"student_id": string,"student_last_read_at"?: string,"subject": string,"updated_at"?: string,"urgency"?: Database["public"]['Enums']["request_urgency"]
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["request_category"],"counselor_id"?: string | null,"counselor_last_read_at"?: string | null,"created_at"?: string,"first_response_at"?: string | null,"id"?: string,"last_message_at"?: string,"last_message_preview"?: string | null,"last_message_sender"?: string | null,"resolved_at"?: string | null,"status"?: Database["public"]['Enums']["request_status"],"student_id"?: string,"student_last_read_at"?: string,"subject"?: string,"updated_at"?: string,"urgency"?: Database["public"]['Enums']["request_urgency"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "conversations_counselor_id_fkey"
      columns: ["counselor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "conversations_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"feedback": {
                  Row: {
                    "appointment_id": string | null,"comment": string | null,"conversation_id": string | null,"counselor_id": string | null,"created_at": string,"id": string,"rating": number,"student_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "appointment_id"?: string | null,"comment"?: string | null,"conversation_id"?: string | null,"counselor_id"?: string | null,"created_at"?: string,"id"?: string,"rating": number,"student_id": string
                  }
                  Update: {
                    "appointment_id"?: string | null,"comment"?: string | null,"conversation_id"?: string | null,"counselor_id"?: string | null,"created_at"?: string,"id"?: string,"rating"?: number,"student_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "feedback_appointment_id_fkey"
      columns: ["appointment_id"]
isOneToOne: true
      referencedRelation: "appointments"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "feedback_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: true
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "feedback_counselor_id_fkey"
      columns: ["counselor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "feedback_student_id_fkey"
      columns: ["student_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"messages": {
                  Row: {
                    "body": string,"conversation_id": string,"created_at": string,"id": string,"sender_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "body": string,"conversation_id": string,"created_at"?: string,"id"?: string,"sender_id"?: string | null
                  }
                  Update: {
                    "body"?: string,"conversation_id"?: string,"created_at"?: string,"id"?: string,"sender_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "messages_conversation_id_fkey"
      columns: ["conversation_id"]
isOneToOne: false
      referencedRelation: "conversations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "messages_sender_id_fkey"
      columns: ["sender_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"notifications": {
                  Row: {
                    "body": string | null,"created_at": string,"href": string | null,"id": string,"kind": string,"read_at": string | null,"title": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "body"?: string | null,"created_at"?: string,"href"?: string | null,"id"?: string,"kind": string,"read_at"?: string | null,"title": string,"user_id": string
                  }
                  Update: {
                    "body"?: string | null,"created_at"?: string,"href"?: string | null,"id"?: string,"kind"?: string,"read_at"?: string | null,"title"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "notifications_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "avatar_hue": number,"bio": string | null,"counselor_id": string | null,"created_at": string,"email": string | null,"full_name": string,"grade": string | null,"id": string,"office_hours": string | null,"presence": Database["public"]['Enums']["counselor_presence"],"role": Database["public"]['Enums']["user_role"],"section": string | null,"specialties": (string)[],"status": Database["public"]['Enums']["account_status"],"student_number": string | null,"title": string | null,"updated_at": string,"username": string,"whatsapp": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "avatar_hue"?: number,"bio"?: string | null,"counselor_id"?: string | null,"created_at"?: string,"email"?: string | null,"full_name": string,"grade"?: string | null,"id": string,"office_hours"?: string | null,"presence"?: Database["public"]['Enums']["counselor_presence"],"role"?: Database["public"]['Enums']["user_role"],"section"?: string | null,"specialties"?: (string)[],"status"?: Database["public"]['Enums']["account_status"],"student_number"?: string | null,"title"?: string | null,"updated_at"?: string,"username": string,"whatsapp"?: string | null
                  }
                  Update: {
                    "avatar_hue"?: number,"bio"?: string | null,"counselor_id"?: string | null,"created_at"?: string,"email"?: string | null,"full_name"?: string,"grade"?: string | null,"id"?: string,"office_hours"?: string | null,"presence"?: Database["public"]['Enums']["counselor_presence"],"role"?: Database["public"]['Enums']["user_role"],"section"?: string | null,"specialties"?: (string)[],"status"?: Database["public"]['Enums']["account_status"],"student_number"?: string | null,"title"?: string | null,"updated_at"?: string,"username"?: string,"whatsapp"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "profiles_counselor_id_fkey"
      columns: ["counselor_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "admin_assign_counselor":
{ Args: { "p_counselor": string,"p_move_open"?: boolean,"p_student": string }; Returns: undefined
                           },
"admin_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"admin_update_user":
{ Args: { "p_role": Database["public"]['Enums']["user_role"],"p_status": Database["public"]['Enums']["account_status"],"p_user": string }; Returns: undefined
                           },
"book_appointment":
{ Args: { "p_reason": string,"p_slot": string }; Returns: string
                           },
"can_access_conversation":
{ Args: { "cid": string }; Returns: boolean
                           },
"counselor_can_see_student":
{ Args: { "sid": string }; Returns: boolean
                           },
"counselor_stats":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"create_admin_provision_token":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"current_role_active":
{ Args: Record<PropertyKey, never>; Returns: Database["public"]['Enums']["user_role"]
                           },
"is_admin":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"is_counselor":
{ Args: Record<PropertyKey, never>; Returns: boolean
                           },
"leave_feedback":
{ Args: { "p_appointment": string,"p_comment": string,"p_conversation": string,"p_rating": number }; Returns: undefined
                           },
"mark_conversation_read":
{ Args: { "p_conversation": string }; Returns: undefined
                           },
"my_counselor_id":
{ Args: Record<PropertyKey, never>; Returns: string
                           },
"notify":
{ Args: { "p_body": string,"p_href": string,"p_kind": string,"p_title": string,"p_user": string }; Returns: undefined
                           },
"open_slots":
{ Args: Record<PropertyKey, never>; Returns: {
              "counselor_id": string,
"created_at": string,
"ends_at": string,
"id": string,
"location": string | null,
"mode": Database["public"]['Enums']["appointment_mode"],
"starts_at": string
            }[]
                          SetofOptions: {
        from: "*"
        to: "availability_slots"
        isOneToOne: false
        isSetofReturn: true
      } },
"start_conversation":
{ Args: { "p_body": string,"p_category": Database["public"]['Enums']["request_category"],"p_subject": string,"p_urgency": Database["public"]['Enums']["request_urgency"] }; Returns: string
                           },
"update_appointment":
{ Args: { "p_appointment": string,"p_reason": string,"p_status": Database["public"]['Enums']["appointment_status"] }; Returns: undefined
                           }
          }
          Enums: {
            "account_status": "active"|"pending"|"suspended","announcement_audience": "everyone"|"all_students"|"my_students"|"counselors","appointment_mode": "in_person"|"online"|"phone","appointment_status": "confirmed"|"completed"|"cancelled","counselor_presence": "available"|"busy"|"away","request_category": "academic"|"exams"|"career"|"wellbeing"|"friendship"|"family"|"bullying"|"other","request_status": "pending"|"in_progress"|"resolved","request_urgency": "low"|"normal"|"high"|"urgent","user_role": "student"|"counselor"|"admin"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "account_status": ["active", "pending", "suspended"],"announcement_audience": ["everyone", "all_students", "my_students", "counselors"],"appointment_mode": ["in_person", "online", "phone"],"appointment_status": ["confirmed", "completed", "cancelled"],"counselor_presence": ["available", "busy", "away"],"request_category": ["academic", "exams", "career", "wellbeing", "friendship", "family", "bullying", "other"],"request_status": ["pending", "in_progress", "resolved"],"request_urgency": ["low", "normal", "high", "urgent"],"user_role": ["student", "counselor", "admin"]
          }
        }
} as const
