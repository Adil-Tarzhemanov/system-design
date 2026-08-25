// РЕШЕНИЕ. Корень композиции — единственное место, которому разрешено знать всех.
// Сюда стеклись оба знания, выселенные из модулей:
//
//   1. сборка строки сводки — уехала из lib (утилита не имеет права знать домен);
//   2. проверка существования пользователя — уехала из tasks (иначе tasks знает user).
//
// Обрати внимание: app стал «толще», и это норма. Конкретика течёт вверх,
// а модули внизу становятся листьями.
import { addUser, rawName, resetUsers, userExists } from '../user/model.ts';
import { addTask, completeTask, countActive, resetTasks } from '../tasks/model.ts';
import { titleCase } from '../lib/text.ts';

export function reset(): void {
  resetUsers();
  resetTasks();
}

export function registerUser(id: string, name: string): void {
  addUser(id, name);
}

export function createTaskFor(userId: string, title: string): string {
  // Знание «задачу можно завести только существующему пользователю» связывает два
  // модуля, поэтому живёт там, где оба видны. Текст ошибки сохранён дословно —
  // тесты на поведение проверяют именно его.
  if (!userExists(userId)) throw new Error(`нет пользователя ${userId}`);
  return addTask(userId, title).id;
}

export function finishTask(id: string): void {
  completeTask(id);
}

export function dashboard(userId: string): string {
  // Бывший lib/userSummary. Из lib осталась только работа со строкой — titleCase,
  // а знание про «активные задачи» подмешивается здесь.
  return `${titleCase(rawName(userId))}: ${countActive(userId)} активных`;
}

export function activeCount(userId: string): number {
  return countActive(userId);
}
