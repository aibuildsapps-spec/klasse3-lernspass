/* Aufgaben-Generatoren: Mathe (Klasse 3), Deutsch, Englisch.
   Jede Aufgabe ist reines Daten-Objekt (JSON-tauglich), damit sie gespeichert und wiederholt werden kann. */
(function (global) {
  'use strict';

  /* ---------- Zufall (mit Seed -> gleiche Aufgaben am gleichen Tag) ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function Rng(seed) {
    var f = mulberry32(seed >>> 0);
    this.f = f;
    this.int = function (a, b) { return a + Math.floor(f() * (b - a + 1)); };
    this.pick = function (arr) { return arr[Math.floor(f() * arr.length)]; };
    this.shuffle = function (arr) {
      var a = arr.slice();
      for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(f() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
      return a;
    };
  }

  /* ---------- Zahlen in Worten (Zahlendiktat) ---------- */
  var ONES = ['null', 'ein', 'zwei', 'drei', 'vier', 'fünf', 'sechs', 'sieben', 'acht', 'neun', 'zehn', 'elf', 'zwölf', 'dreizehn', 'vierzehn', 'fünfzehn', 'sechzehn', 'siebzehn', 'achtzehn', 'neunzehn'];
  var TENS = ['', '', 'zwanzig', 'dreißig', 'vierzig', 'fünfzig', 'sechzig', 'siebzig', 'achtzig', 'neunzig'];
  function numberWords(n) {
    if (n === 1000) return 'eintausend';
    var h = Math.floor(n / 100), r = n % 100, s = '';
    if (h) s += ONES[h] + 'hundert';
    if (r) {
      if (r < 20) s += (r === 1 ? 'eins' : ONES[r]);
      else {
        var o = r % 10, t = Math.floor(r / 10);
        s += (o ? (o === 1 ? 'ein' : ONES[o]) + 'und' : '') + TENS[t];
      }
    }
    return s;
  }

  var S = String;

  /* =====================================================================
     MATHE – Themen der Mathe-Arbeit
     ===================================================================== */
  var OPS = ['+', '-', '·', ':'];

  function kopf(r, op) {
    op = op || r.pick(OPS);
    var a, b, ans, q;
    if (op === '+') {
      if (r.f() < 0.5) { a = r.int(12, 69); b = r.int(11, 99 - a); }
      else { a = r.int(101, 799); b = r.int(11, Math.min(299, 999 - a)); }
      ans = a + b;
    } else if (op === '-') {
      if (r.f() < 0.5) { a = r.int(31, 99); b = r.int(11, a - 10); }
      else { a = r.int(201, 999); b = r.int(11, Math.min(a - 10, 500)); }
      ans = a - b;
    } else if (op === '·') {
      if (r.f() < 0.75) { a = r.int(2, 10); b = r.int(2, 10); }
      else { a = r.int(2, 9) * 10; b = r.int(2, 9); }
      ans = a * b;
    } else {
      b = r.int(2, 10); q = r.int(2, 10); a = b * q; ans = q;
    }
    var sym = op === '-' ? '−' : op;
    return {
      q: 'Rechne im Kopf.', kind: 'fields', parts: [a + ' ' + sym + ' ' + b + ' =', { f: 0 }],
      answers: [S(ans)], solution: a + ' ' + sym + ' ' + b + ' = ' + ans
    };
  }

  function rest(r) {
    var d = r.int(2, 9), m = r.int(1, d - 1), q = r.int(2, Math.floor((100 - m) / d)), a = d * q + m;
    return {
      q: 'Rechne mit Rest.', kind: 'fields', parts: [a + ' : ' + d + ' =', { f: 0 }, 'Rest', { f: 1 }],
      answers: [S(q), S(m)], solution: a + ' : ' + d + ' = ' + q + ' Rest ' + m
    };
  }

  function diktat(r) {
    var n;
    do { n = r.int(101, 999); } while (n % 100 === 0);
    var w = numberWords(n);
    return {
      q: 'Zahlendiktat: Schreibe die Zahl mit Ziffern.', kind: 'fields',
      visual: '<div class="bigword">' + w + '</div>', speak: { text: w, lang: 'de-DE' },
      parts: [{ f: 0 }], answers: [S(n)], solution: w + ' = ' + n
    };
  }

  function stellen(r) {
    var h = r.int(1, 9), z = r.int(0, 9), e = r.int(0, 9), n = h * 100 + z * 10 + e;
    if (r.f() < 0.5) {
      return {
        q: 'Trage die Zahl <b>' + n + '</b> in die Stellenwerttafel ein.', kind: 'fields',
        parts: [{ table: { head: ['H', 'Z', 'E'], row: [{ f: 0 }, { f: 1 }, { f: 2 }] } }],
        answers: [S(h), S(z), S(e)], solution: n + ' = ' + h + ' H, ' + z + ' Z, ' + e + ' E'
      };
    }
    return {
      q: 'Welche Zahl steht in der Stellenwerttafel?', kind: 'fields',
      parts: [{ table: { head: ['H', 'Z', 'E'], row: [S(h), S(z), S(e)] } }, 'Zahl:', { f: 0 }],
      answers: [S(n)], solution: h + ' H, ' + z + ' Z, ' + e + ' E = ' + n
    };
  }

  function gcode(h, z, e) {
    function rep(cls, k) { var s = ''; for (var i = 0; i < k; i++) s += '<span class="' + cls + '"></span>'; return s; }
    return '<div class="gcode"><span class="ggrp">' + rep('gh', h) + '</span><span class="ggrp">' + rep('gz', z) + '</span><span class="ggrp">' + rep('ge', e) + '</span></div>';
  }
  var GLEG = '<div class="legend"><span class="gh"></span> = Hunderter (100) &nbsp; <span class="gz"></span> = Zehner (10) &nbsp; <span class="ge"></span> = Einer (1)</div>';

  function geheim(r) {
    var h = r.int(1, 9), z = r.int(0, 9), e = r.int(0, 9), n = h * 100 + z * 10 + e;
    if (r.f() < 0.5) {
      return {
        q: 'Geheimschrift: Welche Zahl ist das?', kind: 'fields',
        visual: GLEG + gcode(h, z, e), parts: ['Zahl:', { f: 0 }], answers: [S(n)],
        solution: h + ' Hunderter, ' + z + ' Zehner, ' + e + ' Einer = ' + n
      };
    }
    return {
      q: 'Schreibe <b>' + n + '</b> in Geheimschrift. Wie viele Zeichen brauchst du?', kind: 'fields',
      visual: GLEG,
      parts: [{ html: '<span class="gh"></span>' }, { f: 0 }, { html: '<span class="gz"></span>' }, { f: 1 }, { html: '<span class="ge"></span>' }, { f: 2 }],
      answers: [S(h), S(z), S(e)], solution: n + ' = ' + h + ' Hunderter, ' + z + ' Zehner, ' + e + ' Einer'
    };
  }

  function hfeld(r) {
    var r0 = r.int(0, 96), c0 = r.int(0, 6), rows = 3, cols = 4, cells = [], i, j;
    for (i = 0; i < rows * cols; i++) cells.push(i);
    var blanks = r.shuffle(cells).slice(0, 4).sort(function (a, b) { return a - b; });
    var grid = [], answers = [], k = 0, sol = [];
    for (i = 0; i < rows; i++) {
      var row = [];
      for (j = 0; j < cols; j++) {
        var v = (r0 + i) * 10 + (c0 + j) + 1, idx = i * cols + j;
        if (blanks.indexOf(idx) >= 0) { row.push({ f: k++ }); answers.push(S(v)); sol.push(v); }
        else row.push({ v: v });
      }
      grid.push(row);
    }
    return {
      q: 'Das ist ein Ausschnitt aus dem Hunderterfeld. Finde die fehlenden Zahlen.', kind: 'fields',
      parts: [{ grid: grid }], answers: answers, solution: 'Fehlende Zahlen: ' + sol.join(', ')
    };
  }

  function ordnen(r) {
    var asc = r.f() < 0.5, set = {}, nums = [], base = r.int(1, 9) * 100;
    while (nums.length < 5) {
      var v = r.f() < 0.6 ? base + r.int(0, 99) : r.int(101, 999);
      if (!set[v]) { set[v] = 1; nums.push(v); }
    }
    var sorted = nums.slice().sort(function (a, b) { return asc ? a - b : b - a; });
    return {
      q: 'Ordne die Zahlen der Größe nach. Tippe zuerst die ' + (asc ? '<b>kleinste</b>' : '<b>größte</b>') + ' Zahl an.',
      kind: 'order', options: r.shuffle(nums).map(S), answers: sorted.map(S),
      solution: sorted.join(asc ? ' < ' : ' > ')
    };
  }

  var STEPNAME = { 1: 'Einerschritten', 2: 'Zweierschritten', 5: 'Fünferschritten', 10: 'Zehnerschritten', 100: 'Hunderterschritten' };
  function zaehlen(r) {
    var step = r.pick([1, 10, 10, 100, 100, 2, 5]), fwd = r.f() < 0.5, n = 4, span = step * n;
    var start = fwd ? r.int(0, 1000 - span) : r.int(span, 1000);
    if (step === 100) start = r.int(0, 9) * 10 + r.int(0, 9) * 100 + (fwd ? 0 : 0);
    if (fwd && start + span > 1000) start = 1000 - span;
    if (!fwd && start - span < 0) start = span;
    var seq = [start], parts = [start + ','], answers = [];
    for (var i = 1; i <= n; i++) {
      var v = fwd ? start + i * step : start - i * step;
      seq.push(v); answers.push(S(v));
      parts.push({ f: i - 1 }); if (i < n) parts.push(',');
    }
    return {
      q: 'Zähle in ' + STEPNAME[step] + ' <b>' + (fwd ? 'vorwärts' : 'rückwärts') + '</b>.', kind: 'fields',
      parts: parts, answers: answers, solution: seq.join(', ')
    };
  }

  function vornach(r) {
    var n = r.int(101, 998);
    return {
      q: 'Schreibe den Vorgänger und den Nachfolger auf.', kind: 'fields',
      parts: [{ f: 0 }, '◀', { html: '<b class="mid">' + n + '</b>' }, '▶', { f: 1 }],
      answers: [S(n - 1), S(n + 1)], solution: 'Vorgänger ' + (n - 1) + ', Nachfolger ' + (n + 1)
    };
  }
  function nzehn(r) {
    var n; do { n = r.int(101, 998); } while (n % 10 === 0);
    var lo = n - (n % 10);
    return {
      q: 'Schreibe die beiden <b>Nachbarzehner</b> von ' + n + ' auf.', kind: 'fields',
      parts: [{ f: 0 }, '&lt;', { html: '<b class="mid">' + n + '</b>' }, '&lt;', { f: 1 }],
      answers: [S(lo), S(lo + 10)], solution: lo + ' &lt; ' + n + ' &lt; ' + (lo + 10)
    };
  }
  function nhund(r) {
    var n; do { n = r.int(101, 999); } while (n % 100 === 0);
    var lo = Math.floor(n / 100) * 100;
    return {
      q: 'Schreibe die beiden <b>Nachbarhunderter</b> von ' + n + ' auf.', kind: 'fields',
      parts: [{ f: 0 }, '&lt;', { html: '<b class="mid">' + n + '</b>' }, '&lt;', { f: 1 }],
      answers: [S(lo), S(lo + 100)], solution: lo + ' &lt; ' + n + ' &lt; ' + (lo + 100)
    };
  }

  var NAMES = ['Mia', 'Ben', 'Lena', 'Paul', 'Emma', 'Noah', 'Lara', 'Finn'];
  function sach(r) {
    var t = r.int(1, 4), nm = r.pick(NAMES), a, b, d, q, p, k, ans, text, unit = '';
    if (t === 1) { a = r.int(120, 600); b = r.int(20, 300); ans = a + b; text = nm + ' hat ' + a + ' Sticker. Zum Geburtstag bekommt sie noch ' + b + ' dazu. Wie viele Sticker hat sie jetzt?'; }
    else if (t === 2) { d = r.int(2, 9); q = r.int(3, 12); a = d * q; ans = q; text = d + ' Kinder teilen ' + a + ' Gummibärchen gerecht. Wie viele Gummibärchen bekommt jedes Kind?'; }
    else if (t === 3) { p = r.pick([20, 30, 40, 50, 60]); k = r.int(2, 6); ans = p * k; unit = 'Cent'; text = 'Ein Heft kostet ' + p + ' Cent. Wie viel kosten ' + k + ' Hefte?'; }
    else { a = r.int(120, 400); b = r.int(15, 90); ans = a - b; text = 'Im Zug sitzen ' + a + ' Leute. An der Haltestelle steigen ' + b + ' Leute aus. Wie viele Leute sitzen noch im Zug?'; }
    return {
      q: 'Sachaufgabe: ' + text, kind: 'fields', parts: ['Antwort:', { f: 0 }, unit],
      answers: [S(ans)], solution: ans + (unit ? ' ' + unit : '')
    };
  }

  var MATH_TOPICS = [
    { id: 'kopf', name: 'Kopfrechnen (+ − · :)', emoji: '🧠', gen: kopf, tip: 'Plus und Minus: erst die Zehner, dann die Einer. Mal und Geteilt: denk ans kleine Einmaleins. Probe: 56 : 7 = 8, weil 8 · 7 = 56.' },
    { id: 'rest', name: 'Division mit Rest', emoji: '➗', gen: rest, tip: 'Wie oft passt die Zahl hinein? Was übrig bleibt, ist der Rest. Der Rest ist immer kleiner als die Teiler-Zahl. Beispiel: 15 : 4 = 3 Rest 3, denn 3 · 4 = 12 und 15 − 12 = 3.' },
    { id: 'diktat', name: 'Zahlendiktat', emoji: '🎧', gen: diktat, tip: 'Höre oder lies die Zahl und schreibe sie mit Ziffern. dreihundertvierundzwanzig = 324. Bei „vierundzwanzig“ wird zuerst die Einer-Zahl gesprochen, aber 24 schreibst du mit der 2 vorne!' },
    { id: 'stellen', name: 'Stellenwerttafel', emoji: '🔢', gen: stellen, tip: 'H = Hunderter, Z = Zehner, E = Einer. 482 = 4 H, 8 Z, 2 E. Wenn eine Stelle leer ist, schreibst du eine 0. 305 = 3 H, 0 Z, 5 E.' },
    { id: 'geheim', name: 'Geheimschrift', emoji: '🕵️', gen: geheim, tip: 'Zähle jede Sorte Zeichen einzeln: Hunderter, Zehner, Einer. Dann setzt du die Zahl zusammen.' },
    { id: 'hfeld', name: 'Hunderterfeld-Ausschnitte', emoji: '🧩', gen: hfeld, tip: 'Im Hunderterfeld geht es nach rechts immer +1 und nach unten immer +10. Nach links −1, nach oben −10.' },
    { id: 'ordnen', name: 'Zahlen ordnen', emoji: '📶', gen: ordnen, tip: 'Vergleiche zuerst die Hunderter, dann die Zehner, dann die Einer. < heißt „kleiner als“, > heißt „größer als“.' },
    { id: 'zaehlen', name: 'Vorwärts & rückwärts zählen', emoji: '🔁', gen: zaehlen, tip: 'In Zehnerschritten ändert sich nur die Zehnerstelle: 340, 350, 360. Rückwärts rechnest du minus. In Hunderterschritten ändert sich nur die Hunderterstelle.' },
    { id: 'vornach', name: 'Vorgänger & Nachfolger', emoji: '↔️', gen: vornach, tip: 'Vorgänger = eine Zahl davor (−1). Nachfolger = eine Zahl danach (+1). Achtung bei 300, 410, 500 … : der Vorgänger von 400 ist 399!' },
    { id: 'nzehn', name: 'Nachbarzehner', emoji: '🔟', gen: nzehn, tip: 'Der Nachbarzehner ist der volle Zehner direkt davor und direkt danach. 347 liegt zwischen 340 und 350.' },
    { id: 'nhund', name: 'Nachbarhunderter', emoji: '💯', gen: nhund, tip: 'Der Nachbarhunderter ist der volle Hunderter direkt davor und direkt danach. 347 liegt zwischen 300 und 400.' }
  ];

  function topicOf(id) { for (var i = 0; i < MATH_TOPICS.length; i++) if (MATH_TOPICS[i].id === id) return MATH_TOPICS[i]; return null; }

  function finish(list, subject, tagFn) {
    return list.map(function (t, i) {
      t.id = i + 1; t.subject = subject;
      if (t.num === undefined) t.num = (subject === 'math' && t.kind === 'fields');
      if (t.cs === undefined) t.cs = false;
      return t;
    });
  }
  function withTag(t, topic) { t.topic = topic.id; t.tag = topic.name; return t; }

  function uniq(gen, used) {
    var t;
    for (var k = 0; k < 25; k++) { t = gen(); if (!used[t.solution]) break; }
    used[t.solution] = 1;
    return t;
  }

  /* Prüfungsvorbereitung: Gesamttest (24 Aufgaben, 30 Min.) oder Themen-Test (6 Aufgaben, 10 Min.) */
  function makeMathTest(seed, topicId) {
    var r = new Rng(seed), used = {}, list = [];
    if (!topicId) {
      MATH_TOPICS.forEach(function (tp) {
        var cnt = tp.id === 'kopf' ? 4 : 2;
        for (var k = 0; k < cnt; k++) list.push(withTag(uniq(function () { return tp.id === 'kopf' ? kopf(r, OPS[k % 4]) : tp.gen(r); }, used), tp));
      });
      return { tasks: finish(list, 'math'), limit: 1800, title: 'Mathe-Gesamttest' };
    }
    var tp = topicOf(topicId);
    for (var k = 0; k < 6; k++) list.push(withTag(uniq(function () { return tp.id === 'kopf' ? kopf(r, OPS[k % 4]) : tp.gen(r); }, used), tp));
    return { tasks: finish(list, 'math'), limit: 600, title: 'Mathe: ' + tp.name };
  }

  function dailyMath(r) {
    var ops = r.shuffle(OPS), kt = topicOf('kopf'), used = {}, list = [];
    list.push(withTag(uniq(function () { return kopf(r, ops[0]); }, used), kt));
    list.push(withTag(uniq(function () { return kopf(r, ops[1]); }, used), kt));
    r.shuffle(MATH_TOPICS.filter(function (t) { return t.id !== 'kopf'; })).slice(0, 5).forEach(function (tp) {
      list.push(withTag(uniq(function () { return tp.gen(r); }, used), tp));
    });
    var s = sach(r); s.tag = 'Sachaufgabe'; list.push(s);
    return finish(r.shuffle(list), 'math');
  }

  /* =====================================================================
     DEUTSCH
     ===================================================================== */
  var NOUNS = [['Hund', 'der', 'Hunde'], ['Katze', 'die', 'Katzen'], ['Baum', 'der', 'Bäume'], ['Haus', 'das', 'Häuser'], ['Buch', 'das', 'Bücher'], ['Apfel', 'der', 'Äpfel'], ['Kind', 'das', 'Kinder'], ['Vogel', 'der', 'Vögel'], ['Hand', 'die', 'Hände'], ['Stuhl', 'der', 'Stühle'], ['Tisch', 'der', 'Tische'], ['Blume', 'die', 'Blumen'], ['Maus', 'die', 'Mäuse'], ['Fuß', 'der', 'Füße'], ['Ball', 'der', 'Bälle'], ['Schule', 'die', 'Schulen'], ['Tür', 'die', 'Türen'], ['Auto', 'das', 'Autos'], ['Kuh', 'die', 'Kühe'], ['Bruder', 'der', 'Brüder'], ['Wald', 'der', 'Wälder'], ['Stadt', 'die', 'Städte'], ['Lied', 'das', 'Lieder'], ['Lampe', 'die', 'Lampen'], ['Mond', 'der', 'Monde'], ['Fisch', 'der', 'Fische'], ['Straße', 'die', 'Straßen'], ['Heft', 'das', 'Hefte'], ['Birne', 'die', 'Birnen'], ['Bett', 'das', 'Betten'], ['Sonne', 'die', 'Sonnen']];
  var SPELL = [['Fahrrad', 'Farrad'], ['Straße', 'Strase'], ['Mädchen', 'Medchen'], ['Vogel', 'Fogel'], ['Wald', 'Walt'], ['Hund', 'Hunt'], ['Schnee', 'Schne'], ['Spielplatz', 'Spilplatz'], ['Freund', 'Freunt'], ['Käse', 'Kese'], ['Sommer', 'Somer'], ['Kuchen', 'Kuhen'], ['Brot', 'Prot'], ['Zeitung', 'Zeitunk'], ['Schule', 'Shule'], ['Mutter', 'Muter'], ['Fenster', 'Fenstar'], ['Winter', 'Vinter'], ['Zimmer', 'Zimer'], ['Fliege', 'Vliege'], ['Pferd', 'Pfert'], ['Geschenk', 'Geschänk'], ['Bäcker', 'Becker'], ['Strumpf', 'Strump']];
  var GAPIE = [['L_be', 'ie', 'Liebe'], ['Br_f', 'ie', 'Brief'], ['Sp_gel', 'ie', 'Spiegel'], ['Z_t', 'ei', 'Zeit'], ['Kl_d', 'ei', 'Kleid'], ['R_se', 'ei', 'Reise'], ['K_ste', 'i', 'Kiste'], ['W_nter', 'i', 'Winter'], ['Fl_ge', 'ie', 'Fliege'], ['S_fe', 'ei', 'Seife'], ['Sch_f', 'a', 'Schaf'], ['Z_ge', 'ie', 'Ziege'], ['Kr_g', 'ie', 'Krieg'], ['B_n', 'ei', 'Bein']].filter(function (x) { return ['ie', 'ei', 'i'].indexOf(x[1]) >= 0; });
  var GAPSS = [['Stra_e', 'ß', 'Straße'], ['Fu_', 'ß', 'Fuß'], ['Ta_e', 'ss', 'Tasse'], ['Wa_er', 'ss', 'Wasser'], ['Ha_e', 's', 'Hase'], ['Gra_', 's', 'Gras'], ['Flu_', 'ss', 'Fluss'], ['Sü_igkeit', 'ß', 'Süßigkeit'], ['Ro_e', 's', 'Rose'], ['Schlo_', 'ss', 'Schloss'], ['Gro_', 'ß', 'groß'], ['Bu_', 's', 'Bus']];
  var WORTART = [['Hund', 'Nomen'], ['laufen', 'Verb'], ['schön', 'Adjektiv'], ['Tisch', 'Nomen'], ['spielen', 'Verb'], ['klein', 'Adjektiv'], ['Freude', 'Nomen'], ['schlafen', 'Verb'], ['lustig', 'Adjektiv'], ['Sonne', 'Nomen'], ['singen', 'Verb'], ['rot', 'Adjektiv'], ['Lehrerin', 'Nomen'], ['lachen', 'Verb'], ['kalt', 'Adjektiv'], ['Fahrrad', 'Nomen'], ['malen', 'Verb'], ['schnell', 'Adjektiv'], ['Schule', 'Nomen'], ['essen', 'Verb'], ['dunkel', 'Adjektiv']];
  var OPP_DE = [['groß', 'klein'], ['heiß', 'kalt'], ['schnell', 'langsam'], ['hell', 'dunkel'], ['laut', 'leise'], ['alt', 'jung'], ['dick', 'dünn'], ['lang', 'kurz'], ['früh', 'spät'], ['fröhlich', 'traurig'], ['leicht', 'schwer'], ['nass', 'trocken'], ['hart', 'weich'], ['stark', 'schwach'], ['süß', 'sauer'], ['voll', 'leer'], ['breit', 'schmal'], ['tief', 'flach']];
  var VERBEN = [['spielen', 'er', 'spielt'], ['lachen', 'ich', 'lache'], ['malen', 'wir', 'malen'], ['laufen', 'du', 'läufst'], ['lesen', 'er', 'liest'], ['schlafen', 'sie', 'schläft'], ['singen', 'ihr', 'singt'], ['rechnen', 'ich', 'rechne'], ['fahren', 'du', 'fährst'], ['essen', 'er', 'isst'], ['springen', 'wir', 'springen'], ['schreiben', 'du', 'schreibst'], ['gehen', 'ihr', 'geht'], ['kaufen', 'ich', 'kaufe'], ['trinken', 'sie', 'trinkt']];
  var COMPOUND = [['Sonne', 'Blume', 'Sonnenblume'], ['Hand', 'Schuh', 'Handschuh'], ['Schule', 'Hof', 'Schulhof'], ['Tisch', 'Bein', 'Tischbein'], ['Regen', 'Schirm', 'Regenschirm'], ['Butter', 'Brot', 'Butterbrot'], ['Haus', 'Tür', 'Haustür'], ['Apfel', 'Baum', 'Apfelbaum'], ['Kinder', 'Zimmer', 'Kinderzimmer'], ['Schnee', 'Mann', 'Schneemann'], ['Fahrrad', 'Weg', 'Fahrradweg'], ['Zahn', 'Bürste', 'Zahnbürste']];
  var SATZ = [['Wie heißt du', '?'], ['Ich gehe in die Schule', '.'], ['Hör sofort auf damit', '!'], ['Wo wohnst du', '?'], ['Die Sonne scheint', '.'], ['Pass auf', '!'], ['Hast du Hunger', '?'], ['Wir spielen im Garten', '.'], ['Sei bitte leise', '!'], ['Wann kommt der Bus', '?'], ['Mein Bruder liest ein Buch', '.']];
  var SILBEN = [['Schule', 2], ['Schmetterling', 3], ['Banane', 3], ['Hund', 1], ['Kaninchen', 3], ['Elefant', 3], ['Fahrrad', 2], ['Schokolade', 4], ['Sonne', 2], ['Computer', 3], ['Kindergarten', 4], ['Apfel', 2], ['Krokodil', 3], ['Marienkäfer', 5], ['Tisch', 1], ['Spielplatz', 2]];

  function ch(r, q, opts, correct, extra, keep) {
    return Object.assign({ kind: 'choice', q: q, options: keep ? opts : r.shuffle(opts), answers: [correct], solution: correct, num: false }, extra || {});
  }
  function wrongs(r, arr, correct, n) { return r.shuffle(arr.filter(function (x) { return x !== correct; })).slice(0, n); }
  function tag(t, name) { t.tag = name; return t; }

  var DE_TYPES = [
    function plural(r) {
      var n = r.pick(NOUNS);
      return tag({ kind: 'fields', q: 'Schreibe die <b>Mehrzahl</b> (Plural).', parts: ['Einzahl: ' + n[1] + ' ' + n[0] + ' &nbsp;→&nbsp; Mehrzahl: die', { f: 0 }], answers: [n[2]], solution: 'die ' + n[2], cs: true, num: false }, 'Mehrzahl');
    },
    function artikel(r) {
      var n = r.pick(NOUNS);
      return tag(ch(r, 'Welcher Artikel passt? <b>___ ' + n[0] + '</b>', ['der', 'die', 'das'], n[1], { solution: n[1] + ' ' + n[0] }, true), 'Artikel');
    },
    function spell(r) {
      var s = r.pick(SPELL);
      return tag(ch(r, 'Welches Wort ist richtig geschrieben?', [s[0], s[1]], s[0]), 'Rechtschreibung');
    },
    function gapie(r) {
      var g = r.pick(GAPIE);
      return tag(ch(r, 'Welche Buchstaben fehlen? <b>' + g[0].replace('_', '__') + '</b>', ['ie', 'ei', 'i'], g[1], { solution: g[2] }, true), 'ie – ei – i');
    },
    function gapss(r) {
      var g = r.pick(GAPSS);
      return tag(ch(r, 'Was fehlt? <b>' + g[0] + '</b>', ['s', 'ss', 'ß'], g[1], { solution: g[2] }, true), 's – ss – ß');
    },
    function wortart(r) {
      var w = r.pick(WORTART);
      return tag(ch(r, 'Welche Wortart ist „<b>' + w[0] + '</b>“?', ['Nomen', 'Verb', 'Adjektiv'], w[1], null, true), 'Wortarten');
    },
    function opp(r) {
      var p = r.pick(OPP_DE);
      return tag(ch(r, 'Was ist das <b>Gegenteil</b> von „' + p[0] + '“?', [p[1]].concat(wrongs(r, OPP_DE.map(function (x) { return x[1]; }), p[1], 2)), p[1]), 'Gegenteile');
    },
    function verb(r) {
      var v = r.pick(VERBEN);
      return tag({ kind: 'fields', q: 'Setze die richtige Form des Verbs ein.', parts: [v[1], { f: 0 }, '(' + v[0] + ')'], answers: [v[2]], solution: v[1] + ' ' + v[2], cs: false, num: false }, 'Verben');
    },
    function compound(r) {
      var c = r.pick(COMPOUND);
      return tag({ kind: 'fields', q: 'Setze die Nomen zusammen: <b>' + c[0] + ' + ' + c[1] + '</b> (Schreibe groß!)', parts: [{ f: 0 }], answers: [c[2]], solution: c[2], cs: true, num: false }, 'Zusammengesetzte Nomen');
    },
    function satz(r) {
      var s = r.pick(SATZ);
      return tag(ch(r, 'Welches Satzzeichen fehlt?<br><b>' + s[0] + '</b>', ['.', '?', '!'], s[1], { solution: s[0] + s[1] }, true), 'Satzzeichen');
    },
    function silben(r) {
      var s = r.pick(SILBEN);
      return tag({ kind: 'fields', q: 'Klatsche mit: Wie viele <b>Silben</b> hat das Wort „' + s[0] + '“?', parts: [{ f: 0 }], answers: [S(s[1])], solution: s[1] + ' Silben', num: true }, 'Silben');
    },
    function gross(r) {
      var n = r.pick(NOUNS), low = n[0].toLowerCase();
      return tag({ kind: 'fields', q: 'Schreibe das Nomen richtig: Nomen schreibt man <b>groß</b>.', parts: [low + ' &nbsp;→', { f: 0 }], answers: [n[0]], solution: n[0], cs: true, num: false }, 'Großschreibung');
    }
  ];

  /* =====================================================================
     ENGLISCH
     ===================================================================== */
  var VOC = [['🐶', 'dog', 'Hund'], ['🐱', 'cat', 'Katze'], ['🐴', 'horse', 'Pferd'], ['🐮', 'cow', 'Kuh'], ['🐷', 'pig', 'Schwein'], ['🐟', 'fish', 'Fisch'], ['🐦', 'bird', 'Vogel'], ['🐰', 'rabbit', 'Hase'], ['🍎', 'apple', 'Apfel'], ['🍌', 'banana', 'Banane'], ['🍞', 'bread', 'Brot'], ['🥛', 'milk', 'Milch'], ['🧀', 'cheese', 'Käse'], ['🍕', 'pizza', 'Pizza'], ['🏠', 'house', 'Haus'], ['🚗', 'car', 'Auto'], ['🚌', 'bus', 'Bus'], ['🌳', 'tree', 'Baum'], ['☀️', 'sun', 'Sonne'], ['🌙', 'moon', 'Mond'], ['⭐', 'star', 'Stern'], ['📚', 'book', 'Buch'], ['✏️', 'pencil', 'Bleistift'], ['🎒', 'school bag', 'Schultasche'], ['⚽', 'football', 'Fußball'], ['🚲', 'bike', 'Fahrrad'], ['🐘', 'elephant', 'Elefant'], ['🦁', 'lion', 'Löwe'], ['🐒', 'monkey', 'Affe'], ['🐸', 'frog', 'Frosch'], ['', 'mother', 'Mutter'], ['', 'father', 'Vater'], ['', 'sister', 'Schwester'], ['', 'brother', 'Bruder'], ['', 'grandma', 'Oma'], ['', 'grandpa', 'Opa'], ['', 'teacher', 'Lehrer/Lehrerin'], ['', 'ruler', 'Lineal'], ['', 'desk', 'Schreibtisch'], ['', 'window', 'Fenster'], ['', 'door', 'Tür']];
  var COLORS = [['red', '#e53935'], ['blue', '#1e88e5'], ['green', '#43a047'], ['yellow', '#fdd835'], ['black', '#212121'], ['white', '#ffffff'], ['orange', '#fb8c00'], ['pink', '#ec407a'], ['purple', '#8e24aa'], ['brown', '#6d4c41']];
  var NUMW = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
  var BE = [['I', 'am'], ['You', 'are'], ['He', 'is'], ['She', 'is'], ['It', 'is'], ['We', 'are'], ['They', 'are'], ['My mum', 'is'], ['The dogs', 'are'], ['Tom and Anna', 'are'], ['The cat', 'is']];
  var PLUR = [['dog', 'dogs'], ['apple', 'apples'], ['box', 'boxes'], ['bus', 'buses'], ['child', 'children'], ['man', 'men'], ['foot', 'feet'], ['mouse', 'mice'], ['book', 'books'], ['baby', 'babies'], ['woman', 'women'], ['tooth', 'teeth']];
  var OPP_EN = [['big', 'small'], ['hot', 'cold'], ['happy', 'sad'], ['old', 'young'], ['fast', 'slow'], ['up', 'down'], ['long', 'short'], ['open', 'closed'], ['day', 'night'], ['yes', 'no'], ['good', 'bad'], ['full', 'empty']];
  var QA = [['What\'s your name?', 'My name is Mia.'], ['How are you?', 'I\'m fine, thank you.'], ['How old are you?', 'I\'m eight years old.'], ['Where do you live?', 'I live in Germany.'], ['Do you like pizza?', 'Yes, I do.'], ['What\'s this?', 'It\'s a book.'], ['What colour is the sun?', 'It\'s yellow.'], ['Can you swim?', 'Yes, I can.']];
  var DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  function vocWords(withEmoji) { return VOC.filter(function (v) { return withEmoji ? v[0] : true; }); }

  var EN_TYPES = [
    function emoji(r) {
      var v = r.pick(vocWords(true));
      return tag(ch(r, 'What is this?', [v[1]].concat(wrongs(r, VOC.map(function (x) { return x[1]; }), v[1], 2)), v[1], { visual: '<div class="bigemoji">' + v[0] + '</div>', speak: { text: v[1], lang: 'en-GB' } }), 'Vocabulary');
    },
    function en2de(r) {
      var v = r.pick(VOC);
      return tag(ch(r, 'Was heißt „<b>' + v[1] + '</b>“ auf Deutsch?', [v[2]].concat(wrongs(r, VOC.map(function (x) { return x[2]; }), v[2], 2)), v[2], { speak: { text: v[1], lang: 'en-GB' } }), 'Vocabulary');
    },
    function de2en(r) {
      var v = r.pick(VOC);
      return tag(ch(r, 'Wie heißt „<b>' + v[2] + '</b>“ auf Englisch?', [v[1]].concat(wrongs(r, VOC.map(function (x) { return x[1]; }), v[1], 2)), v[1]), 'Vocabulary');
    },
    function colour(r) {
      var c = r.pick(COLORS);
      return tag(ch(r, 'What colour is this?', [c[0]].concat(wrongs(r, COLORS.map(function (x) { return x[0]; }), c[0], 2)), c[0], { visual: '<div class="swatch" style="background:' + c[1] + '"></div>', speak: { text: c[0], lang: 'en-GB' } }), 'Colours');
    },
    function numbers(r) {
      var n = r.int(1, 20);
      return tag({ kind: 'fields', q: 'Write the number in words.', parts: [n + ' &nbsp;→', { f: 0 }], answers: [NUMW[n]], solution: NUMW[n], cs: false, num: false, speak: { text: NUMW[n], lang: 'en-GB' } }, 'Numbers');
    },
    function be(r) {
      var b = r.pick(BE);
      return tag(ch(r, 'Which word fits? <b>' + b[0] + ' ___ happy.</b>', ['am', 'is', 'are'], b[1], { solution: b[0] + ' ' + b[1] + ' happy.' }, true), 'am – is – are');
    },
    function plural(r) {
      var p = r.pick(PLUR);
      return tag({ kind: 'fields', q: 'Write the plural (more than one).', parts: ['one ' + p[0] + ' &nbsp;→&nbsp; two', { f: 0 }], answers: [p[1]], solution: p[1], cs: false, num: false }, 'Plural');
    },
    function opposite(r) {
      var p = r.pick(OPP_EN);
      return tag(ch(r, 'What is the <b>opposite</b> of “' + p[0] + '”?', [p[1]].concat(wrongs(r, OPP_EN.map(function (x) { return x[1]; }), p[1], 2)), p[1]), 'Opposites');
    },
    function qa(r) {
      var p = r.pick(QA);
      return tag(ch(r, 'Choose the right answer:<br><b>' + p[0] + '</b>', [p[1]].concat(wrongs(r, QA.map(function (x) { return x[1]; }), p[1], 2)), p[1], { speak: { text: p[0], lang: 'en-GB' } }), 'Conversation');
    },
    function days(r) {
      var i = r.int(0, 6), next = DAYS[(i + 1) % 7];
      return tag(ch(r, 'Which day comes after <b>' + DAYS[i] + '</b>?', [next].concat(wrongs(r, DAYS, next, 2)), next), 'Days of the week');
    },
    function vocab2(r) {
      var v = r.pick(VOC.filter(function (x) { return !x[0]; }));
      return tag(ch(r, 'Wie heißt „<b>' + v[2] + '</b>“ auf Englisch?', [v[1]].concat(wrongs(r, VOC.filter(function (x) { return !x[0]; }).map(function (x) { return x[1]; }), v[1], 2)), v[1]), 'Family & School');
    }
  ];

  function dailyFrom(types, r, count) {
    var used = {}, list = [];
    r.shuffle(types).slice(0, count).forEach(function (fn) { list.push(uniq(function () { return fn(r); }, used)); });
    return list;
  }
  function dailyDeutsch(r) { return finish(dailyFrom(DE_TYPES, r, 8), 'deutsch'); }
  function dailyEnglish(r) { return finish(dailyFrom(EN_TYPES, r, 8), 'english'); }

  global.GEN = {
    Rng: Rng, hashStr: hashStr, numberWords: numberWords,
    MATH_TOPICS: MATH_TOPICS, topicOf: topicOf,
    makeMathTest: makeMathTest,
    dailyMath: dailyMath, dailyDeutsch: dailyDeutsch, dailyEnglish: dailyEnglish
  };
})(window);
