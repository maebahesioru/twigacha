import { createClient } from '@supabase/supabase-js';

// サーバー側: SERVICE_ROLEキー（RLSをバイパス）
// クライアント側: ANONキー（読み取り専用）
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
