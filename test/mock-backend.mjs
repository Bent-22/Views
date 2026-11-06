// Testumgebung ohne echte Schülerdaten: node test/mock-backend.mjs
// Liefert die Webseite aus und bildet dieselbe Schnittstelle wie Supabase nach.
// Alles liegt im Arbeitsspeicher und ist nach dem Beenden weg.
// Anmeldung im Lehrkraftbereich: lehrkraft@test.invalid / test-passwort
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const PORT = Number(process.env.PORT || 8787);
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff': 'font/woff' };
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const db = { classes: [], participants: [], submissions: [] };
const TEACHER_TOKEN = randomUUID();
const code = (n) => Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
}
const isTeacher = (req) => req.headers.authorization === `Bearer ${TEACHER_TOKEN}`;

function submit(b) {
  const klass = db.classes.find((c) => c.code === String(b.p_class_code).trim().toUpperCase());
  const part = klass && db.participants.find((p) => p.class_id === klass.id && p.code === String(b.p_participant_code).trim().toUpperCase());
  if (!part) { return [400, { message: 'invalid_code' }]; }
  const old = db.submissions.find((s) => s.participant_id === part.id);
  if (old) {
    return old.submission_id === b.p_submission_id ? [200, { status: 'already_received' }] : [400, { message: 'already_submitted' }];
  }
  db.submissions.push({ id: randomUUID(), submission_id: b.p_submission_id, class_id: klass.id, participant_id: part.id, payload: b.p_payload, created_at: new Date().toISOString() });
  return [200, { status: 'accepted' }];
}

async function api(req, res, url, raw) {
  const b = raw ? JSON.parse(raw) : {};
  const p = url.pathname;
  if (p === '/__test/seed') {
    db.classes.length = db.participants.length = db.submissions.length = 0;
    const id = randomUUID();
    db.classes.push({ id, name: 'Testklasse', code: 'KTEST01', is_test: true, created_at: new Date().toISOString() });
    ['AAAA1111', 'BBBB2222', 'CCCC3333'].forEach((c) => db.participants.push({ id: randomUUID(), class_id: id, code: c }));
    return send(res, 200, { ok: true });
  }
  if (p === '/__test/count') { return send(res, 200, { submissions: db.submissions.length }); }
  if (p === '/auth/v1/token') {
    if (b.email === 'lehrkraft@test.invalid' && b.password === 'test-passwort') { return send(res, 200, { access_token: TEACHER_TOKEN }); }
    return send(res, 400, { error_description: 'invalid_grant' });
  }
  if (p === '/auth/v1/logout') { return send(res, 204); }
  if (p === '/rest/v1/rpc/submit_protocol') {
    const [s, body] = submit(b);
    return send(res, s, body);
  }
  if (!isTeacher(req)) { return send(res, 401, { message: 'not authenticated' }); }
  if (p === '/rest/v1/rpc/create_class') {
    const id = randomUUID(), c = 'K' + code(6), list = [];
    db.classes.push({ id, name: b.p_name, code: c, is_test: !!b.p_is_test, created_at: new Date().toISOString() });
    for (let i = 0; i < b.p_count; i += 1) { const k = code(8); list.push(k); db.participants.push({ id: randomUUID(), class_id: id, code: k }); }
    return send(res, 200, { id, code: c, participants: list });
  }
  const table = p.replace('/rest/v1/', '');
  if (!db[table]) { return send(res, 404, { message: 'unknown' }); }
  if (req.method === 'GET') { return send(res, 200, db[table]); }
  if (req.method === 'DELETE') {
    const id = (url.searchParams.get('id') || '').replace('eq.', '');
    db[table] = db[table].filter((r) => r.id !== id);
    if (table === 'classes') {
      db.participants = db.participants.filter((r) => r.class_id !== id);
      db.submissions = db.submissions.filter((r) => r.class_id !== id);
    }
    return send(res, 204);
  }
  return send(res, 405, {});
}

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/config.js') {
    res.writeHead(200, { 'Content-Type': 'text/javascript' });
    return res.end(`window.VIEWS_CONFIG = { supabaseUrl: 'http://localhost:${PORT}', supabaseKey: 'test-key' };`);
  }
  if (/^\/(auth|rest|__test)\//.test(url.pathname)) {
    let raw = '';
    for await (const chunk of req) { raw += chunk; }
    return api(req, res, url, raw);
  }
  const file = normalize(url.pathname === '/' ? '/index.html' : url.pathname);
  if (file.includes('..') || !TYPES[extname(file)]) { res.writeHead(404); return res.end(); }
  try {
    const data = await readFile(join(ROOT, file));
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] });
    res.end(data);
  } catch { res.writeHead(404); res.end(); }
}).listen(PORT, () => console.log(`Testumgebung: http://localhost:${PORT}`));
