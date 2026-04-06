import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireAdminKey } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
  if (!requireAdminKey(req)) return jsonResponse({ error: 'Unauthorized' }, 401);

  try {
    const { space_id } = await req.json();
    if (!space_id) return jsonResponse({ error: 'space_id is required' }, 400);

    const supabase = getServiceClient();

    const { data: participants } = await supabase
      .from('participants')
      .select('photo_path')
      .eq('space_id', space_id)
      .not('photo_path', 'is', null);

    const filePaths = (participants || []).map((p) => p.photo_path).filter(Boolean);
    if (filePaths.length > 0) {
      await supabase.storage.from('participant-photos-temp').remove(filePaths);
    }

    const { data, error } = await supabase.rpc('purge_expired_space', { p_space_id: space_id });
    if (error) throw error;

    return jsonResponse({ ok: true, purged: data === true });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Unexpected error' }, 500);
  }
});
