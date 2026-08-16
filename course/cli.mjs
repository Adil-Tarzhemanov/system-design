#!/usr/bin/env node
// Служебная консоль курса. Ей пользуется преподаватель (агент) во время разбора в чате.
//
//   node course/cli.mjs due                      — что пора повторить
//   node course/cli.mjs questions <lessonNum>     — вопросы урока с id
//   node course/cli.mjs grade <qid> <0..5> [--answer "..."] [--feedback "..."]
//   node course/cli.mjs mistake <lessonNum> "<тема>" "<что не так>" ["<как правильно>"]
//   node course/cli.mjs resolve <mistakeId>
//   node course/cli.mjs note <lessonNum> "<текст>"
//   node course/cli.mjs status <lessonNum> <locked|available|in_progress|done>
//   node course/cli.mjs task <taskId> <todo|doing|done|skipped>
//   node course/cli.mjs practice [lessonNum]              — упражнения и их статус
//   node course/cli.mjs practice <slug> <todo|doing|done|skipped> [--notes "..."]
//   node course/cli.mjs mock <afterLesson> <0..5> "<вердикт>"
//   node course/cli.mjs report                   — сводка прогресса
import { openDb, all, one, run } from './db.mjs';

const db = openDb();
const [cmd, ...rest] = process.argv.slice(2);
const flag = (name) => {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? null : rest[i + 1];
};
const pos = rest.filter((v, i) => !v.startsWith('--') && !(i > 0 && rest[i - 1].startsWith('--')));
const today = new Date().toISOString().slice(0, 10);
const plusDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

// SM-2: качество 0..5, ниже 3 — провал, интервал сбрасывается
function schedule(qid, score) {
  const r = one(db, 'SELECT * FROM reviews WHERE question_id = ?', qid)
        ?? { ease: 2.5, interval_days: 0, reps: 0, lapses: 0 };
  let { ease, interval_days: interval, reps, lapses } = r;
  if (score < 3) {
    reps = 0; lapses += 1; interval = 1;
  } else {
    reps += 1;
    interval = reps === 1 ? 1 : reps === 2 ? 6 : Math.round(interval * ease);
  }
  ease = Math.max(1.3, ease + (0.1 - (5 - score) * (0.08 + (5 - score) * 0.02)));
  const due = plusDays(interval);
  const exists = one(db, 'SELECT 1 AS x FROM reviews WHERE question_id = ?', qid);
  if (exists) {
    run(db, `UPDATE reviews SET ease = ?, interval_days = ?, reps = ?, lapses = ?,
             due_at = ?, last_score = ? WHERE question_id = ?`,
        ease, interval, reps, lapses, due, score, qid);
  } else {
    run(db, `INSERT INTO reviews (question_id, ease, interval_days, reps, lapses, due_at, last_score)
             VALUES (?, ?, ?, ?, ?, ?, ?)`, qid, ease, interval, reps, lapses, due, score);
  }
  return { interval, due, ease: ease.toFixed(2), lapses };
}

