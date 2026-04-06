import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, haversineMeters, normalizePhone, oneDayAfter, sha256Hex, validateDisplayName, xorEncrypt } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const body = await req.json();
    const {
      public_code,
      display_name,
      gender,
      age,
      availability,
      whatsapp_number,
      lat,
      lng,
      photo_base64,
      photo_mime_type,
    } = body;

    if (!public_code || !display_name || !gender || !age || !availability || !whatsapp_number) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    if (!validateDisplayName(display_name)) {
      return jsonResponse({ error: 'Invalid display name' }, 400);
    }

    const ageNum = Number(age);
    if (Number.isNaN(ageNum) || ageNum < 18 || ageNum > 99) {
      return jsonResponse({ error: 'Invalid age' }, 400);
    }

    const phone_normalized = normalizePhone(whatsapp_number);
    if (phone_normalized.length < 8) {
      return jsonResponse({ error: 'Invalid WhatsApp number' }, 400);
    }

    const supabase = getServiceClient();
    const { data: space, error: spaceError } = await supabase
      .from('spaces')
      .select('*')
      .eq('public_code', String(public_code).toUpperCase())
      .single();

    if (spaceError || !space) return jsonResponse({ error: 'Space not found' }, 404);
    if (space.status !== 'active') return jsonResponse({ error: 'Space not active' }, 403);

    const now = new Date();
    if (now < new Date(space.starts_at) || now > new Date(space.ends_at)) {
      return jsonResponse({ error: 'Event not active' }, 403);
    }

    const distance = haversineMeters(Number(lat), Number(lng), Number(space.latitude), Number(space.longitude));
    const inRadius = distance <= Number(space.radius_meters);
    if (!inRadius) return jsonResponse({ error: 'Outside allowed radius' }, 403);

    const { data: existing } = await supabase
      .from('participants')
      .select('id')
      .eq('space_id', space.id)
      .eq('phone_normalized', phone_normalized)
      .maybeSingle();

    if (existing) {
      return jsonResponse({ error: 'This number is already registered in this space' }, 409);
    }

    let photo_path: string | null = null;
    if (photo_base64 && photo_mime_type) {
      const ext = photo_mime_type.includes('png') ? 'png' : 'jpg';
      const fileName = `${space.id}/${crypto.randomUUID()}.${ext}`;
      const bytes = Uint8Array.from(atob(photo_base64), (c) => c.charCodeAt(0));
      const { error: uploadError } = await supabase.storage
        .from('participant-photos-temp')
        .upload(fileName, bytes, {
          contentType: photo_mime_type,
          upsert: false,
        });
      if (uploadError) throw uploadError;
      photo_path = fileName;
    }

    const session_token = crypto.randomUUID();
    const session_token_hash = await sha256Hex(session_token);
    const phone_hash = await sha256Hex(phone_normalized);
    const encrypted = xorEncrypt(phone_normalized, Deno.env.get('APP_ENCRYPTION_KEY') || 'fallback-secret');

    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .insert({
        space_id: space.id,
        session_token_hash,
        display_name: display_name.trim(),
        gender,
        age: ageNum,
        photo_path,
        phone_normalized,
        phone_hash,
        whatsapp_number_encrypted: encrypted,
        availability,
        paid_unlock: false,
        is_visible: true,
        joined_latitude: lat,
        joined_longitude: lng,
        joined_in_radius: true,
        expires_at: oneDayAfter(space.ends_at),
      })
      .select('id, display_name, gender, age, photo_path, availability, paid_unlock')
      .single();

    if (participantError) throw participantError;

    await supabase.from('audit_events_minimal').insert({
      space_id: space.id,
      participant_id: participant.id,
      event_type: 'participant_registered',
    });

    return jsonResponse({
      ok: true,
      participant,
      participant_session_token: session_token,
      space_id: space.id,
    });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Unexpected error' }, 500);
  }
});
