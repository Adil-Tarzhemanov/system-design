// Наполняет базу роадмапом. Идемпотентно: прогресс (status/attempts) не трогает.
import { openDb, run, one } from './db.mjs';

const MODULES = [
  [0, 'Фундамент мышления', 'Понять, что такое архитектура и чем меряется её качество'],
  [1, 'Архитектура кодовой базы', 'Слои, границы, FSD, состояние — как не превратить проект в спагетти'],
  [2, 'Ядро system design интервью', 'Фреймворк ответа, рендеринг, данные, real-time'],
  [3, 'Качества системы', 'Performance, надёжность, безопасность, доступность'],
  [4, 'Масштаб команды', 'Монорепа, микрофронтенды, тесты и релизы'],
  [5, 'Кейсы — полные разборы', 'Пять задач в формате реального собеса'],
  [6, 'Финиш', 'Internals-блиц и умение продать свой опыт'],
];

// [num, module, slug, title, summary, sources]
const LESSONS = [
  [1, 0, 'why-architecture',
   'Что такое архитектура и зачем она',
   'Cohesion и coupling, границы, стоимость изменения. Как отвечать на «расскажи об архитектуре своего проекта».', '1'],
  [2, 0, 'solid-and-di',
   'SOLID без карго-культа. Inversion vs Injection',
   'Три принципа, которые реально работают во фронте. Чем инверсия зависимостей отличается от внедрения — на этом сыпятся.', '1,2'],
  [3, 0, 'layers-and-direction',
   'Слои и направление зависимостей',
   'Clean Architecture и DDD-lite глазами фронтендера: почему низ не знает о верхе и что бывает, когда знает.', '1,2,3'],

  [4, 1, 'fsd-basics',
   'FSD: слои, слайсы, сегменты',
   'Правила импортов, публичные API, за что FSD ругают и что он на самом деле решает.', '3'],
  [5, 1, 'fsd-in-practice',
   'FSD на практике: где ломается',
   'Типовые тупики — кросс-импорты, «куда положить эту сущность», разрастание shared. И как из них выходить.', '4,5'],
  [6, 1, 'module-boundaries',
   'Границы модулей: public API, циклы, линтер',
   'index.ts как контракт, обнаружение циклических зависимостей, автоматическая защита границ через ESLint.', '3,4'],
  [7, 1, 'state-architecture',
   'Server state vs client state',
   'React Query / RTK Query / Redux / MobX — где чей слой, и почему «положим всё в глобальный стор» ломает архитектуру.', '7,8'],
  [8, 1, 'cross-module-communication',
   'Кросс-модульное взаимодействие',
   'События, инверсия через пропсы и слоты, композиция в app/widgets, DI-контейнер — когда он нужен.', '6,9'],

  [9, 2, 'radio-framework',
   'Фреймворк ответа на system design',
   'RADIO: requirements → architecture → data → API → optimize. Скрипт первых пяти минут, которые решают исход.', ''],
  [10, 2, 'rendering-strategies',
   'Рендеринг: CSR, SSR, SSG, ISR, streaming, RSC',
   'Что выбрать под задачу, чем платишь за гидратацию, Next Pages Router vs App Router.', '10'],
  [11, 2, 'network-and-data',
   'Сеть и данные: REST, GraphQL, BFF',
   'Пагинация offset vs cursor, нормализация, слои кэша, N+1 на фронте, дизайн контракта под UI.', ''],
  [12, 2, 'realtime-and-offline',
   'Real-time и оптимистичные обновления',
   'Polling / long-polling / SSE / WebSocket, разрешение конфликтов, offline-очередь.', ''],

  [13, 3, 'performance',
   'Performance: бюджеты и критический путь',
   'Core Web Vitals, code splitting, виртуализация, изображения, что реально двигает метрики.', ''],
  [14, 3, 'reliability',
   'Надёжность: ошибки, ретраи, деградация',
   'Error boundaries, backoff, идемпотентность, graceful degradation, observability фронтенда.', ''],
  [15, 3, 'security',
   'Безопасность фронта',
   'XSS/CSRF, CSP, где хранить токены, OAuth и refresh-флоу. Обязательный минимум для финтеха.', ''],
  [16, 3, 'a11y-i18n-responsive',
   'Доступность, i18n и адаптивность',
   'Требования, которые закладывают в архитектуру, а не прикручивают потом. ru/kk/en и RTL.', ''],

  [17, 4, 'monorepo-and-design-system',
   'Монорепа и дизайн-система',
   'Границы пакетов, версионирование, shared-библиотеки, токены дизайна.', ''],
  [18, 4, 'microfrontends',
   'Микрофронтенды и когда их НЕ надо',
   'Module Federation, изоляция команд, цена интеграции. Главный вопрос — «а зачем».', ''],
  [19, 4, 'testing-and-delivery',
   'Тестирование как часть архитектуры + доставка',
   'Пирамида тестов по слоям, контрактные тесты, CI/CD, feature flags, A/B.', ''],

  [20, 5, 'case-marketplace-catalog',
   'Кейс: каталог маркетплейса с фильтрами',
   'Бесконечная лента, фасетные фильтры, URL как состояние, SSR и SEO. Kaspi-стиль.', ''],
  [21, 5, 'case-realtime-tracking',
   'Кейс: real-time трекинг заказа / чат',
   'WebSocket, переподключения, порядок сообщений, карта и геоданные. inDrive-стиль.', ''],
  [22, 5, 'case-financial-dashboard',
   'Кейс: финансовый дашборд на 100k строк',
   'Виртуализация, агрегации, графики, экспорт, точность денег. Freedom/Halyk-стиль.', ''],
  [23, 5, 'case-checkout',
   'Кейс: многошаговый чекаут и платёж',
   'Состояние формы, идемпотентность, сетевые сбои на списании денег, 3-D Secure. Kaspi Pay-стиль.', ''],
  [24, 5, 'case-uploads-offline',
   'Кейс: загрузка файлов и offline-first',
   'Чанки, возобновление, прогресс, очередь синхронизации, разрешение конфликтов.', ''],

  [25, 6, 'internals-blitz',
   'Блиц: JS и React под капотом',
   'Event loop, реконсиляция, причины ререндеров, мемоизация, замыкания. Здесь режут чаще, чем на архитектуре.', ''],
  [26, 6, 'selling-your-experience',
   'Как рассказывать о своём опыте',
   'STAR-истории, разбор типичных провалов, вопросы работодателю. Плюс финальный полный mock.', ''],
];

