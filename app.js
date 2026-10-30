/* Lernspaß – App-Logik. Alle Daten bleiben lokal auf dem iPad (localStorage). */
(function () {
  'use strict';
  var G = window.GEN;
  var VERSION = self.APP_VERSION || 'dev';
  var KEY = 'lernspass.v1';

  /* ---------- Einstellungen, die du ändern kannst ---------- */
  var EXAM = { subject: 'math', date: '2026-11-09', title: 'Mathe-Arbeit', dateLabel: '9.11.' };
  var DAILY_TARGET_SEC = 300; // ca. 5 Min. pro Fach = 15 Min. insgesamt

  var SUBJ = {
    math: { name: 'Mathe', emoji: '🔢', cls: 'math' },
    deutsch: { name: 'Deutsch', emoji: '📖', cls: 'de' },
    english: { name: 'Englisch', emoji: '🌍', cls: 'en' }
  };
  var SUBJECTS = ['math', 'deutsch', 'english'];
  var AVATARS = ['🦊', '🐼', '🦄', '🐯', '🐸', '🐵', '🦁', '🐰', '🐙', '🦖', '🐱', '🐶'];
  var CANDIES = ['🍭', '🍬', '🍫', '🍩', '🧁', '🍪', '🍓', '🍒', '🍦', '🍧', '🍰', '🎂', '🍿', '🥨', '🍯', '🍉', '🍇', '🍌'];
  var LEVELS = [[0, 'Lern-Küken 🐣'], [30, 'Lern-Fuchs 🦊'], [100, 'Super-Schlau 🦉'], [250, 'Lern-Held 🦸'], [500, 'Lern-Meister 🧙'], [1000, 'Lern-Legende 🐉']];
  var PRAISE = ['Super! 🎉', 'Richtig! 👍', 'Toll gemacht! ⭐', 'Genau! 💪', 'Prima! 🌈', 'Klasse! 🚀'];
  var NOTE_TXT = { 1: 'sehr gut', 2: 'gut', 3: 'befriedigend', 4: 'ausreichend', 5: 'mangelhaft', 6: 'ungenügend' };

  /* ---------- kleine Helfer ---------- */
  function h(tag, props) {
    var el = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (k) {
      var v = props[k];
      if (v === false || v == null) return;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    });
    var kids = Array.prototype.slice.call(arguments, 2);
    (function add(list) {
      list.forEach(function (c) {
        if (c == null || c === false) return;
        if (Array.isArray(c)) return add(c);
        el.appendChild(c.nodeType ? c : document.createTextNode(c));
      });
    })(kids);
    return el;
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function today() { var d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function addDays(iso, delta) { var p = iso.split('-'); var d = new Date(+p[0], +p[1] - 1, +p[2] + delta); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
  function daysBetween(a, b) { var x = a.split('-'), y = b.split('-'); return Math.round((Date.UTC(+y[0], +y[1] - 1, +y[2]) - Date.UTC(+x[0], +x[1] - 1, +x[2])) / 864e5); }
  function mmss(s) { s = Math.max(0, Math.round(s)); return pad(Math.floor(s / 60)) + ':' + pad(s % 60); }
  function fmtDate(ts) { var d = new Date(ts); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear() + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }
  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }
  function noteFor(pct) { return pct >= 95 ? 1 : pct >= 80 ? 2 : pct >= 65 ? 3 : pct >= 50 ? 4 : pct >= 25 ? 5 : 6; }
  function levelOf(stars) { var l = LEVELS[0][1], next = null; for (var i = 0; i < LEVELS.length; i++) { if (stars >= LEVELS[i][0]) { l = LEVELS[i][1]; next = LEVELS[i + 1] || null; } } return { name: l, next: next }; }
  function decode(s) { return String(s).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/<[^>]+>/g, ''); }

  /* ---------- Speicher ---------- */
  var DB = load();
  function load() { try { var d = JSON.parse(localStorage.getItem(KEY)); if (d && d.profiles) return d; } catch (e) { } return { profiles: {}, current: null }; }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(DB)); } catch (e) { toast('Speichern hat nicht geklappt – bitte Eltern Bescheid sagen.'); } }
  function cur() { return DB.profiles[DB.current] || null; }
  function effStreak(p) { return (p.lastDaily === today() || p.lastDaily === addDays(today(), -1)) ? (p.streak || 0) : 0; }

  /* ---------- UI-Grundgerüst ---------- */
  var app = document.getElementById('app');
  var cleanup = null;
  function mount(node) {
    if (cleanup) { cleanup(); cleanup = null; }
    app.replaceChildren(node);
    window.scrollTo(0, 0);
    document.body.dataset.view = node.dataset.view || '';
  }
  function toast(msg) {
    var t = h('div', { class: 'toast' }, msg);
    document.body.appendChild(t);
    setTimeout(function () { t.classList.add('out'); setTimeout(function () { t.remove(); }, 400); }, 2600);
  }
  function modal(content) {
    var ov = h('div', { class: 'overlay' }, h('div', { class: 'modal' }, content));
    document.body.appendChild(ov);
    return function close() { ov.remove(); };
  }
  function chip(icon, val, cls) { return h('div', { class: 'chip ' + (cls || '') }, h('span', {}, icon), h('b', {}, String(val))); }
  function btn(label, onclick, cls) { return h('button', { class: 'btn ' + (cls || ''), type: 'button', onclick: onclick }, label); }
  function topBar(title, back, right) {
    return h('header', { class: 'bar' },
      back ? h('button', { class: 'back', type: 'button', onclick: back, 'aria-label': 'Zurück' }, '◀') : h('span', { class: 'back ph' }),
      h('h1', {}, title), right || h('span', { class: 'back ph' }));
  }
  function confetti(list) {
    list = list || ['⭐', '🍭', '🍬', '🎉', '🍫', '🌟'];
    for (var i = 0; i < 36; i++) {
      var c = h('span', { class: 'conf' }, pick(list));
      c.style.left = Math.random() * 100 + 'vw';
      c.style.animationDuration = (2.2 + Math.random() * 2.2) + 's';
      c.style.animationDelay = Math.random() * 0.8 + 's';
      c.style.fontSize = (20 + Math.random() * 26) + 'px';
      document.body.appendChild(c);
      (function (el) { setTimeout(function () { el.remove(); }, 5600); })(c);
    }
  }
  function speak(text, lang) {
    try {
      if (!window.speechSynthesis) return toast('Vorlesen geht auf diesem Gerät nicht.');
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text); u.lang = lang; u.rate = 0.8;
      window.speechSynthesis.speak(u);
    } catch (e) { }
  }

  /* ---------- Antworten prüfen ---------- */
  function norm(s, cs) { s = String(s == null ? '' : s).trim().replace(/\s+/g, ' '); return cs ? s : s.toLowerCase(); }
  function fieldOk(t, i, a) {
    if (a == null || String(a).trim() === '') return false;
    var e = t.answers[i];
    if (t.num) return Number(String(a).trim().replace(',', '.')) === Number(e);
    return norm(a, t.cs) === norm(e, t.cs);
  }
  function taskOk(t, ans) {
    ans = ans || [];
    if (t.kind === 'choice') return ans[0] === t.answers[0];
    if (t.kind === 'order') return ans.length === t.answers.length && t.answers.every(function (x, i) { return ans[i] === x; });
    return t.answers.every(function (_, i) { return fieldOk(t, i, ans[i]); });
  }
  function isAnswered(t, ans) {
    ans = ans || [];
    if (t.kind === 'choice') return ans[0] != null;
    if (t.kind === 'order') return ans.length === t.answers.length;
    return t.answers.every(function (_, i) { return ans[i] != null && String(ans[i]).trim() !== ''; });
  }
  function yourAnswer(t, ans) {
    ans = ans || [];
    return t.kind === 'order' || t.kind === 'choice' ? ans.join(', ') : t.answers.map(function (_, i) { return ans[i] == null ? '–' : ans[i]; }).join(' | ');
  }

  /* ---------- Aufgabe darstellen ---------- */
  function mkInput(t, i, ans, o) {
    var inp = h('input', {
      class: 'fld' + (t.num ? ' num' : ''), type: 'text', inputmode: t.num ? 'numeric' : 'text', autocomplete: 'off',
      autocapitalize: 'off', autocorrect: 'off', spellcheck: 'false', 'aria-label': 'Antwort ' + (i + 1)
    });
    inp.value = ans[i] == null ? '' : ans[i];
    if (o.locked) { inp.disabled = true; inp.classList.add(fieldOk(t, i, ans[i]) ? 'ok' : 'bad'); }
    else {
      inp.addEventListener('input', function () { ans[i] = inp.value; if (o.onInput) o.onInput(); });
      inp.addEventListener('keydown', function (e) {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        var all = Array.prototype.slice.call(inp.closest('.task').querySelectorAll('input.fld'));
        var k = all.indexOf(inp);
        if (k < all.length - 1) all[k + 1].focus(); else { inp.blur(); if (o.onSubmit) o.onSubmit(); }
      });
    }
    return inp;
  }
  function renderParts(t, ans, o) {
    var line = h('div', { class: 'line' });
    t.parts.forEach(function (p) {
      if (typeof p === 'string') line.appendChild(h('span', { class: 'txt', html: p }));
      else if (p.html != null) line.appendChild(h('span', { class: 'txt', html: p.html }));
      else if (p.f != null) line.appendChild(mkInput(t, p.f, ans, o));
      else if (p.table) {
        var head = h('tr', {}, p.table.head.map(function (x) { return h('th', {}, x); }));
        var row = h('tr', {}, p.table.row.map(function (c) { return h('td', {}, typeof c === 'string' ? h('span', { class: 'cell' }, c) : mkInput(t, c.f, ans, o)); }));
        line.appendChild(h('table', { class: 'sw' }, head, row));
      } else if (p.grid) {
        line.appendChild(h('table', { class: 'grid' }, p.grid.map(function (r) {
          return h('tr', {}, r.map(function (c) { return h('td', {}, c.f != null ? mkInput(t, c.f, ans, o) : h('span', { class: 'cell' }, String(c.v))); }));
        })));
      }
    });
    return line;
  }
  function renderChoice(t, ans, o) {
    var wrap = h('div', { class: 'opts' });
    t.options.forEach(function (op) {
      var b = h('button', { class: 'opt', type: 'button' }, op);
      if (o.locked) {
        b.disabled = true;
        if (op === t.answers[0]) b.classList.add('ok');
        else if (ans[0] === op) b.classList.add('bad');
      } else {
        if (ans[0] === op) b.classList.add('sel');
        b.addEventListener('click', function () {
          ans[0] = op;
          Array.prototype.forEach.call(wrap.children, function (x) { x.classList.toggle('sel', x === b); });
          if (o.onInput) o.onInput();
        });
      }
      wrap.appendChild(b);
    });
    return wrap;
  }
  function renderOrder(t, ans, o) {
    var wrap = h('div', { class: 'order' });
    function draw() {
      wrap.replaceChildren();
      var slots = h('div', { class: 'slots' });
      for (var i = 0; i < t.answers.length; i++) {
        (function (i) {
          var v = ans[i];
          var s = h('button', { class: 'slot' + (v != null ? ' filled' : ''), type: 'button' }, v != null ? v : String(i + 1));
          if (o.locked) { s.disabled = true; if (v != null) s.classList.add(v === t.answers[i] ? 'ok' : 'bad'); }
          else if (v != null) s.addEventListener('click', function () { ans.splice(i, 1); draw(); if (o.onInput) o.onInput(); });
          slots.appendChild(s);
        })(i);
      }
      wrap.appendChild(slots);
      if (!o.locked) {
        var pool = h('div', { class: 'pool' });
        t.options.forEach(function (op) {
          if (ans.indexOf(op) >= 0) return;
          pool.appendChild(h('button', { class: 'chipn', type: 'button', onclick: function () { if (ans.length < t.answers.length) { ans.push(op); draw(); if (o.onInput) o.onInput(); } } }, op));
        });
        wrap.appendChild(pool);
        wrap.appendChild(h('div', { class: 'hint' }, 'Tippe eine Zahl an, um sie nach oben zu setzen. Tippe sie oben an, um sie zurückzunehmen.'));
      }
    }
    draw();
    return wrap;
  }
  function renderTask(t, ans, o) {
    o = o || {};
    var box = h('div', { class: 'task' });
    if (t.tag) box.appendChild(h('div', { class: 'tag' }, t.tag));
    if (t.q) box.appendChild(h('div', { class: 'q', html: t.q }));
    if (t.visual) box.appendChild(h('div', { class: 'visual', html: t.visual }));
    if (t.speak) box.appendChild(h('button', { class: 'btn small speak', type: 'button', onclick: function () { speak(t.speak.text, t.speak.lang); } }, '🔊 Anhören'));
    if (t.kind === 'fields') box.appendChild(renderParts(t, ans, o));
    else if (t.kind === 'choice') box.appendChild(renderChoice(t, ans, o));
    else if (t.kind === 'order') box.appendChild(renderOrder(t, ans, o));
    return box;
  }

  /* ---------- Test-/Übungs-Ablauf ---------- */
  function runSession(cfg) {
    var tasks = cfg.tasks, n = tasks.length, immediate = cfg.mode !== 'exam';
    var S = { i: 0, ans: tasks.map(function () { return []; }), checked: tasks.map(function () { return false; }), t0: Date.now(), over: false };
    var root = h('div', { class: 'screen session', 'data-view': 'session' });
    var timerEl = h('div', { class: 'timer' });
    var dots = h('div', { class: 'dots' });
    var body = h('div', { class: 'taskwrap' });
    var nav = h('div', { class: 'nav' });

    function elapsed() { return Math.floor((Date.now() - S.t0) / 1000); }
    function tick() {
      if (S.over) return;
      var e = elapsed();
      if (cfg.limit) {
        var left = Math.max(0, cfg.limit - e);
        timerEl.textContent = '⏱ ' + mmss(left);
        timerEl.classList.toggle('warn', left <= 60);
        if (left <= 0) finish(true);
      } else {
        timerEl.textContent = '⏱ ' + mmss(e) + (cfg.target ? ' / ca. ' + mmss(cfg.target) : '');
      }
    }
    var iv = setInterval(tick, 500);

    function updateDots() {
      dots.replaceChildren();
      tasks.forEach(function (t, i) {
        var d = h('button', { class: 'dot' + (i === S.i ? ' cur' : '') + (isAnswered(t, S.ans[i]) ? ' done' : ''), type: 'button', 'aria-label': 'Aufgabe ' + (i + 1) }, String(i + 1));
        if (!immediate) d.addEventListener('click', function () { S.i = i; draw(); });
        else d.disabled = true;
        dots.appendChild(d);
      });
    }
    function check() {
      var t = tasks[S.i];
      if (!isAnswered(t, S.ans[S.i])) {
        toast(t.kind === 'choice' ? 'Wähle erst eine Antwort.' : 'Fülle erst alle Felder aus.');
        body.classList.add('shake'); setTimeout(function () { body.classList.remove('shake'); }, 400);
        return;
      }
      S.checked[S.i] = true; draw();
    }
    function next() {
      if (S.i < n - 1) { S.i++; draw(); } else finish(false);
    }
    function askFinish() {
      var open = tasks.filter(function (t, i) { return !isAnswered(t, S.ans[i]); }).length;
      var close;
      close = modal([
        h('h2', {}, 'Test abgeben?'),
        h('p', {}, open ? 'Du hast noch ' + open + ' Aufgabe' + (open > 1 ? 'n' : '') + ' offen.' : 'Du hast alle Aufgaben bearbeitet.'),
        h('div', { class: 'row' }, btn('Weiter arbeiten', function () { close(); }, 'ghost'), btn('✅ Abgeben', function () { close(); finish(false); }, 'go'))
      ]);
    }
    function quit() {
      var close;
      close = modal([
        h('h2', {}, 'Wirklich aufhören?'), h('p', {}, 'Dein Fortschritt geht dann verloren.'),
        h('div', { class: 'row' }, btn('Weitermachen', function () { close(); }, 'go'), btn('Aufhören', function () { close(); if (cleanup) cleanup(); cfg.onQuit(); }, 'ghost'))
      ]);
    }
    function finish(timeUp) {
      if (S.over) return;
      S.over = true; clearInterval(iv);
      var sec = Math.min(elapsed(), cfg.limit || 1e9);
      if (timeUp) toast('⏰ Die Zeit ist um!');
      cfg.onFinish({ ans: S.ans, sec: sec, timeUp: !!timeUp });
    }
    function draw() {
      var t = tasks[S.i], locked = immediate && S.checked[S.i];
      body.replaceChildren(
        h('div', { class: 'count' }, 'Aufgabe ' + (S.i + 1) + ' von ' + n),
        renderTask(t, S.ans[S.i], { locked: locked, onInput: updateDots, onSubmit: immediate ? check : null })
      );
      if (locked) {
        var ok = taskOk(t, S.ans[S.i]);
        body.appendChild(h('div', { class: 'fb ' + (ok ? 'good' : 'wrong'), html: ok ? pick(PRAISE) : 'Fast! Richtig wäre: <b>' + t.solution + '</b>' }));
      }
      nav.replaceChildren();
      if (immediate) {
        nav.appendChild(locked ? btn(S.i < n - 1 ? 'Weiter ▶' : 'Fertig ✓', next, 'go big') : btn('Prüfen ✓', check, 'go big'));
      } else {
        nav.appendChild(btn('◀ Zurück', function () { if (S.i > 0) { S.i--; draw(); } }, 'ghost' + (S.i === 0 ? ' dis' : '')));
        nav.appendChild(S.i < n - 1 ? btn('Weiter ▶', next, 'go big') : btn('✅ Abgeben', askFinish, 'go big'));
        if (S.i < n - 1) nav.appendChild(btn('Abgeben', askFinish, 'ghost small'));
      }
      updateDots();
      if (!locked) { var f = body.querySelector('input.fld'); if (f && window.innerWidth > 0 && !f.value) setTimeout(function () { try { f.focus(); } catch (e) { } }, 50); }
    }
    root.append(
      h('header', { class: 'bar' }, h('button', { class: 'back', type: 'button', onclick: quit, 'aria-label': 'Beenden' }, '✕'), h('h1', {}, cfg.title), timerEl),
      dots, body, nav
    );
    mount(root);
    cleanup = function () { clearInterval(iv); S.over = true; };
    tick(); draw();
  }

  /* ---------- Ergebnis & Belohnungen ---------- */
  function addSticker(p, emoji, why) { p.stickers.push({ e: emoji, ts: Date.now(), why: why }); }
  function addCandy(p) {
    var owned = p.stickers.map(function (s) { return s.e; });
    var free = CANDIES.filter(function (c) { return owned.indexOf(c) < 0; });
    var e = free.length ? free[0] : pick(CANDIES);
    addSticker(p, e, 'Tages-Belohnung');
    return e;
  }

  function recordResult(o) {
    var p = cur(), score = 0;
    o.tasks.forEach(function (t, i) { if (taskOk(t, o.ans[i])) score++; });
    var total = o.tasks.length, pct = Math.round(score / total * 100), note = noteFor(pct);
    var entry = {
      id: uid(), ts: Date.now(), date: today(), type: o.type, subject: o.subject, topicId: o.topicId || null, title: o.title,
      score: score, total: total, percent: pct, note: note, sec: o.sec, limit: o.limit || null, retry: !!o.retry, stars: 0, tasks: o.tasks, ans: o.ans
    };
    var rewards = [], stars = 0, jackpot = false;
    if (o.retry) {
      rewards.push({ icon: '🔁', text: 'Wiederholung – Übung macht den Meister! (Für Wiederholungen gibt es keine Sterne.)' });
    } else {
      stars += score; rewards.push({ icon: '⭐', text: score + ' richtige Antworten', n: score });
      if (note === 1) { stars += 5; addSticker(p, '🏆', 'Note 1'); rewards.push({ icon: '🏆', text: 'Note 1 – Extra-Belohnung + Pokal-Sticker!', n: 5 }); }
      else if (note === 2) { stars += 3; addSticker(p, '🥈', 'Note 2'); rewards.push({ icon: '🥈', text: 'Note 2 – Extra-Belohnung + Medaillen-Sticker!', n: 3 }); }
      if (o.type === 'daily') {
        var d = p.daily[entry.date] || (p.daily[entry.date] = {});
        d[o.subject] = { score: score, total: total, note: note, id: entry.id };
        if (SUBJECTS.every(function (s) { return d[s]; }) && !d.bonus) {
          d.bonus = true; jackpot = true; stars += 10;
          rewards.push({ icon: '🎁', text: '15 Minuten geschafft! Tages-Belohnung', n: 10 });
          rewards.push({ icon: addCandy(p), text: 'Neues Süßigkeiten-Sticker für dein Album!' });
          p.streak = p.lastDaily === addDays(entry.date, -1) ? (p.streak || 0) + 1 : 1;
          p.lastDaily = entry.date;
          if ([3, 7, 14, 30].indexOf(p.streak) >= 0) { stars += 10; rewards.push({ icon: '🔥', text: p.streak + ' Tage in Folge! Serien-Bonus', n: 10 }); }
        }
      }
    }
    entry.stars = stars; p.stars += stars; p.history.push(entry);
    entry.jackpot = jackpot;
    save();
    return { entry: entry, rewards: rewards, jackpot: jackpot };
  }

  function cfgFromEntry(e) {
    return { mode: e.type === 'exam' ? 'exam' : 'daily', type: e.type, subject: e.subject, topicId: e.topicId, title: e.title, limit: e.limit, tasks: e.tasks };
  }

  function launch(cfg) {
    var back = cfg.back || viewHome;
    var full = Object.assign({}, cfg, {
      onQuit: back,
      onFinish: function (r) {
        if (cfg.save === false) {
          var sc = cfg.tasks.filter(function (t, i) { return taskOk(t, r.ans[i]); }).length;
          return mount(h('div', { class: 'screen center', 'data-view': 'result' },
            h('h1', {}, sc === cfg.tasks.length ? 'Alles richtig! 🎉' : 'Geübt: ' + sc + ' von ' + cfg.tasks.length + ' richtig'),
            h('p', {}, 'Super, dass du die Fehler nochmal geübt hast!'),
            btn('Fertig', back, 'go big')));
        }
        var out = recordResult(Object.assign({}, cfg, { ans: r.ans, sec: r.sec }));
        showResult(out.entry, out.rewards, out.jackpot, back);
      }
    });
    runSession(full);
  }

  function showResult(entry, rewards, jackpot, back) {
    var good = entry.note <= 2;
    var msg = { 1: 'Fantastisch! Note 1!', 2: 'Sehr gut gemacht! Note 2!', 3: 'Gut gemacht!', 4: 'Du bist auf dem richtigen Weg!', 5: 'Übe noch ein bisschen – du schaffst das!', 6: 'Nicht aufgeben! Schau dir die Fehler an und versuche es nochmal.' }[entry.note];
    var root = h('div', { class: 'screen result', 'data-view': 'result' },
      topBar('Ergebnis'),
      h('section', { class: 'card big-result n' + entry.note },
        h('div', { class: 'score' }, entry.score + ' / ' + entry.total), h('div', { class: 'sub' }, 'Punkte · ' + entry.percent + ' %'),
        h('div', { class: 'note' }, 'Note ' + entry.note + ' – ' + NOTE_TXT[entry.note]),
        h('p', { class: 'msg' }, msg),
        h('div', { class: 'sub' }, '⏱ Zeit: ' + mmss(entry.sec))),
      h('section', { class: 'card rewards' }, h('h2', {}, 'Deine Belohnung'),
        rewards.map(function (r) { return h('div', { class: 'rw' }, h('span', { class: 'ico' }, r.icon), h('span', { class: 'rt' }, r.text), r.n ? h('b', { class: 'plus' }, '+' + r.n + ' ⭐') : null); }),
        entry.stars ? h('div', { class: 'total' }, 'Zusammen: +' + entry.stars + ' ⭐ (jetzt ' + cur().stars + ')') : null),
      h('div', { class: 'stack' },
        btn('🔍 Fehler ansehen', function () { viewReview(entry, function () { showResult(entry, rewards, jackpot, back); }); }, 'go'),
        entry.type === 'exam' ? btn('🔁 Test nochmal machen (gleiche Aufgaben)', function () { launch(Object.assign(cfgFromEntry(entry), { retry: true, back: back })); }, 'ghost') : null,
        entry.type === 'exam' ? btn('🆕 Neuer Test (neue Aufgaben)', function () { startExam(entry.topicId, back); }, 'ghost') : null,
        btn('🏠 Zur Startseite', viewHome, 'ghost')));
    mount(root);
    if (good || jackpot) confetti(jackpot ? ['🍭', '🍬', '🍫', '⭐', '🎉'] : ['⭐', '🌟', '🏆', '🎉']);
  }

  function viewReview(entry, back) {
    var only = false;
    var list = h('div', { class: 'reviewlist' });
    var wrong = entry.tasks.filter(function (t, i) { return !taskOk(t, entry.ans[i]); });
    var toggle = h('button', { class: 'btn small ghost', type: 'button', onclick: function () { only = !only; toggle.textContent = only ? 'Alle zeigen' : 'Nur Fehler zeigen'; draw(); } }, 'Nur Fehler zeigen');
    function draw() {
      list.replaceChildren();
      entry.tasks.forEach(function (t, i) {
        var ok = taskOk(t, entry.ans[i]);
        if (only && ok) return;
        var card = h('section', { class: 'card rv ' + (ok ? 'rok' : 'rbad') },
          h('div', { class: 'rvhead' }, h('b', {}, 'Aufgabe ' + (i + 1)), h('span', { class: 'mark' }, ok ? '✅ richtig' : '❌ falsch')),
          renderTask(t, entry.ans[i] || [], { locked: true }));
        if (!ok) card.appendChild(h('div', { class: 'fb wrong', html: 'Richtig wäre: <b>' + t.solution + '</b>' }));
        list.appendChild(card);
      });
      if (!list.children.length) list.appendChild(h('div', { class: 'card center' }, 'Keine Fehler – alles richtig! 🎉'));
    }
    draw();
    var root = h('div', { class: 'screen', 'data-view': 'review' },
      topBar('Auswertung', back),
      h('section', { class: 'card sumrow' },
        h('div', {}, h('b', {}, entry.title), h('div', { class: 'sub' }, fmtDate(entry.ts))),
        h('div', { class: 'sumscore' }, entry.score + '/' + entry.total), h('div', { class: 'notebadge n' + entry.note }, 'Note ' + entry.note)),
      h('div', { class: 'row wrap' }, toggle,
        wrong.length ? btn('✏️ Nur die Fehler nochmal üben', function () { launch({ mode: 'daily', type: entry.type, subject: entry.subject, title: 'Fehler üben', tasks: wrong, save: false, back: function () { viewReview(entry, back); } }); }, 'go small') : null,
        entry.type === 'exam' ? btn('🔁 Ganzen Test nochmal', function () { launch(Object.assign(cfgFromEntry(entry), { retry: true, back: back })); }, 'ghost small') : null),
      list);
    mount(root);
  }

  /* ---------- Startseite ---------- */
  function viewHome() {
    var p = cur(); if (!p) return viewProfiles();
    var d = p.daily[today()] || {};
    var doneN = SUBJECTS.filter(function (s) { return d[s]; }).length;
    var lv = levelOf(p.stars);
    var days = daysBetween(today(), EXAM.date);
    var bestAll = bestNote(p, 'exam', null);

    var subjBtns = SUBJECTS.map(function (s) {
      var m = SUBJ[s], done = d[s];
      return h('button', {
        class: 'subj ' + m.cls + (done ? ' done' : ''), type: 'button',
        onclick: function () { done ? openDailyEntry(done.id) : startDaily(s); }
      }, h('span', { class: 'e' }, m.emoji), h('b', {}, m.name), h('span', { class: 'st' }, done ? '✅ Note ' + done.note : '▶ ca. 5 Min.'));
    });

    var root = h('div', { class: 'screen home', 'data-view': 'home' },
      h('header', { class: 'hello' },
        h('button', { class: 'avatar', type: 'button', onclick: viewProfiles, title: 'Kind wechseln' }, p.avatar),
        h('div', { class: 'who' }, h('h1', {}, 'Hallo ' + p.name + '!'), h('div', { class: 'sub' }, lv.name)),
        h('div', { class: 'chips' }, chip('⭐', p.stars), chip('🔥', effStreak(p)), chip('🍭', p.stickers.length))),
      h('section', { class: 'card daily' },
        h('h2', {}, '📅 Heute: 15 Minuten'),
        h('p', { class: 'sub' }, doneN === 3 ? '🎉 Geschafft! Deine Tages-Belohnung hast du dir geholt.' : 'Mache alle 3 Fächer (je ca. 5 Min.) und hol dir deine Belohnung!'),
        h('div', { class: 'prog' }, h('div', { class: 'fill', style: 'width:' + (doneN / 3 * 100) + '%' })),
        h('div', { class: 'subjects' }, subjBtns)),
      (days >= 0) ? h('section', { class: 'card exam' },
        h('h2', {}, '📝 ' + EXAM.title + ' am ' + EXAM.dateLabel),
        h('div', { class: 'count-big' }, days === 0 ? 'Heute ist es soweit – du schaffst das! 💪' : 'Noch ' + days + (days === 1 ? ' Tag' : ' Tage')),
        bestAll ? h('p', { class: 'sub' }, 'Beste Note im Gesamttest: ' + bestAll) : h('p', { class: 'sub' }, 'Übe mit Timer-Tests und sieh danach deine Punkte.'),
        btn('Prüfung üben ▶', viewExam, 'go big')) : null,
      h('div', { class: 'tiles' },
        tile('🏆', 'Belohnungen', viewRewards), tile('📊', 'Meine Ergebnisse', viewHistory), tile('⚙️', 'Eltern', viewSettings)),
      h('footer', { class: 'foot' }, 'Lernspaß · Version ' + VERSION));
    mount(root);
  }
  function tile(e, label, fn) { return h('button', { class: 'tile', type: 'button', onclick: fn }, h('span', { class: 'e' }, e), h('b', {}, label)); }
  function bestNote(p, type, topicId) {
    var best = null;
    p.history.forEach(function (e) { if (e.type === type && (e.topicId || null) === topicId && !e.retry && (best == null || e.note < best)) best = e.note; });
    return best;
  }

  /* ---------- Täglich 15 Minuten ---------- */
  function startDaily(subject) {
    var p = cur(), seed = G.hashStr(p.id + today() + subject), r = new G.Rng(seed);
    var tasks = { math: G.dailyMath, deutsch: G.dailyDeutsch, english: G.dailyEnglish }[subject](r);
    launch({ mode: 'daily', type: 'daily', subject: subject, title: SUBJ[subject].emoji + ' ' + SUBJ[subject].name, tasks: tasks, target: DAILY_TARGET_SEC, back: viewHome });
  }
  function openDailyEntry(id) {
    var p = cur(), e = p.history.filter(function (x) { return x.id === id; })[0];
    if (e) viewReview(e, viewHome); else toast('Schon erledigt ✅');
  }

  /* ---------- Prüfungsvorbereitung ---------- */
  function viewExam() {
    var p = cur();
    var topics = G.MATH_TOPICS.map(function (tp) {
      var b = bestNote(p, 'exam', tp.id);
      return h('button', { class: 'topic', type: 'button', onclick: function () { viewExamIntro(tp.id); } }, h('span', { class: 'e' }, tp.emoji), h('b', {}, tp.name), h('span', { class: 'st' }, b ? 'Beste Note: ' + b : '6 Aufgaben · 10 Min.'));
    });
    var bAll = bestNote(p, 'exam', null);
    mount(h('div', { class: 'screen', 'data-view': 'exam' },
      topBar('Prüfung üben', viewHome),
      h('section', { class: 'card' }, h('h2', {}, '📝 ' + EXAM.title + ' am ' + EXAM.dateLabel),
        h('p', {}, 'Mit Zeit-Uhr. Danach siehst du deine Punkte und deine Note und kannst die Fehler anschauen.'),
        btn('⏱ Gesamttest starten (24 Aufgaben · 30 Min.)', function () { viewExamIntro(null); }, 'go big'),
        bAll ? h('p', { class: 'sub' }, 'Beste Note: ' + bAll) : null),
      h('h2', { class: 'sec' }, 'Oder ein Thema üben'),
      h('div', { class: 'topics' }, topics)));
  }
  function viewExamIntro(topicId) {
    var tp = topicId ? G.topicOf(topicId) : null;
    var tips = tp ? [h('li', {}, tp.tip)] : G.MATH_TOPICS.map(function (t) { return h('li', {}, h('b', {}, t.emoji + ' ' + t.name + ': '), t.tip); });
    mount(h('div', { class: 'screen', 'data-view': 'intro' },
      topBar(tp ? tp.name : 'Gesamttest', viewExam),
      h('section', { class: 'card' }, h('h2', {}, '💡 Merkzettel'), h('ul', { class: 'tips' }, tips)),
      h('section', { class: 'card center' },
        h('p', {}, tp ? '6 Aufgaben · 10 Minuten' : '24 Aufgaben · 30 Minuten'),
        h('p', { class: 'sub' }, 'Die Zeit läuft rückwärts. Du kannst zwischen den Aufgaben hin- und herspringen und am Ende abgeben.'),
        btn('🚀 Los geht’s!', function () { startExam(topicId, viewExam); }, 'go big'))));
  }
  function startExam(topicId, back) {
    var res = G.makeMathTest(Date.now() & 0x7fffffff, topicId || null);
    launch({ mode: 'exam', type: 'exam', subject: EXAM.subject, topicId: topicId || null, title: res.title, tasks: res.tasks, limit: res.limit, back: back || viewExam });
  }

  /* ---------- Belohnungen ---------- */
  function viewRewards() {
    var p = cur(), lv = levelOf(p.stars);
    var owned = {}; p.stickers.forEach(function (s) { owned[s.e] = (owned[s.e] || 0) + 1; });
    var nextTxt = lv.next ? 'Noch ' + (lv.next[0] - p.stars) + ' ⭐ bis „' + lv.next[1] + '“' : 'Höchste Stufe erreicht! 🎉';
    var album = CANDIES.map(function (c) { return h('div', { class: 'stk' + (owned[c] ? ' got' : '') }, owned[c] ? c : '❔'); });
    var spec = h('div', { class: 'spec' },
      h('div', { class: 'stk got' }, '🏆'), h('b', {}, '× ' + (owned['🏆'] || 0)), h('span', { class: 'sub' }, 'Note 1'),
      h('div', { class: 'stk got' }, '🥈'), h('b', {}, '× ' + (owned['🥈'] || 0)), h('span', { class: 'sub' }, 'Note 2'));
    mount(h('div', { class: 'screen', 'data-view': 'rewards' },
      topBar('Meine Belohnungen', viewHome),
      h('section', { class: 'card center' }, h('div', { class: 'bigstars' }, '⭐ ' + p.stars), h('div', { class: 'lvl' }, lv.name), h('p', { class: 'sub' }, nextTxt),
        h('p', { class: 'sub' }, '🔥 Serie: ' + effStreak(p) + ' Tage in Folge')),
      h('section', { class: 'card' }, h('h2', {}, '🍭 Süßigkeiten-Album'), h('p', { class: 'sub' }, 'Jeden Tag, an dem du alle 15 Minuten schaffst, bekommst du eine neue Süßigkeit!'), h('div', { class: 'album' }, album)),
      h('section', { class: 'card' }, h('h2', {}, '🏅 Extra-Belohnungen'), spec, h('p', { class: 'sub' }, 'Für Note 1 oder Note 2 gibt es Extra-Sterne und einen Sticker.')),
      h('section', { class: 'card' }, h('h2', {}, '⭐ So bekommst du Sterne'), h('ul', { class: 'tips' },
        h('li', {}, '1 ⭐ für jede richtige Antwort'), h('li', {}, '+10 ⭐ und eine Süßigkeit, wenn du heute alle 3 Fächer geschafft hast'),
        h('li', {}, '+5 ⭐ extra für Note 1, +3 ⭐ extra für Note 2'), h('li', {}, '+10 ⭐ Serien-Bonus nach 3, 7, 14 und 30 Tagen in Folge')))));
  }

  /* ---------- Ergebnisse & Export ---------- */
  function viewHistory() {
    var p = cur();
    var items = p.history.slice().reverse().map(function (e) {
      return h('button', { class: 'hrow', type: 'button', onclick: function () { viewReview(e, viewHistory); } },
        h('span', { class: 'e' }, e.type === 'exam' ? '📝' : SUBJ[e.subject].emoji),
        h('span', { class: 'ht' }, h('b', {}, e.title + (e.retry ? ' (Wiederholung)' : '')), h('span', { class: 'sub' }, fmtDate(e.ts) + ' · ' + mmss(e.sec))),
        h('span', { class: 'hs' }, e.score + '/' + e.total), h('span', { class: 'notebadge n' + e.note }, 'Note ' + e.note));
    });
    mount(h('div', { class: 'screen', 'data-view': 'history' },
      topBar('Meine Ergebnisse', viewHome),
      h('div', { class: 'row wrap' }, btn('⬇️ Als Tabelle (CSV)', function () { exportCSV(p); }, 'ghost small'), btn('⬇️ Komplette Sicherung (JSON)', function () { exportJSON(p); }, 'ghost small')),
      items.length ? h('div', { class: 'hlist' }, items) : h('section', { class: 'card center' }, 'Noch keine Ergebnisse. Mach deine erste Aufgabe! 🚀')));
  }
  function download(name, text, mime) {
    var blob = new Blob([text], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = h('a', { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 5000);
  }
  function csvCell(v) { v = String(v == null ? '' : v); return '"' + v.replace(/"/g, '""') + '"'; }
  function exportCSV(p) {
    var head = ['Datum', 'Uhrzeit', 'Kind', 'Art', 'Fach', 'Titel', 'Punkte', 'Maximal', 'Prozent', 'Note', 'Dauer', 'Sterne', 'Wiederholung'];
    var rows = p.history.map(function (e) {
      var d = new Date(e.ts);
      return [pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.' + d.getFullYear(), pad(d.getHours()) + ':' + pad(d.getMinutes()), p.name, e.type === 'exam' ? 'Prüfungsvorbereitung' : 'Tagesaufgabe', SUBJ[e.subject].name, e.title, e.score, e.total, e.percent, e.note, mmss(e.sec), e.stars, e.retry ? 'ja' : 'nein'];
    });
    var fails = [['', '', '', '', '', '', '', '', '', '', '', '', ''], ['Falsch beantwortete Aufgaben'], ['Datum', 'Titel', 'Aufgabe', 'Antwort des Kindes', 'Richtig wäre']];
    p.history.forEach(function (e) {
      e.tasks.forEach(function (t, i) {
        if (!taskOk(t, e.ans[i])) fails.push([fmtDate(e.ts), e.title, decode((t.q || '') + ' ' + (t.parts ? t.parts.map(function (x) { return typeof x === 'string' ? x : (x.html ? x.html : ' _ '); }).join(' ') : '')), yourAnswer(t, e.ans[i]), decode(t.solution)]);
      });
    });
    var csv = '﻿' + [head].concat(rows).concat(fails).map(function (r) { return r.map(csvCell).join(';'); }).join('\r\n');
    download('Lernspass-' + p.name + '-' + today() + '.csv', csv, 'text/csv;charset=utf-8');
    p.exportedAt = Date.now(); save();
    toast('Tabelle wurde heruntergeladen.');
  }
  function exportJSON(p) {
    download('Lernspass-Sicherung-' + p.name + '-' + today() + '.json', JSON.stringify({ app: 'lernspass', version: VERSION, exported: new Date().toISOString(), profile: p }, null, 1), 'application/json');
    p.exportedAt = Date.now(); save();
    toast('Sicherung wurde heruntergeladen.');
  }
  function importJSON(file) {
    var fr = new FileReader();
    fr.onload = function () {
      try {
        var d = JSON.parse(fr.result);
        if (!d || d.app !== 'lernspass' || !d.profile || !d.profile.name) throw new Error('bad');
        var pr = d.profile; pr.id = uid();
        pr.stickers = pr.stickers || []; pr.history = pr.history || []; pr.daily = pr.daily || {};
        DB.profiles[pr.id] = pr; DB.current = pr.id; save();
        toast('Sicherung für ' + pr.name + ' wurde geladen.'); viewHome();
      } catch (e) { toast('Diese Datei ist keine gültige Sicherung.'); }
    };
    fr.readAsText(file);
  }

  /* ---------- Profile ---------- */
  function viewProfiles() {
    var ids = Object.keys(DB.profiles);
    if (!ids.length) return viewNewProfile();
    var list = ids.map(function (id) {
      var p = DB.profiles[id];
      return h('button', { class: 'prof', type: 'button', onclick: function () { DB.current = id; save(); viewHome(); } }, h('span', { class: 'e' }, p.avatar), h('b', {}, p.name), h('span', { class: 'sub' }, '⭐ ' + p.stars));
    });
    mount(h('div', { class: 'screen center', 'data-view': 'profiles' },
      h('h1', { class: 'title' }, '👋 Wer lernt heute?'), h('div', { class: 'profs' }, list),
      btn('➕ Neues Kind', viewNewProfile, 'ghost')));
  }
  function viewNewProfile() {
    var av = AVATARS[0];
    var name = h('input', { class: 'namebox', type: 'text', placeholder: 'Dein Name', maxlength: '20', autocomplete: 'off', autocapitalize: 'words', 'aria-label': 'Name' });
    var grid = h('div', { class: 'avatars' });
    AVATARS.forEach(function (a) {
      var b = h('button', { class: 'avopt' + (a === av ? ' sel' : ''), type: 'button', onclick: function () { av = a; Array.prototype.forEach.call(grid.children, function (x) { x.classList.toggle('sel', x === b); }); } }, a);
      grid.appendChild(b);
    });
    function create() {
      var nm = name.value.trim();
      if (!nm) { toast('Bitte schreibe deinen Namen.'); name.focus(); return; }
      var p = { id: uid(), name: nm, avatar: av, created: Date.now(), stars: 0, stickers: [], streak: 0, lastDaily: null, history: [], daily: {} };
      DB.profiles[p.id] = p; DB.current = p.id; save(); viewHome();
    }
    name.addEventListener('keydown', function (e) { if (e.key === 'Enter') create(); });
    mount(h('div', { class: 'screen center', 'data-view': 'newprofile' },
      Object.keys(DB.profiles).length ? topBar('Neues Kind', viewProfiles) : null,
      h('h1', { class: 'title' }, '🌟 Willkommen bei Lernspaß!'), h('p', {}, 'Wie heißt du?'), name,
      h('p', {}, 'Wähle dein Tier:'), grid, btn('Los geht’s! 🚀', create, 'go big')));
  }

  /* ---------- Eltern-Bereich ---------- */
  function parentGate(then) {
    var a = 12 + Math.floor(Math.random() * 8), b = 6 + Math.floor(Math.random() * 4);
    var inp = h('input', { class: 'fld num', type: 'text', inputmode: 'numeric', 'aria-label': 'Antwort' });
    var close;
    function ok() { if (Number(inp.value) === a * b) { close(); then(); } else { toast('Leider falsch.'); inp.value = ''; } }
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') ok(); });
    close = modal([h('h2', {}, '🔒 Nur für Eltern'), h('p', {}, 'Wie viel ist ' + a + ' · ' + b + ' ?'), inp,
      h('div', { class: 'row' }, btn('Abbrechen', function () { close(); }, 'ghost'), btn('OK', ok, 'go'))]);
    setTimeout(function () { inp.focus(); }, 100);
  }
  function viewSettings() {
    var p = cur();
    var file = h('input', { type: 'file', accept: '.json,application/json', class: 'hidden', onchange: function () { if (file.files[0]) importJSON(file.files[0]); } });
    mount(h('div', { class: 'screen', 'data-view': 'settings' },
      topBar('Eltern-Bereich', viewHome),
      h('section', { class: 'card' }, h('h2', {}, p.avatar + ' ' + p.name),
        h('p', { class: 'sub' }, 'Alle Daten sind nur auf diesem iPad gespeichert. Mache regelmäßig eine Sicherung.'),
        h('div', { class: 'stack' },
          btn('⬇️ Ergebnisse als Tabelle (CSV)', function () { exportCSV(p); }, 'ghost'),
          btn('⬇️ Komplette Sicherung (JSON)', function () { exportJSON(p); }, 'ghost'),
          btn('⬆️ Sicherung einlesen', function () { file.click(); }, 'ghost'), file,
          btn('🔄 Kind wechseln', viewProfiles, 'ghost'),
          btn('🗑️ Profil löschen …', function () { parentGate(function () { deleteFlow(p); }); }, 'danger'))),
      h('section', { class: 'card' }, h('h2', {}, 'App'), h('p', { class: 'sub' }, 'Version ' + VERSION),
        btn('🔎 Nach Update suchen', checkUpdate, 'ghost'),
        h('p', { class: 'sub' }, 'Neue Versionen werden automatisch geladen, sobald das iPad Internet hat und die App geöffnet wird.'))));
  }
  function deleteFlow(p) {
    var downloaded = !p.history.length, close, delBtn;
    function enable() { downloaded = true; delBtn.classList.remove('dis'); delBtn.disabled = false; }
    delBtn = btn('Endgültig löschen', function () {
      if (!downloaded) return;
      delete DB.profiles[p.id]; DB.current = Object.keys(DB.profiles)[0] || null; save(); close(); toast('Profil wurde gelöscht.'); viewProfiles();
    }, 'danger' + (downloaded ? '' : ' dis'));
    delBtn.disabled = !downloaded;
    close = modal([
      h('h2', {}, 'Profil „' + p.name + '“ löschen?'),
      h('p', {}, 'Alle Sterne, Sticker und Ergebnisse sind danach weg. ' + (p.history.length ? 'Lade vorher die Ergebnisse herunter:' : '')),
      p.history.length ? h('div', { class: 'stack' }, btn('⬇️ Ergebnisse als Tabelle (CSV)', function () { exportCSV(p); enable(); }, 'ghost'), btn('⬇️ Komplette Sicherung (JSON)', function () { exportJSON(p); enable(); }, 'ghost')) : null,
      h('div', { class: 'row' }, btn('Abbrechen', function () { close(); }, 'go'), delBtn)
    ]);
  }

  /* ---------- Updates (Service Worker) ---------- */
  var swReg = null;
  function showUpdateBanner() {
    if (document.querySelector('.updatebar')) return;
    document.body.appendChild(h('button', { class: 'updatebar', type: 'button', onclick: function () { location.reload(); } }, '✨ Neue Version ist da! Tippe hier zum Neuladen.'));
  }
  function checkUpdate() {
    if (!swReg) return toast('Update-Suche geht nur mit Internet in der installierten App.');
    toast('Suche nach Updates …');
    swReg.update().then(function () { setTimeout(function () { if (!document.querySelector('.updatebar')) toast('Du hast die neueste Version ✅'); }, 1500); }).catch(function () { toast('Gerade kein Internet.'); });
  }
  if ('serviceWorker' in navigator) {
    var hadController = !!navigator.serviceWorker.controller;
    navigator.serviceWorker.addEventListener('controllerchange', function () { if (hadController) showUpdateBanner(); hadController = true; });
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').then(function (reg) { swReg = reg; reg.update().catch(function () { }); }).catch(function () { });
    });
    document.addEventListener('visibilitychange', function () { if (!document.hidden && swReg) swReg.update().catch(function () { }); });
  }
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) { }

  /* ---------- Start ---------- */
  if (cur()) viewHome(); else viewProfiles();
})();
