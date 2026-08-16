export type Order = { sku: string; price: number };

export function createOrder(sku: string, price: number): Order {
  return { sku, price };
}

export function orderTotal(orders: Order[]): number {
  return orders.reduce((sum, order) => sum + order.price, 0);
}
