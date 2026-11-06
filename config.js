/* Verbindung zur Ergebnissammlung.

   collectResults: false setzt die zentrale Abgabe aus. Schüler beenden die
   Ermittlung dann ohne Codes, nichts wird übertragen, ihr Bericht bleibt auf
   dem Gerät. Zum Aktivieren auf true stellen und die beiden Werte eintragen.

   Beide Werte stehen im Supabase-Projekt unter „Project Settings > API“.
   Der publishable (anon) Key ist für den Browser gedacht und darf öffentlich sein.
   Der service_role Key oder das Datenbankpasswort dürfen NIE hier stehen. */
window.VIEWS_CONFIG = {
  collectResults: false,
  supabaseUrl: '',
  supabaseKey: ''
};
