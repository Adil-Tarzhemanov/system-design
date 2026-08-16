// СТАРТОВОЕ СОСТОЯНИЕ. Оформление лезет в корзину за суммой — вторая половина кольца.
import { total } from '../cart/model.ts';

let card: string | null = null;

export function setCard(number: string): void {
  card = number;
}

export function isPaymentReady(): boolean {
  return card !== null;
}

export function submit(): string {
  const sum = total();
  if (sum === 0) throw new Error('корзина пуста');
  return `оплачено ${sum} ₸ картой ${card}`;
}

export function resetCheckout(): void {
  card = null;
}
