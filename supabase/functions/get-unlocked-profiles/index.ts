import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { bearerToken, getServiceClient, sha256Hex, xorDecrypt } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'GET') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const token = bearerToken(req);
    if (!token) return jsonResponse({ error: 'Missing participant session token' }, 401);

    const supabase = getServiceClient();
    const session_token_hash = await sha256Hex(token);

    const { data: participant, error } = await supabase
      .from('participants')
      .select('*')
      .eq('session_token_hash', session_token_hash)
      .single();

    if (error || !participant) return jsonResponse({ error: 'Participant not found' }, 404);

    const { data: profiles, error: profilesError } = await supabase
      .from('participants')
      .select('id, display_name, gender, age, photo_path, availability, is_visible, paid_unlock, whatsapp_number_encrypted')
      .eq('space_id', participant.space_id)
      .eq('is_visible', true)
      .order('created_at', { ascending: false });

    if (profilesError) throw profilesError;

    const canUnlock = participant.paid_unlock === true;
    const secret = Deno.env.get('APP_ENCRYPTION_KEY') || 'fallback-secret';

    const payload = (profiles || []).map((p) => {
      const unlocked = canUnlock;
      const phone = unlocked ? xorDecrypt(p.whatsapp_number_encrypted, secret) : null;
      return {
        id: p.id,
        display_name: p.display_name,
        gender: p.gender,
        age: p.age,
        photo_path: p.photo_path,
        availability: p.availability,
        contact_locked: !unlocked,
        whatsapp_link: unlocked ? `https://wa.me/${phone}` : null,
      };
    });

    return jsonResponse({ ok: true, paid_unlock: canUnlock, profiles: payload });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Unexpected error' }, 500);
  }
});
