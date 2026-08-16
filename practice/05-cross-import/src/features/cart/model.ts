// СТАРТОВОЕ СОСТОЯНИЕ. Корзина спрашивает у оформления, готова ли оплата,
// чтобы решить, можно ли показывать кнопку. Классический кросс-импорт фич.
import { isPaymentReady } from '../checkout/model.ts';

export type Item = { sku: string; price: number };

const items: Item[] = [];

export function addItem(sku: string, price: number): void {
  items.push({ sku, price });
}

export function total(): number {
  return items.reduce((sum, item) => sum + item.price, 0);
}

export function canSubmit(): boolean {
  return items.length > 0 && isPaymentReady();
}

export function resetCart(): void {
  items.length = 0;
}
