import { createServer } from 'node:http';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { openDb, all, one, run, ROOT } from './db.mjs';

const PORT = Number(process.env.PORT || 4173);
const PUBLIC = join(ROOT, 'course', 'public');
const db = openDb();

// Версия кэшей service worker. Считается от статики и текстов уроков:
// поменялся хоть один — установленное приложение сбрасывает старый кэш.
const SHELL_VERSION = (() => {
  const h = createHash('sha1');
  for (const f of ['style.css', 'sw.js', 'manifest.webmanifest']) h.update(readFileSync(join(PUBLIC, f)));
  const lessons = join(ROOT, 'course', 'lessons');
  for (const f of readdirSync(lessons).sort()) {
    h.update(f);
    h.update(readFileSync(join(lessons, f)));
  }
  return h.digest('hex').slice(0, 12);
})();

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const pad = (n) => String(n).padStart(2, '0');

const STATUS_LABEL = {
  locked: 'закрыт', available: 'доступен', in_progress: 'в работе', done: 'пройден',
};

const PRACTICE_LABEL = {
  todo: 'не начато', doing: 'в работе', done: 'сдано', skipped: 'пропущено',
};

// ---------------------------------------------------------------- данные

const lessonsWithModules = () => all(db, `
  SELECT l.*, m.num AS module_num, m.title AS module_title, m.goal AS module_goal
  FROM lessons l JOIN modules m ON m.id = l.module_id
  ORDER BY l.num`);

const dueCount = () => one(db,
  `SELECT count(*) AS n FROM reviews WHERE due_at <= date('now')`).n;

const stats = () => {
  const s = one(db, `
    SELECT count(*) AS total,
           sum(status = 'done') AS done,
           sum(status = 'in_progress') AS doing
    FROM lessons`);
  return { total: s.total, done: s.done ?? 0, doing: s.doing ?? 0 };
};

// ---------------------------------------------------------------- вёрстка

function layout(title, body, active = '') {
  const st = stats();
  const pct = Math.round((st.done / st.total) * 100);
  const due = dueCount();
  const nav = (href, label, badge = '') =>
    `<a class="navlink${active === href ? ' on' : ''}" href="${href}">${label}${
      badge ? `<span class="badge">${badge}</span>` : ''}</a>`;

  const modules = all(db, 'SELECT * FROM modules ORDER BY num');
  const lessons = lessonsWithModules();
  const tree = modules.map((m) => {
    const items = lessons.filter((l) => l.module_num === m.num).map((l) => `
      <a class="tl ${l.status}${active === `/lesson/${l.num}` ? ' on' : ''}" href="/lesson/${l.num}">
        <span class="tlnum">${pad(l.num)}</span>
        <span class="tltitle">${esc(l.title)}</span>
      </a>`).join('');
    return `<div class="mod"><div class="modtitle">M${m.num} · ${esc(m.title)}</div>${items}</div>`;
  }).join('');

  return `<!doctype html><html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} — Frontend System Design</title>
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#14161a">
<link rel="icon" href="/static/icon-192.png" type="image/png">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black">
<meta name="apple-mobile-web-app-title" content="System Design">
<link rel="stylesheet" href="/static/style.css">
</head><body>
<aside class="side">
  <div class="brand"><a href="/">Frontend<br><b>System Design</b></a></div>
  <div class="progress"><div class="bar"><i style="width:${pct}%"></i></div>
    <div class="pmeta">${st.done}/${st.total} уроков · ${pct}%</div></div>
  <nav class="mainnav">
    ${nav('/', 'Роадмап')}
    ${nav('/review', 'Повторение', due || '')}
    ${nav('/mistakes', 'Ошибки')}
    ${nav('/mocks', 'Мок-собесы')}
  </nav>
  <div class="tree">${tree}</div>
</aside>
<main class="main">${body}</main>
<script>navigator.serviceWorker?.register('/sw.js');</script>
</body></html>`;
}

