/* ==========================================================
   VIEWS – Lehrkraftbereich
   Die Anmeldung läuft über Supabase Auth. Das Token bleibt nur im
   Arbeitsspeicher, nach dem Neuladen ist eine neue Anmeldung nötig.
   Die eigentliche Sperre liegt serverseitig in den Datenbankregeln.
   ========================================================== */
(function () {
  'use strict';

  var C = window.VIEWS_CONTENT;
  var CFG = window.VIEWS_CONFIG || {};
  var root = document.getElementById('teacher');
  var BASE = (CFG.supabaseUrl || '').replace(/\/$/, '');
  var token = '';
  var classes = [], participants = [], submissions = [];
  var classId = '', openId = '', message = '', armed = '', newCodes = null, lastMail = '';

  function esc(s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function api(path, opts) {
    opts = opts || {};
    var headers = { apikey: CFG.supabaseKey, 'Content-Type': 'application/json' };
    if (token) { headers.Authorization = 'Bearer ' + token; }
    return fetch(BASE + path, { method: opts.method || 'GET', headers: headers, body: opts.body ? JSON.stringify(opts.body) : undefined })
      .then(function (r) {
        return r.text().then(function (t) {
          var data = null;
          try { data = t ? JSON.parse(t) : null; } catch (e) { data = null; }
          if (!r.ok) {
            var err = new Error((data && (data.message || data.msg || data.error_description)) || 'Fehler ' + r.status);
            err.status = r.status;
            throw err;
          }
          return data;
        });
      });
  }
  function fail(e) {
    if (e.status === 401) { token = ''; message = 'Die Anmeldung ist abgelaufen.'; }
    else if (e.status === 403) { message = 'Dieses Konto ist nicht als Lehrkraft freigeschaltet.'; }
    else { message = 'Das hat nicht geklappt: ' + e.message; }
    render();
  }

  function refresh() {
    return Promise.all([
      api('/rest/v1/classes?select=*&order=created_at.desc'),
      api('/rest/v1/participants?select=id,class_id,code'),
      api('/rest/v1/submissions?select=id,class_id,participant_id,payload,created_at&order=created_at.asc')
    ]).then(function (res) {
      classes = res[0] || []; participants = res[1] || []; submissions = res[2] || [];
      if (!classes.some(function (c) { return c.id === classId; })) { classId = classes[0] ? classes[0].id : ''; }
      render();
    }).catch(fail);
  }

  function current() { return submissions.filter(function (s) { return s.class_id === classId; }); }
  function codeOf(pid) {
    var p = participants.filter(function (x) { return x.id === pid; })[0];
    return p ? p.code : '';
  }
  function theoryLabel(id) {
    if (id === 'eigene') { return 'Eine andere Erklärung'; }
    var t = C.THEORIES.filter(function (x) { return x.id === id; })[0];
    return t ? t.name : id;
  }
  function personLabel(id) { return C.PERSONS[id] ? C.PERSONS[id].name : id; }
  function evidenceLabel(id) { return C.EVIDENCE[id] ? C.EVIDENCE[id].title : id; }
  function tally(list) {
    var m = {};
    list.forEach(function (k) { if (k) { m[k] = (m[k] || 0) + 1; } });
    return Object.keys(m).map(function (k) { return [k, m[k]]; }).sort(function (a, b) { return b[1] - a[1]; });
  }
  function bars(rows, label) {
    if (!rows.length) { return '<p class="hint">Noch keine Daten.</p>'; }
    var max = rows[0][1];
    return rows.map(function (r) {
      return '<div class="t-row"><span>' + esc(label(r[0])) + '</span><span class="t-track"><span class="t-fill" data-w="' + Math.round(r[1] / max * 100) + '"></span></span><b>' + r[1] + '</b></div>';
    }).join('');
  }
  function flat(fn) { return current().reduce(function (acc, s) { return acc.concat(fn(s.payload) || []); }, []); }
  function bucket(v) {
    var low = Math.floor(Number(v) / 25) * 25;
    if (low >= 100) { low = 75; }
    return low + ' bis ' + (low + 25) + ' %';
  }

  function loginView() {
    if (!CFG.collectResults || !BASE || !CFG.supabaseKey) {
      return '<div class="t-login"><h1>Lehrkraftbereich</h1><p>Die Ergebnissammlung ist zurzeit ausgesetzt. Zum Aktivieren die Schritte in der README befolgen.</p></div>';
    }
    return '<div class="t-login"><h1>Lehrkraftbereich</h1><label class="field"><span>E-Mail</span><input type="email" id="mail" autocomplete="username" value="' + esc(lastMail) + '"></label>' +
      '<label class="field"><span>Passwort</span><input type="password" id="pass" autocomplete="current-password"></label>' +
      '<button class="primary" data-act="login">Anmelden</button>' + (message ? '<p class="error" role="alert">' + esc(message) + '</p>' : '') + '</div>';
  }
  function detail() {
    var s = submissions.filter(function (x) { return x.id === openId; })[0];
    if (!s) { return ''; }
    var p = s.payload;
    function row(k, v) { return '<dt>' + esc(k) + '</dt><dd>' + esc(v) + '</dd>'; }
    return '<section class="t-detail"><h2>Protokoll ' + esc(codeOf(s.participant_id)) + '</h2><dl>' +
      row('Erklärung', theoryLabel(p.theory)) + row('Erster Verdacht', theoryLabel(p.firstSuspicion)) + row('Was passiert ist', p.q1) +
      row('Relevant', (p.q2 || []).map(personLabel).concat(p.q2extra ? [p.q2extra] : []).join(', ')) +
      row('Beweisstücke', (p.q3 || []).map(evidenceLabel).join(', ')) + row('Unsicher', p.q4) + row('Nächster Schritt', p.q5) + row('Sicherheit', p.confidence + ' %') +
      '</dl><div class="row"><button class="ghost" data-act="close">Schließen</button><button class="ghost danger" data-act="del-one" data-id="' + esc(s.id) + '">' + (armed === s.id ? 'Wirklich löschen?' : 'Abgabe löschen') + '</button></div></section>';
  }
  function classView() {
    var klass = classes.filter(function (c) { return c.id === classId; })[0];
    if (!klass) { return '<p class="lead-in">Lege zuerst eine Klasse an. Du bekommst einen Klassencode und anonyme Teilnehmercodes zum Austeilen.</p>'; }
    var list = current(), parts = participants.filter(function (p) { return p.class_id === classId; });
    var usedIds = list.map(function (s) { return s.participant_id; });
    var codes = parts.map(function (p) { return '<li>' + esc(p.code) + (usedIds.indexOf(p.id) >= 0 ? ' ✓' : '') + '</li>'; }).join('');
    return '<p>Klassencode: <b>' + esc(klass.code) + '</b> ' + (klass.is_test ? '<span class="t-test">Testklasse</span>' : '') + '</p>' +
      '<p class="t-num">' + list.length + ' von ' + parts.length + '</p><p class="hint">Ermittlungen abgeschlossen</p>' +
      '<details><summary>Teilnehmercodes (✓ = eingereicht)</summary><ul class="t-codes">' + codes + '</ul></details>' +
      '<div class="t-grid"><section><h2>Häufigste Theorien</h2>' + bars(tally(list.map(function (s) { return s.payload.theory; })), theoryLabel) + '</section>' +
      '<section><h2>Häufig als relevant genannt</h2>' + bars(tally(flat(function (p) { return p.q2; })), personLabel) + '</section>' +
      '<section><h2>Wichtigste Beweisstücke</h2>' + bars(tally(flat(function (p) { return p.q3; })), evidenceLabel) + '</section>' +
      '<section><h2>Sicherheit der Schüler</h2>' + bars(tally(list.map(function (s) { return bucket(s.payload.confidence); })).sort(function (a, b) { return parseInt(a[0], 10) - parseInt(b[0], 10); }), String) + '</section>' +
      '<section><h2>Erster Verdacht</h2>' + bars(tally(list.map(function (s) { return s.payload.firstSuspicion; })), theoryLabel) + '</section>' +
      '<section><h2>Offene Fragen</h2><ul class="t-list">' + list.map(function (s) { return '<li>' + esc(s.payload.q4) + '</li>'; }).join('') + '</ul></section></div>' +
      detail() +
      '<h2>Einzelne Protokolle</h2><table class="t-table"><thead><tr><th>Code</th><th>Eingang</th><th>Theorie</th><th>Sicherheit</th></tr></thead><tbody>' +
      list.map(function (s) {
        return '<tr><td><button class="t-open" data-act="open" data-id="' + esc(s.id) + '">' + esc(codeOf(s.participant_id)) + '</button></td><td>' + esc(new Date(s.created_at).toLocaleString('de-DE')) + '</td><td>' + esc(theoryLabel(s.payload.theory)) + '</td><td>' + esc(s.payload.confidence) + ' %</td></tr>';
      }).join('') + '</tbody></table>' +
      '<div class="row t-noprint"><button class="ghost" data-act="csv">Als CSV exportieren</button><button class="ghost danger" data-act="del-class">' + (armed === 'class' ? 'Klasse und alle Abgaben wirklich löschen?' : 'Klasse löschen') + '</button></div>';
  }
  function mainView() {
    return '<div class="t-wrap"><header class="t-head"><h1>Lehrkraftbereich</h1><div class="row t-noprint"><button class="ghost" data-act="refresh">Aktualisieren</button><button class="ghost" data-act="logout">Abmelden</button></div></header>' +
      (message ? '<p class="t-msg">' + esc(message) + '</p>' : '') +
      '<div class="t-bar t-noprint"><label>Klasse<select id="klass">' + classes.map(function (c) {
        return '<option value="' + esc(c.id) + '"' + (c.id === classId ? ' selected' : '') + '>' + esc(c.name) + '</option>';
      }).join('') + '</select></label>' +
      '<label>Neue Klasse<input type="text" id="cname" maxlength="80"></label><label>Anzahl Codes<input type="number" id="ccount" min="1" max="60" value="25"></label>' +
      '<label class="t-check"><input type="checkbox" id="ctest"> Testklasse</label><button class="ghost" data-act="create">Anlegen</button></div>' +
      (newCodes ? '<p class="t-msg">Klasse angelegt. Klassencode ' + esc(newCodes) + '.</p>' : '') + classView() + '</div>';
  }
  function render() {
    root.innerHTML = token ? mainView() : loginView();
    Array.prototype.forEach.call(root.querySelectorAll('[data-w]'), function (el) { el.style.width = el.getAttribute('data-w') + '%'; });
  }

  /* Zellen, die mit = + - @ beginnen, würde Excel als Formel lesen */
  function csvCell(v) {
    var s = String(v === undefined || v === null ? '' : v);
    if (/^[=+\-@\t\r]/.test(s)) { s = "'" + s; }
    return '"' + s.replace(/"/g, '""') + '"';
  }
  function exportCsv() {
    var rows = [['Teilnehmercode', 'Eingang', 'Theorie', 'Erster Verdacht', 'Was passiert ist', 'Relevant', 'Beweisstücke', 'Unsicher', 'Nächster Schritt', 'Sicherheit']];
    current().forEach(function (s) {
      var p = s.payload;
      rows.push([codeOf(s.participant_id), s.created_at, theoryLabel(p.theory), theoryLabel(p.firstSuspicion), p.q1,
        (p.q2 || []).map(personLabel).concat(p.q2extra ? [p.q2extra] : []).join('; '), (p.q3 || []).map(evidenceLabel).join('; '), p.q4, p.q5, p.confidence]);
    });
    var csv = '﻿' + rows.map(function (r) { return r.map(csvCell).join(';'); }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    a.download = 'views-ergebnisse.csv';
    document.body.appendChild(a); a.click(); a.remove();
  }

  var ACTIONS = {
    login: function () {
      var mail = lastMail = document.getElementById('mail').value, pass = document.getElementById('pass').value;
      message = '';
      api('/auth/v1/token?grant_type=password', { method: 'POST', body: { email: mail, password: pass } }).then(function (r) {
        token = r.access_token; message = ''; return refresh();
      }).catch(function () { message = 'E-Mail oder Passwort stimmt nicht.'; render(); });
    },
    logout: function () {
      api('/auth/v1/logout', { method: 'POST' }).catch(function () {});
      token = ''; classes = participants = submissions = []; openId = ''; message = ''; render();
    },
    refresh: function () { message = ''; armed = ''; refresh(); },
    open: function (d) { openId = d.id; armed = ''; render(); },
    close: function () { openId = ''; armed = ''; render(); },
    csv: exportCsv,
    create: function () {
      var name = document.getElementById('cname').value.trim();
      var n = Number(document.getElementById('ccount').value);
      if (!name) { message = 'Gib der Klasse einen Namen.'; render(); return; }
      api('/rest/v1/rpc/create_class', { method: 'POST', body: { p_name: name, p_count: n, p_is_test: document.getElementById('ctest').checked } }).then(function (r) {
        classId = r.id; newCodes = r.code; message = ''; return refresh();
      }).catch(fail);
    },
    'del-one': function (d) {
      if (armed !== d.id) { armed = d.id; render(); return; }
      api('/rest/v1/submissions?id=eq.' + encodeURIComponent(d.id), { method: 'DELETE' }).then(function () {
        armed = ''; openId = ''; message = 'Abgabe gelöscht.'; return refresh();
      }).catch(fail);
    },
    'del-class': function () {
      if (armed !== 'class') { armed = 'class'; render(); return; }
      api('/rest/v1/classes?id=eq.' + encodeURIComponent(classId), { method: 'DELETE' }).then(function () {
        armed = ''; classId = ''; message = 'Klasse gelöscht.'; return refresh();
      }).catch(fail);
    }
  };
  root.addEventListener('click', function (ev) {
    var el = ev.target.closest('[data-act]');
    if (el && ACTIONS[el.getAttribute('data-act')]) { ACTIONS[el.getAttribute('data-act')](el.dataset); }
  });
  root.addEventListener('change', function (ev) {
    if (ev.target.id === 'klass') { classId = ev.target.value; openId = ''; armed = ''; newCodes = null; render(); }
  });
  root.addEventListener('keydown', function (ev) {
    if (ev.key === 'Enter' && ev.target.id === 'pass') { ACTIONS.login(); }
  });
  render();
})();
