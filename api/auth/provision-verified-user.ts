import { createClient } from '@supabase/supabase-js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body || {};
    const { email, password, displayName, username, facePattern } = body;

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.VITE_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl || !email || !password) {
      return res.status(200).json({
        success: false,
        provisioned: false,
        reason: 'Service role key not configured in environment',
      });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: listData } = await adminClient.auth.admin.listUsers();
    const existing = listData?.users?.find(
      (u) => u.email?.toLowerCase().trim() === email.toLowerCase().trim()
    );

    if (existing) {
      await adminClient.auth.admin.updateUserById(existing.id, {
        password,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          username,
          face_template: facePattern || null,
          face_enrolled: Boolean(facePattern && facePattern.length > 0),
        },
      });
    } else {
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: displayName,
          username,
          face_template: facePattern || null,
          face_enrolled: Boolean(facePattern && facePattern.length > 0),
        },
      });
    }

    return res.status(200).json({
      success: true,
      provisioned: true,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn('[Provision User Notice]:', msg);
    return res.status(200).json({
      success: false,
      provisioned: false,
      error: msg,
    });
  }
}
