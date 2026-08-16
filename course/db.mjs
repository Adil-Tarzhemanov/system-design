import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const REPO_DB = join(ROOT, 'data', 'course.db');

// На Vercel файловая система только для чтения, писать можно лишь в /tmp.
// Работаем с копией: чтение полное, записи живут в пределах одного инстанса
// и не переживают деплой. Источник правды — БД в репозитории.
export const READ_ONLY_FS = Boolean(process.env.VERCEL);
export const DB_PATH = READ_ONLY_FS ? join(tmpdir(), 'course.db') : REPO_DB;

export function openDb() {
  if (READ_ONLY_FS) {
    if (!existsSync(DB_PATH)) copyFileSync(REPO_DB, DB_PATH);
  } else {
    mkdirSync(dirname(DB_PATH), { recursive: true });
  }
  const db = new DatabaseSync(DB_PATH);
  db.exec(readFileSync(join(ROOT, 'course', 'schema.sql'), 'utf8'));
  return db;
}

export const all = (db, sql, ...p) => db.prepare(sql).all(...p);
export const one = (db, sql, ...p) => db.prepare(sql).get(...p);
export const run = (db, sql, ...p) => db.prepare(sql).run(...p);
