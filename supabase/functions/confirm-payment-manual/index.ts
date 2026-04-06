import { corsHeaders, jsonResponse } from '../_shared/cors.ts';
import { getServiceClient, requireAdminKey } from '../_shared/utils.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'Method not allowed' }, 405);
  if (!requireAdminKey(req)) return jsonResponse({ error: 'Unauthorized' }, 401);

  try {
    const { payment_reference, provider_reference = null } = await req.json();
    if (!payment_reference) return jsonResponse({ error: 'payment_reference is required' }, 400);

    const supabase = getServiceClient();
    const { data: payment, error } = await supabase
      .from('payments')
      .select('*')
      .eq('payment_reference', payment_reference)
      .single();

    if (error || !payment) return jsonResponse({ error: 'Payment not found' }, 404);
    if (payment.status === 'confirmed') return jsonResponse({ ok: true, already_confirmed: true });

    const { error: paymentUpdateError } = await supabase
      .from('payments')
      .update({
        status: 'confirmed',
        provider_reference,
        paid_at: new Date().toISOString(),
      })
      .eq('id', payment.id);

    if (paymentUpdateError) throw paymentUpdateError;

    const { error: participantUpdateError } = await supabase
      .from('participants')
      .update({ paid_unlock: true })
      .eq('id', payment.participant_id);

    if (participantUpdateError) throw participantUpdateError;

    return jsonResponse({ ok: true, message: 'Payment confirmed and WhatsApp unlock activated' });
  } catch (error) {
    return jsonResponse({ error: error.message || 'Unexpected error' }, 500);
  }
});
