// Kompletter Durchlauf aus Schüler- und Lehrkraftsicht gegen die Testumgebung.
// Start: node test/mock-backend.mjs &   dann: node test/e2e.cjs [Ordner für Screenshots]
const { chromium, devices } = require('playwright');
const assert = require('node:assert');
const fs = require('node:fs');

const BASE = 'http://localhost:8787';
const SHOTS = process.argv[2];
const shot = async (page, name) => { if (SHOTS) { await page.screenshot({ path: `${SHOTS}/${name}.png`, fullPage: false }); } };
const ok = (m) => console.log('ok:', m);
const act = (page, a, id) => page.click(`[data-act="${a}"]${id ? `[data-id="${id}"]` : ''}`);
const noOverflow = async (page, label) => {
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  assert.ok(over <= 1, `horizontaler Überlauf ${over}px: ${label}`);
};

async function journey(context, code, label) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) { errors.push(m.text()); } });
  await page.goto(BASE);
  await shot(page, `${label}-1-start`);
  await page.click('[data-act="begin"]');

  // Später freigeschaltete Inhalte dürfen nicht sichtbar sein
  const early = await page.textContent('body');
  assert.ok(!early.includes('Bär') && !early.includes('Emil') && !early.includes('Forensik'), 'Spätere Inhalte sind sichtbar');
  assert.equal(await page.locator('[data-act="next"]').count(), 0);
  ok('Schritt 1 gesperrt, keine späteren Inhalte');

  await act(page, 'start-choice', 'video');
  await shot(page, `${label}-2-auftrag`);
  await page.click('[data-act="next"]');

  for (const id of ['t1', 't2', 't3', 't4', 't5']) { await act(page, 'timeline', id); }
  assert.equal(await page.locator('[data-act="next"]').count(), 0);
  for (const [id, v] of [['s1', 'fakt'], ['s2', 'behauptung'], ['s3', 'meinung'], ['s4', 'meinung']]) {
    await page.click(`[data-act="sort"][data-id="${id}"][data-v="${v}"]`);
  }
  await shot(page, `${label}-3-ausgangslage`);
  await page.click('[data-act="next"]');
  ok('Schritt 2 abgeschlossen');

  await act(page, 'open', 'freund');
  await page.click('[data-act="chat"][data-i="0"]');
  assert.ok((await page.textContent('body')).includes('passt noch zu seiner Aussage'));
  await page.click('[data-act="chat"][data-i="3"]');
  await act(page, 'open', 'stefan');
  await act(page, 'open', 'emil');
  await page.locator('[data-slider="freund"]').fill('70');
  await page.locator('[data-slider="maenner"]').fill('40');
  await page.click('[data-act="first-suspicion"]');
  assert.ok((await page.textContent('.meters')).includes('Lenas Freund'));
  await page.locator('.paper:has-text("Stefans Beitrag") [data-act="pin"]').click();
  await page.locator('.paper:has-text("Beweisstück 4") [data-act="pin"]').click();
  await shot(page, `${label}-4-personen`);
  await page.click('[data-act="next"]');
  ok('Schritt 3 abgeschlossen, Verdacht und Anzeigen reagieren');

  await page.reload();
  assert.ok((await page.textContent('h1')).includes('Öffentlichkeit'));
  ok('Zwischenstand übersteht Neuladen');

  const before = await page.textContent('#viewcount');
  for (const id of ['r1', 'r2', 'r3', 'r4']) {
    await page.click(`[data-act="rate"][data-id="${id}"][data-v="${id === 'r4' ? 'hoch' : 'mittel'}"]`);
  }
  await act(page, 'open', 'baer');
  await act(page, 'press', 'fakten');
  assert.notEqual(before, await page.textContent('#viewcount'));
  await shot(page, `${label}-5-oeffentlichkeit`);
  await page.click('[data-act="next"]');
  ok('Schritt 4 abgeschlossen, Druck steigt');

  for (const id of ['e9', 'e10', 'e11']) { await page.click(`[data-act="clue"][data-id="${id}"][data-v="offen"]`); }
  await act(page, 'open', 'e12');
  await page.locator('[data-slider="anders"]').fill('80');
  await page.click('[data-act="review5"]');
  await shot(page, `${label}-6-widersprueche`);
  await page.click('[data-act="next"]');
  ok('Schritt 5 abgeschlossen');

  const rows = await page.locator('[data-act="classify"][data-v="fakt"]').all();
  for (const r of rows) { await r.click(); }
  await page.click('[data-act="review6"]');
  await shot(page, `${label}-7-lagebesprechung`);
  await page.click('[data-act="next"]');
  ok('Schritt 6 abgeschlossen, Bericht offen');

  await page.fill('[data-report="q1"]', 'Lena ist etwas zugestoßen, das Video zeigt aber vielleicht nicht das, was alle glauben.');
  await act(page, 'q2', 'freund');
  for (const id of ['e4', 'e9', 'e10']) { await act(page, 'q3', id); }
  await page.fill('[data-report="q4"]', 'Wo die Aufnahme entstanden ist.');
  await page.fill('[data-report="q5"]', 'Den Freund erneut vernehmen.');
  await page.locator('[data-report="confidence"]').fill('65');
  await shot(page, `${label}-8-bericht`);
  await page.click('[data-act="review"]');
  await shot(page, `${label}-9-zusammenfassung`);

  await page.fill('[data-code="klass"]', 'KTEST01');
  await page.fill('[data-code="teil"]', 'FALSCH');
  await page.click('[data-act="submit"]');
  await page.waitForSelector('.error');
  assert.ok((await page.textContent('.error')).includes('stimmt nicht'));
  ok('Falscher Code wird klar gemeldet');

  // Abbruch nach dem Speichern: Wiederholung darf keinen zweiten Eintrag erzeugen
  await page.fill('[data-code="teil"]', code);
  await page.route('**/rpc/submit_protocol', async (route) => { await route.fetch(); await route.abort(); }, { times: 1 });
  await page.click('[data-act="submit"]');
  await page.waitForFunction(() => /Keine Verbindung/.test(document.body.textContent));
  assert.equal(await page.locator('[data-act="back-report"]').count(), 0);
  await page.click('[data-act="submit"]');
  await page.waitForSelector('.closing');
  const count = await page.evaluate(() => fetch('/__test/count').then((r) => r.json()));
  assert.equal(count.submissions, label === 'laptop' ? 1 : 2);
  ok('Wiederholung nach Abbruch ohne Doppeleintrag');

  const end = await page.textContent('.closing');
  assert.ok(end.includes('Dein Ermittlungsprotokoll wurde erfolgreich übermittelt') && end.includes('nach dem richtigen Täter'));
  await shot(page, `${label}-10-abschluss`);
  await noOverflow(page, label);
  assert.deepEqual(errors, []);
  ok(`Schülerreise ${label} ohne Fehler`);
  await page.close();
}

