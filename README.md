# VIEWS: Der Fall Lena Palmer

Interaktive Ermittlung für den Deutschunterricht der 13. Klasse zum Roman „Views“ von Marc-Uwe Kling. Fiktives Unterrichtsprojekt, Dauer etwa 20 Minuten.

Dieses Repository ist öffentlich. **Die Auflösung des Falls gehört weder in den Code noch in die Dokumentation noch in Commit-Nachrichten.**

## Aufbau

| Datei | Zweck |
|---|---|
| `index.html`, `app.js`, `styles.css` | Schüleroberfläche |
| `content.js` | Alle Texte, Figuren, Beweisstücke und Meldungen |
| `config.js` | Verbindung zur Ergebnissammlung |
| `lehrkraft.html`, `lehrkraft.js`, `lehrkraft.css` | Geschützter Lehrkraftbereich |
| `supabase/schema.sql` | Tabellen, Rechte und Abgabefunktion |
| `test/` | Testumgebung ohne echte Daten |
| `docs/quellenlage.md` | Was aus dem Roman stammt, was für die Simulation erstellt wurde |

## Veröffentlichung über GitHub Pages

Unter **Settings > Pages** als Quelle **Deploy from a branch** wählen, dann `main` und `/ (root)`. Die Seite läuft ohne Build-Schritt.

## Ergebnissammlung einrichten

GitHub Pages kann nichts speichern. Die Abgaben landen deshalb in einer Postgres-Datenbank bei Supabase.

1. Vor echten Daten die Nutzung mit Lehrkraft, Schulleitung und der oder dem Datenschutzbeauftragten der Schule klären.
2. Projekt bei [supabase.com](https://supabase.com) anlegen und als Region **Frankfurt (eu-central-1)** wählen, nicht die Gruppe „Europe“.
3. Das Data Processing Agreement von Supabase prüfen und abschließen lassen, falls die Schule zustimmt.
4. Unter **Authentication** öffentliche Registrierungen abschalten und ein Lehrkraftkonto mit starkem Passwort anlegen.
5. Im **SQL Editor** den Inhalt von `supabase/schema.sql` ausführen.
6. Die ID des Kontos freischalten: `insert into public.teachers (user_id) values ('<User-ID>');`
7. Project URL und publishable (anon) Key in `config.js` eintragen und hochladen.
8. Unter `lehrkraft.html` anmelden und zuerst eine **Testklasse** anlegen. Einmal komplett durchspielen.

In `config.js` gehört nie der `service_role`-Key oder das Datenbankpasswort.

## Ablauf im Unterricht

1. Klasse im Lehrkraftbereich anlegen. Du erhältst einen Klassencode und anonyme Teilnehmercodes.
2. Codes zufällig austeilen, ohne Liste, wer welchen Code hat.
3. Schüler arbeiten die sechs Schritte durch und reichen am Ende ein. Zwischenstände bleiben im Browser.
4. Im Lehrkraftbereich Auswertung ansehen, einzelne Protokolle lesen und bei Bedarf als CSV exportieren.
5. Nach der Auswertung Klasse löschen. Damit verschwinden auch alle Codes und Abgaben.

Eine Abgabe lässt sich nur einmal pro Teilnehmercode einreichen. Löscht die Lehrkraft sie, wird der Code wieder frei.

## Tests

```bash
bash test/run-db-test.sh        # Rechte gegen lokales Postgres (als root)
node test/mock-backend.mjs      # Testumgebung auf http://localhost:8787
node test/e2e.cjs               # Browserdurchlauf, braucht Playwright
```

In der Testumgebung gilt für den Lehrkraftbereich: `lehrkraft@test.invalid` und `test-passwort`.

## Schriften

Lora (SIL Open Font License) liegt in `fonts/` und wird nicht von fremden Servern geladen. Die Seite bindet keine Tracking- oder Analysedienste ein.