// [после какого урока, название, тип, минут]
const MOCKS = [
  [3,  'Мини-мок: границы и зависимости', 'mini', 25],
  [6,  'Мини-мок: разбор архитектуры проекта', 'mini', 30],
  [9,  'Мини-мок: первый прогон RADIO', 'mini', 30],
  [12, 'Полный мок: спроектируй ленту с обновлениями', 'full', 45],
  [15, 'Мини-мок: перф и безопасность под давлением', 'mini', 30],
  [19, 'Полный мок: система для растущей команды', 'full', 45],
  [26, 'Финальный мок: полная секция system design', 'full', 60],
];

const db = openDb();

for (const [num, title, goal] of MODULES) {
  const ex = one(db, 'SELECT id FROM modules WHERE num = ?', num);
  if (ex) run(db, 'UPDATE modules SET title = ?, goal = ? WHERE num = ?', title, goal, num);
  else run(db, 'INSERT INTO modules (num, title, goal) VALUES (?, ?, ?)', num, title, goal);
}

for (const [num, mod, slug, title, summary, sources] of LESSONS) {
  const moduleId = one(db, 'SELECT id FROM modules WHERE num = ?', mod).id;
  const ex = one(db, 'SELECT id FROM lessons WHERE num = ?', num);
  if (ex) {
    run(db, `UPDATE lessons SET module_id = ?, slug = ?, title = ?, summary = ?, sources = ?
             WHERE num = ?`, moduleId, slug, title, summary, sources, num);
  } else {
    run(db, `INSERT INTO lessons (module_id, num, slug, title, summary, sources, status)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
        moduleId, num, slug, title, summary, sources, num === 1 ? 'available' : 'locked');
  }
}

for (const [after, title, kind, minutes] of MOCKS) {
  const ex = one(db, 'SELECT id FROM mocks WHERE after_lesson = ?', after);
  if (ex) run(db, 'UPDATE mocks SET title = ?, kind = ?, minutes = ? WHERE after_lesson = ?',
              title, kind, minutes, after);
  else run(db, 'INSERT INTO mocks (after_lesson, title, kind, minutes) VALUES (?, ?, ?, ?)',
           after, title, kind, minutes);
}

console.log('seed: %d модулей, %d уроков, %d моков',
  MODULES.length, LESSONS.length, MOCKS.length);
db.close();
