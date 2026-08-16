// Корень композиции и единственная точка, через которую упражнение проверяется снаружи.
// Сейчас он ничего не связывает — модули уже связались друг с другом сами.
// Публичное поведение этих четырёх функций менять нельзя.
import { addUser, rawName, resetUsers } from '../user/model.ts';
import { addTask, completeTask, countActive, resetTasks } from '../tasks/model.ts';
import { userSummary } from '../lib/text.ts';

export function reset(): void {
  resetUsers();
  resetTasks();
}

export function registerUser(id: string, name: string): void {
  addUser(id, name);
}

export function createTaskFor(userId: string, title: string): string {
  return addTask(userId, title).id;
}

export function finishTask(id: string): void {
  completeTask(id);
}

export function dashboard(userId: string): string {
  return userSummary(userId, rawName(userId));
}

export function activeCount(userId: string): number {
  return countActive(userId);
}
