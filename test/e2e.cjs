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

const go = (page) => page.click('[data-act="next"]');
const read = (page) => page.click('[data-act="read"]');
const sort = async (page, pairs) => { for (const [id, v] of pairs) { await page.click(`[data-act="sort"][data-id="${id}"][data-v="${v}"]`); } };
const pick = (page, key, id) => page.click(`[data-act="choice"][data-key="${key}"][data-id="${id}"]`);
const eilVisible = async (page, head) => {
  const el = page.locator('.flash h1');
  assert.ok((await el.textContent()).includes(head), `Meldung fehlt: ${head}`);
  const box = await el.boundingBox();
  assert.ok(box.y >= 0 && box.y < 500, 'Meldung nicht im sichtbaren Bereich');
};

async function journey(context, code, label, collect) {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_|Failed to load/.test(m.text())) { errors.push(m.text()); } });
  await page.goto(BASE);
  await shot(page, `${label}-1-start`);
  await page.click('[data-act="begin"]');

  // Figuren und Ereignisse dürfen nicht vorzeitig sichtbar sein
  const later = ['Yasira', 'Stefan', 'Bär', 'Emil', 'BKA', 'Video', 'Heimatschutz', 'Forensik'];
  const check = async (words) => { const t = await page.textContent('body'); words.forEach((w) => assert.ok(!t.includes(w), `${w} ist zu früh sichtbar`)); };
  await check(later);
  await eilVisible(page, '16-Jährige vermisst');
  await shot(page, `${label}-2-eilmeldung`);
  assert.equal(await page.locator('[data-act="next"]').count(), 0);
  await read(page);
  await sort(page, [['s1', 'fakt'], ['s2', 'behauptung'], ['s3', 'meinung']]);
  await pick(page, 'hunch', 'weg');
  await check(later);
  await shot(page, `${label}-3-kapitel1`);
  await go(page);
  ok('Kapitel 1: Meldung, Figuren, Einordnung');

  await eilVisible(page, 'Suche nach Lena');
  await read(page);
  for (const id of ['t1', 't2', 't3', 't4']) { await page.click(`[data-act="timeline"][data-id="${id}"]`); }
  await pick(page, 'gap', 'vor');
  assert.equal(await page.locator('[data-act="next"]').count(), 0);
  await pick(page, 'gap', 'nach');
  await go(page);

  await eilVisible(page, 'Polizei befragt');
  await read(page);
  await page.click('[data-act="open"][data-id="freund"]');
  await page.click('[data-act="open"][data-id="emil"]');
  await page.click('[data-act="chat"][data-i="0"]');
  assert.ok((await page.textContent('body')).includes('passt noch zu seiner Aussage'));
  await page.click('[data-act="chat"][data-i="3"]');
  await go(page);
  ok('Kapitel 2: Zeitablauf und Widerspruch');

  await eilVisible(page, 'Video von vermisster Lena');
  assert.ok((await page.textContent('#viewcount')).includes('.'));
  await read(page);
  await sort(page, [['v1', 'fakt'], ['v2', 'behauptung'], ['v3', 'behauptung'], ['v4', 'meinung']]);
  await go(page);

  await eilVisible(page, 'BKA übernimmt');
  await page.waitForTimeout(700);
  await shot(page, `${label}-4-bka`);
  await read(page);
  assert.ok((await page.textContent('.work')).includes('Hauptkommissarin'));
  await pick(page, 'stefan', 'offen');
  await shot(page, `${label}-5-yasira`);
  await go(page);

  await eilVisible(page, 'Erste Pressekonferenz');
  await read(page);
  assert.equal(await page.locator('[data-slider="baer"]').count(), 0);
  await page.locator('[data-slider="freund"]').fill('70');
  await page.locator('[data-slider="maenner"]').fill('40');
  await page.click('[data-act="suspicion"]');
  assert.ok((await page.textContent('.meters')).includes('Lenas Freund'));
  await go(page);
  ok('Kapitel 3: Video, BKA, erster Verdacht');

  await page.reload();
  await eilVisible(page, 'Erste Demonstrationen');
  ok('Zwischenstand übersteht Neuladen');

  const before = await page.textContent('#viewcount');
  await read(page);
  for (const id of ['r1', 'r2', 'r3', 'r4']) { await page.click(`[data-act="rate"][data-id="${id}"][data-v="${id === 'r4' ? 'hoch' : 'mittel'}"]`); }
  await shot(page, `${label}-6-quellen`);
  await go(page);
  await eilVisible(page, 'Aktiver Heimatschutz');
  await read(page);
  await page.click('[data-act="open"][data-id="baer"]');
  await pick(page, 'pruefen', 'echt');
  await go(page);
  await read(page);
  await page.click('[data-act="press"][data-id="fakten"]');
  assert.notEqual(before, await page.textContent('#viewcount'));
  await go(page);
  ok('Kapitel 4: Quellen, Bär, Pressekonferenz');

  await eilVisible(page, 'Mob tötet');
  await read(page);
  await sort(page, [['m1', 'fakt'], ['m2', 'behauptung'], ['m3', 'meinung']]);
  await go(page);
  await eilVisible(page, 'BKA findet keine Spur');
  await read(page);
  for (const id of ['e9', 'e10', 'e11']) { await page.click(`[data-act="clue"][data-id="${id}"][data-v="${id === 'e9' ? 'stuetzt' : 'offen'}"]`); }
  await page.click('[data-act="open"][data-id="e12"]');
  await shot(page, `${label}-7-forensik`);
  await go(page);
  await eilVisible(page, 'Granate');
  await read(page);
  await page.locator('[data-slider="anders"]').fill('80');
  await page.click('[data-act="suspicion"]');
  await go(page);
  ok('Kapitel 5: Befunde und Neubewertung');

  await eilVisible(page, 'suspendiert');
  await read(page);
  for (const r of await page.locator('[data-act="classify"][data-v="fakt"]').all()) { await r.click(); }
  await page.click('[data-act="flag"]');
  await shot(page, `${label}-8-lagebesprechung`);

  // Meldungen bleiben im Verlauf und lassen sich erneut öffnen
  await page.click('[data-act="drawer"][data-id="news"]');
  const archive = await page.locator('.archive li').count();
  assert.ok(archive >= 15, `nur ${archive} Meldungen im Verlauf`);
  assert.ok((await page.textContent('.archive')).includes('Bereits gelesen'));
  await page.locator('.archive button', { hasText: '16-Jährige vermisst' }).click();
  assert.ok((await page.textContent('.archive')).includes('Ihr Vater meldete sie'));
  await shot(page, `${label}-9-verlauf`);
  await page.keyboard.press('Escape');
  await page.locator('.chrono button', { hasText: 'Das Video' }).click();
  await eilVisible(page, 'Video von vermisster Lena');
  await page.locator('.chrono button', { hasText: 'Die Suspendierung' }).click();
  ok('Verlauf und Zeitachse führen zu früheren Meldungen');
  await go(page);

  await page.fill('[data-report="q1"]', 'Lena ist etwas zugestoßen, das Video zeigt aber vielleicht nicht das, was alle glauben.');
  await page.click('[data-act="q2"][data-id="freund"]');
  for (const id of ['e4', 'e9', 'e10']) { await page.click(`[data-act="q3"][data-id="${id}"]`); }
  await page.fill('[data-report="q4"]', 'Wo die Aufnahme entstanden ist.');
  await page.fill('[data-report="q5"]', 'Den Freund erneut vernehmen.');
  await page.locator('[data-report="confidence"]').fill('65');
  await page.click('[data-act="review"]');
  await shot(page, `${label}-10-zusammenfassung`);

  if (collect) {
    await page.fill('[data-code="klass"]', 'KTEST01');
    await page.fill('[data-code="teil"]', 'FALSCH');
    await page.click('[data-act="submit"]');
    await page.waitForSelector('.error');
    assert.ok((await page.textContent('.error')).includes('stimmt nicht'));
    await page.fill('[data-code="teil"]', code);
    await page.route('**/rpc/submit_protocol', async (route) => { await route.fetch(); await route.abort(); }, { times: 1 });
    await page.click('[data-act="submit"]');
    await page.waitForFunction(() => /Keine Verbindung/.test(document.body.textContent));
    assert.equal(await page.locator('[data-act="back-report"]').count(), 0);
    await page.click('[data-act="submit"]');
    await page.waitForSelector('.closing');
    assert.ok((await page.textContent('.closing')).includes('erfolgreich übermittelt'));
    ok('Abgabe mit Wiederholung nach Abbruch');
  } else {
    assert.equal(await page.locator('[data-code="klass"]').count(), 0, 'Codefeld trotz ausgesetzter Abgabe');
    const sent = [];
    page.on('request', (r) => { if (r.method() === 'POST') { sent.push(r.url()); } });
    await page.click('[data-act="close-case"]');
    await page.waitForSelector('.closing');
    const end = await page.textContent('.closing');
    assert.ok(!end.includes('übermittelt') && end.includes('nach dem richtigen Täter'));
    assert.deepEqual(sent, []);
    const [dl] = await Promise.all([page.waitForEvent('download'), page.click('[data-act="download"]')]);
    assert.ok(fs.readFileSync(await dl.path(), 'utf8').includes('Den Freund erneut vernehmen'));
    ok('Abschluss ohne Übertragung, Bericht lässt sich speichern');
  }
  await shot(page, `${label}-11-abschluss`);
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
  // Standard: Abgabe ausgesetzt, wie in config.js
  const off = (ctx) => ctx.route('**/config.js', (r) => r.fulfill({ contentType: 'text/javascript', body: 'window.VIEWS_CONFIG = { collectResults: false };' }));
  const laptop = await browser.newContext({ viewport: { width: 1366, height: 768 }, acceptDownloads: true });
  await off(laptop);
  await journey(laptop, '', 'laptop', false);
  await laptop.close();
  const tablet = await browser.newContext({ ...devices['iPad (gen 7)'], acceptDownloads: true });
  await off(tablet);
  await journey(tablet, '', 'tablet', false);
  await tablet.close();
  // Abgabe aktiv: gegen die Testumgebung
  for (const code of ['AAAA1111', 'BBBB2222']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    await journey(ctx, code, 'abgabe', true);
    await ctx.close();
  }
  await teacher(browser);
  await browser.close();
  console.log('Alle Prüfungen bestanden');
})().catch((e) => { console.error(e); process.exit(1); });
