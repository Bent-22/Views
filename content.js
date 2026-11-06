/* ==========================================================
   VIEWS – Inhalte der Ermittlung
   Texte, Figuren, Beweisstücke, Meldungen und der Ablauf der
   Geschichte stehen nur hier. Die Logik liegt in app.js, der
   Lehrkraftbereich nutzt diese Datei für Beschriftungen.

   WICHTIG: Diese Datei ist öffentlich. Hier darf nichts stehen,
   was den Fall auflöst.

   sim: true markiert Material, das für die Unterrichtssimulation
   ergänzt wurde. Alle Tage und Uhrzeiten sind Simulationsdetails,
   aus dem Roman stammt nur die Abfolge (siehe docs/quellenlage.md).
   ========================================================== */
window.VIEWS_CONTENT = (function () {
  'use strict';

  var CHAPTERS = [
    { n: 1, title: 'Der Fall beginnt' },
    { n: 2, title: 'Die ersten Spuren' },
    { n: 3, title: 'Die Menschen hinter dem Fall' },
    { n: 4, title: 'Der Fall wird öffentlich' },
    { n: 5, title: 'Die Ermittlungen spitzen sich zu' },
    { n: 6, title: 'Die letzte Lagebesprechung' }
  ];

  /* beat = Abschnitt, ab dem die Erklärung als Verdacht wählbar ist */
  var THEORIES = [
    { id: 'maenner', name: 'Die drei Männer aus dem Video', beat: 'b4' },
    { id: 'kamera', name: 'Die Person hinter der Kamera', beat: 'b4' },
    { id: 'frank', name: 'Frank Palmer', beat: 'b1' },
    { id: 'freund', name: 'Lenas Freund', beat: 'b3' },
    { id: 'stefan', name: 'Stefan', beat: 'b5' },
    { id: 'baer', name: 'Bär und der Aktive Heimatschutz', beat: 'b8' },
    { id: 'anders', name: 'Das Video zeigt nicht, was es zu zeigen scheint', beat: 'b12' }
  ];

  var PERSONS = {
    lena: { name: 'Lena Palmer', role: 'Die Vermisste, 16 Jahre',
      back: 'Ihre Mutter ist gestorben, zur Familie war der Kontakt zuletzt schwierig.',
      link: 'Um sie geht es: Sie kam gestern nicht nach Hause.',
      why: 'Wo sie ist und wer sie zuletzt gesehen hat, ist ungeklärt.' },
    frank: { name: 'Frank Palmer', role: 'Lenas Vater',
      back: 'Lehrt Öffentliches Recht an einer Universität im Harz. Seine Frau ist gestorben.',
      link: 'Er hat Lena als vermisst gemeldet.',
      why: 'Er ist bisher die einzige Quelle zu ihrem letzten Tag, weiß aber wenig über ihren Alltag.' },
    freund: { name: 'Lenas Freund', redacted: true, role: 'Zu ihm wollte Lena',
      back: 'Sein Name ist in dieser Akte geschwärzt. Über ihn ist bisher wenig bekannt.',
      link: 'Lena war auf dem Weg zu ihm und kam dort nie an.',
      why: 'Er ist ihr letzter bekannter Kontakt. Du musst seine Aussage prüfen.' },
    emil: { name: 'Emil Palmer', role: 'Lenas jüngerer Bruder',
      back: 'Lebt bei seinem Vater Frank Palmer.',
      link: 'Er hat Lena am Tag ihres Verschwindens noch gesehen.',
      why: 'Seine Beobachtung ist die einzige aus der Familie zu diesem Tag und könnte später wichtig werden.' },
    yasira: { name: 'Yasira Saad', role: 'Hauptkommissarin beim BKA',
      back: 'Ende 30, geschieden, Mutter einer Tochter.',
      link: 'Sie leitet ab heute die Suche nach Lena.',
      why: 'Sie ist jetzt deine Chefin und wird zum öffentlichen Gesicht der Ermittlung. Deine Akte geht direkt an sie.' },
    michael: { name: 'Michael Becker', role: 'Yasiras Partner beim BKA',
      back: 'Macht gern unpassende Witze und hat immer ein Leberwurstbrot dabei.',
      link: 'Er arbeitet mit Yasira an dem Fall.',
      why: 'Er gleicht deine Einschätzungen ab und übernimmt, wenn Yasira ausfällt.' },
    stefan: { name: 'Stefan', role: 'Online-Journalist',
      back: 'Yasira traf ihn zu einem Date, als das Video auftauchte.',
      link: 'Zu Lena ist keine Verbindung bekannt.',
      why: 'Er hatte das Video auffällig früh und berichtete als einer der Ersten darüber. Du sollst klären, was das bedeutet.' },
    baer: { name: 'Bär', role: 'Anführer des Aktiven Heimatschutzes',
      back: 'Seine rechtsradikale Gruppe gewinnt seit dem Video rasant Zulauf.',
      link: 'Keine bekannte Verbindung zu Lena. Er nutzt ihren Fall für seine Zwecke.',
      why: 'Er ruft zu Selbstjustiz auf. Was er verbreitet, erreicht inzwischen Millionen.' },
    ministerin: { name: 'Die Innenministerin', role: 'Politische Verantwortung',
      back: 'Sie steht unter wachsendem öffentlichem Druck.',
      link: 'Keine Verbindung zu Lena. Sie machte Yasira zum Gesicht der Ermittlung.',
      why: 'Sie muss heute vor die Presse und will von euch wissen, was sie sagen kann.' }
  };

  /* grade: fakt = amtlich gesichert, behauptung = unbestätigt, deutung = Interpretation */
  var EVIDENCE = {
    e1: { title: 'Vermisstenanzeige', kind: 'Polizeidokument', grade: 'fakt', sim: true,
      lines: ['Anzeigende Person: Frank Palmer', 'Vermisst seit: Tag 1, 16:40 Uhr', 'Ziel laut Vater: die Wohnung ihres Freundes', 'Bekleidung: unbekannt'],
      more: 'Lenas Konto zeigt seit Tag 1 keine Bewegung.' },
    e3: { title: 'Aussage von Lenas Freund', kind: 'Vernehmung', grade: 'behauptung', sim: true,
      lines: ['„Zuletzt hatten wir um halb fünf Kontakt. Danach kam nichts mehr. Ich dachte, sie hat es sich anders überlegt.“'] },
    e4: { title: 'Chat vom Tag 1', kind: 'Handyauswertung', grade: 'fakt', sim: true,
      chat: [
        ['freund', '16:28', 'kommst du heute?'],
        ['lena', '16:31', 'ja, um fünf'],
        ['freund', '16:52', 'hast du es dabei?'],
        ['lena', '17:04', 'bin gleich da'],
        ['freund', '17:05', 'ok. sag niemandem was']
      ] },
    e5: { title: 'Beobachtung von Emil Palmer', kind: 'Zeugenaussage', grade: 'behauptung', sim: true,
      lines: ['„Sie hatte die graue Jacke an, die von Mama. Die hat sie die ganze Woche getragen.“'] },
    e2: { title: 'Sicherungsprotokoll Video', kind: 'Polizeidokument', grade: 'fakt', sim: true,
      lines: ['Länge 00:47, Upload Tag 4, 21:14 Uhr', 'Zu sehen: Lena Palmer, drei Männer, eine filmende Person', 'Aufnahmedatum: unbekannt', 'Inhalt wird aus Opferschutzgründen nicht beschrieben'],
      more: 'Das Upload-Konto wurde zwei Stunden vorher angelegt.' },
    e6: { title: 'Stefans Beitrag', kind: 'Zeitstempel', grade: 'fakt', sim: true,
      lines: ['Upload des Videos: 21:14 Uhr', 'Meldung auf Stefans Portal: 21:33 Uhr', 'Quelle laut Stefan: „ein Hinweis aus dem Netz“'],
      more: 'Stefan sagt, schnelle Meldungen seien in seinem Beruf Alltag. Überprüfen lässt sich das nicht.' },
    e7: { title: 'Viraler Ortshinweis', kind: 'Social-Media-Beitrag', grade: 'behauptung', sim: true,
      lines: ['„Ich kenne die Halle aus dem Video. Industriegebiet bei uns um die Ecke!!“', '38.000 Mal geteilt, Ort nicht angegeben'] },
    e8: { title: 'Bärs Videobotschaft', kind: 'Transkript', grade: 'behauptung', sim: true,
      lines: ['„Wenn der Staat nicht handelt, tun wir es.“', 'Das Video zeigt danach eine Gewalttat. Sie wird hier nicht wiedergegeben.', 'Ort und Echtheit: nicht bestätigt'],
      more: 'Der Kanal gewann in zwei Tagen 900.000 Abonnenten.' },
    e9: { title: 'Forensik zum Video', kind: 'Technische Analyse', grade: 'fakt', sim: true,
      lines: ['Aufnahmeort: nicht identifizierbar', 'Abgleich der drei Männer: kein Treffer', 'Metadaten: keine (bei Plattform-Uploads üblich)', 'Sichtbare Schnitte: keine'],
      more: 'Die automatische Echtheitsprüfung lieferte kein eindeutiges Ergebnis.' },
    e10: { title: 'Kleidung im Vergleich', kind: 'Interne Notiz', grade: 'deutung', sim: true,
      lines: ['Emil: graue Jacke die ganze Woche', 'Video: helle Jacke, wie auf Lenas öffentlichem Profilfoto', 'Offen: anderer Tag, Irrtum oder etwas anderes'] },
    e11: { title: 'Zwei Tongutachten', kind: 'Technische Analyse', grade: 'deutung', sim: true,
      lines: ['Gutachten A: Der Raumklang wirkt ungewöhnlich gleichmäßig.', 'Gutachten B: Das erklärt sich durch die Kompression der Plattform.'] },
    e12: { title: 'Auswertung der Hotline', kind: 'Statistik', grade: 'fakt', sim: true,
      lines: ['1.240 Hinweise in 24 Stunden', '3 davon verwertbar', 'Verwertbar heißt: prüfbar, nicht bestätigt'] }
  };

  var GRADES = { fakt: 'Gesichert', behauptung: 'Unbestätigt', deutung: 'Interpretation' };
  var SORT_LABELS = { fakt: 'Tatsache', behauptung: 'Behauptung', meinung: 'Meinung' };
  var RATE_LABELS = { hoch: 'Belastbar', mittel: 'Unklar', tief: 'Nicht belastbar' };
  var CLUE_LABELS = { stuetzt: 'Stützt ihn', schwaecht: 'Schwächt ihn', offen: 'Sagt nichts' };

  var TIMELINE = [
    { id: 't1', when: 'Tag 1, 16:40', text: 'Lena verlässt das Haus. Laut Vater will sie zu ihrem Freund.' },
    { id: 't2', when: 'Tag 1, 17:04', text: 'Letzte Nachricht von Lenas Handy.' },
    { id: 't3', when: 'Tag 1, 17:06', text: 'Das Handy geht aus und bleibt aus.' },
    { id: 't4', when: 'Tag 2, 09:15', text: 'Frank Palmer meldet Lena als vermisst.' }
  ];

  var CHAT_TARGET = { messages: [3, 4], hit: 'Der Chat läuft nach halb fünf weiter. Warum er das verschweigt, zeigt der Verlauf nicht.', miss: 'Das passt noch zu seiner Aussage.' };

  /* Meldungen. Jede gehört zu einem Abschnitt (beat) und erscheint, sobald er beginnt.
     kind: eil = zentrale Eilmeldung, news = normale Nachricht, post = Beitrag,
     debatte = öffentliche Diskussion. */
  var NEWS = [
    { id: 'n1', beat: 'b1', kind: 'eil', src: 'Tagesfunke Regional', when: 'Tag 2, 09:40', head: '16-Jährige vermisst', body: 'Lena P. ist seit gestern Nachmittag verschwunden. Ihr Vater meldete sie heute früh bei der Polizei. Hinweise auf eine Straftat gibt es nicht.', press: 3 },
    { id: 'n2', beat: 'b2', kind: 'eil', src: 'Tagesfunke Regional', when: 'Tag 2, 18:10', head: 'Suche nach Lena: Handy seit gestern aus', body: 'Die Polizei sucht weiter nach der Vermissten. Ihr Handy ist seit dem Nachmittag des Verschwindens nicht mehr erreichbar.', press: 3 },
    { id: 'n3', beat: 'b2', kind: 'post', src: '@nachbarschaft_aktuell', when: 'Tag 2, 19:02', body: 'Betet für die Familie. Wer etwas gesehen hat, bitte melden.', press: 1 },
    { id: 'n4', beat: 'b3', kind: 'eil', src: 'Tagesfunke Regional', when: 'Tag 3, 11:00', head: 'Polizei befragt Lenas Umfeld', body: 'Auch zwei Tage nach dem Verschwinden fehlt jede Spur. Die Ermittler wollen wissen, wer die 16-Jährige zuletzt gesehen hat.', press: 3 },
    { id: 'n5', beat: 'b3', kind: 'debatte', src: 'Kommentare, Tagesfunke', when: 'Tag 3, 12:30', body: '„Die läuft doch nur weg.“ „Eine 16-Jährige verschwindet nicht einfach.“', press: 1 },
    { id: 'n6', beat: 'b4', kind: 'eil', src: 'Tagesfunke', when: 'Tag 4, 21:52', head: 'Video von vermisster Lena im Netz', body: 'Eine Aufnahme soll die 16-Jährige als Opfer sexualisierter Gewalt zeigen. Sie verbreitet sich rasant. Die Polizei bittet dringend, das Video nicht zu teilen.', press: 22, views: 1400000 },
    { id: 'n7', beat: 'b4', kind: 'post', src: '@stimmedesvolkes', when: 'Tag 4, 23:10', body: 'Drei Tage weg und die Polizei hat NICHTS?', press: 3, views: 1900000 },
    { id: 'n8', beat: 'b5', kind: 'eil', src: 'Tagesfunke', when: 'Tag 5, 07:00', head: 'BKA übernimmt: Yasira Saad leitet die Ermittlungen', body: 'Der Fall geht an das Bundeskriminalamt. Die Kommissarin soll Lena finden und die Männer aus dem Video identifizieren.', press: 6, views: 5200000 },
    { id: 'n9', beat: 'b6', kind: 'news', src: 'Tagesfunke', when: 'Tag 5, 13:00', head: 'Erste Pressekonferenz: keine Festnahme', body: 'Die Ermittler nennen keine Namen und keinen Aufenthaltsort.', press: 4, views: 3100000 },
    { id: 'n10', beat: 'b6', kind: 'debatte', src: 'Kommentare, Tagesfunke', when: 'Tag 5, 13:20', body: '„Wozu gibt es das BKA?“ „Lasst sie doch erst mal arbeiten.“', press: 2 },
    { id: 'n11', beat: 'b7', kind: 'eil', src: 'Tagesfunke', when: 'Tag 5, 18:20', head: 'Erste Demonstrationen in mehreren Städten', body: 'Tausende gehen wegen des Videos auf die Straße, dazu kommen Gegendemonstrationen. Im Netz kursieren immer mehr angebliche Augenzeugenberichte.', press: 10, views: 5400000 },
    { id: 'n12', beat: 'b8', kind: 'eil', src: 'Tagesfunke', when: 'Tag 6, 12:15', head: 'Aktiver Heimatschutz ruft zu Selbstjustiz auf', body: 'Die rechtsradikale Gruppe wächst rasant. Eine Videobotschaft ihres Anführers erreicht in Stunden ein Millionenpublikum.', press: 12, views: 8300000 },
    { id: 'n13', beat: 'b8', kind: 'debatte', src: 'Kommentare, Tagesfunke', when: 'Tag 6, 13:05', body: '[Beitrag wegen Volksverhetzung entfernt] „Endlich tut jemand was.“ „Das ist genau die Gewalt, die uns spaltet.“', press: 2 },
    { id: 'n14', beat: 'b9', kind: 'news', src: 'Tagesfunke', when: 'Tag 6, 16:00', head: 'Innenministerin kündigt Erklärung an', body: 'Die Regierung will Handlungsfähigkeit zeigen.', press: 3, views: 2000000 },
    { id: 'n15', beat: 'b10', kind: 'eil', src: 'Tagesfunke', when: 'Tag 7, 00:40', head: 'Mob tötet Unbeteiligten', body: 'In der Nacht ist ein Mann von einer aufgebrachten Menge getötet worden. Er hatte mit dem Fall nichts zu tun. Die Stimmung im Land kippt.', press: 12, views: 6100000 },
    { id: 'n16', beat: 'b11', kind: 'eil', src: 'Tagesfunke', when: 'Tag 7, 10:05', head: 'BKA findet keine Spur zu den drei Männern', body: 'Sechs Tage nach Lenas Verschwinden gibt es weder Namen noch Tatort. Die ersten technischen Untersuchungen liegen vor.', press: 5, views: 2800000 },
    { id: 'n17', beat: 'b11', kind: 'post', src: '@stimmedesvolkes', when: 'Tag 7, 10:30', body: 'Wieso findet das BKA keinen einzigen von denen? Wollen die nicht?', press: 2 },
    { id: 'n18', beat: 'b12', kind: 'eil', src: 'Tagesfunke', when: 'Tag 7, 16:30', head: 'Granate bei Demonstration: Polizist stirbt', body: 'Der Beamte warf sich schützend vor seine Kollegen, unter ihnen Yasira Saad. Sie blieb unverletzt.', press: 8, views: 7200000 },
    { id: 'n19', beat: 'b13', kind: 'eil', src: 'Tagesfunke', when: 'Tag 8, 08:00', head: 'Ermittlungsleiterin Saad suspendiert', body: 'Sie soll Interna an die Presse gegeben haben. Welche, ist bisher unklar. Lena Palmer bleibt verschwunden.', press: 8, views: 9600000 }
  ];

  /* Die Geschichte: ein Abschnitt nach dem anderen.
     short = Eintrag auf der Zeitachse, tie = Bezug der Meldung zum Ermittlungsstand,
     context = Handlungskontext, order = Ermittlungsauftrag, blocks = Inhalte in Reihenfolge. */
  var BEATS = [
    { id: 'b1', chapter: 1, when: 'Tag 2', short: 'Lena wird vermisst', news: 'n1',
      tie: 'Das ist der Fall, den du gerade bekommen hast.',
      context: 'Du bist neu in der Ermittlungsgruppe. Frank Palmer hat heute Morgen seine Tochter Lena als vermisst gemeldet. Noch ist es ein Vermisstenfall, mehr nicht. Die Akte ist dünn, also beginnst du mit dem, was vorliegt.',
      order: 'Lerne Lena und ihren Vater kennen. Trenne dann, was wirklich feststeht, von dem, was nur gesagt wird.',
      blocks: [
        { t: 'person', id: 'lena' }, { t: 'person', id: 'frank' }, { t: 'evidence', id: 'e1' },
        { t: 'sort', key: 'start', items: [
          { id: 's1', text: 'Lenas Handy ist seit gestern aus.', ref: 'fakt', note: 'Das belegt der Netzbetreiber.' },
          { id: 's2', text: 'Lena wollte zu ihrem Freund.', ref: 'behauptung', note: 'Das sagt ihr Vater. Geprüft ist es noch nicht.' },
          { id: 's3', text: 'Ihr Vater hätte besser aufpassen müssen.', ref: 'meinung', note: 'Das schreiben Leute unter die Meldung. Es hilft dem Fall nicht.' }
        ] },
        { t: 'choice', key: 'hunch', title: 'Was glaubst du gerade?', options: [
          { id: 'weg', label: 'Lena ist von sich aus weg', reply: 'Notiert. Am Ende vergleichst du das mit deinem letzten Stand.' },
          { id: 'unfall', label: 'Ihr ist etwas zugestoßen', reply: 'Notiert. Am Ende vergleichst du das mit deinem letzten Stand.' },
          { id: 'tat', label: 'Jemand hat ihr etwas angetan', reply: 'Notiert. Am Ende vergleichst du das mit deinem letzten Stand.' }
        ] }
      ], next: 'Am Abend gibt die Polizei neue Informationen heraus.' },

    { id: 'b2', chapter: 2, when: 'Tag 2', short: 'Die Suche', news: 'n2',
      tie: 'Die Meldung bestätigt, was in deiner Akte steht: Das Handy ist aus.',
      context: 'Die Suche läuft, aber Lena bleibt unerreichbar. Aus Anzeige, Funkdaten und der Aussage ihres Vaters entsteht ein erster Ablauf von Lenas letztem Tag.',
      order: 'Setze den Ablauf zusammen und finde die Stelle, an der sich Lenas Spur verliert.',
      blocks: [
        { t: 'timeline' },
        { t: 'choice', key: 'gap', title: 'Wo verliert sich die Spur?', must: 'nach', options: [
          { id: 'vor', label: 'Zwischen 16:40 und 17:04 Uhr', reply: 'Da schreibt sie noch Nachrichten. Die Spur lebt.' },
          { id: 'nach', label: 'Nach 17:06 Uhr', reply: 'Genau. Ab da gibt es nichts mehr. Wer war zuletzt mit ihr in Kontakt?' }
        ] }
      ], next: 'Am nächsten Tag beginnen die Befragungen.' },

    { id: 'b3', chapter: 2, when: 'Tag 3', short: 'Lenas Umfeld', news: 'n4',
      tie: 'Die Befragungen sind dein Auftrag.',
      context: 'Lena wollte laut ihrem Vater zu ihrem Freund, dort kam sie nie an. Ihr jüngerer Bruder Emil hat sie am selben Tag noch gesehen. Beide liegen jetzt als Akten vor.',
      order: 'Verschaffe dir ein Bild von Lenas letztem bekanntem Umfeld und vergleiche die Aussage ihres Freundes mit dem Chat.',
      blocks: [
        { t: 'dossiers', items: [{ id: 'freund', label: 'Akte: Lenas Freund', evidence: [] }, { id: 'emil', label: 'Akte: Emil Palmer', evidence: ['e5'] }] },
        { t: 'chat' }
      ], next: 'Ein ruhiger Tag. Dann, am Abend, klingeln überall die Handys.' },

    { id: 'b4', chapter: 3, when: 'Tag 4', short: 'Das Video', news: 'n6',
      tie: 'Lena ist seit drei Tagen weg. Jetzt kennt das ganze Land ihren Namen.',
      context: 'Drei Tage lang war Lena nur ein Name in deiner Akte. Seit 21:14 Uhr kursiert ein Video. Zu sehen sind Lena, drei Männer und jemand, der filmt. Du bekommst nur das Protokoll, das Video selbst nicht.',
      order: 'Im Netz stehen längst fertige Urteile. Prüfe, was sich aus dem Protokoll tatsächlich ableiten lässt.',
      blocks: [
        { t: 'evidence', id: 'e2' },
        { t: 'sort', key: 'video', items: [
          { id: 'v1', text: 'Auf dem Video sind drei Männer zu sehen.', ref: 'fakt', note: 'Das steht im Protokoll.' },
          { id: 'v2', text: 'Das Video zeigt, was an Tag 1 passiert ist.', ref: 'behauptung', note: 'Wann es aufgenommen wurde, ist unbekannt.' },
          { id: 'v3', text: 'Die Täter sind Ausländer.', ref: 'behauptung', note: 'Das schließt das Netz aus dem Aussehen. Belegt ist nichts.' },
          { id: 'v4', text: 'Die Polizei tut zu wenig.', ref: 'meinung', note: 'Kann man finden. Beweisen kann man es nicht.' }
        ] }
      ], next: 'Noch in der Nacht fällt eine Entscheidung in Wiesbaden.' },

    { id: 'b5', chapter: 3, when: 'Tag 5', short: 'Das BKA übernimmt', news: 'n8',
      tie: 'Deine Akte geht ans BKA. Du bleibst im Team.',
      context: 'Der Fall ist jetzt zu groß für die Region. Yasira Saad übernimmt die Leitung, Michael Becker arbeitet mit ihr. Sie lesen deine Akte und haben sofort eine Frage an dich.',
      order: 'Yasira erfuhr durch einen Journalisten von dem Video. Prüfe, wann seine Meldung erschien und was seine Erklärung taugt.',
      blocks: [
        { t: 'person', id: 'yasira' }, { t: 'person', id: 'michael' },
        { t: 'message', from: 'Yasira Saad', text: 'Ich saß gestern beim Date, als das Video kam. Stefan hatte es schon auf dem Handy. Sieh dir das bitte an.' },
        { t: 'person', id: 'stefan' }, { t: 'evidence', id: 'e6' },
        { t: 'choice', key: 'stefan', title: 'Wie liest du die 19 Minuten?', options: [
          { id: 'verdacht', label: 'Verdächtig früh', reply: 'Vielleicht. Aber früh sein ist kein Beweis, solange die Quelle unklar bleibt.' },
          { id: 'normal', label: 'Normal für seinen Beruf', reply: 'Möglich. Dann sollte sich sein Hinweis belegen lassen. Bisher tut er das nicht.' },
          { id: 'offen', label: 'Das reicht nicht für ein Urteil', reply: 'Sauber. Die Frage bleibt in der Akte.' }
        ] }
      ], next: 'Mittags will Yasira wissen, wo du stehst.' },

    { id: 'b6', chapter: 3, when: 'Tag 5', short: 'Erster Verdacht', news: 'n9',
      tie: 'Die Öffentlichkeit erwartet Namen. Ihr habt keine.',
      context: 'Erinnerst du dich? Lenas Freund hat den Chat verschwiegen, Stefan hatte das Video früh, und die drei Männer sind unbekannt. Frank Palmer kann kaum etwas beitragen. Mehr habt ihr nicht.',
      order: 'Yasira braucht deinen Stand. Stelle ein, wie plausibel dir jede Erklärung erscheint. Das ist keine Schuldwahrscheinlichkeit.',
      blocks: [{ t: 'sliders', key: 'firstSuspicion', label: 'Ersten Verdacht festhalten', reply: 'Festgehalten. Ein Verdacht ist noch kein Beweis, und du kannst ihn jederzeit oben im Lagebild ändern.' }],
      next: 'Am Abend gehen die ersten Menschen auf die Straße.' },

    { id: 'b7', chapter: 4, when: 'Tag 5', short: 'Demonstrationen', news: 'n11',
      tie: 'Die Hinweise aus dem Netz landen jetzt auf deinem Tisch.',
      context: 'Das Video verbreitet sich inzwischen rasant, die Aufrufe steigen im Minutentakt. Gleichzeitig tauchen immer mehr angebliche Augenzeugenberichte auf. Jeder davon klingt dringend.',
      order: 'Prüfe, welchen dieser Aussagen ihr als Ermittler tatsächlich vertrauen könnt.',
      blocks: [{ t: 'rate', items: [
        { id: 'r1', evidence: 'e7', src: '@wahrheit_lokal', text: 'Ich kenne die Halle aus dem Video. Industriegebiet bei uns um die Ecke!!', meta: '38.000 Mal geteilt' },
        { id: 'r2', src: 'Tagesfunke', text: 'Insider: Die Ermittler haben längst eine heiße Spur.', meta: 'Quelle nicht genannt' },
        { id: 'r3', src: '@klarblick', text: 'Alles Schauspieler. Oder Geheimdienst. Oder KI. Glaubt gar nichts mehr.', meta: '212 Likes' },
        { id: 'r4', src: 'Polizei, Pressestelle', text: 'Bitte teilt das Video nicht. Hinweise nur über die Hotline.', meta: 'Offizielle Mitteilung' }
      ], reply: 'Michael Becker: „Von all dem Lärm kann ich genau eine Zeile in die Akte schreiben.“' }],
      next: 'Am nächsten Mittag meldet sich jemand, der vom Fall profitiert.' },

    { id: 'b8', chapter: 4, when: 'Tag 6', short: 'Selbstjustiz', news: 'n12',
      tie: 'Die Wut aus deinem Feed hat jetzt einen Anführer.',
      context: 'Aus den Protesten ist eine Bewegung geworden. Der Aktive Heimatschutz gibt sich als Bürgerwehr und fordert, die Männer aus dem Video selbst zu jagen. Sein Anführer nennt sich Bär.',
      order: 'Yasira will wissen, was an Bärs Botschaft geprüft werden muss. Sieh dir die neue Akte an und lege die Priorität fest.',
      blocks: [
        { t: 'dossiers', items: [{ id: 'baer', label: 'Neue Akte: Bär', evidence: ['e8'] }] },
        { t: 'choice', key: 'pruefen', title: 'Was prüfst du zuerst?', options: [
          { id: 'echt', label: 'Ist Bärs Video echt?', reply: 'Michael setzt die Technik darauf an. Das Ergebnis lässt auf sich warten.' },
          { id: 'kanal', label: 'Wer steckt hinter dem Kanal?', reply: 'Die Spur führt in viele Konten. Zu Lena führt bisher keine.' },
          { id: 'lena', label: 'Hat Bär etwas mit Lena zu tun?', reply: 'Bisher nichts. Das schließt es aber noch nicht aus.' }
        ] }
      ], next: 'Das Innenministerium ruft an.' },

    { id: 'b9', chapter: 4, when: 'Tag 6', short: 'Die Pressekonferenz', news: 'n14',
      tie: 'Was ihr heute sagt, wird morgen die Schlagzeile sein.',
      context: 'Die Demonstrationen werden größer, und die Regierung muss reagieren. Die Innenministerin, die Yasira zum Gesicht der Ermittlung gemacht hat, will in zehn Minuten etwas sagen können.',
      order: 'Entscheide, was sie mitbekommt. Du kannst das nicht zurücknehmen.',
      blocks: [
        { t: 'person', id: 'ministerin' },
        { t: 'press', options: [
          { id: 'fahndung', label: 'Fahndung nach den drei Männern ausrufen', press: 12, reply: 'Die Fahndung bringt 400 Anrufe und neue Übergriffe auf Unbeteiligte.' },
          { id: 'fakten', label: 'Nur sagen, was gesichert ist', press: 5, reply: 'Sachlich, aber das Netz liest es als „Die Polizei schweigt“.' },
          { id: 'umfeld', label: 'Zeugen aus Lenas Umfeld suchen', press: 8, reply: 'Reporter stehen nun vor dem Haus der Familie Palmer.' }
        ] }
      ], next: 'In der Nacht klingelt dein Telefon.' },

    { id: 'b10', chapter: 5, when: 'Tag 7', short: 'Der Mob', news: 'n15',
      tie: 'Es gibt den ersten Toten in einem Fall, in dem du noch keinen Täter kennst.',
      context: 'Erst Wut im Netz, dann Demonstrationen, jetzt ein Toter. Er hat mit Lena nichts zu tun, doch im Netz wird trotzdem behauptet, er sei einer der drei Männer. Die Lage entgleitet.',
      order: 'Halte fest, was hier gesichert ist und welche Schlussfolgerung die Öffentlichkeit zieht.',
      blocks: [{ t: 'sort', key: 'mob', items: [
        { id: 'm1', text: 'Ein Unbeteiligter ist tot.', ref: 'fakt', note: 'Das haben die Ermittler bestätigt.' },
        { id: 'm2', text: 'Er war einer der Männer aus dem Video.', ref: 'behauptung', note: 'Dafür gibt es keinen Beleg.' },
        { id: 'm3', text: 'Das BKA trägt die Schuld daran.', ref: 'meinung', note: 'Eine Wertung, die gerade viele teilen.' }
      ] }], next: 'Am Morgen kommen die ersten technischen Ergebnisse.' },

    { id: 'b11', chapter: 5, when: 'Tag 7', short: 'Die Forensik', news: 'n16',
      tie: 'Die Öffentlichkeit liest: Versagen. Du liest die Rohdaten.',
      context: 'Die ersten technischen Untersuchungen liegen vor. Einige Ergebnisse passen zu deiner bisherigen Theorie, andere werfen neue Fragen auf. Erinnerst du dich an Emil? Er hat Lena an Tag 1 in ihrer grauen Jacke gesehen.',
      order: 'Was bedeuten die Befunde für deinen aktuellen Verdacht?',
      blocks: [{ t: 'clues', items: ['e9', 'e10', 'e11'] }, { t: 'optional', id: 'e12', label: 'Zusatzbericht zur Hotline (freiwillig)' }],
      next: 'Am Nachmittag rückt das Team zu einer Demonstration aus.' },

    { id: 'b12', chapter: 5, when: 'Tag 7', short: 'Die Granate', news: 'n18',
      tie: 'Yasira war dabei. Ein Kollege hat sie mit seinem Leben geschützt.',
      context: 'Die Lage wird lebensgefährlich, auch für euer Team. Die Akte ist inzwischen dick, doch die Befunde passen nicht zusammen: kein Tatort, kein Treffer, eine Jacke, die nicht stimmt. Yasira fragt noch am Abend nach deinem Stand.',
      order: 'Überprüfe deine Einschätzung. Eine neue Erklärung steht zur Auswahl: Das Video zeigt nicht, was es zu zeigen scheint.',
      blocks: [{ t: 'sliders', key: 'review5', label: 'Aktuellen Stand festhalten', reply: 'Dein Stand ist vermerkt.' }],
      next: 'Am nächsten Morgen ist Yasiras Büro leer.' },

    { id: 'b13', chapter: 6, when: 'Tag 8', short: 'Die Suspendierung', news: 'n19',
      tie: 'Ab jetzt hängt die Ermittlung an dem, was in deiner Akte steht.',
      context: 'Yasira ist suspendiert, Michael Becker übernimmt die Lagebesprechung. Acht Tage sind vergangen, Lena ist nicht gefunden, und das Land hat längst ein Urteil. Bevor du deinen Bericht schreibst, ordnet ihr gemeinsam die Akte.',
      order: 'Vergleiche deinen ersten Verdacht mit deinem heutigen Stand und ordne alle Beweisstücke ein.',
      blocks: [{ t: 'recap' }, { t: 'classify' }],
      next: 'Michael Becker: „Jetzt bist du dran. Schreib auf, was du wirklich vertreten kannst.“' }
  ];

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
    VERSION: 2, CHAPTERS: CHAPTERS, THEORIES: THEORIES, PERSONS: PERSONS, EVIDENCE: EVIDENCE, GRADES: GRADES,
    SORT_LABELS: SORT_LABELS, RATE_LABELS: RATE_LABELS, CLUE_LABELS: CLUE_LABELS, TIMELINE: TIMELINE, CHAT_TARGET: CHAT_TARGET,
    NEWS: NEWS, BEATS: BEATS, CLOSING: CLOSING, REPORT_QUESTIONS: REPORT_QUESTIONS
  };
})();
