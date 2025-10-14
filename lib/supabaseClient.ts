import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    db: { schema: 'app' },  // ← 요게 꼭 있어야 함
    auth: { persistSession: true, autoRefreshToken: true }
  }
)
