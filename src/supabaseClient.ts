import { createClient } from '@supabase/supabase-js'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://mqahrdxlahpbiavvzyem.supabase.co'
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string) || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xYWhyZHhsYWhwYmlhdnZ5emVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU0Mzg3NzUsImV4cCI6MjEwMTAxNDc3NX0.wNwPGR5V0YSRxwQq9jFcUVFqlVMdtQuEJU-tB_XnIh8'

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
