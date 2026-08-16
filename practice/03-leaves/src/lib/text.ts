// СТАРТОВОЕ СОСТОЯНИЕ. Утилитарный модуль, который полез в предметную область:
// ради одной строчки итога он импортирует задачи и теперь знает, что такое «активная задача».
import { countActive } from '../tasks/model.ts';

// \b здесь не годится: границы слов в JS считаются по ASCII, и кириллицу они не видят.
export function titleCase(s: string): string {
  return s.replace(/(^|\s)(\p{L})/gu, (_, space: string, letter: string) => space + letter.toUpperCase());
}

export function isBlank(s: string): boolean {
  return s.trim().length === 0;
}

export function userSummary(userId: string, name: string): string {
  return `${titleCase(name)}: ${countActive(userId)} активных`;
}
