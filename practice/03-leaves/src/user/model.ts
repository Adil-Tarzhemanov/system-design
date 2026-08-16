// СТАРТОВОЕ СОСТОЯНИЕ. Хранилище пользователей.
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
