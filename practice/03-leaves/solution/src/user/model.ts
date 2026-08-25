// РЕШЕНИЕ. Разрыв №3 — не сделан, и это осознанно.
//
// user по-прежнему импортирует lib. Кольца это не создаёт: после первого разрыва
// lib стал листом и никуда не тянется, значит, user → lib — обычная стрелка вниз,
// в сторону более стабильного. Тесты такую связь и не запрещают.
//
// Убирать её имеет смысл только если цель — чтобы вообще все модули стали листьями
// (жёсткий вариант из README упражнения). Цена: isBlank придётся либо продублировать,
// либо принимать проверку аргументом — ради связи, которая ничем не мешает.
import { isBlank } from '../lib/text.ts';

export type User = { id: string; name: string };

const users = new Map<string, User>();

export function addUser(id: string, name: string): void {
  if (isBlank(name)) throw new Error('addUser: пустое имя');
  users.set(id, { id, name });
}

export function userExists(id: string): boolean {
  return users.has(id);
}

export function rawName(id: string): string {
  const user = users.get(id);
  if (!user) throw new Error(`нет пользователя ${id}`);
  return user.name;
}

export function resetUsers(): void {
  users.clear();
}
