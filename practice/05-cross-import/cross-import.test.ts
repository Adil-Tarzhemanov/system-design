// Тесты — контракт упражнения. Их менять нельзя, менять нужно src/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';
import { buildGraph, findCycles, sliceReach } from '../tools/graph.mjs';

import * as app from './src/app/order.ts';

const SRC = join(import.meta.dirname, 'src');
const LAYERS = ['features', 'widgets', 'entities'];

test('поведение: пустая корзина без карты — платить нельзя', () => {
  app.reset();
  assert.equal(app.readyToSubmit(), false);
});

test('поведение: товар есть, карты нет — платить нельзя', () => {
  app.reset();
  app.addItem('sku-1', 1500);
  assert.equal(app.readyToSubmit(), false);
});

test('поведение: товар и карта — можно платить', () => {
  app.reset();
  app.addItem('sku-1', 1500);
  app.setCard('4400');
  assert.equal(app.readyToSubmit(), true);
});

test('поведение: оплата собирает сумму по корзине', () => {
  app.reset();
  app.addItem('sku-1', 1500);
  app.addItem('sku-2', 500);
  app.setCard('4400');
  assert.equal(app.pay(), 'оплачено 2000 ₸ картой 4400');
});

test('поведение: пустую корзину оплатить нельзя', () => {
  app.reset();
  app.setCard('4400');
  assert.throws(() => app.pay(), /корзина пуста/);
});

test('циклов импортов нет', () => {
  const cycles = findCycles(buildGraph(SRC));
  assert.deepEqual(cycles, [], `найден цикл: ${cycles.map((c) => c.join(' → ')).join('; ')}`);
});

test('фичи не знают друг о друге', () => {
  const reach = sliceReach(SRC, LAYERS);
  const cart = [...(reach.get('features/cart') ?? [])];
  const checkout = [...(reach.get('features/checkout') ?? [])];

  assert.ok(!cart.includes('features/checkout'), `cart дотягивается до: ${cart.join(', ')}`);
  assert.ok(!checkout.includes('features/cart'), `checkout дотягивается до: ${checkout.join(', ')}`);
});
