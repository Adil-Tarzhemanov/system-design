// Тесты — контракт упражнения. Их менять нельзя, менять нужно src/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { layerViolations } from '../tools/graph.mjs';

import * as app from './src/app/render.ts';

const SRC = join(import.meta.dirname, 'src');

// Сверху вниз. Слой может импортировать только те, что ниже его в этом списке.
const LAYERS = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'];

test('поведение: гость видит заголовок и подпись «гость»', () => {
  app.logout();
  assert.equal(app.render(), 'ГЛАВНАЯ · гость');
});

test('поведение: после входа в шапке имя пользователя', () => {
  app.login();
  assert.equal(app.render(), 'ГЛАВНАЯ · Аиша');
  app.logout();
});

test('поведение: приветствие собирается по имени', () => {
  assert.equal(app.greetingLine(), 'Привет, Аиша');
});

test('импорты не идут вверх по слоям', () => {
  const bad = layerViolations(SRC, LAYERS);
  assert.deepEqual(
    bad,
    [],
    `нарушений: ${bad.length}\n${bad.map((v) => `  ${v.file} → ${v.dep}  (${v.from} импортирует ${v.to})`).join('\n')}`,
  );
});
