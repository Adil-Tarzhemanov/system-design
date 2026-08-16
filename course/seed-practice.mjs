// Запускаемые упражнения из practice/. Идемпотентно: узнаёт упражнение по slug,
// статус и заметки не трогает — их ставит преподаватель по ходу разбора.
import { openDb, one, run } from './db.mjs';

const cmd = (slug) =>
  `node --no-warnings --experimental-strip-types --test "practice/${slug}/**/*.test.ts"`;

// [lessonNum, slug, title, minutes, goal, checklist, reference]
const PRACTICE = [
  [2, '02-di-notifications',
   'Инверсия зависимости без единого класса', 30,
   'Развернуть стрелку между модулем уведомлений и конкретным транспортом — на функциях и типах, без ООП.',
   [
     'notifications не импортирует transport ни прямо, ни через третий модуль',
     'есть фабрика createNotifier({ transport }) с notifyUser и notifyAll',
     'реальный транспорт подставлен ровно в одном месте — в корне композиции',
     'в тесте транспорт подменяется фейком, настоящий outbox остаётся пустым',
   ],
   'FSD/2-dependency-inversion/examples/5-components-di/props-di.spec.tsx'],

  [3, '03-leaves',
   'Направление зависимостей и транзитивный цикл', 40,
   'Разорвать кольцо user → lib → tasks → user, сохранив поведение до последнего символа.',
   [
     'циклов импортов нет',
     'lib не дотягивается ни до одного модуля',
     'user не дотягивается до tasks, tasks не дотягивается до user',
     'ни один модуль не импортирует app',
   ],
   'FSD/2-dependency-inversion/README.md — та же задача жёстче; эталон в ветке teacher-solution'],

  [4, '04-fsd-layers',
   'Слои FSD и правило направления импортов', 30,
   'Убрать три импорта, идущих вверх по слоям, приёмом «параметризация вместо похода наверх».',
   [
     'entities не знает о features',
     'shared не знает вообще ни о чём',
     'widgets не знает о pages — шапку можно вставить на любую страницу',
     'ни один файл не удалён, все три функции живы и используются',
   ],
   'FSD/4-fsd-layers/src — смотреть на раскладку сегментов, не на код'],

  [5, '05-cross-import',
   'Кросс-импорт двух фич', 35,
   'Поднять связь cart ↔ checkout на уровень композиции, не заводя общего модуля с состоянием.',
   [
     'циклов импортов нет',
     'cart не дотягивается до checkout, checkout не дотягивается до cart',
     'выбран и назван способ: параметризация или колбэк при сборке',
     'сигнатуры app/order.ts не изменились',
   ],
   'FSD/5-fsd-my-problems-solution/src — куда он поднимает связь'],

  [6, '06-public-api',
   'Публичный API модуля', 35,
   'Заменить export * на осознанный список экспортов и убрать импорты, пробивающие границу слайса.',
   [
     'глубоких импортов нет — снаружи в слайс входят только через index.ts',
     'export * не осталось нигде',
     'у фичи тоже есть публичный API',
     'normalizeSku не виден снаружи сущности',
   ],
   'FSD/4-fsd-layers/src и 5-fsd-my-problems-solution/src — что попадает в index.ts слайса'],
];

const db = openDb();
let added = 0;
let updated = 0;

for (const [lessonNum, slug, title, minutes, goal, checklist, reference] of PRACTICE) {
  const lesson = one(db, 'SELECT id FROM lessons WHERE num = ?', lessonNum);
  if (!lesson) { console.warn('нет урока', lessonNum, '— упражнение', slug, 'пропущено'); continue; }

  const list = checklist.join('\n');
  const ex = one(db, 'SELECT id FROM practice WHERE slug = ?', slug);
  if (ex) {
    run(db, `UPDATE practice SET lesson_id = ?, title = ?, goal = ?, est_minutes = ?,
             command = ?, checklist = ?, reference = ? WHERE id = ?`,
        lesson.id, title, goal, minutes, cmd(slug), list, reference, ex.id);
    updated++;
  } else {
    run(db, `INSERT INTO practice (lesson_id, slug, title, goal, est_minutes, command, checklist, reference)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        lesson.id, slug, title, goal, minutes, cmd(slug), list, reference);
    added++;
  }
}

console.log('практика: добавлено %d, обновлено %d', added, updated);
db.close();
