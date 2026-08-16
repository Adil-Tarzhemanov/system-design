// Тесты — контракт упражнения. Их менять нельзя, менять нужно src/.
// Первые проверяют, что поведение не сломалось, последние — что форма зависимостей исправлена.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { buildGraph, findCycles, moduleReach } from '../tools/graph.mjs';

import * as app from './src/app/dashboard.ts';

const SRC = join(import.meta.dirname, 'src');

test('поведение: сводка собирается как раньше', () => {
  app.reset();
  app.registerUser('u1', 'аиша нурланова');
  app.createTaskFor('u1', 'созвон');
  app.createTaskFor('u1', 'ревью');

  assert.equal(app.dashboard('u1'), 'Аиша Нурланова: 2 активных');
});

test('поведение: закрытая задача уходит из счётчика', () => {
  app.reset();
  app.registerUser('u1', 'ержан');
  const id = app.createTaskFor('u1', 'отчёт');
  app.createTaskFor('u1', 'встреча');
  app.finishTask(id);

  assert.equal(app.activeCount('u1'), 1);
  assert.equal(app.dashboard('u1'), 'Ержан: 1 активных');
});

test('поведение: задача несуществующему пользователю не создаётся', () => {
  app.reset();
  assert.throws(() => app.createTaskFor('нет-такого', 'задача'), /нет пользователя/);
});

test('поведение: пустое имя не принимается', () => {
  app.reset();
  assert.throws(() => app.registerUser('u1', '   '), /пустое имя/);
});

test('циклов импортов нет', () => {
  const cycles = findCycles(buildGraph(SRC));
  assert.deepEqual(cycles, [], `найден цикл: ${cycles.map((c) => c.join(' → ')).join('; ')}`);
});

test('lib не знает о предметной области', () => {
  const reach = [...(moduleReach(SRC).get('lib') ?? [])];
  assert.deepEqual(reach, [], `lib дотягивается до ${reach.join(', ')} — утилиты не знают о домене`);
});

test('user и tasks не знают друг о друге — ни прямо, ни транзитивно', () => {
  const reach = moduleReach(SRC);
  const user = [...(reach.get('user') ?? [])];
  const tasks = [...(reach.get('tasks') ?? [])];

  assert.ok(!user.includes('tasks'), `user дотягивается до: ${user.join(', ')}`);
  assert.ok(!tasks.includes('user'), `tasks дотягивается до: ${tasks.join(', ')}`);
});

test('связывает модули только app', () => {
  const reach = moduleReach(SRC);
  for (const module of ['user', 'tasks', 'lib']) {
    assert.ok(
      !(reach.get(module) ?? new Set()).has('app'),
      `${module} не должен знать про корень композиции`,
    );
  }
});
