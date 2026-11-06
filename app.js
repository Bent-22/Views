/* ==========================================================
   VIEWS – Ablauf der Ermittlung
   Inhalte: content.js. Verbindung zur Ergebnissammlung: config.js.
   ========================================================== */
(function () {
  'use strict';

  var C = window.VIEWS_CONTENT;
  var CFG = window.VIEWS_CONFIG || {};
  var KEY = 'views-ermittlung-v1';
  var START_VIEWS = 1400000;
  var app = document.getElementById('app');

  function defaults() {
    return {
      started: false, unlocked: 1, view: 1, done: {}, startChoice: '', timeline: {}, sort: {}, opened: {}, chatHit: false,
      chatMiss: -1, rates: {}, press: '', clues: {}, weights: {}, history: [], pins: {}, classes: {}, feed: [], unread: 0,
      pressure: 0, views: START_VIEWS, notes: '', report: { q1: '', q2: [], q2extra: '', q3: [], q4: '', q5: '', confidence: 50, theory: '' },
      reviewing: false, codes: { klass: '', teil: '' }, submission: null, submitted: false
    };
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var s = JSON.parse(raw), d = defaults();
        Object.keys(d).forEach(function (k) { if (s[k] === undefined) { s[k] = d[k]; } });
        return s;
      }
    } catch (e) { /* ohne Speicher läuft die Ermittlung im Arbeitsspeicher weiter */ }
    return defaults();
  }
  var state = load();
  var drawer = '';
  var submitError = '';
  var sending = false;

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* siehe load */ }
  }
  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function fmt(n) { return Math.round(n).toLocaleString('de-DE'); }
  function reduced() { return window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches; }

  /* ---------- Lagebild ---------- */
  function availableTheories() {
    return C.THEORIES.filter(function (t) { return t.unlock <= state.unlocked && (!t.needs || state.opened[t.needs]); });
  }
  function theoryName(id) {
    var t = C.THEORIES.filter(function (x) { return x.id === id; })[0];
    return t ? t.name : 'Noch offen';
  }
  function lead() {
    var best = '', val = 0;
    availableTheories().forEach(function (t) {
      var v = state.weights[t.id] || 0;
      if (v > val) { best = t.id; val = v; }
    });
    return { id: best, value: val };
  }
  function evidenceQuality(theory) {
    var counts = { fakt: 0, behauptung: 0, deutung: 0 };
    (state.pins[theory] || []).forEach(function (id) { counts[C.EVIDENCE[id].grade] += 1; });
    var score = Math.min(100, counts.fakt * 25 + counts.deutung * 12 + counts.behauptung * 5);
    return { counts: counts, score: score };
  }
  function pinnedSomewhere(id) {
    var l = lead().id;
    return l && (state.pins[l] || []).indexOf(id) >= 0;
  }

  /* ---------- Meldungen ---------- */
  var eilTimer;
  function showEil(item) {
    var box = document.getElementById('eil');
    box.innerHTML = '<strong>Eilmeldung</strong> <span>' + esc(item.head) + '</span>';
    box.classList.add('show');
    clearTimeout(eilTimer);
    eilTimer = setTimeout(function () { box.classList.remove('show'); }, 6000);
  }
  function emit(trigger) {
    var last;
    C.FEED.forEach(function (n) {
      if (n.on === trigger && state.feed.indexOf(n.id) < 0) {
        state.feed.unshift(n.id);
        state.pressure = Math.min(100, state.pressure + n.press);
        state.views += n.views;
        state.unread += 1;
        if (n.eil) { last = n; }
      }
    });
    if (last) { showEil(last); }
  }
  function addPressure(n) { state.pressure = Math.max(0, Math.min(100, state.pressure + n)); }

  /* ---------- Fortschritt ---------- */
  function has(obj, keys) { return keys.every(function (k) { return obj[k]; }); }
  function ids(list) { return list.map(function (x) { return x.id; }); }
  function phaseDone(n) {
    if (n === 1) { return !!state.startChoice; }
    if (n === 2) { return has(state.timeline, ids(C.TIMELINE)) && has(state.sort, ids(C.SORT_ITEMS)); }
    if (n === 3) { return has(state.opened, ['freund', 'stefan', 'emil']) && state.chatHit && !!state.done.firstSuspicion; }
    if (n === 4) { return has(state.rates, ids(C.RATE_ITEMS)) && !!state.opened.baer && !!state.press; }
    if (n === 5) { return has(state.clues, ['e9', 'e10', 'e11']) && !!state.done.review5; }
    if (n === 6) { return !!state.done.review6; }
    return false;
  }
  function progressText() {
    if (state.submitted) { return 'Dein Protokoll ist eingereicht.'; }
    if (state.view === 7) { return 'Schreibe deinen Abschlussbericht.'; }
    var p = C.PHASES[state.view - 1];
    if (state.view < state.unlocked) { return 'Du siehst dir einen erledigten Schritt an. Änderungen bleiben möglich.'; }
    return p.task;
  }
  function completePhase(n) {
    if (state.unlocked === n) {
      state.history.push({ phase: n, lead: lead().id, value: lead().value });
      state.unlocked = n + 1;
      state.view = n + 1;
      if (n === 6) { state.report.theory = state.report.theory || lead().id; }
      emit('p' + n);
    } else {
      state.view = n + 1;
    }
    save();
    render(true);
  }

  /* ---------- Bausteine ---------- */
  function personCard(id, extra) {
    var p = C.PERSONS[id];
    return '<article class="person">' +
      '<h3>' + (p.redacted ? '<span class="redact" aria-label="geschwärzter Name">███████</span> ' : '') + esc(p.redacted ? '(' + p.name + ')' : p.name) + '</h3>' +
      '<p class="role">' + esc(p.role) + '</p>' +
      '<dl><dt>Hintergrund</dt><dd>' + esc(p.back) + '</dd>' +
      '<dt>Bezug zum Fall</dt><dd>' + esc(p.link) + '</dd>' +
      '<dt>Bedeutung</dt><dd>' + esc(p.why) + '</dd></dl>' + (extra || '') + '</article>';
  }
  function evidenceBody(id) {
    var e = C.EVIDENCE[id];
    if (e.chat) {
      return '<div class="chat">' + e.chat.map(function (m) {
        return '<p class="' + (m[0] === 'lena' ? 'mine' : '') + '"><small>' + (m[0] === 'lena' ? 'Lena' : 'Freund') + ', ' + m[1] + '</small>' + esc(m[2]) + '</p>';
      }).join('') + '</div>';
    }
    return e.lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') +
      (e.more ? '<details><summary>Mehr dazu</summary><p>' + esc(e.more) + '</p></details>' : '');
  }
  function evidenceCard(id, opts) {
    var e = C.EVIDENCE[id];
    opts = opts || {};
    var foot = '';
    if (lead().id && !opts.plain) {
      foot = '<button class="pin' + (pinnedSomewhere(id) ? ' on' : '') + '" data-act="pin" data-id="' + id + '" aria-pressed="' + !!pinnedSomewhere(id) + '">' +
        (pinnedSomewhere(id) ? 'Stützt meinen Verdacht' : 'An meinen Verdacht heften') + '</button>';
    }
    return '<article class="paper"><header><span>' + esc(e.kind) + '</span><span>Beweisstück ' + id.slice(1) + '</span></header>' +
      '<h3>' + esc(e.title) + '</h3><div class="paper-body">' + evidenceBody(id) + '</div>' + foot + '</article>';
  }
  function nextButton(n) {
    if (!phaseDone(n)) { return '<p class="todo">' + esc(openTask(n)) + '</p>'; }
    var label = n === 6 ? 'Abschlussbericht öffnen' : 'Weiter zu Schritt ' + (n + 1);
    return '<button class="primary" data-act="next" data-n="' + n + '">' + label + '</button>';
  }
  function openTask(n) {
    if (n === 1) { return 'Wähle, womit du beginnst.'; }
    if (n === 2) {
      return !has(state.timeline, ids(C.TIMELINE)) ? 'Öffne alle Punkte der Zeitachse.' : 'Ordne alle Aussagen ein.';
    }
    if (n === 3) {
      if (!has(state.opened, ['freund', 'stefan', 'emil'])) { return 'Öffne alle drei Akten.'; }
      if (!state.chatHit) { return 'Finde im Chat, was nicht zur Aussage passt.'; }
      return 'Halte deinen ersten Verdacht fest.';
    }
    if (n === 4) {
      if (!has(state.rates, ids(C.RATE_ITEMS))) { return 'Bewerte alle vier Quellen.'; }
      if (!state.opened.baer) { return 'Sieh dir die Akte zu Bär an.'; }
      return 'Entscheide, was die Polizei sagt.';
    }
    if (n === 5) {
      return !has(state.clues, ['e9', 'e10', 'e11']) ? 'Prüfe alle drei Befunde gegen deinen Verdacht.' : 'Bestätige deinen aktuellen Verdacht.';
    }
    return 'Ordne alle Beweisstücke ein und bestätige deinen Stand.';
  }
  function choiceRow(group, key, value, labels) {
    return '<div class="choices" role="group">' + Object.keys(labels).map(function (v) {
      return '<button class="chip' + (value === v ? ' on' : '') + '" aria-pressed="' + (value === v) + '" data-act="' + group + '" data-id="' + key + '" data-v="' + v + '">' + esc(labels[v]) + '</button>';
    }).join('') + '</div>';
  }

  /* ---------- Die sechs Schritte ---------- */
  function phase1() {
    var reply = C.START_CHOICES.filter(function (c) { return c.id === state.startChoice; })[0];
    return '<div class="split"><div class="messages">' +
      C.BRIEFING.map(function (t) { return '<p class="bubble"><small>Yasira Saad</small>' + esc(t) + '</p>'; }).join('') +
      '<div class="choices">' + C.START_CHOICES.map(function (c) {
        return '<button class="chip' + (state.startChoice === c.id ? ' on' : '') + '" aria-pressed="' + (state.startChoice === c.id) + '" data-act="start-choice" data-id="' + c.id + '">' + esc(c.label) + '</button>';
      }).join('') + '</div>' +
      (reply ? '<p class="bubble"><small>Yasira Saad</small>' + esc(reply.reply) + '</p>' : '') +
      '</div><div class="stack">' + personCard('yasira') + personCard('michael') + '</div></div>' + nextButton(1);
  }

  function phase2() {
    var line = C.TIMELINE.map(function (t, i) {
      var open = state.timeline[t.id];
      return '<li class="' + (open ? 'open' : '') + '"><button data-act="timeline" data-id="' + t.id + '" aria-expanded="' + !!open + '">' +
        '<b>' + esc(t.when) + '</b>' + (open ? '<span>' + esc(t.text) + '</span>' : '<span class="muted">Öffnen</span>') + '</button></li>';
    }).join('');
    var sorted = has(state.sort, ids(C.SORT_ITEMS));
    var sort = C.SORT_ITEMS.map(function (s) {
      var val = state.sort[s.id] || '';
      var note = sorted ? '<p class="becker"><b>Michael Becker:</b> ' + esc(C.SORT_LABELS[s.michael]) + '. ' + esc(s.note) + '</p>' : '';
      return '<div class="sort-row"><p>' + esc(s.text) + '</p>' + choiceRow('sort', s.id, val, C.SORT_LABELS) + note + '</div>';
    }).join('');
    return '<div class="stack-row">' + personCard('lena') + personCard('frank') + '</div>' +
      '<h2>Was bisher passiert ist</h2><ol class="timeline">' + line + '</ol>' +
      '<div class="stack-row">' + evidenceCard('e1') + evidenceCard('e2') + '</div>' +
      '<h2>Was steht wirklich fest?</h2><div class="sorter">' + sort + '</div>' + nextButton(2);
  }

  function dossier(id, ev, label) {
    var open = state.opened[id];
    return '<div class="dossier' + (open ? ' open' : '') + '">' +
      (open ? personCard(id) + ev.map(function (e) { return evidenceCard(e); }).join('') :
        '<button class="closed-file" data-act="open" data-id="' + id + '">' + esc(label) + '</button>') + '</div>';
  }
  function chatTask() {
    var msgs = C.EVIDENCE.e4.chat, t = C.CHAT_TARGET;
    return '<h2>Passt das zusammen?</h2><div class="compare"><div>' + evidenceCard('e3') + '</div><div class="paper"><header><span>' + esc(C.EVIDENCE.e4.kind) + '</span><span>Beweisstück 4</span></header><h3>' + esc(C.EVIDENCE.e4.title) + '</h3>' +
      '<p class="hint">Tippe die Nachricht an, die nicht zur Aussage passt.</p><div class="chat">' + msgs.map(function (m, i) {
        var hit = state.chatHit && t.messages.indexOf(i) >= 0;
        var miss = state.chatMiss === i;
        return '<button class="' + (m[0] === 'lena' ? 'mine' : '') + (hit ? ' hit' : '') + (miss ? ' miss' : '') + '" data-act="chat" data-i="' + i + '"><small>' + (m[0] === 'lena' ? 'Lena' : 'Freund') + ', ' + m[1] + '</small>' + esc(m[2]) + '</button>';
      }).join('') + '</div>' +
      (state.chatHit ? '<p class="becker">' + esc(t.hit) + '</p>' : state.chatMiss >= 0 ? '<p class="becker">' + esc(t.miss) + '</p>' : '') +
      (state.chatHit && lead().id ? '<button class="pin' + (pinnedSomewhere('e4') ? ' on' : '') + '" data-act="pin" data-id="e4">' + (pinnedSomewhere('e4') ? 'Stützt meinen Verdacht' : 'An meinen Verdacht heften') + '</button>' : '') +
      '</div></div>';
  }
  function sliders(compact) {
    return '<div class="sliders' + (compact ? ' compact' : '') + '">' + availableTheories().map(function (t) {
      var v = state.weights[t.id] || 0;
      return '<label><span>' + esc(t.name) + '</span><output data-out="' + t.id + '">' + v + '</output>' +
        '<input type="range" min="0" max="100" step="5" value="' + v + '" data-slider="' + t.id + '"></label>';
    }).join('') + '</div>';
  }
  function phase3() {
    var ready = has(state.opened, ['freund', 'stefan', 'emil']) && state.chatHit;
    return '<p class="lead-in">Drei Akten liegen auf dem Tisch. In welcher Reihenfolge du sie öffnest, entscheidest du.</p>' +
      '<div class="dossiers">' + dossier('freund', [], 'Lenas Freund') + dossier('stefan', ['e6'], 'Stefan') + dossier('emil', ['e5'], 'Emil Palmer') + '</div>' +
      (state.opened.freund ? chatTask() : '') +
      (ready ? '<h2>Dein erster Verdacht</h2><p class="hint">Stelle ein, wie plausibel dir jede Erklärung gerade erscheint. Das ist keine Schuldwahrscheinlichkeit.</p>' + sliders() +
        (state.done.firstSuspicion ? '<p class="becker">Festgehalten. Du kannst den Wert jederzeit oben im Lagebild ändern.</p>' :
          '<button class="ghost" data-act="first-suspicion"' + (lead().id ? '' : ' disabled') + '>Ersten Verdacht festhalten</button>') : '') +
      nextButton(3);
  }

  function phase4() {
    var rate = C.RATE_ITEMS.map(function (r) {
      return '<article class="post"><header><b>' + esc(r.src) + '</b><small>' + esc(r.meta) + '</small></header><p>' + esc(r.text) + '</p>' +
        choiceRow('rate', r.id, state.rates[r.id] || '', C.RATE_LABELS) + '</article>';
    }).join('');
    var decided = C.PRESS.filter(function (p) { return p.id === state.press; })[0];
    return '<h2>Was davon hält einer Prüfung stand?</h2><div class="posts">' + rate + '</div>' +
      (has(state.rates, ids(C.RATE_ITEMS)) ? '<div class="stack-row">' + (state.opened.baer ? personCard('baer') + evidenceCard('e8') :
        '<button class="closed-file" data-act="open" data-id="baer">Neue Akte: Bär</button>') + '</div>' : '') +
      (state.opened.baer ? '<h2>Die Pressekonferenz</h2><div class="stack-row">' + personCard('ministerin') +
        '<div><p class="lead-in">Die Innenministerin will in zehn Minuten etwas sagen können. Was gibst du ihr mit?</p><div class="options">' +
        C.PRESS.map(function (p) {
          return '<button class="option' + (state.press === p.id ? ' on' : '') + '" aria-pressed="' + (state.press === p.id) + '" data-act="press" data-id="' + p.id + '"' + (state.press && state.press !== p.id ? ' disabled' : '') + '>' + esc(p.label) + '</button>';
        }).join('') + '</div>' + (decided ? '<p class="becker">' + esc(decided.reply) + '</p>' : '') + '</div></div>' : '') +
      nextButton(4);
  }

  function clueCard(id) {
    var labels = { stuetzt: 'Stützt ihn', schwaecht: 'Schwächt ihn', offen: 'Sagt nichts' };
    return evidenceCard(id, { plain: true }) + choiceRow('clue', id, state.clues[id] || '', labels);
  }
  function phase5() {
    var opened = has(state.clues, ['e9', 'e10', 'e11']);
    var l = lead();
    return '<p class="lead-in">Dein Verdacht zurzeit: <b>' + esc(theoryName(l.id)) + '</b>. Was bedeuten die neuen Befunde dafür?</p>' +
      '<div class="compare"><div>' + clueCard('e9') + '</div><div>' + clueCard('e10') + '</div></div>' +
      '<div class="compare"><div>' + clueCard('e11') + '</div><div>' + (state.opened.e12 ? evidenceCard('e12', { plain: true }) : '<button class="closed-file" data-act="open" data-id="e12">Zusatzbericht zur Hotline (freiwillig)</button>') + '</div></div>' +
      (opened ? '<h2>Bleibst du dabei?</h2><p class="hint">Neue Erklärung im Lagebild: „' + esc(theoryName('anders')) + '“.</p>' + sliders() +
        (state.done.review5 ? '<p class="becker">Dein Stand ist vermerkt.</p>' : '<button class="ghost" data-act="review5">Aktuellen Stand festhalten</button>') : '') +
      nextButton(5);
  }

  function unlockedEvidence() {
    return Object.keys(C.EVIDENCE).filter(function (id) { return C.EVIDENCE[id].phase <= state.unlocked && (id !== 'e12' || state.opened.e12) && (id !== 'e5' || state.opened.emil); });
  }
  function phase6() {
    var first = state.history.filter(function (h) { return h.phase === 3; })[0];
    var l = lead();
    var q = evidenceQuality(l.id);
    var rows = unlockedEvidence().map(function (id) {
      return '<div class="board-row"><p>' + esc(C.EVIDENCE[id].title) + '</p>' + choiceRow('classify', id, state.classes[id] || '', C.GRADES) + '</div>';
    }).join('');
    return '<div class="review"><div class="stat"><h3>Dein erster Verdacht</h3><p>' + esc(first ? theoryName(first.lead) : 'Noch offen') + '</p></div>' +
      '<div class="stat"><h3>Dein Verdacht jetzt</h3><p>' + esc(theoryName(l.id)) + '</p></div>' +
      '<div class="stat"><h3>Daran hängt er</h3><p>' + q.counts.fakt + ' gesichert, ' + q.counts.behauptung + ' unbestätigt, ' + q.counts.deutung + ' Interpretation</p></div></div>' +
      '<h2>Was ist was in deiner Akte?</h2><div class="sorter">' + rows + '</div>' +
      (allClassified() ? (state.done.review6 ? '' : '<button class="ghost" data-act="review6">Stand bestätigen</button>') : '') + nextButton(6);
  }
  function allClassified() { return unlockedEvidence().every(function (id) { return state.classes[id]; }); }

  /* ---------- Abschlussbericht ---------- */
  function reportValid() {
    var r = state.report;
    return r.q1.trim().length >= 20 && (r.q2.length > 0 || r.q2extra.trim()) && r.q3.length === 3 && r.q4.trim() && r.q5.trim() && r.theory;
  }
  function protocol() {
    var r = state.report, q = {};
    Object.keys(state.classes).forEach(function (k) { q[k] = state.classes[k]; });
    return {
      version: C.VERSION, theory: r.theory, q1: r.q1, q2: r.q2, q2extra: r.q2extra, q3: r.q3, q4: r.q4, q5: r.q5,
      confidence: Number(r.confidence), firstSuspicion: (state.history.filter(function (h) { return h.phase === 3; })[0] || {}).lead || '',
      weights: state.weights, rates: state.rates, press: state.press, classes: q
    };
  }
  function reportForm() {
    var r = state.report;
    var persons = ['lena', 'frank', 'freund', 'emil', 'stefan', 'baer', 'ministerin'];
    return '<div class="form">' +
      '<label class="field"><span>Deine Erklärung in einem Satz</span><select data-report="theory"><option value="">Bitte wählen</option>' +
      C.THEORIES.map(function (t) { return '<option value="' + t.id + '"' + (r.theory === t.id ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') + '<option value="eigene"' + (r.theory === 'eigene' ? ' selected' : '') + '>Eine andere Erklärung</option></select></label>' +
      '<label class="field"><span>' + esc(C.REPORT_QUESTIONS.q1) + '</span><textarea rows="4" maxlength="1200" data-report="q1">' + esc(r.q1) + '</textarea></label>' +
      '<div class="field"><span>' + esc(C.REPORT_QUESTIONS.q2) + '</span><div class="choices">' + persons.map(function (id) {
        var on = r.q2.indexOf(id) >= 0;
        return '<button class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="q2" data-id="' + id + '">' + esc(C.PERSONS[id].name) + '</button>';
      }).join('') + '</div><input type="text" maxlength="300" placeholder="Oder ein Zusammenhang in eigenen Worten" data-report="q2extra" value="' + esc(r.q2extra) + '"></div>' +
      '<div class="field"><span>' + esc(C.REPORT_QUESTIONS.q3) + ' (' + r.q3.length + ' von 3)</span><div class="choices">' + unlockedEvidence().map(function (id) {
        var on = r.q3.indexOf(id) >= 0;
        return '<button class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="q3" data-id="' + id + '"' + (!on && r.q3.length >= 3 ? ' disabled' : '') + '>' + esc(C.EVIDENCE[id].title) + '</button>';
      }).join('') + '</div></div>' +
      '<label class="field"><span>' + esc(C.REPORT_QUESTIONS.q4) + '</span><textarea rows="2" maxlength="600" data-report="q4">' + esc(r.q4) + '</textarea></label>' +
      '<label class="field"><span>' + esc(C.REPORT_QUESTIONS.q5) + '</span><textarea rows="2" maxlength="600" data-report="q5">' + esc(r.q5) + '</textarea></label>' +
      '<label class="field"><span>Wie sicher bist du dir? <output data-out="confidence">' + r.confidence + ' %</output></span><input type="range" min="0" max="100" step="5" value="' + r.confidence + '" data-report="confidence"></label>' +
      '<p class="hint">Bitte keine Namen von Mitschülern oder andere persönliche Angaben eintragen.</p>' +
      '<p class="todo" id="reportTodo"' + (reportValid() ? ' hidden' : '') + '>Beantworte alle Fragen und wähle genau drei Beweisstücke.</p>' +
      '<button class="primary" id="reportSend" data-act="review"' + (reportValid() ? '' : ' disabled') + '>Ermittlung abschließen und Ergebnisse einreichen</button></div>';
  }
  function backendReady() { return !!(CFG.supabaseUrl && CFG.supabaseKey); }
  function reportReview() {
    var r = state.report;
    function row(k, v) { return '<dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd>'; }
    var theory = r.theory === 'eigene' ? 'Eine andere Erklärung' : theoryName(r.theory);
    var persons = r.q2.map(function (id) { return C.PERSONS[id].name; }).concat(r.q2extra ? [r.q2extra] : []).join(', ');
    return '<div class="summary"><h2>Dein Ermittlungsprotokoll</h2><dl>' + row('Erklärung', theory) + row('Was passiert ist', r.q1) + row('Relevant', persons) +
      row('Beweisstücke', r.q3.map(function (id) { return C.EVIDENCE[id].title; }).join(', ')) + row('Unsicher', r.q4) + row('Nächster Schritt', r.q5) + row('Sicherheit', r.confidence + ' %') + '</dl>' +
      '<p class="hint">Eingereicht wird dieses Protokoll mit deinen Einschätzungen. Deine Notizen bleiben auf deinem Gerät. Nach dem Einreichen kannst du nichts mehr ändern.</p>' +
      '<div class="form"><label class="field"><span>Klassencode</span><input type="text" autocomplete="off" autocapitalize="characters" maxlength="24" data-code="klass" value="' + esc(state.codes.klass) + '"></label>' +
      '<label class="field"><span>Dein Teilnehmercode</span><input type="text" autocomplete="off" autocapitalize="characters" maxlength="24" data-code="teil" value="' + esc(state.codes.teil) + '"></label></div>' +
      (backendReady() ? '' : '<p class="error">Die zentrale Abgabe ist noch nicht eingerichtet. Dein Stand bleibt auf diesem Gerät gespeichert. Sag deiner Lehrkraft Bescheid.</p>') +
      (submitError ? '<p class="error" role="alert">' + esc(submitError) + '</p>' : '') +
      '<div class="row"><button class="primary" data-act="submit"' + (sending || !backendReady() ? ' disabled' : '') + '>' + (sending ? 'Wird übertragen' : (state.submission ? 'Erneut versuchen' : 'Verbindlich einreichen')) + '</button>' +
      (state.submission && state.submission.unknown ? '' : '<button class="ghost" data-act="back-report"' + (sending ? ' disabled' : '') + '>Zurück zum Bericht</button>') + '</div></div>';
  }
  function finished() {
    return '<div class="closing"><p class="sent">Dein Ermittlungsprotokoll wurde erfolgreich übermittelt. Deine Ermittlung ist abgeschlossen.</p>' +
      C.CLOSING.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') +
      '<p class="hint">Die gemeinsame Auswertung folgt im Unterricht.</p></div>';
  }

  /* ---------- Übertragung ---------- */
  function uuid() {
    if (crypto.randomUUID) { return crypto.randomUUID(); }
    var b = crypto.getRandomValues(new Uint8Array(16));
    b[6] = (b[6] & 15) | 64; b[8] = (b[8] & 63) | 128;
    var h = Array.prototype.map.call(b, function (x) { return ('0' + x.toString(16)).slice(-2); }).join('');
    return h.slice(0, 8) + '-' + h.slice(8, 12) + '-' + h.slice(12, 16) + '-' + h.slice(16, 20) + '-' + h.slice(20);
  }
  function submit() {
    var klass = state.codes.klass.trim().toUpperCase(), teil = state.codes.teil.trim().toUpperCase();
    if (!klass || !teil) { submitError = 'Trage Klassencode und Teilnehmercode ein.'; render(); return; }
    /* Die Kennung bleibt bei Wiederholungen gleich. So entsteht bei Abbrüchen kein doppelter Eintrag. */
    if (!state.submission) { state.submission = { id: uuid(), payload: protocol() }; }
    save();
    sending = true; submitError = ''; render();
    var ctrl = new AbortController();
    var timer = setTimeout(function () { ctrl.abort(); }, 15000);
    fetch(CFG.supabaseUrl.replace(/\/$/, '') + '/rest/v1/rpc/submit_protocol', {
      method: 'POST', signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', apikey: CFG.supabaseKey, Authorization: 'Bearer ' + CFG.supabaseKey },
      body: JSON.stringify({ p_class_code: klass, p_participant_code: teil, p_submission_id: state.submission.id, p_payload: state.submission.payload })
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (body) { return { ok: res.ok, body: body }; });
    }).then(function (r) {
      var status = r.body && (r.body.status || r.body);
      if (r.ok && (status === 'accepted' || status === 'already_received')) {
        state.submitted = true; state.reviewing = false; save(); return;
      }
      var msg = String((r.body && r.body.message) || '');
      if (msg.indexOf('already_submitted') >= 0) { submitError = 'Für diesen Teilnehmercode liegt schon eine Abgabe vor. Wende dich an deine Lehrkraft.'; }
      else if (msg.indexOf('invalid_code') >= 0) { submitError = 'Klassencode oder Teilnehmercode stimmt nicht. Prüfe beide Eingaben.'; }
      else { state.submission.unknown = true; submitError = 'Der Server hat die Abgabe nicht bestätigt. Dein Stand ist gespeichert, versuche es erneut.'; }
    }).catch(function () {
      /* Ob die Abgabe angekommen ist, ist offen. Deshalb bleibt der Inhalt ab hier gesperrt. */
      state.submission.unknown = true;
      submitError = 'Keine Verbindung zur Abgabe. Dein Stand ist gespeichert, versuche es erneut.';
    }).then(function () {
      clearTimeout(timer); sending = false; save(); render();
    });
  }

  /* ---------- Seitengerüst ---------- */
  function meters() {
    var l = lead(), q = evidenceQuality(l.id);
    var warn = l.id && l.value - q.score >= 40;
    return '<section class="meters" aria-label="Lagebild">' +
      '<button class="meter views" data-act="drawer" data-id="lage"><span>Öffentlicher Druck, Aufrufe</span><b id="viewcount">' + fmt(state.views) + '</b><i class="bar"><em class="hot" data-w="' + state.pressure + '"></em></i></button>' +
      '<button class="meter" data-act="drawer" data-id="lage"><span>Mein Verdacht</span><b class="txt">' + esc(l.id ? theoryName(l.id) : 'Noch offen') + '</b><i class="bar"><em data-w="' + l.value + '"></em></i></button>' +
      '<button class="meter" data-act="drawer" data-id="lage"><span>' + (warn ? '<em class="warn">Verdacht stärker als die Belege</em>' : 'Beweislage') + '</span><b class="txt">' + (l.id ? q.counts.fakt + ' gesichert, ' + q.counts.behauptung + ' unbestätigt, ' + q.counts.deutung + ' Interpretation' : 'Noch nichts angeheftet') + '</b><i class="bar"><em class="cool" data-w="' + q.score + '"></em></i>' +
      '' + '</button></section>';
  }
  function steps() {
    return '<nav class="steps" aria-label="Ermittlungsschritte"><ol>' + C.PHASES.map(function (p) {
      var locked = p.n > state.unlocked, cur = state.view === p.n;
      return '<li class="' + (cur ? 'cur' : '') + (p.n < state.unlocked ? ' done' : '') + '"><button data-act="goto" data-n="' + p.n + '"' + (locked ? ' disabled' : '') + (cur ? ' aria-current="step"' : '') + '><b>' + p.n + '</b><span>' + (locked ? 'Gesperrt' : esc(p.title)) + '</span></button></li>';
    }).join('') + '<li class="' + (state.view === 7 ? 'cur' : '') + '"><button data-act="goto" data-n="7"' + (state.unlocked < 7 ? ' disabled' : '') + '><b>✓</b><span>' + (state.unlocked < 7 ? 'Gesperrt' : 'Bericht') + '</span></button></li></ol></nav>';
  }
  function feedHtml() {
    var map = {};
    C.FEED.forEach(function (n) { map[n.id] = n; });
    return '<aside class="feed" aria-label="Live-Feed"><h2>Live aus dem Netz</h2>' + state.feed.map(function (id) {
      var n = map[id];
      return '<article class="' + (n.post ? 'tick post-tick' : 'tick') + (n.eil ? ' eilt' : '') + '"><header><b>' + esc(n.src) + '</b><small>' + esc(n.when) + '</small></header>' +
        (n.head ? '<h3>' + esc(n.head) + '</h3>' : '') + '<p>' + esc(n.body) + '</p></article>';
    }).join('') + '</aside>';
  }
  function drawerHtml() {
    if (!drawer) { return ''; }
    var body = '';
    if (drawer === 'lage') {
      var l = lead();
      body = '<h2>Lagebild</h2><p class="hint">Stelle ein, wie plausibel dir jede Erklärung erscheint. Der Wert ist deine Einschätzung, keine Schuldwahrscheinlichkeit.</p>' +
        (availableTheories().length && state.unlocked >= 3 ? sliders(true) : '<p class="hint">Dein Verdacht wird in Schritt 3 freigeschaltet.</p>') +
        '<p class="hint">Die Beweislage zählt, was an deinem Verdacht hängt. Gesichertes wiegt mehr als Unbestätigtes.</p>' +
        (l.id ? '<p>' + (state.pins[l.id] || []).map(function (id) { return esc(C.EVIDENCE[id].title); }).join(', ') + '</p>' : '');
    } else if (drawer === 'akte') {
      var persons = ['yasira', 'michael'];
      if (state.unlocked >= 2) { persons.push('lena', 'frank'); }
      ['freund', 'stefan', 'emil', 'baer'].forEach(function (id) { if (state.opened[id]) { persons.push(id); } });
      if (state.opened.baer && state.unlocked >= 4) { persons.push('ministerin'); }
      var ev = unlockedEvidence().filter(function (id) { return id !== 'e8' || state.opened.baer; }).filter(function (id) { return id !== 'e6' || state.opened.stefan; }).filter(function (id) { return id !== 'e3' && id !== 'e4' ? true : state.opened.freund; });
      body = '<h2>Meine Akte</h2><div class="stack">' + ev.map(function (id) { return evidenceCard(id); }).join('') + persons.map(function (id) { return personCard(id); }).join('') + '</div>';
    } else {
      body = '<h2>Notizen</h2><p class="hint">Deine Notizen bleiben auf diesem Gerät und werden nicht eingereicht.</p><textarea rows="12" maxlength="4000" data-notes="1">' + esc(state.notes) + '</textarea>' +
        '<button class="ghost danger" data-act="reset">Fortschritt zurücksetzen</button>';
    }
    return '<div class="scrim" data-act="close-drawer"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Seitenbereich"><button class="close" data-act="close-drawer">Schließen</button>' + body + '</aside>';
  }
  function startScreen() {
    return '<section class="cover"><p class="count" aria-label="Aufrufe des Videos"><span id="viewcount">' + fmt(state.views) + '</span><small>Aufrufe. Es ist kurz nach 22 Uhr. Das Video ist 48 Minuten online.</small></p>' +
      '<h1>Der Fall Lena Palmer</h1><p class="intro">Eine 16-Jährige ist verschwunden. Jetzt redet das ganze Land über sie. Du gehörst ab sofort zur Ermittlungsgruppe und hast etwa 20 Minuten, um dir ein eigenes Urteil zu bilden.</p>' +
      '<p class="notice"><b>Inhaltshinweis:</b> Der Fall berührt sexualisierte Gewalt, Rassismus, Rechtsextremismus und politische Gewalt. Nichts davon wird bildlich oder im Detail gezeigt.</p>' +
      '<button class="primary big" data-act="begin">Ermittlung beginnen</button>' +
      legal() + '</section>';
  }
  function legal() {
    return '<footer class="legal">Fiktives Unterrichtsprojekt zum Roman „Views“ von Marc-Uwe Kling. Alle Meldungen, Beiträge, Akten und Untersuchungen wurden für den Unterricht erstellt. Keine echte Behörde, keine echten Nachrichten. Dein Zwischenstand bleibt in diesem Browser, bis du ihn am Ende selbst einreichst.</footer>';
  }
  function stage() {
    if (state.view === 7) {
      if (state.submitted) { return finished(); }
      return state.reviewing ? reportReview() : '<h1>Abschlussbericht</h1><p class="lead-in">Alles Gesagte liegt auf dem Tisch. Jetzt zählt, was du daraus machst.</p>' + reportForm();
    }
    var p = C.PHASES[state.view - 1];
    var fn = [phase1, phase2, phase3, phase4, phase5, phase6][state.view - 1];
    return '<h1>' + esc(p.title) + '</h1>' + fn();
  }
  function render(top) {
    var y = window.scrollY;
    var dScroll = document.querySelector('.drawer');
    var dy = dScroll ? dScroll.scrollTop : 0;
    if (!state.started) {
      app.innerHTML = startScreen();
    } else {
      app.innerHTML = '<div class="hud"><header class="top"><div class="brand"><strong>VIEWS</strong><span>Fall Lena Palmer</span></div>' + steps() +
        '<div class="tools"><button data-act="drawer" data-id="akte">Akte</button><button data-act="drawer" data-id="notizen">Notizen</button></div></header>' +
        meters() + '</div><p class="now"><b>Jetzt:</b> ' + esc(progressText()) + '</p>' +
        '<main class="layout"><section class="stage">' + stage() + '</section>' + feedHtml() + '</main>' + legal() + drawerHtml();
      var d = document.querySelector('.drawer');
      if (d) { d.scrollTop = dy; }
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-w]'), function (el) { el.style.width = el.getAttribute('data-w') + '%'; });
    window.scrollTo(0, top ? 0 : y);
  }
  function refreshMeters() {
    var el = document.querySelector('.meters');
    if (el) {
      el.outerHTML = meters();
      Array.prototype.forEach.call(document.querySelectorAll('.meters [data-w]'), function (b) { b.style.width = b.getAttribute('data-w') + '%'; });
    }
  }

  /* ---------- Bedienung ---------- */
  function toggle(list, id) {
    var i = list.indexOf(id);
    if (i >= 0) { list.splice(i, 1); } else { list.push(id); }
  }
  var ACTIONS = {
    begin: function () { state.started = true; emit('start'); },
    next: function (d) { completePhase(Number(d.n)); return true; },
    goto: function (d) { state.view = Number(d.n); save(); render(true); return true; },
    drawer: function (d) { drawer = d.id; save(); render(); var b = document.querySelector('.drawer .close'); if (b) { b.focus(); } return true; },
    'close-drawer': function () { drawer = ''; },
    'start-choice': function (d) { state.startChoice = d.id; },
    timeline: function (d) { state.timeline[d.id] = true; },
    sort: function (d) { state.sort[d.id] = d.v; },
    open: function (d) { state.opened[d.id] = true; if (d.id === 'baer') { emit('baer'); } },
    chat: function (d) {
      var i = Number(d.i);
      if (C.CHAT_TARGET.messages.indexOf(i) >= 0) { state.chatHit = true; state.chatMiss = -1; } else { state.chatMiss = i; }
    },
    'first-suspicion': function () { state.done.firstSuspicion = true; state.history.push({ phase: 3, lead: lead().id, value: lead().value }); },
    pin: function (d) {
      var l = lead().id;
      if (!l) { return; }
      state.pins[l] = state.pins[l] || [];
      toggle(state.pins[l], d.id);
    },
    rate: function (d) {
      var first = !state.rates[d.id];
      state.rates[d.id] = d.v;
      if (first && d.v === 'hoch') { addPressure(3); state.views += 900000; }
    },
    press: function (d) {
      if (state.press) { return; }
      state.press = d.id;
      var p = C.PRESS.filter(function (x) { return x.id === d.id; })[0];
      addPressure(p.press); state.views += p.press * 400000;
    },
    clue: function (d) {
      state.clues[d.id] = d.v;
      var l = lead().id;
      if (l) {
        state.pins[l] = state.pins[l] || [];
        var i = state.pins[l].indexOf(d.id);
        if (d.v === 'stuetzt' && i < 0) { state.pins[l].push(d.id); }
        if (d.v !== 'stuetzt' && i >= 0) { state.pins[l].splice(i, 1); }
      }
      emit('forensik');
      if (has(state.clues, ['e9', 'e10', 'e11'])) { emit('p5mid'); }
    },
    review5: function () { state.done.review5 = true; },
    classify: function (d) { state.classes[d.id] = d.v; },
    review6: function () { state.done.review6 = true; },
    q2: function (d) { toggle(state.report.q2, d.id); },
    q3: function (d) { toggle(state.report.q3, d.id); },
    review: function () { state.reviewing = true; save(); render(true); return true; },
    'back-report': function () { state.reviewing = false; state.submission = null; submitError = ''; },
    submit: function () { submit(); return true; },
    reset: function (d, el) {
      if (el.getAttribute('data-armed') !== '1') {
        el.setAttribute('data-armed', '1');
        el.textContent = 'Wirklich alles löschen?';
        return true;
      }
      state = defaults(); drawer = '';
      save(); render(true);
      return true;
    }
  };
  app.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]');
    if (!el || el.disabled) { return; }
    var act = ACTIONS[el.getAttribute('data-act')];
    if (!act) { return; }
    var handled = act(el.dataset, el);
    if (!handled) { save(); render(); }
  });
  app.addEventListener('input', function (ev) {
    var t = ev.target, d = t.dataset;
    if (d.slider) {
      state.weights[d.slider] = Number(t.value);
      var out = document.querySelector('[data-out="' + d.slider + '"]');
      if (out) { out.textContent = t.value; }
      save(); refreshMeters();
    } else if (d.report) {
      state.report[d.report] = t.value;
      if (d.report === 'confidence') { document.querySelector('[data-out="confidence"]').textContent = t.value + ' %'; }
      document.getElementById('reportSend').disabled = !reportValid();
      document.getElementById('reportTodo').hidden = !!reportValid();
      save();
    } else if (d.code) {
      state.codes[d.code] = t.value; save();
    } else if (d.notes) {
      state.notes = t.value; save();
    }
  });
  app.addEventListener('change', function (ev) {
    var d = ev.target.dataset;
    if (d.slider) { render(); }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && drawer) { drawer = ''; render(); }
  });
  window.addEventListener('online', function () {
    if (state.submission && !state.submitted && state.reviewing && !sending && backendReady()) { submit(); }
  });

  /* Der Zähler läuft leise weiter, solange die Ermittlung offen ist. */
  if (!reduced()) {
    setInterval(function () {
      if (state.submitted) { return; }
      state.views += 37 + Math.floor(Math.random() * 90);
      var el = document.getElementById('viewcount');
      if (el) { el.textContent = fmt(state.views); }
    }, 1500);
  }
  render();
})();
