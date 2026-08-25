// Те же восемь проверок, что и в упражнении, но против solution/src.
// Здесь они все зелёные — на них удобно смотреть, сравнивая с красными в src/.
// Названия начинаются с «решение:», чтобы в общем прогоне npm run practice
// было видно, где чьи тесты.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { buildGraph, findCycles, moduleReach } from '../../tools/graph.mjs';

import * as app from './src/app/dashboard.ts';

const SRC = join(import.meta.dirname, 'src');

test('решение: поведение — сводка собирается как раньше', () => {
  app.reset();
  app.registerUser('u1', 'аиша нурланова');
  app.createTaskFor('u1', 'созвон');
  app.createTaskFor('u1', 'ревью');

  assert.equal(app.dashboard('u1'), 'Аиша Нурланова: 2 активных');
});

test('решение: поведение — закрытая задача уходит из счётчика', () => {
  app.reset();
  app.registerUser('u1', 'ержан');
  const id = app.createTaskFor('u1', 'отчёт');
  app.createTaskFor('u1', 'встреча');
  app.finishTask(id);

  assert.equal(app.activeCount('u1'), 1);
  assert.equal(app.dashboard('u1'), 'Ержан: 1 активных');
});

test('решение: поведение — задача несуществующему пользователю не создаётся', () => {
  app.reset();
  assert.throws(() => app.createTaskFor('нет-такого', 'задача'), /нет пользователя/);
});

test('решение: поведение — пустое имя не принимается', () => {
  app.reset();
  assert.throws(() => app.registerUser('u1', '   '), /пустое имя/);
});

test('решение: циклов импортов нет', () => {
  const cycles = findCycles(buildGraph(SRC));
  assert.deepEqual(cycles, [], `найден цикл: ${cycles.map((c) => c.join(' → ')).join('; ')}`);
});

test('решение: lib не знает о предметной области', () => {
  const reach = [...(moduleReach(SRC).get('lib') ?? [])];
  assert.deepEqual(reach, [], `lib дотягивается до ${reach.join(', ')} — утилиты не знают о домене`);
});

test('решение: user и tasks не знают друг о друге — ни прямо, ни транзитивно', () => {
  const reach = moduleReach(SRC);
  const user = [...(reach.get('user') ?? [])];
  const tasks = [...(reach.get('tasks') ?? [])];

  assert.ok(!user.includes('tasks'), `user дотягивается до: ${user.join(', ')}`);
  assert.ok(!tasks.includes('user'), `tasks дотягивается до: ${tasks.join(', ')}`);
});

test('решение: связывает модули только app', () => {
  const reach = moduleReach(SRC);
  for (const module of ['user', 'tasks', 'lib']) {
    assert.ok(
      !(reach.get(module) ?? new Set()).has('app'),
      `${module} не должен знать про корень композиции`,
    );
  }
});
