import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireAdminKey, sha256Hex } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
  if (!requireAdminKey(req)) return jsonResponse({ error: 'Unauthorized' }, 401);

  try {
    const { public_code, admin_pin } = await req.json();
    if (!public_code || !admin_pin) return jsonResponse({ error: 'Missing required fields' }, 400);

    const supabase = getServiceClient();
    const { data: space, error } = await supabase
      .from('spaces')
      .select('*')
      .eq('public_code', String(public_code).toUpperCase())
      .single();

    if (error || !space) return jsonResponse({ error: 'Space not found' }, 404);

    const pinHash = await sha256Hex(String(admin_pin));
    if (pinHash !== space.admin_pin_hash) return jsonResponse({ error: 'Invalid admin PIN' }, 403);

    const { error: updateError } = await supabase
      .from('spaces')
      .update({ status: 'closed', updated_at: new Date().toISOString() })
      .eq('id', space.id);

    if (updateError) throw updateError;

    return jsonResponse({ ok: true, message: 'Space closed' });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Unexpected error' }, 500);
  }
});
