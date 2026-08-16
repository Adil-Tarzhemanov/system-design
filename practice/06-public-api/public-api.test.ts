// Тесты — контракт упражнения. Их менять нельзя, менять нужно src/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { deepImports, starExports } from '../tools/graph.mjs';

import * as app from './src/app/index.ts';
import * as orderEntity from './src/entities/order/index.ts';

const SRC = join(import.meta.dirname, 'src');
const LAYERS = ['features', 'entities', 'widgets'];

test('поведение: артикул приводится к каноническому виду', () => {
  app.reset();
  app.add('  abc-1  ', 100);
  assert.equal(app.render(), 'ABC-1 — 100 ₸');
});

test('поведение: список и сумма собираются по всем заказам', () => {
  app.reset();
  app.add('abc-1', 100);
  app.add('xyz-9', 200);

  assert.equal(app.render(), 'ABC-1 — 100 ₸\nXYZ-9 — 200 ₸');
  assert.equal(app.total(), 300);
});

test('никто не лезет внутрь чужого слайса мимо index.ts', () => {
  const bad = deepImports(SRC, LAYERS);
  assert.deepEqual(
    bad,
    [],
    `глубоких импортов: ${bad.length}\n${bad.map((v) => `  ${v.file} → ${v.dep}`).join('\n')}`,
  );
});

test('публичный API собран руками, без export *', () => {
  const stars = starExports(SRC);
  assert.deepEqual(stars, [], `export * найден в: ${stars.join(', ')}`);
});

test('нормализация артикула осталась внутренней деталью сущности', () => {
  assert.equal(
    typeof (orderEntity as Record<string, unknown>).normalizeSku,
    'undefined',
    'normalizeSku не должен торчать из index.ts: снаружи не должно быть способа приводить артикул иначе, чем это делает сама сущность',
  );
});
