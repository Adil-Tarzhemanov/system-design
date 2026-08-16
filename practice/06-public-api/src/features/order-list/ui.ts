// СТАРТОВОЕ СОСТОЯНИЕ. Фича лезет внутрь сущности двумя разными способами
// и заодно делает работу сущности за неё — нормализует артикул сама.
import { normalizeSku } from '../../entities/order/model/normalize.ts';
import { renderBadge } from '../../entities/order/ui/badge.ts';
import { createOrder, orderTotal, type Order } from '../../entities/order/index.ts';

const orders: Order[] = [];

export function add(sku: string, price: number): void {
  orders.push(createOrder(normalizeSku(sku), price));
}

export function render(): string {
  return orders.map(renderBadge).join('\n');
}

export function total(): number {
  return orderTotal(orders);
}

export function reset(): void {
  orders.length = 0;
}
