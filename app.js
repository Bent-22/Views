/* ==========================================================
   VIEWS – Ablauf der Ermittlung
   Inhalte und Geschichte: content.js. Ergebnissammlung: config.js.

   Die Geschichte besteht aus Abschnitten (C.BEATS). Jeder beginnt mit
   einer Meldung, ordnet sie ein und führt in einen Auftrag. Die Zeit
   läuft nur durch die Geschichte, nie nach der echten Uhr.
   ========================================================== */
(function () {
  'use strict';

  var C = window.VIEWS_CONTENT;
  var CFG = window.VIEWS_CONFIG || {};
  var KEY = 'views-ermittlung-v2';
  var REPORT = 'bericht';
  var app = document.getElementById('app');

  var BEAT = {}, NEWS = {};
  C.BEATS.forEach(function (b, i) { b.index = i; BEAT[b.id] = b; });
  C.NEWS.forEach(function (n) { NEWS[n.id] = n; });

  function defaults() {
    return {
      started: false, reached: 0, view: 0, finishedStory: false, opened: {}, read: {}, feed: [], met: [], found: [],
      sorts: {}, choices: {}, chatHit: false, chatMiss: -1, rates: {}, clues: {}, classes: {}, done: {},
      weights: {}, history: [], pins: {}, pressure: 0, views: 0, viewBonus: 0, notes: '',
      report: { q1: '', q2: [], q2extra: '', q3: [], q4: '', q5: '', confidence: 50, theory: '' },
      reviewing: false, codes: { klass: '', teil: '' }, submission: null, submitted: false, closed: false
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
  var openNews = '';
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
  function collecting() { return !!CFG.collectResults; }
  function backendReady() { return collecting() && !!(CFG.supabaseUrl && CFG.supabaseKey); }
  function addTo(list, id) { if (list.indexOf(id) < 0) { list.push(id); } }
  function toggle(list, id) {
    var i = list.indexOf(id);
    if (i >= 0) { list.splice(i, 1); } else { list.push(id); }
  }

  /* ---------- Lagebild ---------- */
  function availableTheories() {
    return C.THEORIES.filter(function (t) { return BEAT[t.beat].index <= state.reached; });
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
  /* Was ohne Beleg als gesichert behandelt wird, schwächt die Beweislage.
     Richtige Antworten bringen dagegen keine Punkte. */
  function assumptions() {
    var n = 0;
    C.BEATS.forEach(function (b) {
      b.blocks.forEach(function (x) {
        if (x.t === 'sort') { x.items.forEach(function (s) { if (state.sorts[s.id] === 'fakt' && s.ref !== 'fakt') { n += 1; } }); }
        if (x.t === 'rate') { x.items.forEach(function (r) { if (r.unproven && state.rates[r.id] === 'hoch') { n += 1; } }); }
      });
    });
    return n;
  }
  function evidenceQuality(theory) {
    var counts = { fakt: 0, behauptung: 0, deutung: 0 };
    (state.pins[theory] || []).forEach(function (id) { counts[C.EVIDENCE[id].grade] += 1; });
    return { counts: counts, score: Math.max(0, Math.min(100, counts.fakt * 25 + counts.deutung * 12 + counts.behauptung * 5) - assumptions() * 5) };
  }
  function pinned(id) {
    var l = lead().id;
    return l && (state.pins[l] || []).indexOf(id) >= 0;
  }

  /* ---------- Geschichte ---------- */
  function enterBeat(i) {
    var beat = C.BEATS[i];
    C.NEWS.forEach(function (n) {
      if (n.beat === beat.id && state.feed.indexOf(n.id) < 0) {
        state.feed.unshift(n.id);
        state.pressure = Math.min(100, state.pressure + n.press);
      }
    });
    if (beat.views) { state.views = beat.views + state.viewBonus; }
  }
  /* Die Aufrufe hängen an der Geschichte: Jeder Abschnitt legt einen Stand fest.
     Dazwischen wächst die Zahl leise um höchstens ein Zehntel des Wegs zum nächsten
     Ereignis und bleibt dann stehen. Nach großen Ereignissen läuft sie schneller. */
  function viewRange() {
    var beat = C.BEATS[state.reached];
    if (!beat.views) { return { base: 0, gap: 0 }; }
    var next = C.BEATS[state.reached + 1];
    return { base: beat.views + state.viewBonus, gap: ((next ? next.views : beat.views * 1.1) - beat.views) / 10 };
  }
  function clampViews() {
    var r = viewRange();
    state.views = Math.max(r.base, Math.min(r.base + r.gap, state.views));
  }
  function firstSuspicion() { return state.history.filter(function (h) { return h.key === 'firstSuspicion'; })[0]; }

  function blockDone(b) {
    switch (b.t) {
      case 'sort': return b.items.every(function (i) { return state.sorts[i.id]; });
      case 'choice': return b.must ? state.choices[b.key] === b.must : !!state.choices[b.key];
      case 'dossiers': return b.items.every(function (i) { return state.opened[i.id]; });
      case 'chat': return state.chatHit;
      case 'sliders': return !!state.done[b.key];
      case 'rate': return b.items.every(function (i) { return state.rates[i.id]; });
      case 'press': return !!state.choices.press;
      case 'clues': return b.items.every(function (id) { return state.clues[id]; });
      case 'classify': return state.found.every(function (id) { return state.classes[id]; }) && !!state.done.review6;
      default: return true;
    }
  }
  function beatDone(beat) { return !!state.read[beat.news] && beat.blocks.every(blockDone); }

  /* ---------- Bausteine ---------- */
  function personCard(id) {
    var p = C.PERSONS[id];
    return '<article class="person">' +
      '<h3>' + (p.redacted ? '<span class="redact" aria-label="geschwärzter Name">███████</span> ' : '') + esc(p.redacted ? '(' + p.name + ')' : p.name) + '</h3>' +
      '<p class="role">' + esc(p.role) + '</p>' +
      '<dl><dt>Hintergrund</dt><dd>' + esc(p.back) + '</dd>' +
      '<dt>Bezug zum Fall</dt><dd>' + esc(p.link) + '</dd>' +
      '<dt>Warum jetzt</dt><dd>' + esc(p.why) + '</dd></dl></article>';
  }
  function evidenceBody(id) {
    var e = C.EVIDENCE[id];
    if (e.chat) {
      return '<div class="chat">' + e.chat.map(function (m) {
        return '<p class="' + (m[0] === 'lena' ? 'mine' : '') + '"><small>' + (m[0] === 'lena' ? 'Lena' : 'Freund') + ', ' + m[1] + '</small>' + esc(m[2]) + '</p>';
      }).join('') + '</div>';
    }
    return e.lines.map(function (l) { return '<p>' + esc(l) + '</p>'; }).join('') +
      (e.more ? '<details><summary>Details anzeigen</summary><p>' + esc(e.more) + '</p></details>' : '');
  }
  function pinButton(id) {
    if (!lead().id) { return ''; }
    return '<button class="pin' + (pinned(id) ? ' on' : '') + '" data-act="pin" data-id="' + id + '" aria-pressed="' + !!pinned(id) + '">' + (pinned(id) ? 'Stützt meinen Verdacht' : 'An meinen Verdacht heften') + '</button>';
  }
  function evidenceCard(id, plain) {
    var e = C.EVIDENCE[id];
    return '<article class="paper"><header><span>' + esc(e.kind) + '</span></header>' +
      '<h3>' + esc(e.title) + '</h3><div class="paper-body">' + evidenceBody(id) + '</div>' + (plain ? '' : pinButton(id)) + '</article>';
  }
  function choiceRow(group, key, value, labels) {
    return '<div class="choices" role="group">' + Object.keys(labels).map(function (v) {
      return '<button class="chip' + (value === v ? ' on' : '') + '" aria-pressed="' + (value === v) + '" data-act="' + group + '" data-id="' + key + '" data-v="' + v + '">' + esc(labels[v]) + '</button>';
    }).join('') + '</div>';
  }
  function reply(text) { return text ? '<p class="becker">' + esc(text) + '</p>' : ''; }
  function suspicionWord(v) { return C.SUSPICION_SCALE[Math.min(4, Math.floor(v / 20))]; }
  function sliders(question) {
    return (question ? '<h3 class="ask">' + esc(question) + '</h3>' : '') + '<div class="sliders">' + availableTheories().map(function (t) {
      var v = state.weights[t.id] || 0;
      return '<label><span>' + esc(t.name) + '</span><output data-out="' + t.id + '">' + esc(suspicionWord(v)) + '</output>' +
        '<input type="range" min="0" max="100" step="5" value="' + v + '" data-slider="' + t.id + '" aria-valuetext="' + esc(suspicionWord(v)) + '">' +
        '<span class="scale" aria-hidden="true">' + C.SUSPICION_SCALE.map(function (w) { return '<i>' + esc(w) + '</i>'; }).join('') + '</span></label>';
    }).join('') + '</div>';
  }

  function sortFeedback(s, val) {
    var html = '<p class="becker"><b>' + (val === s.ref ? 'Das sieht die Akte genauso: ' : 'Die Akte ordnet das anders ein: ') + esc(C.SORT_LABELS[s.ref]) + '.</b> ' + esc(s.note) + '</p>';
    if (val === 'fakt' && s.ref !== 'fakt') { html += '<p class="hint">Als Tatsache steht das nun als ungeprüfte Annahme in deiner Akte und senkt deine Beweislage, bis du es änderst.</p>'; }
    return html;
  }

  var BLOCKS = {
    person: function (b) { addTo(state.met, b.id); return personCard(b.id); },
    evidence: function (b) { addTo(state.found, b.id); return evidenceCard(b.id); },
    message: function (b) { return '<p class="bubble wide"><small>' + esc(b.from) + '</small>' + esc(b.text) + '</p>'; },
    sort: function (b) {
      return '<div class="sorter wide"><p class="order-line">' + esc(b.task) + '</p><dl class="legend">' + Object.keys(C.SORT_LABELS).map(function (k) {
        return '<dt>' + esc(C.SORT_LABELS[k]) + '</dt><dd>' + esc(C.SORT_HELP[k]) + '</dd>';
      }).join('') + '</dl>' + b.items.map(function (s) {
        var val = state.sorts[s.id];
        return '<div class="sort-row"><p class="src">' + esc(s.who) + '</p><p class="quote">„' + esc(s.text) + '“</p>' + choiceRow('sort', s.id, val || '', C.SORT_LABELS) + (val ? sortFeedback(s, val) : '') + '</div>';
      }).join('') + '</div>';
    },
    choice: function (b) {
      var cur = b.options.filter(function (o) { return o.id === state.choices[b.key]; })[0];
      return '<div class="wide"><h3 class="ask">' + esc(b.title) + '</h3><div class="choices">' + b.options.map(function (o) {
        var on = cur && cur.id === o.id;
        return '<button class="chip' + (on ? ' on' : '') + '" aria-pressed="' + !!on + '" data-act="choice" data-key="' + b.key + '" data-id="' + o.id + '">' + esc(o.label) + '</button>';
      }).join('') + '</div>' + reply(cur && cur.reply) + '</div>';
    },
    timeline: function () {
      return '<ol class="timeline wide">' + C.TIMELINE.map(function (t) {
        return '<li class="open"><div class="entry"><b>' + esc(t.when) + '</b><span>' + esc(t.text) + '</span></div></li>';
      }).join('') + '</ol>';
    },
    dossiers: function (b) {
      return '<div class="dossiers wide">' + b.items.map(function (it) {
        if (!state.opened[it.id]) { return '<button class="closed-file" data-act="open" data-id="' + it.id + '">' + esc(it.label) + '</button>'; }
        addTo(state.met, it.id);
        it.evidence.forEach(function (e) { addTo(state.found, e); });
        return '<div class="dossier">' + personCard(it.id) + it.evidence.map(function (e) { return evidenceCard(e); }).join('') + '</div>';
      }).join('') + '</div>';
    },
    chat: function () {
      var msgs = C.EVIDENCE.e4.chat, t = C.CHAT_TARGET;
      addTo(state.found, 'e3'); addTo(state.found, 'e4');
      return '<div class="compare wide"><div>' + evidenceCard('e3') + '</div><div class="paper"><header><span>' + esc(C.EVIDENCE.e4.kind) + '</span></header><h3>' + esc(C.EVIDENCE.e4.title) + '</h3>' +
        '<p class="hint">Tippe die Nachricht an, die nicht zur Aussage passt.</p><div class="chat">' + msgs.map(function (m, i) {
          var hit = state.chatHit && t.messages.indexOf(i) >= 0, miss = state.chatMiss === i;
          return '<button class="' + (m[0] === 'lena' ? 'mine' : '') + (hit ? ' hit' : '') + (miss ? ' miss' : '') + '" data-act="chat" data-i="' + i + '"><small>' + (m[0] === 'lena' ? 'Lena' : 'Freund') + ', ' + m[1] + '</small>' + esc(m[2]) + '</button>';
        }).join('') + '</div>' + (state.chatHit ? reply(t.hit) : state.chatMiss >= 0 ? reply(t.miss) : '') + (state.chatHit ? pinButton('e4') : '') + '</div></div>';
    },
    sliders: function (b) {
      var had = state.done[b.key];
      return '<div class="wide">' + sliders(b.question) + (had ? reply(b.reply) : '<button class="ghost" data-act="suspicion" data-key="' + b.key + '"' + (lead().id ? '' : ' disabled') + '>' + esc(b.label) + '</button>') + '</div>';
    },
    rate: function (b) {
      addTo(state.found, 'e7');
      var open = b.items.filter(function (r) { return r.unproven && state.rates[r.id] === 'hoch'; }).length;
      return '<p class="hint wide">' + esc(b.hint) + '</p><div class="posts wide">' + b.items.map(function (r) {
        return '<article class="post"><header><b>' + esc(r.src) + '</b><small>' + esc(r.meta) + '</small></header><p>' + esc(r.text) + '</p>' + choiceRow('rate', r.id, state.rates[r.id] || '', C.RATE_LABELS) + '</article>';
      }).join('') + '</div>' + (blockDone(b) ? '<div class="wide">' + reply(b.reply) + (open ? '<p class="hint">' + (open === 1 ? 'Einer Aussage ohne Beleg vertraust du. Sie steht als ungeprüfte Annahme in deiner Akte und senkt' : open + ' Aussagen ohne Beleg vertraust du. Sie stehen als ungeprüfte Annahmen in deiner Akte und senken') + ' deine Beweislage, bis du das änderst.</p>' : '') + '</div>' : '');
    },
    press: function (b) {
      var cur = b.options.filter(function (o) { return o.id === state.choices.press; })[0];
      return '<div class="options">' + b.options.map(function (p) {
        return '<button class="option' + (cur && cur.id === p.id ? ' on' : '') + '" data-act="press" data-id="' + p.id + '"' + (cur && cur.id !== p.id ? ' disabled' : '') + '>' + esc(p.label) + '</button>';
      }).join('') + reply(cur && cur.reply) + '</div>';
    },
    clues: function (b) {
      var l = lead();
      return '<p class="wide lead-in">Dein Verdacht zurzeit: <b>' + esc(theoryName(l.id)) + '</b></p><div class="clues wide">' + b.items.map(function (id) {
        addTo(state.found, id);
        return '<div>' + evidenceCard(id, true) + choiceRow('clue', id, state.clues[id] || '', C.CLUE_LABELS) + '</div>';
      }).join('') + '</div>';
    },
    optional: function (b) {
      if (!state.opened[b.id]) { return '<button class="closed-file slim wide" data-act="open" data-id="' + b.id + '">' + esc(b.label) + '</button>'; }
      addTo(state.found, b.id);
      return evidenceCard(b.id, true);
    },
    recap: function () {
      var f = firstSuspicion(), l = lead(), q = evidenceQuality(l.id);
      var hunch = (BEAT.b1.blocks.filter(function (b) { return b.key === 'hunch'; })[0].options.filter(function (o) { return o.id === state.choices.hunch; })[0] || {}).label;
      return '<div class="review wide">' +
        '<div class="stat"><h3>Tag 2, dein Bauchgefühl</h3><p>' + esc(hunch || 'Keine Angabe') + '</p></div>' +
        '<div class="stat"><h3>Tag 5, dein erster Verdacht</h3><p>' + esc(f ? theoryName(f.lead) : 'Noch offen') + '</p></div>' +
        '<div class="stat"><h3>Tag 8, dein Verdacht jetzt</h3><p>' + esc(theoryName(l.id)) + '</p></div>' +
        '<div class="stat"><h3>Daran hängt er</h3><p>' + q.counts.fakt + ' gesichert, ' + q.counts.behauptung + ' unbestätigt, ' + q.counts.deutung + ' Interpretation</p></div></div>';
    },
    classify: function () {
      var all = state.found.every(function (id) { return state.classes[id]; });
      return '<div class="sorter wide">' + state.found.map(function (id) {
        return '<div class="board-row"><p>' + esc(C.EVIDENCE[id].title) + '</p>' + choiceRow('classify', id, state.classes[id] || '', C.GRADES) + '</div>';
      }).join('') + '</div>' + (all && !state.done.review6 ? '<button class="ghost wide-btn" data-act="flag" data-key="review6">Stand bestätigen</button>' : '');
    }
  };

  function eilCard(n, beat) {
    var chapter = beat && C.BEATS[beat.index - 1] && C.BEATS[beat.index - 1].chapter === beat.chapter ? null : beat && C.CHAPTERS[beat.chapter - 1];
    var fresh = beat && beat.index === state.reached && !state.read[n.id];
    return '<article class="flash' + (n.kind === 'eil' ? ' eil-flash' : '') + (fresh ? ' fresh' : '') + '">' +
      (chapter ? '<p class="chapter">Kapitel ' + chapter.n + ': ' + esc(chapter.title) + '</p>' : '') +
      '<header><span class="tag">' + (n.kind === 'eil' ? '<i class="live"></i>Eilmeldung' : 'Meldung') + '</span><span>' + esc(n.src) + '</span><time>' + esc(n.when) + '</time></header>' +
      '<h1>' + esc(n.head) + '</h1><p class="sum">' + esc(n.body) + '</p>' +
      (beat ? '<p class="tie">' + esc(beat.tie) + '</p>' : '') + '</article>';
  }
  function beatView(beat) {
    var n = NEWS[beat.news];
    if (!state.read[n.id]) {
      return eilCard(n, beat) + '<button class="primary" data-act="read" data-id="' + n.id + '">Zum Ermittlungsauftrag</button>';
    }
    var html = eilCard(n, beat) + '<p class="context">' + esc(beat.context) + '</p><p class="order"><b>Dein Auftrag:</b> ' + esc(beat.order) + '</p><div class="work">';
    /* Inhalte erscheinen nacheinander: Was noch offen ist, hält den Rest zurück. */
    for (var i = 0; i < beat.blocks.length; i += 1) {
      html += BLOCKS[beat.blocks[i].t](beat.blocks[i]);
      if (!blockDone(beat.blocks[i])) { break; }
    }
    html += '</div>';
    if (!beatDone(beat)) { return html; }
    var last = beat.index === C.BEATS.length - 1;
    return html + '<div class="ahead"><p>' + esc(beat.next) + '</p><button class="primary" data-act="next">' + (last ? 'Abschlussbericht öffnen' : 'Weiter') + '</button></div>';
  }

  /* ---------- Abschlussbericht ---------- */
  function reportValid() {
    var r = state.report;
    return r.q1.trim().length >= 20 && (r.q2.length > 0 || r.q2extra.trim()) && r.q3.length === 3 && r.q4.trim() && r.q5.trim() && r.theory;
  }
  function protocol() {
    var r = state.report, f = firstSuspicion();
    return {
      version: C.VERSION, theory: r.theory, q1: r.q1, q2: r.q2, q2extra: r.q2extra, q3: r.q3, q4: r.q4, q5: r.q5,
      confidence: Number(r.confidence), hunch: state.choices.hunch || '', firstSuspicion: f ? f.lead : '',
      weights: state.weights, rates: state.rates, press: state.choices.press || '', classes: state.classes
    };
  }
  function reportForm() {
    var r = state.report;
    var persons = state.met.filter(function (id) { return id !== 'michael' && id !== 'yasira'; });
    return '<div class="form">' +
      '<label class="field"><span>Deine Erklärung</span><select data-report="theory"><option value="">Bitte wählen</option>' +
      C.THEORIES.map(function (t) { return '<option value="' + t.id + '"' + (r.theory === t.id ? ' selected' : '') + '>' + esc(t.name) + '</option>'; }).join('') + '<option value="eigene"' + (r.theory === 'eigene' ? ' selected' : '') + '>Eine andere Erklärung</option></select></label>' +
      '<label class="field"><span>' + esc(C.REPORT_QUESTIONS.q1) + '</span><textarea rows="4" maxlength="1200" data-report="q1">' + esc(r.q1) + '</textarea></label>' +
      '<div class="field"><span>' + esc(C.REPORT_QUESTIONS.q2) + '</span><div class="choices">' + persons.map(function (id) {
        var on = r.q2.indexOf(id) >= 0;
        return '<button class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="q2" data-id="' + id + '">' + esc(C.PERSONS[id].name) + '</button>';
      }).join('') + '</div><input type="text" maxlength="300" placeholder="Oder ein Zusammenhang in eigenen Worten" data-report="q2extra" value="' + esc(r.q2extra) + '"></div>' +
      '<div class="field"><span>' + esc(C.REPORT_QUESTIONS.q3) + ' (' + r.q3.length + ' von 3)</span><div class="choices">' + state.found.map(function (id) {
        var on = r.q3.indexOf(id) >= 0;
        return '<button class="chip' + (on ? ' on' : '') + '" aria-pressed="' + on + '" data-act="q3" data-id="' + id + '"' + (!on && r.q3.length >= 3 ? ' disabled' : '') + '>' + esc(C.EVIDENCE[id].title) + '</button>';
      }).join('') + '</div></div>' +
      '<label class="field"><span>' + esc(C.REPORT_QUESTIONS.q4) + '</span><textarea rows="2" maxlength="600" data-report="q4">' + esc(r.q4) + '</textarea></label>' +
      '<label class="field"><span>' + esc(C.REPORT_QUESTIONS.q5) + '</span><textarea rows="2" maxlength="600" data-report="q5">' + esc(r.q5) + '</textarea></label>' +
      '<label class="field"><span>Wie sicher bist du dir? <output data-out="confidence">' + r.confidence + ' %</output></span><input type="range" min="0" max="100" step="5" value="' + r.confidence + '" data-report="confidence"></label>' +
      '<p class="hint">Bitte keine Namen von Mitschülern oder andere persönliche Angaben eintragen.</p>' +
      '<p class="todo" id="reportTodo"' + (reportValid() ? ' hidden' : '') + '>Beantworte alle Fragen und wähle genau drei Beweisstücke.</p>' +
      '<button class="primary" id="reportSend" data-act="review"' + (reportValid() ? '' : ' disabled') + '>' + (collecting() ? 'Ermittlung abschließen und Ergebnisse einreichen' : 'Ermittlung abschließen') + '</button></div>';
  }
  function summaryRows() {
    var r = state.report;
    function row(k, v) { return '<dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd>'; }
    var theory = r.theory === 'eigene' ? 'Eine andere Erklärung' : theoryName(r.theory);
    var persons = r.q2.map(function (id) { return C.PERSONS[id].name; }).concat(r.q2extra ? [r.q2extra] : []).join(', ');
    return '<dl>' + row('Erklärung', theory) + row('Was passiert ist', r.q1) + row('Relevant', persons) +
      row('Beweisstücke', r.q3.map(function (id) { return C.EVIDENCE[id].title; }).join(', ')) + row('Unsicher', r.q4) + row('Nächster Schritt', r.q5) + row('Sicherheit', r.confidence + ' %') + '</dl>';
  }
  function reportReview() {
    if (!collecting()) {
      return '<div class="summary"><h2>Dein Ermittlungsprotokoll</h2>' + summaryRows() +
        '<p class="hint">Dein Bericht bleibt auf diesem Gerät und wird nicht übertragen.</p>' +
        '<div class="row"><button class="primary" data-act="close-case">Ermittlung abschließen</button><button class="ghost" data-act="back-report">Zurück zum Bericht</button></div></div>';
    }
    return '<div class="summary"><h2>Dein Ermittlungsprotokoll</h2>' + summaryRows() +
      '<p class="hint">Eingereicht wird dieses Protokoll mit deinen Einschätzungen. Deine Notizen bleiben auf deinem Gerät. Nach dem Einreichen kannst du nichts mehr ändern.</p>' +
      '<div class="form"><label class="field"><span>Klassencode</span><input type="text" autocomplete="off" autocapitalize="characters" maxlength="24" data-code="klass" value="' + esc(state.codes.klass) + '"></label>' +
      '<label class="field"><span>Dein Teilnehmercode</span><input type="text" autocomplete="off" autocapitalize="characters" maxlength="24" data-code="teil" value="' + esc(state.codes.teil) + '"></label></div>' +
      (backendReady() ? '' : '<p class="error">Die zentrale Abgabe ist noch nicht eingerichtet. Dein Stand bleibt auf diesem Gerät gespeichert.</p>') +
      (submitError ? '<p class="error" role="alert">' + esc(submitError) + '</p>' : '') +
      '<div class="row"><button class="primary" data-act="submit"' + (sending || !backendReady() ? ' disabled' : '') + '>' + (sending ? 'Wird übertragen' : (state.submission ? 'Erneut versuchen' : 'Verbindlich einreichen')) + '</button>' +
      (state.submission && state.submission.unknown ? '' : '<button class="ghost" data-act="back-report"' + (sending ? ' disabled' : '') + '>Zurück zum Bericht</button>') + '</div></div>';
  }
  function finished() {
    return '<div class="closing">' + (state.submitted ? '<p class="sent">Dein Ermittlungsprotokoll wurde erfolgreich übermittelt. Deine Ermittlung ist abgeschlossen.</p>' : '<p class="sent">Deine Ermittlung ist abgeschlossen.</p>') +
      C.CLOSING.map(function (t) { return '<p>' + esc(t) + '</p>'; }).join('') +
      '<p class="hint">Die gemeinsame Auswertung folgt im Unterricht.</p>' +
      (state.submitted ? '' : '<button class="ghost" data-act="download">Meinen Bericht als Textdatei speichern</button>') + '</div>';
  }
  function downloadReport() {
    var r = state.report;
    var lines = ['Ermittlungsbericht, Fall Lena Palmer', '', 'Erklärung: ' + (r.theory === 'eigene' ? 'Eine andere Erklärung' : theoryName(r.theory)), '', C.REPORT_QUESTIONS.q1, r.q1, '',
      C.REPORT_QUESTIONS.q2, r.q2.map(function (id) { return C.PERSONS[id].name; }).concat(r.q2extra ? [r.q2extra] : []).join(', '), '',
      C.REPORT_QUESTIONS.q3, r.q3.map(function (id) { return C.EVIDENCE[id].title; }).join(', '), '',
      C.REPORT_QUESTIONS.q4, r.q4, '', C.REPORT_QUESTIONS.q5, r.q5, '', 'Sicherheit: ' + r.confidence + ' %'];
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' }));
    a.download = 'ermittlungsbericht.txt';
    document.body.appendChild(a); a.click(); a.remove();
  }

  /* ---------- Übertragung (nur bei collectResults: true) ---------- */
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
      '<button class="meter" data-act="drawer" data-id="lage"><span>' + (assumptions() ? '<em class="warn">Beweislage: ' + assumptions() + (assumptions() === 1 ? ' ungeprüfte Annahme' : ' ungeprüfte Annahmen') + '</em>' : warn ? '<em class="warn">Verdacht stärker als die Belege</em>' : 'Beweislage') + '</span><b class="txt">' + (l.id ? q.counts.fakt + ' gesichert, ' + q.counts.behauptung + ' unbestätigt, ' + q.counts.deutung + ' Interpretation' : 'Noch nichts angeheftet') + '</b><i class="bar"><em class="cool" data-w="' + q.score + '"></em></i></button></section>';
  }
  function chapterOf(view) { return view === REPORT ? 7 : C.BEATS[view].chapter; }
  function chapters() {
    var reachedCh = state.finishedStory ? 7 : C.BEATS[state.reached].chapter, cur = chapterOf(state.view);
    return '<nav class="steps" aria-label="Kapitel"><ol>' + C.CHAPTERS.map(function (c) {
      var locked = c.n > reachedCh;
      return '<li class="' + (cur === c.n ? 'cur' : '') + (c.n < reachedCh ? ' done' : '') + '"><button data-act="chapter" data-n="' + c.n + '"' + (locked ? ' disabled' : '') + (cur === c.n ? ' aria-current="step"' : '') + '><b>' + c.n + '</b><span>' + (locked ? 'Gesperrt' : esc(c.title)) + '</span></button></li>';
    }).join('') + '<li class="' + (cur === 7 ? 'cur' : '') + '"><button data-act="goto-report"' + (state.finishedStory ? '' : ' disabled') + '><b>✓</b><span>' + (state.finishedStory ? 'Bericht' : 'Gesperrt') + '</span></button></li></ol></nav>';
  }
  function chronology() {
    var items = C.BEATS.slice(0, state.reached + 1).map(function (b) {
      var cur = state.view === b.index;
      return '<li class="' + (cur ? 'cur' : '') + '"><button data-act="goto" data-n="' + b.index + '"' + (cur ? ' aria-current="true"' : '') + '><small>' + esc(b.when) + '</small>' + esc(b.short) + '</button></li>';
    }).join('');
    var coming = state.finishedStory ? '' : '<li class="coming"><span><small>Als Nächstes</small>noch nicht bekannt</span></li>';
    return '<nav class="chrono" aria-label="Zeitachse des Falls"><ol id="chrono">' + items + coming + '</ol></nav>';
  }
  function kindLabel(n) { return { eil: 'Eilmeldung', news: 'Nachricht', post: 'Beitrag', debatte: 'Diskussion' }[n.kind]; }
  function feedHtml() {
    var list = state.feed.filter(function (id) { return NEWS[id].kind !== 'eil'; });
    return '<aside class="feed" aria-label="Reaktionen"><h2>Reaktionen</h2>' + (list.length ? '' : '<p class="hint">Noch redet niemand über den Fall.</p>') + list.map(function (id) {
      var n = NEWS[id];
      return '<article class="tick ' + (n.kind === 'news' ? '' : 'post-tick') + '"><header><b>' + esc(n.src) + '</b><small>' + esc(n.when) + '</small></header>' +
        (n.head ? '<h3>' + esc(n.head) + '</h3>' : '') + '<p>' + esc(n.body) + '</p></article>';
    }).join('') + '</aside>';
  }
  function unreadCount() { return state.feed.filter(function (id) { return !state.read[id]; }).length; }
  function archive() {
    return '<h2>Nachrichtenverlauf</h2><p class="hint">Alle bisherigen Meldungen, die neueste zuerst.</p><ul class="archive">' + state.feed.map(function (id) {
      var n = NEWS[id], open = openNews === id;
      return '<li class="' + (n.kind === 'eil' ? 'a-eil' : '') + '"><button data-act="news" data-id="' + id + '" aria-expanded="' + open + '"><span class="a-meta">' + kindLabel(n) + ', ' + esc(n.when) + ' <em class="' + (state.read[id] ? 'seen' : 'new') + '">' + (state.read[id] ? 'Bereits gelesen' : 'Neu') + '</em></span>' +
        '<b>' + esc(n.head || n.src) + '</b></button>' + (open ? '<p>' + esc(n.body) + '</p><small>' + esc(n.src) + '</small>' : '') + '</li>';
    }).join('') + '</ul>';
  }
  function drawerHtml() {
    if (!drawer) { return ''; }
    var body = '';
    if (drawer === 'lage') {
      var l = lead();
      body = '<h2>Lagebild</h2><p class="hint"><b>Öffentlicher Druck</b> zeigt, wie stark der Fall alle beschäftigt. Er sagt nichts über Schuld.</p>' +
        (state.done.firstSuspicion ? '<p class="hint"><b>Mein Verdacht</b> ist deine Einschätzung, keine Schuldwahrscheinlichkeit.</p>' + sliders() : '<p class="hint">Dein Verdacht wird an Tag 5 freigeschaltet.</p>') +
        '<p class="hint"><b>Beweislage</b> zählt, was an deinem Verdacht hängt. Gesichertes wiegt mehr als Unbestätigtes. Aussagen ohne Beleg, die du als Tatsache einordnest oder denen du vertraust, senken den Wert. Das lässt sich in den jeweiligen Abschnitten ändern.</p>' +
        (l.id ? '<p>' + (state.pins[l.id] || []).map(function (id) { return esc(C.EVIDENCE[id].title); }).join(', ') + '</p>' : '');
    } else if (drawer === 'news') {
      body = archive();
    } else if (drawer === 'akte') {
      body = '<h2>Meine Akte</h2><div class="stack">' + state.found.map(function (id) { return evidenceCard(id); }).join('') + state.met.map(personCard).join('') + '</div>';
    } else {
      body = '<h2>Notizen</h2><p class="hint">Deine Notizen bleiben auf diesem Gerät.</p><textarea rows="12" maxlength="4000" data-notes="1">' + esc(state.notes) + '</textarea>' +
        '<button class="ghost danger" data-act="reset">Fortschritt zurücksetzen</button>';
    }
    return '<div class="scrim" data-act="close-drawer"></div><aside class="drawer" role="dialog" aria-modal="true" aria-label="Seitenbereich"><button class="close" data-act="close-drawer">Schließen</button>' + body + '</aside>';
  }
  function legal() {
    return '<footer class="legal">Fiktives Unterrichtsprojekt zum Roman „Views“ von Marc-Uwe Kling. Alle Meldungen, Beiträge, Akten und Untersuchungen wurden für den Unterricht erstellt. Keine echte Behörde, keine echten Nachrichten. Dein Stand bleibt in diesem Browser' + (collecting() ? ', bis du ihn am Ende selbst einreichst.' : '.') + '</footer>';
  }
  function startScreen() {
    return '<section class="cover"><p class="count"><span>0</span><small>Aufrufe. Noch.</small></p>' +
      '<h1>Der Fall Lena Palmer</h1><p class="intro">Eine 16-Jährige ist verschwunden, und noch sucht nur ihre Familie nach ihr. Du gehörst ab heute zur Ermittlungsgruppe. In etwa 20 Minuten erlebst du, wie aus einem Vermisstenfall etwas viel Größeres wird.</p>' +
      '<p class="notice"><b>Inhaltshinweis:</b> Der Fall berührt sexualisierte Gewalt, Rassismus, Rechtsextremismus und politische Gewalt. Nichts davon wird bildlich oder im Detail gezeigt.</p>' +
      '<button class="primary big" data-act="begin">Ermittlung beginnen</button>' + legal() + '</section>';
  }
  function stage() {
    if (state.view !== REPORT) { return beatView(C.BEATS[state.view]); }
    if (state.submitted || state.closed) { return finished(); }
    return state.reviewing ? reportReview() : '<h1>Abschlussbericht</h1><p class="context">Lena ist nicht gefunden, Yasira suspendiert, das Land gespalten. Schreib auf, was du nach acht Tagen wirklich vertreten kannst.</p>' + reportForm();
  }
  /* Balken laufen vom alten zum neuen Wert, damit Änderungen sichtbar werden. */
  function barWidths() {
    return Array.prototype.map.call(document.querySelectorAll('.meters [data-w]'), function (el) { return el.style.width; });
  }
  function fillBars(previous) {
    var list = document.querySelectorAll('.meters [data-w]');
    Array.prototype.forEach.call(list, function (el, i) {
      el.style.transition = 'none';
      el.style.width = previous[i] || '0%';
    });
    if (list.length) { void list[0].offsetWidth; }
    Array.prototype.forEach.call(list, function (el) {
      el.style.transition = '';
      el.style.width = el.getAttribute('data-w') + '%';
    });
  }
  function render(top) {
    var y = window.scrollY;
    var old = document.querySelector('.drawer'), dy = old ? old.scrollTop : 0;
    var oldChrono = document.getElementById('chrono'), cx = oldChrono ? oldChrono.scrollLeft : 0;
    var bars = barWidths();
    if (!state.started) {
      app.innerHTML = startScreen();
    } else {
      var body = stage();
      var unread = unreadCount();
      app.innerHTML = '<div class="hud"><header class="top"><div class="brand"><strong>VIEWS</strong></div>' + chapters() +
        '<div class="tools"><button data-act="drawer" data-id="news">Nachrichten' + (unread ? ' <em>' + unread + '</em>' : '') + '</button><button data-act="drawer" data-id="akte">Akte</button><button data-act="drawer" data-id="notizen">Notizen</button></div></header>' +
        meters() + chronology() + '</div><main class="layout"><section class="stage">' + body + '</section>' + feedHtml() + '</main>' + legal() + drawerHtml();
      var d = document.querySelector('.drawer');
      if (d) { d.scrollTop = dy; }
      var c = document.getElementById('chrono');
      if (c) {
        c.scrollLeft = cx;
        var mark = c.querySelector('.cur');
        if (top && mark) { c.scrollLeft = mark.offsetLeft - c.clientWidth / 2; }
      }
      save();
    }
    fillBars(bars);
    window.scrollTo(0, top ? 0 : y);
  }
  function refreshMeters() {
    var el = document.querySelector('.meters');
    if (el) {
      var bars = barWidths();
      el.outerHTML = meters();
      fillBars(bars);
    }
  }

  /* ---------- Bedienung ---------- */
  function moveTo(view) { state.view = view; drawer = ''; save(); render(true); return true; }
  var ACTIONS = {
    begin: function () { state.started = true; enterBeat(0); },
    read: function (d) { state.read[d.id] = true; },
    next: function () {
      var i = state.view;
      if (i === C.BEATS.length - 1) {
        state.finishedStory = true;
        state.report.theory = state.report.theory || lead().id;
        return moveTo(REPORT);
      }
      if (i === state.reached) {
        /* Beiträge und Nachrichten waren im Feed sichtbar und gelten jetzt als gelesen. */
        state.feed.forEach(function (id) { if (NEWS[id].kind !== 'eil') { state.read[id] = true; } });
        state.reached = i + 1;
        enterBeat(i + 1);
      }
      return moveTo(i + 1);
    },
    goto: function (d) { return moveTo(Number(d.n)); },
    chapter: function (d) {
      var first = C.BEATS.filter(function (b) { return b.chapter === Number(d.n); })[0];
      return moveTo(first.index);
    },
    'goto-report': function () { return moveTo(REPORT); },
    drawer: function (d) { drawer = d.id; openNews = ''; save(); render(); var b = document.querySelector('.drawer .close'); if (b) { b.focus(); } return true; },
    'close-drawer': function () { drawer = ''; },
    news: function (d) { openNews = openNews === d.id ? '' : d.id; state.read[d.id] = true; },
    sort: function (d) { state.sorts[d.id] = d.v; },
    choice: function (d) { state.choices[d.key] = d.id; },
    open: function (d) { state.opened[d.id] = true; },
    chat: function (d) {
      var i = Number(d.i);
      if (C.CHAT_TARGET.messages.indexOf(i) >= 0) { state.chatHit = true; state.chatMiss = -1; } else { state.chatMiss = i; }
    },
    suspicion: function (d) {
      state.done[d.key] = true;
      state.history.push({ key: d.key, lead: lead().id, value: lead().value });
    },
    flag: function (d) { state.done[d.key] = true; },
    pin: function (d) {
      var l = lead().id;
      if (!l) { return; }
      state.pins[l] = state.pins[l] || [];
      toggle(state.pins[l], d.id);
    },
    rate: function (d) {
      var first = !state.rates[d.id];
      state.rates[d.id] = d.v;
      if (first && d.v === 'hoch') { state.pressure = Math.min(100, state.pressure + 3); state.viewBonus += 20000; state.views += 20000; }
    },
    press: function (d) {
      if (state.choices.press) { return; }
      state.choices.press = d.id;
      var b = BEAT.b9.blocks.filter(function (x) { return x.t === 'press'; })[0];
      var p = b.options.filter(function (x) { return x.id === d.id; })[0];
      state.pressure = Math.min(100, state.pressure + p.press);
      state.viewBonus += p.press * 10000;
      state.views += p.press * 10000;
    },
    clue: function (d) {
      state.clues[d.id] = d.v;
      var l = lead().id;
      if (!l) { return; }
      state.pins[l] = state.pins[l] || [];
      var i = state.pins[l].indexOf(d.id);
      if (d.v === 'stuetzt' && i < 0) { state.pins[l].push(d.id); }
      if (d.v !== 'stuetzt' && i >= 0) { state.pins[l].splice(i, 1); }
    },
    classify: function (d) { state.classes[d.id] = d.v; },
    q2: function (d) { toggle(state.report.q2, d.id); },
    q3: function (d) { toggle(state.report.q3, d.id); },
    review: function () { state.reviewing = true; save(); render(true); return true; },
    'back-report': function () { state.reviewing = false; state.submission = null; submitError = ''; },
    'close-case': function () { state.closed = true; state.reviewing = false; save(); render(true); return true; },
    download: function () { downloadReport(); return true; },
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
    if (!act(el.dataset, el)) { render(); }
  });
  app.addEventListener('input', function (ev) {
    var t = ev.target, d = t.dataset;
    if (d.slider) {
      state.weights[d.slider] = Number(t.value);
      var out = document.querySelector('[data-out="' + d.slider + '"]');
      if (out) { out.textContent = suspicionWord(Number(t.value)); }
      t.setAttribute('aria-valuetext', suspicionWord(Number(t.value)));
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
    if (ev.target.dataset.slider) { render(); }
  });
  document.addEventListener('keydown', function (ev) {
    if (ev.key === 'Escape' && drawer) { drawer = ''; render(); }
  });
  window.addEventListener('online', function () {
    if (state.submission && !state.submitted && state.reviewing && !sending && backendReady()) { submit(); }
  });

  /* Sobald das Video online ist, läuft der Zähler leise weiter. */
  if (!reduced()) {
    setInterval(function () {
      var r = viewRange();
      if (!state.views || state.submitted || state.closed || state.views >= r.base + r.gap) { return; }
      state.views = Math.min(r.base + r.gap, state.views + Math.ceil(r.gap / 150 * (0.6 + Math.random() * 0.8)));
      var el = document.getElementById('viewcount');
      if (el) { el.textContent = fmt(state.views); }
    }, 2000);
  }
  clampViews();
  render();
})();