// ---------------------------------------------------------------- страницы

function pageRoadmap() {
  const lessons = lessonsWithModules();
  const mocks = all(db, 'SELECT * FROM mocks ORDER BY after_lesson');
  const modules = all(db, 'SELECT * FROM modules ORDER BY num');

  const practice = new Map();
  for (const p of all(db, 'SELECT lesson_id, status FROM practice')) {
    const acc = practice.get(p.lesson_id) ?? { total: 0, done: 0 };
    acc.total += 1;
    if (p.status === 'done') acc.done += 1;
    practice.set(p.lesson_id, acc);
  }
  const next = lessons.find((l) => l.status === 'in_progress')
            || lessons.find((l) => l.status === 'available')
            || lessons.find((l) => l.status !== 'done');

  const blocks = modules.map((m) => {
    const ls = lessons.filter((l) => l.module_num === m.num);
    const rows = ls.map((l) => {
      const mk = mocks.filter((x) => x.after_lesson === l.num).map((x) => `
        <div class="mockrow ${x.status}">
          <span class="mocktag">MOCK</span>
          <span>${esc(x.title)}</span>
          <span class="dim">${x.minutes} мин</span>
        </div>`).join('');
      return `
      <a class="card ${l.status}" href="/lesson/${l.num}">
        <div class="cardnum">${pad(l.num)}</div>
        <div class="cardbody">
          <div class="cardtitle">${esc(l.title)}</div>
          <div class="cardsum">${esc(l.summary)}</div>
          <div class="cardmeta">
            <span class="chip ${l.status}">${STATUS_LABEL[l.status]}</span>
            ${l.content_ready ? '' : '<span class="chip todo">материал не готов</span>'}
            ${practice.has(l.id) ? `<span class="chip ${
              practice.get(l.id).done === practice.get(l.id).total ? 'done' : 'todo'
            }">практика ${practice.get(l.id).done}/${practice.get(l.id).total}</span>` : ''}
            ${l.sources ? `<span class="dim">источники: уроки Паромова ${esc(l.sources)}</span>` : ''}
          </div>
        </div>
      </a>${mk}`;
    }).join('');
    return `<section class="modblock">
      <h2>Модуль ${m.num}. ${esc(m.title)}</h2>
      <p class="modgoal">${esc(m.goal)}</p>
      ${rows}
    </section>`;
  }).join('');

  const body = `
    <header class="head">
      <h1>Роадмап курса</h1>
      <p class="lead">26 уроков · ~2 часа в день · 6–7 недель. 60% системный дизайн на собесе,
      40% архитектура кодовой базы. Ответы и разбор — в чате, прогресс — здесь.</p>
      ${next ? `<a class="cta" href="/lesson/${next.num}">Продолжить: ${pad(next.num)} · ${esc(next.title)}</a>` : ''}
    </header>
    ${blocks}`;
  return layout('Роадмап', body, '/');
}

function pageLesson(num) {
  const l = one(db, `SELECT l.*, m.num AS module_num, m.title AS module_title
                     FROM lessons l JOIN modules m ON m.id = l.module_id WHERE l.num = ?`, num);
  if (!l) return null;

  const file = join(ROOT, 'course', 'lessons', `${pad(l.num)}-${l.slug}.html`);
  const content = existsSync(file) ? readFileSync(file, 'utf8') : `
    <div class="empty">
      <h2>Материал ещё не написан</h2>
      <p>Этот урок есть в роадмапе, но страницу я собираю по мере продвижения —
      чтобы содержание учитывало, где ты плывёшь на предыдущих темах.</p>
      <p>Напиши в чате «делай урок ${l.num}» — и он появится здесь.</p>
    </div>`;

  const qs = all(db, 'SELECT * FROM questions WHERE lesson_id = ? ORDER BY difficulty, id', l.id);
  const tasks = all(db, 'SELECT * FROM tasks WHERE lesson_id = ? ORDER BY id', l.id);

  const qBlock = qs.length ? `
    <section class="qblock">
      <h2>Вопросы на разбор</h2>
      <p class="dim">Отвечать в чате. Я оцениваю 0–5 и ставлю дату повтора.</p>
      <ol class="qlist">${qs.map((q) => {
        const last = one(db, `SELECT score, answered_at FROM attempts
                              WHERE question_id = ? ORDER BY id DESC LIMIT 1`, q.id);
        const rv = one(db, 'SELECT due_at FROM reviews WHERE question_id = ?', q.id);
        return `<li class="q ${q.kind}">
          <span class="kind ${q.kind}">${q.kind}</span>
          ${esc(q.question)}
          ${last ? `<span class="score s${last.score}">${last.score}/5</span>` : ''}
          ${rv ? `<span class="dim">повтор ${rv.due_at}</span>` : ''}
        </li>`;
      }).join('')}</ol>
    </section>` : '';

  const tBlock = tasks.length ? `
    <section class="qblock">
      <h2>Микро-задачки</h2>
      <ul class="tlist">${tasks.map((t) => `
        <li class="task ${t.status}">
          <b>${esc(t.title)}</b> <span class="dim">${t.est_minutes} мин</span>
          ${t.body ? `<div class="taskbody">${esc(t.body)}</div>` : ''}
        </li>`).join('')}</ul>
    </section>` : '';

  const practice = all(db, 'SELECT * FROM practice WHERE lesson_id = ? ORDER BY id', l.id);
  const pBlock = practice.length ? `
    <section class="qblock">
      <h2>Практика</h2>
      <p class="dim">Запускаемые упражнения: правится <code>src/</code>, тесты — контракт.
      Решил — скажи в чате «сдаю упражнение ${esc(practice[0].slug.slice(0, 2))}».</p>
      ${practice.map((p) => `
        <div class="pract ${p.status}">
          <div class="practhead">
            <b>${esc(p.title)}</b>
            <span class="chip ${p.status === 'done' ? 'done' : 'todo'}">${PRACTICE_LABEL[p.status]}</span>
            <span class="dim">${p.est_minutes} мин · practice/${esc(p.slug)}/</span>
          </div>
          ${p.goal ? `<div class="taskbody">${esc(p.goal)}</div>` : ''}
          <div class="pcmd"><code>${esc(p.command)}</code></div>
          ${p.checklist ? `<ul class="pcheck">${p.checklist.split('\n')
            .map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
          ${p.reference ? `<div class="pref">сверка после решения: <code>${esc(p.reference)}</code></div>` : ''}
          ${p.notes ? `<div class="mfix">${esc(p.notes)}</div>` : ''}
        </div>`).join('')}
    </section>` : '';

  const prev = one(db, 'SELECT num, title FROM lessons WHERE num = ?', num - 1);
  const nxt = one(db, 'SELECT num, title FROM lessons WHERE num = ?', num + 1);

  const body = `
    <header class="head lessonhead">
      <div class="crumb">Модуль ${l.module_num} · ${esc(l.module_title)}</div>
      <h1><span class="bignum">${pad(l.num)}</span> ${esc(l.title)}</h1>
      <p class="lead">${esc(l.summary)}</p>
      <div class="statusrow">
        <span class="chip ${l.status}">${STATUS_LABEL[l.status]}</span>
        <button class="sbtn" data-num="${l.num}" data-status="in_progress">начал</button>
        <button class="sbtn" data-num="${l.num}" data-status="done">прошёл</button>
      </div>
    </header>
    <article class="lesson">${content}</article>
    ${qBlock}${pBlock}${tBlock}
    <nav class="pager">
      ${prev ? `<a href="/lesson/${prev.num}">← ${pad(prev.num)} ${esc(prev.title)}</a>` : '<span></span>'}
      ${nxt ? `<a href="/lesson/${nxt.num}">${pad(nxt.num)} ${esc(nxt.title)} →</a>` : '<span></span>'}
    </nav>
    <script>
    document.querySelectorAll('.sbtn').forEach(b => b.onclick = async () => {
      try {
        await fetch('/api/lesson/' + b.dataset.num + '/status', {
          method: 'POST', headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ status: b.dataset.status }) });
        location.reload();
      } catch { b.textContent = 'нет сети'; }
    });
    </script>`;
  return layout(`${pad(l.num)} · ${l.title}`, body, `/lesson/${num}`);
}

function pageReview() {
  const rows = all(db, `
    SELECT q.question, q.kind, q.lesson_id, r.due_at, r.interval_days, r.reps, r.last_score,
           l.num AS lnum, l.title AS ltitle
    FROM reviews r JOIN questions q ON q.id = r.question_id
    LEFT JOIN lessons l ON l.id = q.lesson_id
    ORDER BY r.due_at`);
  const due = rows.filter((r) => r.due_at <= new Date().toISOString().slice(0, 10));
  const later = rows.filter((r) => !due.includes(r));
  const list = (arr) => arr.length ? `<ul class="qlist">${arr.map((r) => `
      <li class="q">
        <span class="kind ${r.kind}">${r.kind}</span>${esc(r.question)}
        <div class="dim">урок ${pad(r.lnum)} · ${esc(r.ltitle)} · повторов ${r.reps} ·
        интервал ${r.interval_days} дн · последняя оценка ${r.last_score ?? '—'} · ${r.due_at}</div>
      </li>`).join('')}</ul>` : '<p class="dim">пусто</p>';

  return layout('Повторение', `
    <header class="head"><h1>Интервальные повторения</h1>
    <p class="lead">Вопросы, которые пора вытащить из памяти заново. Скажи в чате «повторение» —
    и я прогоню тебя по этому списку.</p></header>
    <section class="modblock"><h2>Пора повторить — ${due.length}</h2>${list(due)}</section>
    <section class="modblock"><h2>Впереди — ${later.length}</h2>${list(later)}</section>`, '/review');
}

function pageMistakes() {
  const rows = all(db, `SELECT ms.*, l.num AS lnum, l.title AS ltitle FROM mistakes ms
                        LEFT JOIN lessons l ON l.id = ms.lesson_id ORDER BY resolved, ms.id DESC`);
  const body = rows.length ? `<ul class="mlist">${rows.map((m) => `
      <li class="mistake ${m.resolved ? 'ok' : ''}">
        <div class="mtopic">${esc(m.topic || 'без темы')}
          ${m.lnum ? `<span class="dim">урок ${pad(m.lnum)}</span>` : ''}</div>
        <div class="mwrong">${esc(m.wrong)}</div>
        ${m.correction ? `<div class="mfix">→ ${esc(m.correction)}</div>` : ''}
      </li>`).join('')}</ul>`
    : '<p class="dim">Пока пусто. Появится после первых разборов.</p>';
  return layout('Ошибки', `
    <header class="head"><h1>Журнал ошибок</h1>
    <p class="lead">Всё, что ты путал или не смог объяснить. Именно это всплывёт на повторе
    и на мок-собесах — не общие темы, а твои личные дыры.</p></header>
    <section class="modblock">${body}</section>`, '/mistakes');
}

function pageMocks() {
  const rows = all(db, 'SELECT * FROM mocks ORDER BY after_lesson');
  return layout('Мок-собесы', `
    <header class="head"><h1>Мок-собеседования</h1>
    <p class="lead">Каждые три урока. Формат жёсткий: перебиваю, требую обосновать trade-off,
    не подсказываю. Разбор и оценка — после.</p></header>
    <section class="modblock">${rows.map((m) => `
      <div class="card ${m.status === 'done' ? 'done' : 'available'}">
        <div class="cardnum">${pad(m.after_lesson)}</div>
        <div class="cardbody">
          <div class="cardtitle">${esc(m.title)}</div>
          <div class="cardmeta">
            <span class="chip ${m.status === 'done' ? 'done' : 'available'}">${m.kind} · ${m.minutes} мин</span>
            <span class="dim">после урока ${m.after_lesson}</span>
            ${m.score != null ? `<span class="score s${m.score}">${m.score}/5</span>` : ''}
          </div>
          ${m.verdict ? `<div class="cardsum">${esc(m.verdict)}</div>` : ''}
        </div>
      </div>`).join('')}</section>`, '/mocks');
}

// Запасная страница service worker: показывается, когда сети нет,
// а запрошенную страницу на этом устройстве ещё ни разу не открывали.
function pageOffline() {
  return layout('Офлайн', `
    <header class="head"><h1>Офлайн</h1>
    <p class="lead">Сети нет, а эта страница ни разу не открывалась с устройства —
    показать нечего. Уроки, которые ты уже читал, доступны без сети: открой их
    из списка уроков.</p></header>`);
}

// ---------------------------------------------------------------- роутер

const MIME = {
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
};
const mimeOf = (f) => MIME[f.slice(f.lastIndexOf('.'))] ?? 'application/octet-stream';

// sw.js обязан отдаваться из корня, иначе его scope не покроет весь сайт.
// Манифест и apple-touch-icon браузеры тоже ищут именно там.
const ROOT_FILES = {
  '/sw.js': 'sw.js',
  '/manifest.webmanifest': 'manifest.webmanifest',
  '/apple-touch-icon.png': 'apple-touch-icon.png',
};

const send = (res, code, type, body) => {
  res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' });
  res.end(body);
};

export function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const p = url.pathname;

  if (req.method === 'POST') {
    const m = p.match(/^\/api\/lesson\/(\d+)\/status$/);
    if (m) {
      let raw = '';
      req.on('data', (c) => { raw += c; });
      req.on('end', () => {
        const { status } = JSON.parse(raw || '{}');
        if (!['available', 'in_progress', 'done'].includes(status)) return send(res, 400, 'text/plain', 'bad status');
        const col = status === 'done' ? 'completed_at' : 'started_at';
        run(db, `UPDATE lessons SET status = ?, ${col} = datetime('now') WHERE num = ?`, status, Number(m[1]));
        if (status === 'done') {
          run(db, `UPDATE lessons SET status = 'available'
                   WHERE num = ? AND status = 'locked'`, Number(m[1]) + 1);
        }
        send(res, 200, 'application/json', '{"ok":true}');
      });
      return;
    }
    return send(res, 404, 'text/plain', 'not found');
  }

  if (ROOT_FILES[p] || p.startsWith('/static/')) {
    const f = join(PUBLIC, ROOT_FILES[p] ?? p.slice('/static/'.length));
    if (!f.startsWith(PUBLIC) || !existsSync(f)) return send(res, 404, 'text/plain', '404');
    const body = p === '/sw.js'
      ? readFileSync(f, 'utf8').replaceAll('__VERSION__', SHELL_VERSION)
      : readFileSync(f);
    return send(res, 200, mimeOf(f), body);
  }

  let html = null;
  if (p === '/') html = pageRoadmap();
  else if (p === '/offline') html = pageOffline();
  else if (p === '/review') html = pageReview();
  else if (p === '/mistakes') html = pageMistakes();
  else if (p === '/mocks') html = pageMocks();
  else {
    const m = p.match(/^\/lesson\/(\d+)$/);
    if (m) html = pageLesson(Number(m[1]));
  }
  if (!html) return send(res, 404, 'text/html; charset=utf-8', layout('404', '<div class="empty"><h2>Нет такой страницы</h2></div>'));
  send(res, 200, 'text/html; charset=utf-8', html);
}

// Локальный запуск: `npm start`. На Vercel этот модуль импортит api/index.mjs.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  createServer(handler).listen(PORT, () => {
    console.log(`курс: http://localhost:${PORT}`);
  });
}
