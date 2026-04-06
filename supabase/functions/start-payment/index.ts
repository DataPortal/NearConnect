import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { bearerToken, getFxQuote, getMomoRecipient, getServiceClient, haversineMeters, roundLocalAmount, sha256Hex } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);

  try {
    const token = bearerToken(req);
    const { lat, lng } = await req.json();
    if (!token) return jsonResponse({ error: 'Missing participant session token' }, 401);

    const supabase = getServiceClient();
    const session_token_hash = await sha256Hex(token);

    const { data: participant, error: participantError } = await supabase
      .from('participants')
      .select('*, spaces(*)')
      .eq('session_token_hash', session_token_hash)
      .single();

    if (participantError || !participant) return jsonResponse({ error: 'Participant not found' }, 404);
    if (participant.paid_unlock) {
      return jsonResponse({ ok: true, already_paid: true, message: 'Unlock already active' });
    }

    const space = participant.spaces;
    if (!space || space.status !== 'active') return jsonResponse({ error: 'Space not active' }, 403);

    const distance = haversineMeters(Number(lat), Number(lng), Number(space.latitude), Number(space.longitude));
    const inRadius = distance <= Number(space.radius_meters);
    if (!inRadius) return jsonResponse({ error: 'Outside allowed radius' }, 403);

    const { data: existingPayment } = await supabase
      .from('payments')
      .select('*')
      .eq('space_id', space.id)
      .eq('phone_hash', participant.phone_hash)
      .eq('status', 'confirmed')
      .maybeSingle();

    if (existingPayment) {
      await supabase.from('participants').update({ paid_unlock: true }).eq('id', participant.id);
      return jsonResponse({ ok: true, already_paid: true, message: 'Existing payment restored' });
    }

    const quote = getFxQuote(space.country_code);
    const local_amount = roundLocalAmount(1 * quote.rate, quote.rounding);
    const payment_reference = `NC-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const recipient_msisdn = getMomoRecipient(space.country_code);

    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        space_id: space.id,
        participant_id: participant.id,
        phone_hash: participant.phone_hash,
        country_code: space.country_code,
        currency_code: quote.currency,
        base_amount_usd: 1,
        local_amount,
        fx_rate_used: quote.rate,
        rounding_rule: quote.rounding,
        payment_method: space.country_code === 'RW' ? 'momo_rwanda_manual' : 'manual_mobile_money',
        recipient_msisdn,
        payment_reference,
        status: 'pending',
        paid_in_radius: true,
        expires_at: participant.expires_at,
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    await supabase.from('space_fx_quotes').insert({
      space_id: space.id,
      base_currency: 'USD',
      quote_currency: quote.currency,
      fx_rate: quote.rate,
      rounding_rule: quote.rounding,
      rounded_local_amount: local_amount,
    });

    return jsonResponse({
      ok: true,
      payment,
      instructions: {
        title: 'Pass social de la soirée',
        amount: local_amount,
        currency_code: quote.currency,
        recipient_msisdn,
        payment_reference,
        message: `Payer ${local_amount} ${quote.currency} vers ${recipient_msisdn} puis confirmer le paiement.`
      }
    });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Unexpected error' }, 500);
  }
});
