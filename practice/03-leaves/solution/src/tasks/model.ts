// РЕШЕНИЕ. Разрыв №2 — вопрос вкуса, выбран самый дешёвый вариант.
//
// Было: addTask сам ходил в user за проверкой userExists. Модуль задач знал про
// модуль пользователей — вторая стрелка кольца.
//
// Стало: tasks стал листом. Он больше ничего не импортирует и ничего не проверяет —
// хранит задачи, и всё. Проверку поднял наверх тот, кто и так знает обоих: app.
//
// Чем заплатили: addTask теперь можно вызвать напрямую с несуществующим userId,
// и он молча создаст задачу. Гарантия переехала из модуля в договорённость
// «ходи через app». Это осознанный размен — см. solution/README.md, там же
// альтернатива через контракт, если такой размен не устраивает.
export type Task = { id: string; userId: string; title: string; done: boolean };

const tasks: Task[] = [];
let seq = 0;

export function addTask(userId: string, title: string): Task {
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
