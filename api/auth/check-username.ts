import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const rawUser = body.username?.trim().toLowerCase();
    if (!rawUser) {
      return res.status(200).json({ available: false, error: 'Username required' });
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const anonKey = process.env.VITE_SUPABASE_ANON_KEY;

    const targetKey = serviceRoleKey || anonKey;
    if (supabaseUrl && targetKey) {
      const client = createClient(supabaseUrl, targetKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // 1. Try check_username_exists RPC
      const { data: rpcRes, error: rpcErr } = await client.rpc('check_username_exists', {
        target_username: rawUser,
      });
      if (!rpcErr && typeof rpcRes === 'boolean') {
        return res.status(200).json({ available: !rpcRes });
      }

      // 2. Direct query profiles table
      const { data, error } = await client
        .from('profiles')
        .select('id, username')
        .ilike('username', rawUser)
        .limit(1);

      if (!error && Array.isArray(data) && data.length > 0) {
        return res.status(200).json({ available: false });
      }
    }

    return res.status(200).json({ available: true });
  } catch {
    return res.status(200).json({ available: true });
  }
}
