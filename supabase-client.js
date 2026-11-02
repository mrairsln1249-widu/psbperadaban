(function () {
  const config = window.SUPABASE_CONFIG || {};
  if (!config.url || !config.anonKey || !window.supabase) {
    window.supabaseClient = null;
    return;
  }
  window.supabaseClient = window.supabase.createClient(config.url, config.anonKey);
}());
