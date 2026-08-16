import { DatabaseSync } from 'node:sqlite';
import { readFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const DB_PATH = join(ROOT, 'data', 'course.db');

export function openDb() {
  mkdirSync(dirname(DB_PATH), { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec(readFileSync(join(ROOT, 'course', 'schema.sql'), 'utf8'));
  return db;
}

export const all = (db, sql, ...p) => db.prepare(sql).all(...p);
export const one = (db, sql, ...p) => db.prepare(sql).get(...p);
export const run = (db, sql, ...p) => db.prepare(sql).run(...p);
