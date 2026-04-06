import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { computeCurrency, generatePublicCode, getMomoRecipient, getServiceClient, requireAdminKey, sha256Hex } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
  if (!requireAdminKey(req)) return jsonResponse({ error: 'Unauthorized' }, 401);

  try {
    const body = await req.json();
    const {
      venue_name,
      city,
      country_code,
      latitude,
      longitude,
      radius_meters = 100,
      event_name,
      starts_at,
      ends_at,
      admin_pin,
      created_by = 'admin',
    } = body;

    if (!venue_name || !country_code || !event_name || !starts_at || !ends_at || !admin_pin) {
      return jsonResponse({ error: 'Missing required fields' }, 400);
    }

    const supabase = getServiceClient();

    const { data: venue, error: venueError } = await supabase
      .from('venues')
      .insert({
        name: venue_name,
        city,
        country_code: country_code.toUpperCase(),
        latitude,
        longitude,
        default_radius_meters: radius_meters,
        payment_recipient_msisdn: getMomoRecipient(country_code),
      })
      .select()
      .single();

    if (venueError) throw venueError;

    const public_code = generatePublicCode();
    const admin_pin_hash = await sha256Hex(String(admin_pin));
    const currency_code = computeCurrency(country_code);
    const now = new Date();
    const status = new Date(starts_at) <= now ? 'active' : 'draft';

    const { data: space, error: spaceError } = await supabase
      .from('spaces')
      .insert({
        venue_id: venue.id,
        event_name,
        public_code,
        admin_pin_hash,
        country_code: country_code.toUpperCase(),
        currency_code,
        latitude,
        longitude,
        radius_meters,
        starts_at,
        ends_at,
        status,
        payment_recipient_msisdn: getMomoRecipient(country_code),
        created_by,
      })
      .select()
      .single();

    if (spaceError) throw spaceError;

    return jsonResponse({
      ok: true,
      venue,
      space,
      join_url_template: `YOUR_WEB_APP_URL/index.html?code=${public_code}`,
      qr_payload: public_code,
    });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Unexpected error' }, 500);
  }
});
