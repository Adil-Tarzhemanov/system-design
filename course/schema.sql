-- Frontend System Design course — local progress database
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS modules (
  id     INTEGER PRIMARY KEY,
  num    INTEGER NOT NULL UNIQUE,
  title  TEXT    NOT NULL,
  goal   TEXT
);

CREATE TABLE IF NOT EXISTS lessons (
  id            INTEGER PRIMARY KEY,
  module_id     INTEGER NOT NULL REFERENCES modules(id),
  num           INTEGER NOT NULL UNIQUE,          -- сквозная нумерация 1..26
  slug          TEXT    NOT NULL UNIQUE,
  title         TEXT    NOT NULL,
  summary       TEXT,
  est_minutes   INTEGER NOT NULL DEFAULT 120,
  status        TEXT    NOT NULL DEFAULT 'locked'
                CHECK (status IN ('locked','available','in_progress','done')),
  content_ready INTEGER NOT NULL DEFAULT 0,       -- есть ли готовая HTML-страница
  sources       TEXT,                             -- уроки Паромова, питающие тему
  started_at    TEXT,
  completed_at  TEXT
);

CREATE TABLE IF NOT EXISTS questions (
  id           INTEGER PRIMARY KEY,
  lesson_id    INTEGER REFERENCES lessons(id),
  kind         TEXT NOT NULL DEFAULT 'open'
               CHECK (kind IN ('open','trap','design','code','term')),
  difficulty   INTEGER NOT NULL DEFAULT 2 CHECK (difficulty BETWEEN 1 AND 3),
  question     TEXT NOT NULL,
  ideal_answer TEXT,
  tags         TEXT
);

CREATE TABLE IF NOT EXISTS attempts (
  id          INTEGER PRIMARY KEY,
  question_id INTEGER NOT NULL REFERENCES questions(id),
  answered_at TEXT NOT NULL DEFAULT (datetime('now')),
  answer      TEXT,
  score       INTEGER CHECK (score BETWEEN 0 AND 5),
  feedback    TEXT
);

-- SM-2-подобное состояние интервальных повторений, одна строка на вопрос
CREATE TABLE IF NOT EXISTS reviews (
  question_id   INTEGER PRIMARY KEY REFERENCES questions(id),
  ease          REAL    NOT NULL DEFAULT 2.5,
  interval_days INTEGER NOT NULL DEFAULT 0,
  reps          INTEGER NOT NULL DEFAULT 0,
  lapses        INTEGER NOT NULL DEFAULT 0,
  due_at        TEXT    NOT NULL DEFAULT (date('now')),
  last_score    INTEGER
);

CREATE TABLE IF NOT EXISTS tasks (
  id             INTEGER PRIMARY KEY,
  lesson_id      INTEGER REFERENCES lessons(id),
  title          TEXT NOT NULL,
  body           TEXT,
  est_minutes    INTEGER NOT NULL DEFAULT 30,
  status         TEXT NOT NULL DEFAULT 'todo'
                 CHECK (status IN ('todo','doing','done','skipped')),
  solution_notes TEXT,
  completed_at   TEXT
);

-- практика: запускаемое упражнение в practice/<slug>, в отличие от tasks — не текст, а код
CREATE TABLE IF NOT EXISTS practice (
  id           INTEGER PRIMARY KEY,
  lesson_id    INTEGER NOT NULL REFERENCES lessons(id),
  slug         TEXT    NOT NULL UNIQUE,          -- имя папки в practice/
  title        TEXT    NOT NULL,
  goal         TEXT,                             -- что именно отрабатываем, одной фразой
  est_minutes  INTEGER NOT NULL DEFAULT 30,
  command      TEXT,                             -- чем проверить решение
  checklist    TEXT,                             -- «сделано, если…», по пункту на строку
  reference    TEXT,                             -- куда посмотреть у Паромова ПОСЛЕ решения
  status       TEXT    NOT NULL DEFAULT 'todo'
               CHECK (status IN ('todo','doing','done','skipped')),
  notes        TEXT,
  completed_at TEXT
);

CREATE TABLE IF NOT EXISTS mocks (
  id           INTEGER PRIMARY KEY,
  after_lesson INTEGER NOT NULL,
  title        TEXT NOT NULL,
  kind         TEXT NOT NULL DEFAULT 'mini' CHECK (kind IN ('mini','full','case')),
  minutes      INTEGER NOT NULL DEFAULT 30,
  status       TEXT NOT NULL DEFAULT 'planned'
               CHECK (status IN ('planned','done','skipped')),
  held_at      TEXT,
  score        INTEGER CHECK (score BETWEEN 0 AND 5),
  verdict      TEXT
);

-- журнал ошибок: что путал, чтобы всплыло на повторе
CREATE TABLE IF NOT EXISTS mistakes (
  id         INTEGER PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  lesson_id  INTEGER REFERENCES lessons(id),
  topic      TEXT,
  wrong      TEXT NOT NULL,
  correction TEXT,
  resolved   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS notes (
  id         INTEGER PRIMARY KEY,
  lesson_id  INTEGER REFERENCES lessons(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  body       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS study_sessions (
  id         INTEGER PRIMARY KEY,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  minutes    INTEGER,
  summary    TEXT
);

CREATE INDEX IF NOT EXISTS idx_questions_lesson ON questions(lesson_id);
CREATE INDEX IF NOT EXISTS idx_attempts_question ON attempts(question_id);
CREATE INDEX IF NOT EXISTS idx_reviews_due ON reviews(due_at);
CREATE INDEX IF NOT EXISTS idx_tasks_lesson ON tasks(lesson_id);
CREATE INDEX IF NOT EXISTS idx_practice_lesson ON practice(lesson_id);
