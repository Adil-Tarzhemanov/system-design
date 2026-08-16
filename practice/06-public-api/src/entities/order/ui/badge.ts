import type { Order } from '../model/order.ts';

export function renderBadge(order: Order): string {
  return `${order.sku} — ${order.price} ₸`;
}
