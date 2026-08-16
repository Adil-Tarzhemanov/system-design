// СТАРТОВОЕ СОСТОЯНИЕ. Хранилище задач, которое само ходит проверять существование
// пользователя — и потому знает про модуль user.
import { userExists } from '../user/model.ts';

export type Task = { id: string; userId: string; title: string; done: boolean };

const tasks: Task[] = [];
let seq = 0;

export function addTask(userId: string, title: string): Task {
  if (!userExists(userId)) throw new Error(`нет пользователя ${userId}`);
  const task: Task = { id: `t${++seq}`, userId, title, done: false };
  tasks.push(task);
  return task;
}

export function countActive(userId: string): number {
  return tasks.filter((t) => t.userId === userId && !t.done).length;
}

export function completeTask(id: string): void {
  const task = tasks.find((t) => t.id === id);
  if (task) task.done = true;
}

export function resetTasks(): void {
  tasks.length = 0;
  seq = 0;
}
