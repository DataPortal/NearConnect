import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getFxQuote, getServiceClient, haversineMeters, roundLocalAmount } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const { public_code, lat, lng } = await req.json();
    if (!public_code) return jsonResponse({ error: 'public_code is required' }, 400);

    const supabase = getServiceClient();
    const { data: space, error } = await supabase
      .from('spaces_public')
      .select('*')
      .eq('public_code', String(public_code).toUpperCase())
      .single();

    if (error || !space) return jsonResponse({ error: 'Space not found' }, 404);

    const now = new Date();
    const starts = new Date(space.starts_at);
    const ends = new Date(space.ends_at);

    if (!(space.status === 'active' || space.status === 'draft')) {
      return jsonResponse({ error: 'Space is not accessible' }, 403);
    }
    if (now < starts || now > ends) {
      return jsonResponse({ error: 'Space is outside event window' }, 403);
    }

    let in_radius = false;
    let distance_meters: number | null = null;
    if (typeof lat === 'number' && typeof lng === 'number') {
      distance_meters = Math.round(haversineMeters(lat, lng, Number(space.latitude), Number(space.longitude)));
      in_radius = distance_meters <= Number(space.radius_meters);
    }

    const quote = getFxQuote(space.country_code);
    const local_amount = roundLocalAmount(1 * quote.rate, quote.rounding);

    return jsonResponse({
      ok: true,
      space,
      access: {
        in_radius,
        distance_meters,
      },
      payment_preview: {
        base_usd: 1,
        currency_code: quote.currency,
        fx_rate_used: quote.rate,
        rounding_rule: quote.rounding,
        local_amount,
      },
    });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Unexpected error' }, 500);
  }
});