async function teacher(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 800 }, acceptDownloads: true });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/lehrkraft.html`);
  await page.fill('#mail', 'lehrkraft@test.invalid');
  await page.fill('#pass', 'falsch');
  await page.click('[data-act="login"]');
  await page.waitForSelector('.error');
  assert.equal(await page.locator('.t-wrap').count(), 0);
  ok('Falsches Passwort kommt nicht hinein');
  const anon = await page.evaluate(() => fetch('/rest/v1/submissions', { headers: { apikey: 'test-key' } }).then((r) => r.status));
  assert.equal(anon, 401);

  await page.fill('#pass', 'test-passwort');
  await page.click('[data-act="login"]');
  await page.waitForSelector('.t-wrap');
  assert.ok((await page.textContent('.t-num')).includes('2 von 3'));
  await shot(page, 'lehrkraft-1-uebersicht');
  await page.click('[data-act="open"]');
  assert.ok((await page.textContent('.t-detail')).includes('Den Freund erneut vernehmen'));
  ok('Lehrkraft sieht Zahlen und Einzelprotokolle');
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="csv"]')]);
  const csv = fs.readFileSync(await dl.path(), 'utf8');
  assert.ok(csv.includes('Teilnehmercode') && csv.includes('AAAA1111'));
  ok('CSV-Export');
  await page.click('[data-act="del-one"]');
  await page.click('[data-act="del-one"]');
  await page.waitForFunction(() => /1 von 3/.test(document.body.textContent));
  ok('Löschen funktioniert');
  await page.fill('#cname', 'Neue Klasse');
  await page.fill('#ccount', '5');
  await page.check('#ctest');
  await page.click('[data-act="create"]');
  await page.waitForFunction(() => /0 von 5/.test(document.body.textContent));
  ok('Klasse mit Codes angelegt');
  await ctx.close();
}

(async () => {
  const browser = await chromium.launch();
  await fetch(`${BASE}/__test/seed`);
  const laptop = await browser.newContext({ viewport: { width: 1366, height: 768 } });
  await journey(laptop, 'AAAA1111', 'laptop');
  await laptop.close();
  const tablet = await browser.newContext({ ...devices['iPad (gen 7)'] });
  await journey(tablet, 'BBBB2222', 'tablet');
  await tablet.close();
  await teacher(browser);
  await browser.close();
  console.log('Alle Prüfungen bestanden');
})().catch((e) => { console.error(e); process.exit(1); });