switch (cmd) {
  case 'due': {
    const rows = all(db, `
      SELECT q.id, q.kind, q.question, r.due_at, r.reps, r.last_score, l.num AS lnum
      FROM reviews r JOIN questions q ON q.id = r.question_id
      LEFT JOIN lessons l ON l.id = q.lesson_id
      WHERE r.due_at <= ? ORDER BY r.due_at, q.id`, today);
    if (!rows.length) console.log('на сегодня повторять нечего');
    rows.forEach((r) => console.log(
      `#${r.id} [урок ${r.lnum} · ${r.kind} · было ${r.last_score}/5 · ${r.due_at}] ${r.question}`));
    break;
  }
  case 'questions': {
    const lnum = Number(pos[0]);
    const rows = all(db, `
      SELECT q.*, (SELECT score FROM attempts a WHERE a.question_id = q.id ORDER BY a.id DESC LIMIT 1) AS last,
             (SELECT due_at FROM reviews r WHERE r.question_id = q.id) AS due
      FROM questions q JOIN lessons l ON l.id = q.lesson_id
      WHERE l.num = ? ORDER BY q.difficulty, q.id`, lnum);
    rows.forEach((r) => console.log(
      `#${r.id} [${r.kind} d${r.difficulty}${r.last != null ? ` · ${r.last}/5 · повтор ${r.due}` : ''}] ${r.question}`));
    break;
  }
  case 'grade': {
    const qid = Number(pos[0]);
    const score = Number(pos[1]);
    if (!Number.isInteger(score) || score < 0 || score > 5) throw new Error('оценка 0..5');
    const q = one(db, 'SELECT question FROM questions WHERE id = ?', qid);
    if (!q) throw new Error(`нет вопроса #${qid}`);
    run(db, 'INSERT INTO attempts (question_id, answer, score, feedback) VALUES (?, ?, ?, ?)',
        qid, flag('answer'), score, flag('feedback'));
    const s = schedule(qid, score);
    console.log(`#${qid} ${score}/5 → следующий повтор ${s.due} (через ${s.interval} дн, ease ${s.ease})`);
    break;
  }
  case 'mistake': {
    const l = one(db, 'SELECT id FROM lessons WHERE num = ?', Number(pos[0]));
    run(db, 'INSERT INTO mistakes (lesson_id, topic, wrong, correction) VALUES (?, ?, ?, ?)',
        l?.id ?? null, pos[1], pos[2], pos[3] ?? null);
    console.log('записано в журнал ошибок');
    break;
  }
  case 'resolve': {
    run(db, 'UPDATE mistakes SET resolved = 1 WHERE id = ?', Number(pos[0]));
    console.log('закрыто');
    break;
  }
  case 'note': {
    const l = one(db, 'SELECT id FROM lessons WHERE num = ?', Number(pos[0]));
    run(db, 'INSERT INTO notes (lesson_id, body) VALUES (?, ?)', l?.id ?? null, pos[1]);
    console.log('заметка сохранена');
    break;
  }
  case 'status': {
    const [numStr, status] = pos;
    const col = status === 'done' ? 'completed_at' : 'started_at';
    run(db, `UPDATE lessons SET status = ?, ${col} = datetime('now') WHERE num = ?`, status, Number(numStr));
    if (status === 'done') {
      run(db, `UPDATE lessons SET status = 'available' WHERE num = ? AND status = 'locked'`, Number(numStr) + 1);
    }
    console.log(`урок ${numStr} → ${status}`);
    break;
  }
  case 'task': {
    run(db, `UPDATE tasks SET status = ?, completed_at = CASE WHEN ? = 'done' THEN datetime('now') END
             WHERE id = ?`, pos[1], pos[1], Number(pos[0]));
    console.log(`задача ${pos[0]} → ${pos[1]}`);
    break;
  }
  // Без аргументов или с номером урока — список. Со slug и статусом — проставить статус.
  case 'practice': {
    const [first, status] = pos;
    if (status) {
      if (!['todo', 'doing', 'done', 'skipped'].includes(status)) throw new Error('статус: todo|doing|done|skipped');
      const ex = one(db, 'SELECT id FROM practice WHERE slug = ?', first);
      if (!ex) throw new Error(`нет упражнения ${first}`);
      run(db, `UPDATE practice SET status = ?, notes = coalesce(?, notes),
               completed_at = CASE WHEN ? = 'done' THEN datetime('now') END WHERE id = ?`,
          status, flag('notes'), status, ex.id);
      console.log(`${first} → ${status}`);
      break;
    }
    const rows = all(db, `
      SELECT p.*, l.num AS lnum FROM practice p JOIN lessons l ON l.id = p.lesson_id
      ${first ? 'WHERE l.num = ?' : ''} ORDER BY l.num`, ...(first ? [Number(first)] : []));
    if (!rows.length) console.log('упражнений нет');
    rows.forEach((r) => {
      console.log(`${r.slug} [урок ${r.lnum} · ${r.status} · ${r.est_minutes} мин] ${r.title}`);
      if (r.notes) console.log(`    ${r.notes}`);
    });
    break;
  }
  case 'mock': {
    run(db, `UPDATE mocks SET status = 'done', held_at = datetime('now'), score = ?, verdict = ?
             WHERE after_lesson = ?`, Number(pos[1]), pos[2] ?? null, Number(pos[0]));
    console.log('мок записан');
    break;
  }
  case 'report': {
    const l = one(db, `SELECT count(*) AS total, sum(status='done') AS done,
                       sum(content_ready) AS ready FROM lessons`);
    const a = one(db, `SELECT count(*) AS n, round(avg(score), 2) AS avg FROM attempts`);
    const d = one(db, `SELECT count(*) AS n FROM reviews WHERE due_at <= ?`, today);
    const m = one(db, `SELECT count(*) AS n FROM mistakes WHERE resolved = 0`);
    const p = one(db, `SELECT count(*) AS total, sum(status = 'done') AS done FROM practice`);
    const weak = all(db, `
      SELECT q.question, r.last_score, r.lapses FROM reviews r JOIN questions q ON q.id = r.question_id
      WHERE r.lapses > 0 OR r.last_score < 4 ORDER BY r.lapses DESC, r.last_score LIMIT 5`);
    console.log(`уроков пройдено: ${l.done ?? 0}/${l.total} (материал готов: ${l.ready ?? 0})`);
    console.log(`ответов: ${a.n}, средняя оценка: ${a.avg ?? '—'}`);
    console.log(`к повторению сегодня: ${d.n} · открытых ошибок: ${m.n}`);
    console.log(`упражнений сдано: ${p.done ?? 0}/${p.total}`);
    if (weak.length) {
      console.log('\nслабые места:');
      weak.forEach((w) => console.log(`  ${w.last_score}/5 (провалов ${w.lapses}) ${w.question.slice(0, 90)}`));
    }
    break;
  }
  default:
    console.error('неизвестная команда. см. комментарий в начале файла');
    process.exitCode = 1;
}
db.close();
