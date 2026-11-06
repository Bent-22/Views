/* Verbindung zur Ergebnissammlung.
   Beide Werte stehen im Supabase-Projekt unter „Project Settings > API“.
   Der publishable (anon) Key ist für den Browser gedacht und darf öffentlich sein.
   Der service_role Key oder das Datenbankpasswort dürfen NIE hier stehen.
   Bleiben die Felder leer, ist die zentrale Abgabe deaktiviert. */
window.VIEWS_CONFIG = {
  supabaseUrl: '',
  supabaseKey: ''
};
