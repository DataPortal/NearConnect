window.sb = supabase.createClient(
  window.NEARCONNECT_SUPABASE_URL,
  window.NEARCONNECT_SUPABASE_ANON_KEY,
  {
    auth: { persistSession: false },
    global: { headers: { apikey: window.NEARCONNECT_SUPABASE_ANON_KEY } },
  }
);
