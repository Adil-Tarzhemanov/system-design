// Тесты — это контракт упражнения. Их менять нельзя, менять нужно src/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { moduleReach } from '../tools/graph.mjs';

import * as notifications from './src/notifications/notify.ts';
import { notifier } from './src/app/composition.ts';
import { outbox, resetOutbox } from './src/transport/telegram.ts';

const SRC = join(import.meta.dirname, 'src');

test('поведение сохранено: через корень композиции сообщение доходит до транспорта', async () => {
  resetOutbox();
  await notifier.notifyUser({ userId: 'u1', text: 'привет' });
  assert.deepEqual(outbox, [{ userId: 'u1', text: 'привет' }]);
});

test('модуль notifications не знает о транспорте', () => {
  const reach = moduleReach(SRC);
  assert.deepEqual(
    [...(reach.get('notifications') ?? [])],
    [],
    'notifications не должен дотягиваться до других модулей — ни прямо, ни через посредника',
  );
});

test('есть фабрика, принимающая транспорт снаружи', () => {
  assert.equal(
    typeof (notifications as Record<string, unknown>).createNotifier,
    'function',
    'ожидается экспорт createNotifier(deps) — фабрика, получающая транспорт аргументом',
  );
});

test('транспорт подменяется без правки модуля notifications', async () => {
  const calls: Array<[string, string]> = [];
  const fake = { send: async (userId: string, text: string) => { calls.push([userId, text]); } };

  const create = (notifications as Record<string, any>).createNotifier;
  const custom = create({ transport: fake });

  resetOutbox();
  await custom.notifyUser({ userId: 'u2', text: 'тест' });

  assert.deepEqual(calls, [['u2', 'тест']], 'должен был вызваться подставленный транспорт');
  assert.deepEqual(outbox, [], 'настоящий транспорт при подстановке трогать нельзя');
});

test('notifyAll работает поверх той же абстракции', async () => {
  const calls: string[] = [];
  const create = (notifications as Record<string, any>).createNotifier;
  const custom = create({ transport: { send: async (u: string) => { calls.push(u); } } });

  await custom.notifyAll(['a', 'b', 'c'], 'рассылка');
  assert.deepEqual(calls, ['a', 'b', 'c']);
});
