/* ==========================================================
   VIEWS – Inhalte der Ermittlung
   Texte, Figuren, Beweisstücke und Meldungen stehen nur hier.
   Die Logik liegt in app.js, der Lehrkraftbereich nutzt diese
   Datei für Beschriftungen.

   WICHTIG: Diese Datei ist öffentlich. Hier darf nichts stehen,
   was den Fall auflöst.
   ========================================================== */
window.VIEWS_CONTENT = (function () {
  'use strict';

  var PHASES = [
    { n: 1, title: 'Auftrag', task: 'Lies das Briefing und entscheide, womit du beginnst.', min: 2 },
    { n: 2, title: 'Ausgangslage', task: 'Rekonstruiere die Zeitachse und sortiere, was feststeht.', min: 3 },
    { n: 3, title: 'Personen und Spuren', task: 'Lerne Lenas Umfeld kennen und halte deinen ersten Verdacht fest.', min: 4 },
    { n: 4, title: 'Öffentlichkeit', task: 'Bewerte die Quellen und entscheide, was die Polizei sagt.', min: 4 },
    { n: 5, title: 'Widersprüche', task: 'Prüfe die neuen Befunde gegen deinen Verdacht.', min: 4 },
    { n: 6, title: 'Lagebesprechung', task: 'Sichte deine Akte, bevor du den Bericht schreibst.', min: 3 }
  ];

  /* unlock = Phase, in der die Erklärung als Verdacht auswählbar wird */
  var THEORIES = [
    { id: 'maenner', name: 'Die drei Männer aus dem Video', unlock: 2 },
    { id: 'kamera', name: 'Die Person hinter der Kamera', unlock: 2 },
    { id: 'frank', name: 'Frank Palmer', unlock: 3 },
    { id: 'freund', name: 'Lenas Freund', unlock: 3, needs: 'freund' },
    { id: 'stefan', name: 'Stefan', unlock: 3, needs: 'stefan' },
    { id: 'baer', name: 'Bär und der Aktive Heimatschutz', unlock: 4, needs: 'baer' },
    { id: 'anders', name: 'Das Video zeigt nicht, was es zu zeigen scheint', unlock: 5 }
  ];

  var PERSONS = {
    yasira: { name: 'Yasira Saad', role: 'Hauptkommissarin beim BKA, Ermittlungsleitung',
      back: 'Ende 30, geschieden, Mutter einer Tochter.',
      link: 'Sie leitet die Suche nach Lena.',
      why: 'Sie ist dein Kontakt und das öffentliche Gesicht der Ermittlung.' },
    michael: { name: 'Michael Becker', role: 'Yasiras Partner im Team',
      back: 'Macht gern unpassende Witze, hat immer ein Leberwurstbrot dabei.',
      link: 'Arbeitet mit Yasira an dem Fall.',
      why: 'Er gleicht deine Einschätzungen mit seinen ab.' },
    lena: { name: 'Lena Palmer', role: 'Die Vermisste, 16 Jahre',
      back: 'Ihre Mutter ist gestorben, zur Familie war der Kontakt zuletzt schwierig.',
      link: 'Um sie geht es.',
      why: 'Wer sie zuletzt gesehen hat und wo sie ist, ist ungeklärt.' },
    frank: { name: 'Frank Palmer', role: 'Lenas Vater',
      back: 'Lehrt Öffentliches Recht an einer Universität im Harz.',
      link: 'Seine Frau ist gestorben, zu Lena ist der Kontakt schwierig.',
      why: 'Er hat Lena als vermisst gemeldet, weiß aber wenig über ihren Alltag.' },
    freund: { name: 'Lenas Freund', redacted: true, role: 'Zu ihm wollte Lena',
      back: 'Name in dieser Akte geschwärzt. Über ihn ist bisher wenig bekannt.',
      link: 'Lena war auf dem Weg zu ihm und kam nicht an.',
      why: 'Er ist der letzte bekannte Kontakt.' },
    emil: { name: 'Emil Palmer', role: 'Lenas jüngerer Bruder',
      back: 'Lebt bei seinem Vater.',
      link: 'Er hat Lena am Tag ihres Verschwindens gesehen.',
      why: 'Seine Beobachtung ist die einzige aus der Familie zu diesem Tag.' },
    stefan: { name: 'Stefan', role: 'Online-Journalist',
      back: 'Yasira traf ihn zu einem Date, als das Video auftauchte.',
      link: 'Zu Lena ist keine Verbindung bekannt.',
      why: 'Er kannte das Video auffällig früh.' },
    baer: { name: 'Bär', role: 'Anführer des Aktiven Heimatschutzes',
      back: 'Die rechtsradikale Gruppe gewinnt rasant Zulauf.',
      link: 'Keine bekannte Verbindung zu Lena. Er nutzt ihren Fall.',
      why: 'Er ruft zu Selbstjustiz auf und treibt die Eskalation.' },
    ministerin: { name: 'Die Innenministerin', role: 'Politische Verantwortung',
      back: 'Steht unter öffentlichem Druck.',
      link: 'Keine Verbindung zu Lena.',
      why: 'Sie verlangt Ergebnisse und eine klare Ansage vor der Presse.' }
  };

  /* grade: fakt = amtlich gesichert, behauptung = unbestätigt, deutung = Interpretation */
  var EVIDENCE = {
    e1: { title: 'Vermisstenanzeige', kind: 'Polizeidokument', grade: 'fakt', phase: 2,
      lines: ['Anzeigende Person: Frank Palmer', 'Vermisst seit: Tag 1, 16:40 Uhr', 'Ziel laut Vater: die Wohnung ihres Freundes', 'Bekleidung: unbekannt'],
      more: 'Lenas Konto zeigt seit Tag 1 keine Bewegung.' },
    e2: { title: 'Sicherungsprotokoll Video', kind: 'Polizeidokument', grade: 'fakt', phase: 2,
      lines: ['Länge 00:47, Upload Tag 4, 21:14 Uhr', 'Zu sehen: Lena Palmer, drei Männer, eine filmende Person', 'Aufnahmedatum: unbekannt', 'Inhalt wird aus Opferschutzgründen nicht beschrieben'],
      more: 'Das Upload-Konto wurde zwei Stunden vorher angelegt.' },
    e3: { title: 'Aussage von Lenas Freund', kind: 'Vernehmung', grade: 'behauptung', phase: 3,
      lines: ['„Zuletzt hatten wir um halb fünf Kontakt. Danach kam nichts mehr. Ich dachte, sie hat es sich anders überlegt.“'] },
    e4: { title: 'Chat vom Tag 1', kind: 'Handyauswertung', grade: 'fakt', phase: 3,
      chat: [
        ['freund', '16:28', 'kommst du heute?'],
        ['lena', '16:31', 'ja, um fünf'],
        ['freund', '16:52', 'hast du es dabei?'],
        ['lena', '17:04', 'bin gleich da'],
        ['freund', '17:05', 'ok. sag niemandem was']
      ] },
    e5: { title: 'Beobachtung von Emil Palmer', kind: 'Zeugenaussage', grade: 'behauptung', phase: 3,
      lines: ['„Sie hatte die graue Jacke an, die von Mama. Die hat sie die ganze Woche getragen.“'] },
    e6: { title: 'Stefans Beitrag', kind: 'Zeitstempel', grade: 'fakt', phase: 3,
      lines: ['Upload des Videos: 21:14 Uhr', 'Meldung auf Stefans Portal: 21:33 Uhr', 'Quelle laut Stefan: „ein Hinweis aus dem Netz“'],
      more: 'Solche Meldungen sind in seinem Beruf Alltag. Das erklärt die 19 Minuten, beweist sie aber nicht.' },
    e7: { title: 'Viraler Ortshinweis', kind: 'Social-Media-Beitrag', grade: 'behauptung', phase: 4,
      lines: ['„Ich kenne die Halle aus dem Video. Industriegebiet bei uns um die Ecke!!“', '38.000 Mal geteilt, Ort nicht angegeben'] },
    e8: { title: 'Bärs Videobotschaft', kind: 'Transkript', grade: 'behauptung', phase: 4,
      lines: ['„Wenn der Staat nicht handelt, tun wir es.“', 'Das Video zeigt danach eine Gewalttat. Sie wird hier nicht wiedergegeben.', 'Ort und Echtheit: nicht bestätigt'],
      more: 'Der Kanal gewann in zwei Tagen 900.000 Abonnenten.' },
    e9: { title: 'Forensik zum Video', kind: 'Technische Analyse', grade: 'fakt', phase: 5,
      lines: ['Aufnahmeort: nicht identifizierbar', 'Abgleich der drei Männer: kein Treffer', 'Metadaten: keine (bei Plattform-Uploads üblich)', 'Sichtbare Schnitte: keine'],
      more: 'Die automatische Echtheitsprüfung lieferte kein eindeutiges Ergebnis.' },
    e10: { title: 'Kleidung im Vergleich', kind: 'Interne Notiz', grade: 'deutung', phase: 5,
      lines: ['Emil: graue Jacke die ganze Woche', 'Video: helle Jacke, wie auf Lenas öffentlichem Profilfoto', 'Offen: anderer Tag, Irrtum oder etwas anderes'] },
    e11: { title: 'Zwei Tongutachten', kind: 'Technische Analyse', grade: 'deutung', phase: 5,
      lines: ['Gutachten A: Der Raumklang wirkt ungewöhnlich gleichmäßig.', 'Gutachten B: Das erklärt sich durch die Kompression der Plattform.'] },
    e12: { title: 'Auswertung der Hotline', kind: 'Statistik', grade: 'fakt', phase: 5, optional: true,
      lines: ['1.240 Hinweise in 24 Stunden', '3 davon verwertbar', 'Verwertbar heißt: prüfbar, nicht bestätigt'] }
  };

  var GRADES = { fakt: 'Gesichert', behauptung: 'Unbestätigt', deutung: 'Interpretation' };

  var BRIEFING = [
    'Danke, dass du so schnell da bist. Lena Palmer, 16, ist seit drei Tagen verschwunden.',
    'Seit heute Abend kennt das ganze Land ihren Namen. Ein Video zeigt sie als Opfer sexualisierter Gewalt. Du arbeitest nur mit Protokollen, das Video selbst bekommst du nicht zu sehen.',
    'Michael und ich brauchen jemanden, der frisch draufschaut. Womit fängst du an?'
  ];

  var START_CHOICES = [
    { id: 'video', label: 'Mit dem Video', reply: 'Gut. Dann schau zuerst, was wir wirklich darüber wissen.' },
    { id: 'umfeld', label: 'Mit Lenas Umfeld', reply: 'Gut. Vermisste kennt man über die Menschen um sie herum.' },
    { id: 'netz', label: 'Mit den Reaktionen im Netz', reply: 'Das kommt von selbst zu dir. Behalte den Feed im Blick.' }
  ];

  var TIMELINE = [
    { id: 't1', when: 'Tag 1, 16:40', text: 'Lena verlässt das Haus. Ihr Vater sagt, sie wollte zu ihrem Freund.' },
    { id: 't2', when: 'Tag 1, 17:04', text: 'Letzte Nachricht von Lenas Handy. Kurz darauf ist es aus.' },
    { id: 't3', when: 'Tag 2, 09:15', text: 'Frank Palmer meldet Lena als vermisst.' },
    { id: 't4', when: 'Tag 3', text: 'Die Suche bleibt ohne Ergebnis.' },
    { id: 't5', when: 'Tag 4, 21:14', text: 'Das Video erscheint. Eine Stunde später haben es Millionen gesehen.' }
  ];

  var SORT_ITEMS = [
    { id: 's1', text: 'Lenas Handy ist seit Tag 1 aus.', michael: 'fakt', note: 'Das belegt der Netzbetreiber.' },
    { id: 's2', text: 'Das Video zeigt, was an Tag 1 passiert ist.', michael: 'behauptung', note: 'Wann es aufgenommen wurde, wissen wir nicht.' },
    { id: 's3', text: 'Die Polizei tut zu wenig.', michael: 'meinung', note: 'Kann man finden. Beweisen kann man es nicht.' },
    { id: 's4', text: 'Die Täter sind Ausländer.', michael: 'behauptung', note: 'Das schließt das Netz aus dem Aussehen. Belegt ist nichts.' }
  ];
  var SORT_LABELS = { fakt: 'Tatsache', behauptung: 'Behauptung', meinung: 'Meinung' };

  var RATE_ITEMS = [
    { id: 'r1', evidence: 'e7', src: '@wahrheit_lokal', text: 'Ich kenne die Halle aus dem Video. Industriegebiet bei uns um die Ecke!!', meta: '38.000 Mal geteilt' },
    { id: 'r2', src: 'Tagesfunke', text: 'Insider: Die Ermittler haben längst eine heiße Spur.', meta: 'Quelle nicht genannt' },
    { id: 'r3', src: '@klarblick', text: 'Alles Schauspieler. Oder Geheimdienst. Oder KI. Glaubt gar nichts mehr.', meta: '212 Likes' },
    { id: 'r4', src: 'Polizei, Pressestelle', text: 'Bitte teilt das Video nicht. Hinweise nur über die Hotline.', meta: 'Offizielle Mitteilung' }
  ];
  var RATE_LABELS = { hoch: 'Belastbar', mittel: 'Unklar', tief: 'Nicht belastbar' };

  var PRESS = [
    { id: 'fahndung', label: 'Fahndung nach den drei Männern ausrufen', press: 12, reply: 'Die Fahndung führt zu 400 Anrufen und neuen Übergriffen auf Unbeteiligte.' },
    { id: 'fakten', label: 'Nur sagen, was gesichert ist', press: 5, reply: 'Sachlich, aber das Netz liest es als „Die Polizei schweigt“.' },
    { id: 'umfeld', label: 'Zeugen aus Lenas Umfeld suchen', press: 8, reply: 'Reporter stehen nun vor dem Haus der Familie Palmer.' }
  ];

  /* on = Auslöser. eil: true blendet zusätzlich die Eilmeldung ein */
  var FEED = [
    { id: 'n1', on: 'start', src: 'Tagesfunke', when: 'Tag 4, 21:52', head: 'Vermisste Lena P.: Video verbreitet sich rasant', body: 'Die Polizei bittet, die Aufnahme nicht zu teilen.', press: 10, views: 2600000 },
    { id: 'n2', on: 'p1', src: '@stimmedesvolkes', when: 'Tag 4, 23:10', post: true, body: 'Drei Tage weg und die Polizei hat NICHTS?', press: 5, views: 1900000 },
    { id: 'n3', on: 'p1', eil: true, src: 'Tagesfunke', when: 'Tag 5, 07:00', head: 'BKA übernimmt: Yasira Saad leitet die Ermittlungen', body: 'Erste Pressekonferenz angekündigt.', press: 6, views: 3200000 },
    { id: 'n4', on: 'p2', src: '@lena_community', when: 'Tag 5, 09:30', post: true, body: 'Wer hat zuletzt mit ihr geschrieben? Das muss doch rauszufinden sein.', press: 4, views: 2100000 },
    { id: 'n5', on: 'p3', src: 'Tagesfunke', when: 'Tag 5, 18:20', head: 'Erste Demonstrationen in mehreren Städten', body: 'Gegendemonstrationen, die Polizei trennt beide Seiten.', press: 10, views: 5400000 },
    { id: 'n6', on: 'baer', eil: true, src: 'Tagesfunke', when: 'Tag 6, 12:15', head: 'Aktiver Heimatschutz ruft zu Selbstjustiz auf', body: 'Bärs Videobotschaft erreicht in Stunden ein Millionenpublikum.', press: 12, views: 8300000 },
    { id: 'n7', on: 'p4', eil: true, src: 'Tagesfunke', when: 'Tag 7, 00:40', head: 'Mob tötet Unbeteiligten', body: 'Er hatte mit dem Fall nichts zu tun.', press: 12, views: 6100000 },
    { id: 'n8', on: 'forensik', src: '@stimmedesvolkes', when: 'Tag 7, 10:05', post: true, body: 'Wieso findet das BKA keinen einzigen von denen? Wollen die nicht?', press: 4, views: 2800000 },
    { id: 'n9', on: 'p5mid', eil: true, src: 'Tagesfunke', when: 'Tag 7, 16:30', head: 'Granate bei Demonstration: Polizist stirbt', body: 'Er warf sich schützend vor seine Kollegen.', press: 8, views: 7200000 },
    { id: 'n10', on: 'p5', eil: true, src: 'Tagesfunke', when: 'Tag 8, 08:00', head: 'Ermittlungsleiterin Saad suspendiert', body: 'Sie soll Interna an die Presse gegeben haben. Welche, ist unklar.', press: 8, views: 9600000 }
  ];

  var CHAT_TARGET = { statement: 'e3', messages: [3, 4], hit: 'Der Chat läuft nach halb fünf weiter. Warum er das nicht erwähnt, zeigt der Verlauf nicht.', miss: 'Das passt noch zu seiner Aussage.' };

  var CLOSING = [
    'Die Ermittlungsgruppe hat ihre bisherige Arbeit abgeschlossen.',
    'Einige Spuren scheinen zusammenzupassen, andere werfen neue Fragen auf.',
    'Du hast die Informationen untersucht, deine Verdächtigen ausgewählt und eine eigene Theorie entwickelt.',
    'Aber bist du sicher, dass du überhaupt nach dem richtigen Täter gesucht hast?',
    'Die endgültige Bewertung des Falls steht noch aus.'
  ];

  var REPORT_QUESTIONS = {
    q1: 'Was ist deiner Meinung nach im Fall Lena Palmer passiert?',
    q2: 'Welche Personen oder Zusammenhänge sind besonders relevant?',
    q3: 'Welche drei Beweisstücke stützen deine Theorie?',
    q4: 'Welche Informationen sind noch unsicher?',
    q5: 'Was wäre der nächste sinnvolle Ermittlungsschritt?'
  };

  return {
    VERSION: 1, PHASES: PHASES, THEORIES: THEORIES, PERSONS: PERSONS, EVIDENCE: EVIDENCE, GRADES: GRADES,
    BRIEFING: BRIEFING, START_CHOICES: START_CHOICES, TIMELINE: TIMELINE, SORT_ITEMS: SORT_ITEMS, SORT_LABELS: SORT_LABELS,
    RATE_ITEMS: RATE_ITEMS, RATE_LABELS: RATE_LABELS, PRESS: PRESS, FEED: FEED, CHAT_TARGET: CHAT_TARGET,
    CLOSING: CLOSING, REPORT_QUESTIONS: REPORT_QUESTIONS
  };
})();
