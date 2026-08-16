// Единственный вход для тестов. Сигнатуры менять нельзя.
// Сейчас файл ничего не связывает: фичи договорились между собой напрямую.
import { addItem, canSubmit, resetCart } from '../features/cart/model.ts';
import { resetCheckout, setCard, submit } from '../features/checkout/model.ts';

export function reset(): void {
  resetCart();
  resetCheckout();
}

export { addItem, setCard };

export function readyToSubmit(): boolean {
  return canSubmit();
}

export function pay(): string {
  return submit();
}
